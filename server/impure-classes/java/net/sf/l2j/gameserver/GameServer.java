/*
 * Decompiled with CFR 0.152 a partir do l2jserver.jar de produção (2026-07-11).
 * MODIFICAÇÃO L2IMPURE (única): seção "GM Command Queue" inicializa o
 * GmCommandPoller no boot — ver net/sf/l2j/gameserver/gm/GmCommandPoller.java.
 * Recompilado e reinjetado via build-gmqueue.sh (mesmo pipeline do vote system).
 */
package net.sf.l2j.gameserver;

import enginemods.main.EngineModsManager;
import java.io.File;
import java.io.FileInputStream;
import java.net.InetAddress;
import java.util.logging.LogManager;
import mods.achievement.AchievementsManager;
import mods.combineItem.CombineItem;
import mods.dressme.DressMeData;
import mods.dungeon.DungeonManager;
import mods.instance.InstanceManager;
import mods.pvpZone.RandomZoneManager;
import mods.teleportInterface.TeleportLocationDataGK;
import net.sf.l2j.Config;
import net.sf.l2j.commons.lang.StringUtil;
import net.sf.l2j.commons.logging.CLogger;
import net.sf.l2j.commons.mmocore.SelectorConfig;
import net.sf.l2j.commons.mmocore.SelectorThread;
import net.sf.l2j.commons.pool.ConnectionPool;
import net.sf.l2j.commons.pool.ThreadPool;
import net.sf.l2j.commons.util.SysUtil;
import net.sf.l2j.gameserver.LoginServerThread;
import net.sf.l2j.gameserver.PcBang;
import net.sf.l2j.gameserver.Shutdown;
import net.sf.l2j.gameserver.communitybbs.Manager.ForumsBBSManager;
import net.sf.l2j.gameserver.data.AgathionData;
import net.sf.l2j.gameserver.data.CombineDataXML;
import net.sf.l2j.gameserver.data.DollsData;
import net.sf.l2j.gameserver.data.EnchantTable;
import net.sf.l2j.gameserver.data.ItemTable;
import net.sf.l2j.gameserver.data.SkillTable;
import net.sf.l2j.gameserver.data.cache.CrestCache;
import net.sf.l2j.gameserver.data.cache.HtmCache;
import net.sf.l2j.gameserver.data.manager.BoatManager;
import net.sf.l2j.gameserver.data.manager.BufferManager;
import net.sf.l2j.gameserver.data.manager.BuyListManager;
import net.sf.l2j.gameserver.data.manager.CastleManager;
import net.sf.l2j.gameserver.data.manager.CastleManorManager;
import net.sf.l2j.gameserver.data.manager.ClanHallManager;
import net.sf.l2j.gameserver.data.manager.ClassBalanceManager;
import net.sf.l2j.gameserver.data.manager.CoupleManager;
import net.sf.l2j.gameserver.data.manager.CursedWeaponManager;
import net.sf.l2j.gameserver.data.manager.DailyLoginRewardManager;
import net.sf.l2j.gameserver.data.manager.DailyRewardManager;
import net.sf.l2j.gameserver.data.manager.DayNightManager;
import net.sf.l2j.gameserver.data.manager.DerbyTrackManager;
import net.sf.l2j.gameserver.data.manager.DimensionalRiftManager;
import net.sf.l2j.gameserver.data.manager.FestivalOfDarknessManager;
import net.sf.l2j.gameserver.data.manager.FishingChampionshipManager;
import net.sf.l2j.gameserver.data.manager.FourSepulchersManager;
import net.sf.l2j.gameserver.data.manager.GrandBossManager;
import net.sf.l2j.gameserver.data.manager.HeroManager;
import net.sf.l2j.gameserver.data.manager.LotteryManager;
import net.sf.l2j.gameserver.data.manager.MovieMakerManager;
import net.sf.l2j.gameserver.data.manager.PetitionManager;
import net.sf.l2j.gameserver.data.manager.RaidBossInfoManager;
import net.sf.l2j.gameserver.data.manager.RaidBossManager;
import net.sf.l2j.gameserver.data.manager.RaidPointManager;
import net.sf.l2j.gameserver.data.manager.SevenSignsManager;
import net.sf.l2j.gameserver.data.manager.SkillBalanceManager;
import net.sf.l2j.gameserver.data.manager.ZoneManager;
import net.sf.l2j.gameserver.data.sql.AutoSpawnTable;
import net.sf.l2j.gameserver.data.sql.BookmarkTable;
import net.sf.l2j.gameserver.data.sql.ClanTable;
import net.sf.l2j.gameserver.data.sql.PlayerInfoTable;
import net.sf.l2j.gameserver.data.sql.ServerMemoTable;
import net.sf.l2j.gameserver.data.sql.SpawnTable;
import net.sf.l2j.gameserver.data.xml.AdminData;
import net.sf.l2j.gameserver.data.xml.AnnouncementData;
import net.sf.l2j.gameserver.data.xml.ArmorSetData;
import net.sf.l2j.gameserver.data.xml.AugmentationData;
import net.sf.l2j.gameserver.data.xml.DoorData;
import net.sf.l2j.gameserver.data.xml.FakePcsTable;
import net.sf.l2j.gameserver.data.xml.FishData;
import net.sf.l2j.gameserver.data.xml.HennaData;
import net.sf.l2j.gameserver.data.xml.HerbDropData;
import net.sf.l2j.gameserver.data.xml.IconsTable;
import net.sf.l2j.gameserver.data.xml.MapRegionData;
import net.sf.l2j.gameserver.data.xml.MultisellData;
import net.sf.l2j.gameserver.data.xml.NewbieBuffData;
import net.sf.l2j.gameserver.data.xml.NpcData;
import net.sf.l2j.gameserver.data.xml.PlayerData;
import net.sf.l2j.gameserver.data.xml.RecipeData;
import net.sf.l2j.gameserver.data.xml.ScriptData;
import net.sf.l2j.gameserver.data.xml.SkillTreeData;
import net.sf.l2j.gameserver.data.xml.SoulCrystalData;
import net.sf.l2j.gameserver.data.xml.SpellbookData;
import net.sf.l2j.gameserver.data.xml.StaticObjectData;
import net.sf.l2j.gameserver.data.xml.SummonItemData;
import net.sf.l2j.gameserver.data.xml.TeleportLocationData;
import net.sf.l2j.gameserver.data.xml.WalkerRouteData;
import net.sf.l2j.gameserver.events.bossevent.BossEvent;
import net.sf.l2j.gameserver.events.eventengine.manager.CtfEventManager;
import net.sf.l2j.gameserver.events.eventengine.manager.DmEventManager;
import net.sf.l2j.gameserver.events.eventengine.manager.TvTEventManager;
import net.sf.l2j.gameserver.events.partyfarm.InitialPartyFarm;
import net.sf.l2j.gameserver.events.partyfarm.PartyFarm;
import net.sf.l2j.gameserver.events.pvpevent.PvPEventManager;
import net.sf.l2j.gameserver.events.soloboss.SoloBossData;
import net.sf.l2j.gameserver.events.soloboss.SoloBossManager;
import net.sf.l2j.gameserver.events.tournament.ArenaEvent;
import net.sf.l2j.gameserver.events.tournament.ArenaTask;
import net.sf.l2j.gameserver.events.tournament.arenas.Arena2x2;
import net.sf.l2j.gameserver.events.tournament.arenas.Arena4x4;
import net.sf.l2j.gameserver.events.tournament.arenas.Arena9x9;
import net.sf.l2j.gameserver.geoengine.GeoEngine;
import net.sf.l2j.gameserver.handler.AdminCommandHandler;
import net.sf.l2j.gameserver.handler.BypassHandler;
import net.sf.l2j.gameserver.handler.ChatHandler;
import net.sf.l2j.gameserver.handler.ItemHandler;
import net.sf.l2j.gameserver.handler.SkillHandler;
import net.sf.l2j.gameserver.handler.UserCommandHandler;
import net.sf.l2j.gameserver.handler.VoicedCommandHandler;
import net.sf.l2j.gameserver.hwid.Hwid;
import net.sf.l2j.gameserver.idfactory.IdFactory;
import net.sf.l2j.gameserver.model.World;
import net.sf.l2j.gameserver.model.boat.BoatGiranTalking;
import net.sf.l2j.gameserver.model.boat.BoatGludinRune;
import net.sf.l2j.gameserver.model.boat.BoatInnadrilTour;
import net.sf.l2j.gameserver.model.boat.BoatRunePrimeval;
import net.sf.l2j.gameserver.model.boat.BoatTalkingGludin;
import net.sf.l2j.gameserver.model.olympiad.Olympiad;
import net.sf.l2j.gameserver.model.olympiad.OlympiadGameManager;
import net.sf.l2j.gameserver.model.partymatching.PartyMatchRoomList;
import net.sf.l2j.gameserver.model.partymatching.PartyMatchWaitingList;
import net.sf.l2j.gameserver.network.GameClient;
import net.sf.l2j.gameserver.network.L2GamePacketHandler;
import net.sf.l2j.gameserver.taskmanager.AttackStanceTaskManager;
import net.sf.l2j.gameserver.taskmanager.DecayTaskManager;
import net.sf.l2j.gameserver.taskmanager.GameTimeTaskManager;
import net.sf.l2j.gameserver.taskmanager.ItemsOnGroundTaskManager;
import net.sf.l2j.gameserver.taskmanager.MovementTaskManager;
import net.sf.l2j.gameserver.taskmanager.PvpFlagTaskManager;
import net.sf.l2j.gameserver.taskmanager.RandomAnimationTaskManager;
import net.sf.l2j.gameserver.taskmanager.ShadowItemTaskManager;
import net.sf.l2j.gameserver.taskmanager.StatusRealTimeTaskManager;
import net.sf.l2j.gameserver.taskmanager.WaterTaskManager;
import net.sf.l2j.util.DeadLockDetector;
import net.sf.l2j.util.IPv4Filter;

