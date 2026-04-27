package net.sf.l2j.gameserver.model.vote;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import net.sf.l2j.commons.config.ExProperties;
import net.sf.l2j.commons.logging.CLogger;
import net.sf.l2j.gameserver.model.actor.Player;
import net.sf.l2j.gameserver.network.serverpackets.NpcHtmlMessage;

public class VoteManager {
    private static final CLogger LOGGER = new CLogger(VoteManager.class.getName());

    private static String BRIDGE_URL;
    private static String HMAC_SECRET;
    private static int VOTE_COIN_ID;
    private static int COIN_OF_LUCK_ID;
    private static int COINS_PER_VOTE;
    private static int EXCHANGE_RATE;
    private static long COOLDOWN_MS;
    private static String URL_HOPZONE;
    private static String URL_L2TOPCO;

    public static final String[] SITES = { "hopzone", "l2topco" };
    public static final Map<String, String> SITE_LABELS = new HashMap<>();

    static {
        SITE_LABELS.put("hopzone", "HopZone");
        SITE_LABELS.put("l2topco", "L2Top.CO");
    }

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    private final Map<String, Long> cooldowns = new ConcurrentHashMap<>();

    private static class SingletonHolder {
        private static final VoteManager INSTANCE = new VoteManager();
    }

    public static VoteManager getInstance() {
        return SingletonHolder.INSTANCE;
    }

    private VoteManager() {
        loadConfig();
    }

    private void loadConfig() {
        ExProperties p = new ExProperties();
        try {
            p.load("./config/vote.properties");
            BRIDGE_URL = p.getProperty("VoteBridgeUrl", "https://bridge.l2impure.com");
            HMAC_SECRET = p.getProperty("VoteHmacSecret", "");
            VOTE_COIN_ID = Integer.parseInt(p.getProperty("VoteCoinId", "38010"));
            COIN_OF_LUCK_ID = Integer.parseInt(p.getProperty("CoinOfLuckId", "38011"));
            COINS_PER_VOTE = Integer.parseInt(p.getProperty("VoteCoinsPerVote", "1"));
            EXCHANGE_RATE = Integer.parseInt(p.getProperty("VoteExchangeRate", "10"));
            COOLDOWN_MS = Long.parseLong(p.getProperty("VoteCooldownHours", "12")) * 3600L * 1000L;
            URL_HOPZONE = p.getProperty("VoteUrlHopzone", "");
            URL_L2TOPCO = p.getProperty("VoteUrlL2topco", "");
            LOGGER.info("VoteManager: config loaded (coin=" + VOTE_COIN_ID + ", cooldown=" + (COOLDOWN_MS/3600000) + "h)");
        } catch (Exception e) {
            LOGGER.error("VoteManager: failed to load config", e);
        }
    }

    public void onEnterWorld(Player player) {
        if (player == null) return;
        showMainPopup(player);
    }

    public void showMainPopup(Player player) {
        StringBuilder sb = new StringBuilder(2048);
        sb.append("<html><title>L2 Impure - Vote</title><body>");
        sb.append("<center>");
        sb.append("<font color=\"LEVEL\">L2 IMPURE - VOTE & EARN</font><br1>");
        sb.append("Each vote = ").append(COINS_PER_VOTE).append(" Vote Coin<br1>");
        sb.append(EXCHANGE_RATE).append(" Vote Coins -> 1 Coin of Luck<br><br>");

        long now = System.currentTimeMillis();
        for (String site : SITES) {
            long lastVote = getLastVote(player.getObjectId(), site);
            boolean onCooldown = (now - lastVote) < COOLDOWN_MS;

            sb.append("<table width=270 bgcolor=\"222222\"><tr><td>");
            sb.append("<font color=\"LEVEL\">").append(SITE_LABELS.get(site)).append("</font>");
            sb.append("</td></tr></table>");

            if (onCooldown) {
                long remainMin = (COOLDOWN_MS - (now - lastVote)) / 60000L;
                long h = remainMin / 60;
                long m = remainMin % 60;
                sb.append("<font color=\"888888\">Available in ").append(h).append("h ").append(m).append("m</font><br>");
            } else {
                sb.append("<button value=\"Vote\" action=\"bypass -h vote_open ").append(site)
                  .append("\" width=80 height=22 back=\"L2UI_ct1.button_df\" fore=\"L2UI_ct1.button_df\">");
                sb.append("&nbsp;");
                sb.append("<button value=\"Claim\" action=\"bypass -h vote_claim ").append(site)
                  .append("\" width=80 height=22 back=\"L2UI_ct1.button_df\" fore=\"L2UI_ct1.button_df\"><br>");
            }
        }

        sb.append("<br><table width=270 bgcolor=\"222222\"><tr><td>");
        sb.append("<font color=\"LEVEL\">Exchange</font>");
        sb.append("</td></tr></table>");
        long voteCoins = player.getInventory().getInventoryItemCount(VOTE_COIN_ID, -1);
        sb.append("Vote Coins: <font color=\"LEVEL\">").append(voteCoins).append("</font><br>");
        sb.append("<button value=\"Exchange ").append(EXCHANGE_RATE).append(" -> 1\" ");
        sb.append("action=\"bypass -h vote_exchange\" ");
        sb.append("width=200 height=22 back=\"L2UI_ct1.button_df\" fore=\"L2UI_ct1.button_df\">");

        sb.append("</center></body></html>");

        NpcHtmlMessage html = new NpcHtmlMessage(0);
        html.setHtml(sb.toString());
        player.sendPacket(html);
    }

