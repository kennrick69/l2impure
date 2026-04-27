package net.sf.l2j.gameserver.handler;

import java.util.HashMap;
import java.util.Map;
import net.sf.l2j.Config;
import net.sf.l2j.commons.logging.CLogger;
import net.sf.l2j.gameserver.handler.bypasshandlers.DailyRewardCBBypasses;
import net.sf.l2j.gameserver.handler.bypasshandlers.DungeonBypasses;
import net.sf.l2j.gameserver.handler.bypasshandlers.Vote;

public class BypassHandler {
    private static final CLogger LOGGER = new CLogger(BypassHandler.class.getName());
    private final Map<Integer, IBypassHandler> _datatable = new HashMap<Integer, IBypassHandler>();

    public static BypassHandler getInstance() {
        return SingletonHolder._instance;
    }

    private BypassHandler() {
        this.registerBypassHandler(new DailyRewardCBBypasses());
        this.registerBypassHandler(new DungeonBypasses());
        // L2 Impure — Vote system
        this.registerBypassHandler(new Vote());
    }

    public void registerBypassHandler(IBypassHandler handler) {
        String[] ids = handler.getBypassHandlersList();
        for (int i = 0; i < ids.length; ++i) {
            if (Config.PACKET_HANDLER_DEBUG) {
                LOGGER.info((Object)("Adding handler for command " + ids[i]));
            }
            this._datatable.put(ids[i].hashCode(), handler);
        }
    }

    public IBypassHandler getBypassHandler(String bypass) {
        String command = bypass;
        if (bypass.indexOf(" ") != -1) {
            command = bypass.substring(0, bypass.indexOf(" "));
        }
        if (Config.PACKET_HANDLER_DEBUG) {
            LOGGER.info((Object)("getting handler for command: " + command + " -> " + (this._datatable.get(command.hashCode()) != null)));
        }
        return this._datatable.get(command.hashCode());
    }

    public int size() {
        return this._datatable.size();
    }

    private static class SingletonHolder {
        protected static final BypassHandler _instance = new BypassHandler();
    }
}