public class GameServer {
    private static final CLogger LOGGER = new CLogger(GameServer.class.getName());
    private final SelectorThread<GameClient> _selectorThread;
    private static GameServer _gameServer;

    public static void main(String[] args) throws Exception {
        _gameServer = new GameServer();
    }

    public GameServer() throws Exception {
        new File("./log").mkdir();
        new File("./log/chat").mkdir();
        new File("./log/console").mkdir();
        new File("./log/error").mkdir();
        new File("./log/gmaudit").mkdir();
        new File("./log/item").mkdir();
        new File("./data/crests").mkdirs();
        try (FileInputStream is = new FileInputStream(new File("config/logging.properties"));){
            LogManager.getLogManager().readConfiguration(is);
        }
        StringUtil.printSection("aCis");
        Config.loadGameServer();
        StringUtil.printSection("Poolers");
        ConnectionPool.init();
        ThreadPool.init();
        StringUtil.printSection("IdFactory");
        IdFactory.getInstance();
        StringUtil.printSection("Gk Interface");
        TeleportLocationDataGK.getInstance();
        StringUtil.printSection("EngineMods");
        EngineModsManager.init();
        StringUtil.printSection("World");
        World.getInstance();
        MapRegionData.getInstance();
        AnnouncementData.getInstance();
        ServerMemoTable.getInstance();
        StringUtil.printSection("Icons");
        IconsTable.getInstance();
        if (Config.ALLOW_DRESS_ME_SYSTEM) {
            StringUtil.printSection("Dress Me / Skins");
            DressMeData.getInstance();
        }
        StringUtil.printSection("Skills");
        SkillTable.getInstance();
        SkillTreeData.getInstance();
        StringUtil.printSection("Items");
        ItemTable.getInstance();
        SummonItemData.getInstance();
        HennaData.getInstance();
        BuyListManager.getInstance();
        MultisellData.getInstance();
        RecipeData.getInstance();
        ArmorSetData.getInstance();
        FishData.getInstance();
        SpellbookData.getInstance();
        SoulCrystalData.getInstance();
        AugmentationData.getInstance();
        CursedWeaponManager.getInstance();
        StringUtil.printSection("Enchants");
        EnchantTable.getInstance();
        StringUtil.printSection("Admins");
        AdminData.getInstance();
        BookmarkTable.getInstance();
        MovieMakerManager.getInstance();
        PetitionManager.getInstance();
        StringUtil.printSection("Fake Pc's");
        FakePcsTable.getInstance();
        StringUtil.printSection("Agathions");
        AgathionData.getInstance();
        StringUtil.printSection("Characters");
        PlayerData.getInstance();
        PlayerInfoTable.getInstance();
        NewbieBuffData.getInstance();
        TeleportLocationData.getInstance();
        HtmCache.getInstance();
        PartyMatchWaitingList.getInstance();
        PartyMatchRoomList.getInstance();
        RaidPointManager.getInstance();
        StringUtil.printSection("Community server");
        if (Config.ENABLE_COMMUNITY_BOARD) {
            ForumsBBSManager.getInstance().initRoot();
        } else {
            LOGGER.info("Community server is disabled.");
        }
        StringUtil.printSection("Clans");
        CrestCache.getInstance();
        ClanTable.getInstance();
        StringUtil.printSection("Geodata & Pathfinding");
        GeoEngine.getInstance();
        StringUtil.printSection("Zones");
        ZoneManager.getInstance();
        StringUtil.printSection("Auto Pvp Zones");
        if (Config.ENABLE_AUTO_PVP_ZONE) {
            LOGGER.info("Auto Pvp Zones - Random Zone is active.");
            RandomZoneManager.getInstance();
        } else {
            LOGGER.info("Auto Pvp Zones - Random Zone is disabled.");
        }
        StringUtil.printSection("Castles & Clan Halls");
        CastleManager.getInstance();
        ClanHallManager.getInstance();
        StringUtil.printSection("Task Managers");
        AttackStanceTaskManager.getInstance();
        DecayTaskManager.getInstance();
        GameTimeTaskManager.getInstance();
        ItemsOnGroundTaskManager.getInstance();
        MovementTaskManager.getInstance();
        PvpFlagTaskManager.getInstance();
        RandomAnimationTaskManager.getInstance();
        ShadowItemTaskManager.getInstance();
        StatusRealTimeTaskManager.getInstance();
        WaterTaskManager.getInstance();
        StringUtil.printSection("Auto Spawns");
        AutoSpawnTable.getInstance();
        StringUtil.printSection("Seven Signs");
        SevenSignsManager.getInstance().spawnSevenSignsNPC();
        FestivalOfDarknessManager.getInstance();
        StringUtil.printSection("Manor Manager");
        CastleManorManager.getInstance();
        StringUtil.printSection("NPCs");
        RaidBossInfoManager.getInstance();
        BufferManager.getInstance();
        HerbDropData.getInstance();
        NpcData.getInstance();
        WalkerRouteData.getInstance();
        DoorData.getInstance().spawn();
        StaticObjectData.getInstance();
        SpawnTable.getInstance();
        RaidBossManager.getInstance();
        GrandBossManager.getInstance();
        DayNightManager.getInstance().notifyChangeMode();
        DimensionalRiftManager.getInstance();
        StringUtil.printSection("Olympiads & Heroes");
        OlympiadGameManager.getInstance();
        Olympiad.getInstance();
        HeroManager.getInstance();
        StringUtil.printSection("Four Sepulchers");
        FourSepulchersManager.getInstance();
        StringUtil.printSection("Quests & Scripts");
        ScriptData.getInstance();
        if (Config.ALLOW_BOAT) {
            BoatManager.getInstance();
            BoatGiranTalking.load();
            BoatGludinRune.load();
            BoatInnadrilTour.load();
            BoatRunePrimeval.load();
            BoatTalkingGludin.load();
        }
        StringUtil.printSection("Events");
        DerbyTrackManager.getInstance();
        LotteryManager.getInstance();
        StringUtil.printSection("Daily Rewards");
        DailyLoginRewardManager.getInstance();
        DailyRewardManager.getInstance().cleanOldDatesDataBase();
        DailyRewardManager.getInstance();
        StringUtil.printSection("PcBang Event");
        if (Config.PCB_ENABLE) {
            LOGGER.info("PcBang Enabled");
            ThreadPool.scheduleAtFixedRate(PcBang.getInstance(), Config.PCB_INTERVAL * 1000, Config.PCB_INTERVAL * 1000);
        } else {
            LOGGER.info("PcBang is disabled.");
        }
        StringUtil.printSection("Event Engine TvT - CTF - DM");
        CtfEventManager.getInstance();
        TvTEventManager.getInstance();
        DmEventManager.getInstance();
        StringUtil.printSection("Solo Boss Event");
        SoloBossData.getInstance();
        if (Config.SOLOBOSS_EVENT_ENABLE) {
            SoloBossManager.getInstance().scheduleEvents();
        }
        StringUtil.printSection("PvP Event");
        if (Config.PVP_EVENT_ENABLED) {
            LOGGER.info("PvP Event: is Started.");
            PvPEventManager.getInstance();
        } else {
            LOGGER.info("PvP Event: is disabled.");
        }
        StringUtil.printSection("Kill The Boss Event");
        BossEvent.getInstance();
        StringUtil.printSection("Tournament 2x2 4x4 9x9");
        ThreadPool.schedule(Arena2x2.getInstance(), 5000L);
        ThreadPool.schedule(Arena9x9.getInstance(), 5000L);
        ThreadPool.schedule(Arena4x4.getInstance(), 5000L);
        if (Config.TOURNAMENT_EVENT_TIME) {
            LOGGER.info("Tournament Event is enabled.");
            ArenaEvent.getInstance().StartCalculationOfNextEventTime();
        } else if (Config.TOURNAMENT_EVENT_START) {
            LOGGER.info("Tournament Event is enabled.");
            ArenaTask.spawnNpc1();
        } else {
            LOGGER.info("Tournament Event is disabled");
        }
        StringUtil.printSection("Party Farm Event");
        LOGGER.info("Evento Party Farm");
        if (Config.PARTY_FARM_BY_TIME_OF_DAY && !Config.START_PARTY) {
            InitialPartyFarm.getInstance().StartCalculationOfNextEventTime();
            LOGGER.info("[Party Farm Time]: Enabled");
        } else if (Config.START_PARTY && !Config.PARTY_FARM_BY_TIME_OF_DAY) {
            LOGGER.info("[Start Spawn Party Farm]: Enabled");
            ThreadPool.schedule(new SpawnMonsters(this), Config.NPC_SERVER_DELAY * 1000L);
        }
        StringUtil.printSection("Achievements");
        AchievementsManager.getInstance();
        InstanceManager.getInstance();
        StringUtil.printSection("Dungeon Manager");
        DungeonManager.getInstance();
        if (Config.ALLOW_WEDDING) {
            CoupleManager.getInstance();
        }
        if (Config.ALT_FISH_CHAMPIONSHIP_ENABLED) {
            FishingChampionshipManager.getInstance();
        }
        StringUtil.printSection("Hwid Manager");
        Hwid.Init();
        StringUtil.printSection("Combine Item Data");
        CombineDataXML.getInstance();
        CombineItem.getInstance();
        StringUtil.printSection("Handlers");
        LOGGER.info((Object)"Loaded {} admin command handlers.", AdminCommandHandler.getInstance().size());
        LOGGER.info((Object)"Loaded {} bypass command handlers.", BypassHandler.getInstance().size());
        LOGGER.info((Object)"Loaded {} chat handlers.", ChatHandler.getInstance().size());
        LOGGER.info((Object)"Loaded {} item handlers.", ItemHandler.getInstance().size());
        LOGGER.info((Object)"Loaded {} skill handlers.", SkillHandler.getInstance().size());
        LOGGER.info((Object)"Loaded {} user command handlers.", UserCommandHandler.getInstance().size());
        LOGGER.info((Object)"Loaded {} voiced command handlers.", VoicedCommandHandler.getInstance().size());
        StringUtil.printSection("Balancer");
        ClassBalanceManager.getInstance();
        SkillBalanceManager.getInstance();
        StringUtil.printSection("Dolls Data");
        DollsData.getInstance();
        StringUtil.printSection("GM Command Queue");
        net.sf.l2j.gameserver.gm.GmCommandPoller.getInstance();
        StringUtil.printSection("System");
        Runtime.getRuntime().addShutdownHook(Shutdown.getInstance());
        ForumsBBSManager.getInstance();
        if (Config.DEADLOCK_DETECTOR) {
            LOGGER.info((Object)"Deadlock detector is enabled. Timer: {}s.", Config.DEADLOCK_CHECK_INTERVAL);
            DeadLockDetector deadDetectThread = new DeadLockDetector();
            deadDetectThread.setDaemon(true);
            deadDetectThread.start();
        } else {
            LOGGER.info("Deadlock detector is disabled.");
        }
        System.gc();
        LOGGER.info((Object)"Gameserver has started, used memory: {} / {} Mo.", SysUtil.getUsedMemory(), SysUtil.getMaxMemory());
        LOGGER.info((Object)"Maximum allowed players: {}.", Config.MAXIMUM_ONLINE_USERS);
        StringUtil.printSection("Login");
        LoginServerThread.getInstance().start();
        SelectorConfig sc = new SelectorConfig();
        sc.MAX_READ_PER_PASS = Config.MMO_MAX_READ_PER_PASS;
        sc.MAX_SEND_PER_PASS = Config.MMO_MAX_SEND_PER_PASS;
        sc.SLEEP_TIME = Config.MMO_SELECTOR_SLEEP_TIME;
        sc.HELPER_BUFFER_COUNT = Config.MMO_HELPER_BUFFER_COUNT;
        L2GamePacketHandler handler = new L2GamePacketHandler();
        this._selectorThread = new SelectorThread<GameClient>(sc, handler, handler, handler, new IPv4Filter());
        InetAddress bindAddress = null;
        if (!Config.GAMESERVER_HOSTNAME.equals("*")) {
            try {
                bindAddress = InetAddress.getByName(Config.GAMESERVER_HOSTNAME);
            }
            catch (Exception e) {
                LOGGER.error((Object)"The GameServer bind address is invalid, using all available IPs.", e);
            }
        }
        try {
            this._selectorThread.openServerSocket(bindAddress, Config.PORT_GAME);
        }
        catch (Exception e) {
            LOGGER.error((Object)"Failed to open server socket.", e);
            System.exit(1);
        }
        this._selectorThread.start();
    }

    public static GameServer getInstance() {
        return _gameServer;
    }

    public SelectorThread<GameClient> getSelectorThread() {
        return this._selectorThread;
    }

    public class SpawnMonsters
    implements Runnable {
        public SpawnMonsters(GameServer this$0) {
        }

        @Override
        public void run() {
            PartyFarm._aborted = false;
            PartyFarm._started = true;
            PartyFarm.spawnMonsters();
        }
    }
}