    public void openVoteUrl(Player player, String site) {
        String baseUrl;
        if ("hopzone".equals(site)) baseUrl = URL_HOPZONE;
        else if ("l2topco".equals(site)) baseUrl = URL_L2TOPCO;
        else return;

        if (baseUrl == null || baseUrl.isEmpty()) {
            player.sendMessage("Vote URL not configured for " + SITE_LABELS.get(site));
            return;
        }

        String url;
        if ("hopzone".equals(site)) {
            String hash = hmacHex(player.getObjectId() + ":hopzone");
            url = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "userid=" + player.getObjectId() + "&hash=" + hash;
        } else {
            url = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "userid=" + player.getObjectId();
        }

        StringBuilder sb = new StringBuilder(512);
        sb.append("<html><title>Vote on ").append(SITE_LABELS.get(site)).append("</title><body><center>");
        sb.append("<font color=\"LEVEL\">Open this URL in your browser:</font><br><br>");
        sb.append("<a action=\"link ").append(url).append("\">").append(url).append("</a><br><br>");
        sb.append("After voting, click <font color=\"LEVEL\">Claim</font> back at the menu.<br><br>");
        sb.append("<button value=\"Back\" action=\"bypass -h vote_main\" width=100 height=22 back=\"L2UI_ct1.button_df\" fore=\"L2UI_ct1.button_df\">");
        sb.append("</center></body></html>");

        NpcHtmlMessage html = new NpcHtmlMessage(0);
        html.setHtml(sb.toString());
        player.sendPacket(html);
    }

    public void claimReward(Player player, String site) {
        long now = System.currentTimeMillis();
        long lastVote = getLastVote(player.getObjectId(), site);
        if ((now - lastVote) < COOLDOWN_MS) {
            player.sendMessage("Cooldown active for " + SITE_LABELS.get(site) + ".");
            return;
        }

        try {
            String ts = String.valueOf(Instant.now().getEpochSecond());
            String body = "site=" + site + "&charId=" + player.getObjectId() + "&ts=" + ts;
            String sig = hmacHex(body);

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(BRIDGE_URL + "/vote/check?" + body + "&sig=" + sig))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200 && resp.body().contains("\"ok\":true")) {
                player.addItem("VoteReward", VOTE_COIN_ID, COINS_PER_VOTE, player, true);
                setLastVote(player.getObjectId(), site, now);
                player.sendMessage("Reward claimed! +" + COINS_PER_VOTE + " Vote Coin.");
            } else {
                player.sendMessage("No pending vote found. Vote first, then come back.");
            }
        } catch (Exception e) {
            LOGGER.error("Vote check failed", e);
            player.sendMessage("Vote system unavailable. Try again later.");
        }

        showMainPopup(player);
    }

    public void exchange(Player player) {
        long count = player.getInventory().getInventoryItemCount(VOTE_COIN_ID, -1);
        if (count < EXCHANGE_RATE) {
            player.sendMessage("You need at least " + EXCHANGE_RATE + " Vote Coins.");
            return;
        }

        int converted = (int) (count / EXCHANGE_RATE);
        int spent = converted * EXCHANGE_RATE;

        player.destroyItemByItemId("VoteExchange", VOTE_COIN_ID, spent, player, true);
        player.addItem("VoteExchange", COIN_OF_LUCK_ID, converted, player, true);
        player.sendMessage("Exchanged " + spent + " Vote Coins -> " + converted + " Coin(s) of Luck.");

        showMainPopup(player);
    }

    private long getLastVote(int charId, String site) {
        return cooldowns.getOrDefault(charId + ":" + site, 0L);
    }

    private void setLastVote(int charId, String site, long ts) {
        cooldowns.put(charId + ":" + site, ts);
    }

    private String hmacHex(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(HMAC_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
