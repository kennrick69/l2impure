package net.sf.l2j.gameserver.gm;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import net.sf.l2j.commons.config.ExProperties;
import net.sf.l2j.commons.logging.CLogger;
import net.sf.l2j.commons.pool.ConnectionPool;
import net.sf.l2j.gameserver.data.ItemTable;
import net.sf.l2j.gameserver.model.World;
import net.sf.l2j.gameserver.model.actor.Player;

/**
 * GM Command Queue poller — polla a bridge local (l2j-bridge) a cada N
 * segundos buscando comandos criados no painel admin do site
 * (/admin/gm-console) e executa in-game sem precisar de GM logado.
 *
 * Contrato canônico: bridge/src/routes/gm-commands.ts (repo l2impure-arq).
 *   GET  {base}/gm-commands/pending?limit=L&ts=T&sig=H
 *        sig = hex(HMAC-SHA256("limit=L&ts=T", secret))
 *   POST {base}/gm-commands/{id}/result?ts=T&sig=H  body {"ok":bool,"message":...}
 *        sig = hex(HMAC-SHA256("id=I&ts=T." + rawBody, secret))
 *
 * Config opcional em ./config/gmqueue.properties (fallback: secret vem de
 * ./config/vote.properties VoteHmacSecret — é o mesmo HMAC_SECRET da bridge).
 *
 * Toda execução é cercada de try/catch: um comando ruim NUNCA derruba o
 * gameserver. Roda em executor daemon próprio — não bloqueia o ThreadPool
 * do core nem a main thread.
 */
public final class GmCommandPoller implements Runnable {
    private static final CLogger LOGGER = new CLogger(GmCommandPoller.class.getName());

    private static final int MAX_GIVE_COUNT = 1_000_000;
    private static final int MAX_BROADCAST_LEN = 500;
    /** Convenção aCis pra ban permanente de conta (access_level negativo = login bloqueado). */
    private static final int BAN_ACCESS_LEVEL = -100;
    private static final long MAX_BAN_HOURS = 87_600; // 10 anos

    private String _bridgeUrl = "http://127.0.0.1:8080";
    private String _secret = "";
    private int _pollSeconds = 5;
    private int _limit = 10;
    private boolean _enabled = true;

    private final HttpClient _http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    /** Executor daemon próprio — isolado do ThreadPool do core. */
    private ScheduledExecutorService _executor;

    /** Log de falha de poll com throttle (1 log a cada 60 falhas ~ 5min). */
    private final AtomicInteger _failStreak = new AtomicInteger(0);

    private static class SingletonHolder {
        private static final GmCommandPoller INSTANCE = new GmCommandPoller();
    }

    public static GmCommandPoller getInstance() {
        return SingletonHolder.INSTANCE;
    }

