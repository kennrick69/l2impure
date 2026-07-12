package net.sf.l2j.gameserver.custom;

import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Properties;

import net.sf.l2j.commons.logging.CLogger;

/**
 * L2 Impure custom (Fase Admin 6) — welcome message multi-line.
 *
 * Lê WellcomeMessageLine1..5 de ./config/custom.properties (mesmo arquivo
 * do mod legado de welcome do aCis). O painel admin do site edita essas
 * keys via bridge /config/apply; mudança vale após restart do gameserver
 * (mesmo contrato do resto do painel de eventos).
 *
 * Lê o arquivo DIRETO (e não via Config) por dois motivos:
 *  1. não precisa recompilar/patchear a classe Config gigante;
 *  2. lê em UTF-8 explícito — Properties.load(InputStream) padrão é
 *     ISO-8859-1 e quebraria acentos que o JOs digitar no painel.
 *
 * Se nenhuma linha estiver preenchida, EnterWorld cai no comportamento
 * legado (WellcomeMessageServerName + WellcomeMessageSecondaryText).
 */
public final class WelcomeMessageData {
    private static final CLogger LOGGER = new CLogger(WelcomeMessageData.class.getName());

    private static final String CONFIG_FILE = "./config/custom.properties";
    private static final int MAX_LINES = 5;

    private static final List<String> LINES = load();

    private WelcomeMessageData() {
    }

    private static List<String> load() {
        final List<String> lines = new ArrayList<>(MAX_LINES);
        try (InputStreamReader reader = new InputStreamReader(new FileInputStream(CONFIG_FILE), StandardCharsets.UTF_8)) {
            final Properties p = new Properties();
            p.load(reader);
            for (int i = 1; i <= MAX_LINES; i++) {
                final String line = p.getProperty("WellcomeMessageLine" + i, "").trim();
                if (!line.isEmpty())
                    lines.add(line);
            }
        } catch (Exception e) {
            LOGGER.warn("WelcomeMessageData: couldn't read " + CONFIG_FILE + " — falling back to legacy welcome message.");
            return Collections.emptyList();
        }
        if (!lines.isEmpty())
            LOGGER.info("WelcomeMessageData: " + lines.size() + " welcome line(s) loaded.");
        return Collections.unmodifiableList(lines);
    }

    /** Linhas configuradas (sem vazias). Lista vazia = usar mensagem legada. */
    public static List<String> getLines() {
        return LINES;
    }
}