    private GmCommandPoller() {
        loadConfig();

        if (!_enabled) {
            LOGGER.info("GmCommandPoller: disabled by config.");
            return;
        }
        if (_secret == null || _secret.isEmpty()) {
            LOGGER.warn("GmCommandPoller: no HMAC secret found (gmqueue.properties / vote.properties) — poller NOT started.");
            return;
        }

        _executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "GmCommandPoller");
            t.setDaemon(true);
            return t;
        });
        _executor.scheduleWithFixedDelay(this, 15, _pollSeconds, TimeUnit.SECONDS);
        LOGGER.info("GmCommandPoller: started (url=" + _bridgeUrl + ", every " + _pollSeconds + "s).");
    }

    private void loadConfig() {
        // Overrides opcionais
        try {
            ExProperties p = new ExProperties();
            p.load("./config/gmqueue.properties");
            _enabled = p.getProperty("GmQueueEnabled", true);
            _bridgeUrl = p.getProperty("GmQueueBridgeUrl", _bridgeUrl);
            _secret = p.getProperty("GmQueueHmacSecret", "");
            _pollSeconds = Math.max(2, p.getProperty("GmQueuePollSeconds", 5));
            _limit = Math.min(50, Math.max(1, p.getProperty("GmQueueLimit", 10)));
        } catch (Exception e) {
            // arquivo opcional — segue com defaults
        }

        // Fallback: mesmo secret do vote system (== HMAC_SECRET da bridge)
        if (_secret == null || _secret.isEmpty()) {
            try {
                ExProperties v = new ExProperties();
                v.load("./config/vote.properties");
                _secret = v.getProperty("VoteHmacSecret", "");
            } catch (Exception e) {
                // sem vote.properties — poller fica off
            }
        }
        if (_bridgeUrl.endsWith("/"))
            _bridgeUrl = _bridgeUrl.substring(0, _bridgeUrl.length() - 1);
    }

    @Override
    public void run() {
        try {
            poll();
        } catch (Throwable t) {
            // NUNCA deixar exceção escapar — mataria o agendamento
            logFailure("poll crashed: " + t.getMessage());
        }
    }

    private void poll() {
        final String ts = String.valueOf(Instant.now().getEpochSecond());
        final String qs = "limit=" + _limit + "&ts=" + ts;
        final String sig = hmacHex(qs);

        HttpResponse<String> resp;
        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(_bridgeUrl + "/gm-commands/pending?" + qs + "&sig=" + sig))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
            resp = _http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            logFailure("bridge unreachable: " + e.getMessage());
            return;
        }

        if (resp.statusCode() != 200) {
            logFailure("pending poll HTTP " + resp.statusCode());
            return;
        }
        _failStreak.set(0);

        final Object parsed;
        try {
            parsed = Json.parse(resp.body());
        } catch (Exception e) {
            logFailure("bad JSON from bridge: " + e.getMessage());
            return;
        }
        if (!(parsed instanceof Map))
            return;

        final Object cmds = ((Map<?, ?>) parsed).get("commands");
        if (!(cmds instanceof List) || ((List<?>) cmds).isEmpty())
            return;

        for (Object o : (List<?>) cmds) {
            if (!(o instanceof Map))
                continue;
            final Map<?, ?> cmd = (Map<?, ?>) o;
            final long id = asLong(cmd.get("id"), -1);
            final String type = asString(cmd.get("type"));
            final Object payload = cmd.get("payload");
            final String requestedBy = asString(cmd.get("requestedBy"));
            if (id <= 0 || type == null)
                continue;

            boolean ok;
            String message;
            try {
                final String[] result = execute(type, payload instanceof Map ? (Map<?, ?>) payload : null, requestedBy);
                ok = "1".equals(result[0]);
                message = result[1];
            } catch (Throwable t) {
                ok = false;
                message = "handler exception: " + t.getMessage();
                LOGGER.error("GmCommandPoller: command #" + id + " (" + type + ") threw", t);
            }
            report(id, ok, message);
        }
    }

    /** @return [0]="1"|"0" (ok), [1]=mensagem */
    private String[] execute(String type, Map<?, ?> payload, String requestedBy) {
        switch (type) {
            case "broadcast": {
                String msg = payload == null ? null : asString(payload.get("message"));
                if (msg == null || msg.isBlank())
                    return fail("broadcast: payload.message vazio");
                msg = msg.trim();
                if (msg.length() > MAX_BROADCAST_LEN)
                    msg = msg.substring(0, MAX_BROADCAST_LEN);
                World.announceToOnlinePlayers(msg);
                final int online = World.getInstance().getPlayers().size();
                LOGGER.info("GmCommandPoller: broadcast sent (" + online + " online): " + msg);
                return okMsg("broadcast enviado (" + online + " players online)");
            }
            case "kick": {
                final String charName = payload == null ? null : asString(payload.get("charName"));
                if (charName == null || charName.isBlank())
                    return fail("kick: payload.charName vazio");
                final Player player = World.getInstance().getPlayer(charName.trim());
                if (player == null)
                    return fail("char '" + charName + "' offline ou inexistente");
                final String realName = player.getName();
                player.logout(false);
                LOGGER.info("GmCommandPoller: kicked " + realName);
                return okMsg(realName + " kickado do servidor");
            }
            case "give_item": {
                if (payload == null)
                    return fail("give_item: payload vazio");
                final String charName = asString(payload.get("charName"));
                final int itemId = (int) asLong(payload.get("itemId"), 0);
                final int count = (int) asLong(payload.get("count"), 0);
                if (charName == null || charName.isBlank())
                    return fail("give_item: payload.charName vazio");
                if (itemId <= 0)
                    return fail("give_item: itemId inválido");
                if (count <= 0 || count > MAX_GIVE_COUNT)
                    return fail("give_item: count fora de 1.." + MAX_GIVE_COUNT);
                if (ItemTable.getInstance().getTemplate(itemId) == null)
                    return fail("give_item: itemId " + itemId + " não existe no ItemTable");
                final Player player = World.getInstance().getPlayer(charName.trim());
                if (player == null)
                    return fail("char offline — use o painel de char offline");
                player.addItem("gm-queue", itemId, count, player, true);
                LOGGER.info("GmCommandPoller: gave " + count + "x item " + itemId + " to " + player.getName());
                return okMsg(count + "x item " + itemId + " entregue a " + player.getName());
            }
            case "announcement_broadcast": {
                if (payload == null)
                    return fail("announcement_broadcast: payload vazio");
                final String title = asString(payload.get("title"));
                final String message = asString(payload.get("message"));
                if (title == null || title.isBlank())
                    return fail("announcement_broadcast: payload.title vazio");
                if (message == null || message.isBlank())
                    return fail("announcement_broadcast: payload.message vazio");
                String full = title.trim() + ": " + message.trim();
                if (full.length() > MAX_BROADCAST_LEN)
                    full = full.substring(0, MAX_BROADCAST_LEN);
                World.announceToOnlinePlayers(full);
                final int online = World.getInstance().getPlayers().size();
                LOGGER.info("GmCommandPoller: announcement broadcast (" + online + " online): " + full);
                return okMsg("anúncio shoutado in-game (" + online + " players online)");
            }
            case "ban_account":
                return banAccount(payload, requestedBy);
            case "unban_account":
                return unbanAccount(payload, requestedBy);
            default:
                return fail("tipo desconhecido: " + type);
        }
    }

    /**
     * Bane uma conta: (1) kicka toda sessão ativa da conta, (2) seta
     * access_level negativo em accounts (login server passa a recusar o
     * login), (3) grava histórico em account_bans (expires_at NULL =
     * permanente; senão o auto-expire do scheduler da bridge desbane).
     */
    private String[] banAccount(Map<?, ?> payload, String requestedBy) {
        if (payload == null)
            return fail("ban_account: payload vazio");
        final String rawLogin = asString(payload.get("accountLogin"));
        final String reason = asString(payload.get("reason"));
        final long durationHours = asLong(payload.get("durationHours"), 0);
        if (rawLogin == null || rawLogin.isBlank())
            return fail("ban_account: payload.accountLogin vazio");
        if (reason == null || reason.isBlank())
            return fail("ban_account: payload.reason vazio");
        if (durationHours < 0 || durationHours > MAX_BAN_HOURS)
            return fail("ban_account: durationHours fora de 1.." + MAX_BAN_HOURS);
        final String login = rawLogin.trim();
        final String bannedBy = requestedBy == null || requestedBy.isBlank() ? "painel-admin" : requestedBy;

        // 1. Kick de toda sessão ativa da conta (char online cai na hora)
        int kicked = 0;
        for (Player p : World.getInstance().getPlayers()) {
            try {
                if (p != null && login.equalsIgnoreCase(p.getAccountName())) {
                    p.sendMessage("Sua conta foi banida: " + reason.trim());
                    p.logout(false);
                    kicked++;
                }
            } catch (Exception e) {
                LOGGER.warn("GmCommandPoller: ban_account kick failed for a player of " + login + ": " + e.getMessage());
            }
        }

        // 2. Bloqueia o login + 3. histórico
        try (Connection con = ConnectionPool.getConnection()) {
            int updated;
            try (PreparedStatement ps = con.prepareStatement(
                "UPDATE accounts SET access_level = ?, lastServer = -1 WHERE login = ?")) {
                ps.setInt(1, BAN_ACCESS_LEVEL);
                ps.setString(2, login);
                updated = ps.executeUpdate();
            }
            if (updated == 0)
                return fail("ban_account: conta '" + login + "' não existe");

            final String insertSql = durationHours > 0
                ? "INSERT INTO account_bans (account_login, reason, banned_by, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))"
                : "INSERT INTO account_bans (account_login, reason, banned_by, expires_at) VALUES (?, ?, ?, NULL)";
            try (PreparedStatement ps = con.prepareStatement(insertSql)) {
                ps.setString(1, login);
                ps.setString(2, reason.trim());
                ps.setString(3, bannedBy);
                if (durationHours > 0)
                    ps.setLong(4, durationHours);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            LOGGER.error("GmCommandPoller: ban_account SQL failed for " + login, e);
            return fail("ban_account: erro SQL — " + e.getMessage());
        }

        final String scope = durationHours > 0 ? durationHours + "h" : "permanente";
        LOGGER.info("GmCommandPoller: banned account " + login + " (" + scope + ", by " + bannedBy + ", kicked " + kicked + " session(s))");
        return okMsg("conta " + login + " banida (" + scope + "), " + kicked + " sessão(ões) derrubada(s)");
    }

    /**
     * Desbane: restaura access_level = 0 / lastServer = 1 e fecha os
     * registros abertos em account_bans. Guard access_level < 0 evita
     * zerar access_level positivo de GM por engano.
     */
    private String[] unbanAccount(Map<?, ?> payload, String requestedBy) {
        if (payload == null)
            return fail("unban_account: payload vazio");
        final String rawLogin = asString(payload.get("accountLogin"));
        if (rawLogin == null || rawLogin.isBlank())
            return fail("unban_account: payload.accountLogin vazio");
        final String login = rawLogin.trim();
        final String unbannedBy = requestedBy == null || requestedBy.isBlank() ? "painel-admin" : requestedBy;

        try (Connection con = ConnectionPool.getConnection()) {
            int updated;
            try (PreparedStatement ps = con.prepareStatement(
                "UPDATE accounts SET access_level = 0, lastServer = 1 WHERE login = ? AND access_level < 0")) {
                ps.setString(1, login);
                updated = ps.executeUpdate();
            }
            if (updated == 0) {
                // não estava banida OU não existe — distinguir pra mensagem
                try (PreparedStatement ps = con.prepareStatement(
                    "SELECT access_level FROM accounts WHERE login = ?")) {
                    ps.setString(1, login);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next())
                            return fail("unban_account: conta '" + login + "' não existe");
                        return fail("unban_account: conta '" + login + "' não está banida (access_level=" + rs.getInt(1) + ")");
                    }
                }
            }
            try (PreparedStatement ps = con.prepareStatement(
                "UPDATE account_bans SET unbanned_at = NOW(), unbanned_by = ? WHERE account_login = ? AND unbanned_at IS NULL")) {
                ps.setString(1, unbannedBy);
                ps.setString(2, login);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            LOGGER.error("GmCommandPoller: unban_account SQL failed for " + login, e);
            return fail("unban_account: erro SQL — " + e.getMessage());
        }

        LOGGER.info("GmCommandPoller: unbanned account " + login + " (by " + unbannedBy + ")");
        return okMsg("conta " + login + " desbanida — já pode logar");
    }

    private static String[] okMsg(String msg) {
        return new String[] { "1", msg };
    }

    private static String[] fail(String msg) {
        return new String[] { "0", msg };
    }

    private void report(long id, boolean ok, String message) {
        try {
            final String body = "{\"ok\":" + ok + ",\"message\":\"" + Json.escape(message == null ? "" : message) + "\"}";
            final String ts = String.valueOf(Instant.now().getEpochSecond());
            final String sig = hmacHex("id=" + id + "&ts=" + ts + "." + body);

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(_bridgeUrl + "/gm-commands/" + id + "/result?ts=" + ts + "&sig=" + sig))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> resp = _http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200)
                LOGGER.warn("GmCommandPoller: result report #" + id + " HTTP " + resp.statusCode() + " " + resp.body());
        } catch (Exception e) {
            LOGGER.error("GmCommandPoller: failed to report result #" + id, e);
        }
    }

    private void logFailure(String why) {
        final int streak = _failStreak.incrementAndGet();
        if (streak == 1 || streak % 60 == 0)
            LOGGER.warn("GmCommandPoller: " + why + " (streak=" + streak + ")");
    }

    private String hmacHex(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(_secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash)
                sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static long asLong(Object o, long def) {
        if (o instanceof Number)
            return ((Number) o).longValue();
        if (o instanceof String) {
            try {
                return Long.parseLong((String) o);
            } catch (NumberFormatException ignored) {
            }
        }
        return def;
    }

    private static String asString(Object o) {
        return o instanceof String ? (String) o : null;
    }

    // =====================================================================
    // Mini parser JSON (sem dependência externa — classpath do fork não tem
    // gson/jackson). Suporta objects, arrays, strings com escapes, números,
    // true/false/null. Suficiente pro contrato do gm-commands.
    // =====================================================================
    static final class Json {
        private final String s;
        private int i;

        private Json(String s) {
            this.s = s;
        }

        static Object parse(String input) {
            Json p = new Json(input);
            p.ws();
            Object v = p.value();
            p.ws();
            if (p.i < p.s.length())
                throw new IllegalArgumentException("trailing garbage at " + p.i);
            return v;
        }

        static String escape(String raw) {
            StringBuilder sb = new StringBuilder(raw.length() + 8);
            for (int k = 0; k < raw.length(); k++) {
                char c = raw.charAt(k);
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> {
                        if (c < 0x20)
                            sb.append(String.format("\\u%04x", (int) c));
                        else
                            sb.append(c);
                    }
                }
            }
            return sb.toString();
        }

        private Object value() {
            if (i >= s.length())
                throw err("unexpected end");
            char c = s.charAt(i);
            switch (c) {
                case '{':
                    return object();
                case '[':
                    return array();
                case '"':
                    return string();
                case 't':
                    expect("true");
                    return Boolean.TRUE;
                case 'f':
                    expect("false");
                    return Boolean.FALSE;
                case 'n':
                    expect("null");
                    return null;
                default:
                    return number();
            }
        }

        private Map<String, Object> object() {
            Map<String, Object> m = new LinkedHashMap<>();
            i++; // {
            ws();
            if (peek() == '}') {
                i++;
                return m;
            }
            while (true) {
                ws();
                if (peek() != '"')
                    throw err("expected key");
                String k = string();
                ws();
                if (peek() != ':')
                    throw err("expected ':'");
                i++;
                ws();
                m.put(k, value());
                ws();
                char c = peek();
                if (c == ',') {
                    i++;
                    continue;
                }
                if (c == '}') {
                    i++;
                    return m;
                }
                throw err("expected ',' or '}'");
            }
        }

        private List<Object> array() {
            List<Object> l = new ArrayList<>();
            i++; // [
            ws();
            if (peek() == ']') {
                i++;
                return l;
            }
            while (true) {
                ws();
                l.add(value());
                ws();
                char c = peek();
                if (c == ',') {
                    i++;
                    continue;
                }
                if (c == ']') {
                    i++;
                    return l;
                }
                throw err("expected ',' or ']'");
            }
        }

        private String string() {
            i++; // "
            StringBuilder sb = new StringBuilder();
            while (true) {
                if (i >= s.length())
                    throw err("unterminated string");
                char c = s.charAt(i++);
                if (c == '"')
                    return sb.toString();
                if (c == '\\') {
                    if (i >= s.length())
                        throw err("bad escape");
                    char e = s.charAt(i++);
                    switch (e) {
                        case '"' -> sb.append('"');
                        case '\\' -> sb.append('\\');
                        case '/' -> sb.append('/');
                        case 'b' -> sb.append('\b');
                        case 'f' -> sb.append('\f');
                        case 'n' -> sb.append('\n');
                        case 'r' -> sb.append('\r');
                        case 't' -> sb.append('\t');
                        case 'u' -> {
                            if (i + 4 > s.length())
                                throw err("bad \\u");
                            sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                            i += 4;
                        }
                        default -> throw err("bad escape \\" + e);
                    }
                } else {
                    sb.append(c);
                }
            }
        }

        private Object number() {
            int start = i;
            if (peek() == '-')
                i++;
            while (i < s.length() && "0123456789+-.eE".indexOf(s.charAt(i)) >= 0)
                i++;
            String tok = s.substring(start, i);
            try {
                if (tok.indexOf('.') < 0 && tok.indexOf('e') < 0 && tok.indexOf('E') < 0)
                    return Long.parseLong(tok);
                return Double.parseDouble(tok);
            } catch (NumberFormatException e) {
                throw err("bad number '" + tok + "'");
            }
        }

        private void expect(String lit) {
            if (!s.startsWith(lit, i))
                throw err("expected " + lit);
            i += lit.length();
        }

        private char peek() {
            if (i >= s.length())
                throw err("unexpected end");
            return s.charAt(i);
        }

        private void ws() {
            while (i < s.length() && Character.isWhitespace(s.charAt(i)))
                i++;
        }

        private IllegalArgumentException err(String msg) {
            return new IllegalArgumentException("JSON: " + msg + " (pos " + i + ")");
        }
    }
}
