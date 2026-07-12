/*
 * Decompiled with CFR 0.152 a partir do l2jserver.jar de produção (2026-07-12)
 * e patcheado — L2 Impure Fase Admin 6:
 *
 *   SevenSignsAlwaysActive (events.properties, default False):
 *     - true  = o ciclo congela no período COMPETITION (Quest Event) —
 *               coleta de seal stones + Festival of Darkness rodando SEMPRE.
 *               Se o server estiver em outro período, avança em fast-forward
 *               (15 min por período) até chegar em COMPETITION.
 *     - false = calendário semanal normal do aCis (comportamento original).
 *
 *   Fix de decompilação: restoreSevenSignsData() usava `ps` fora do escopo
 *   do try-with-resources (artefato do CFR) — reescrito com recursos próprios.
 *
 * Pipeline: scp → build-fase6.sh (backup do jar + javac 21 + jar uf).
 */
package net.sf.l2j.gameserver.data.manager;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import net.sf.l2j.Config;
import net.sf.l2j.commons.logging.CLogger;
import net.sf.l2j.commons.pool.ConnectionPool;
import net.sf.l2j.commons.pool.ThreadPool;
import net.sf.l2j.commons.util.StatsSet;
import net.sf.l2j.gameserver.data.SkillTable;
import net.sf.l2j.gameserver.data.manager.CastleManager;
import net.sf.l2j.gameserver.data.manager.FestivalOfDarknessManager;
import net.sf.l2j.gameserver.data.sql.AutoSpawnTable;
import net.sf.l2j.gameserver.data.xml.MapRegionData;
import net.sf.l2j.gameserver.enums.CabalType;
import net.sf.l2j.gameserver.enums.PeriodType;
import net.sf.l2j.gameserver.enums.SealType;
import net.sf.l2j.gameserver.model.World;
import net.sf.l2j.gameserver.model.actor.Player;
import net.sf.l2j.gameserver.model.spawn.AutoSpawn;
import net.sf.l2j.gameserver.network.SystemMessageId;
import net.sf.l2j.gameserver.network.serverpackets.SSQInfo;
import net.sf.l2j.gameserver.network.serverpackets.SystemMessage;

public class SevenSignsManager {
    private static final CLogger LOGGER = new CLogger(SevenSignsManager.class.getName());
    private static final String LOAD_DATA = "SELECT char_obj_id, cabal, seal, red_stones, green_stones, blue_stones, ancient_adena_amount, contribution_score FROM seven_signs";
    private static final String LOAD_STATUS = "SELECT * FROM seven_signs_status WHERE id=0";
    private static final String INSERT_PLAYER = "INSERT INTO seven_signs (char_obj_id, cabal, seal) VALUES (?,?,?)";
    private static final String UPDATE_PLAYER = "UPDATE seven_signs SET cabal=?, seal=?, red_stones=?, green_stones=?, blue_stones=?, ancient_adena_amount=?, contribution_score=? WHERE char_obj_id=?";
    private static final String UPDATE_STATUS = "UPDATE seven_signs_status SET current_cycle=?, active_period=?, previous_winner=?, dawn_stone_score=?, dawn_festival_score=?, dusk_stone_score=?, dusk_festival_score=?, avarice_owner=?, gnosis_owner=?, strife_owner=?, avarice_dawn_score=?, gnosis_dawn_score=?, strife_dawn_score=?, avarice_dusk_score=?, gnosis_dusk_score=?, strife_dusk_score=?, festival_cycle=?, accumulated_bonus0=?, accumulated_bonus1=?, accumulated_bonus2=?,accumulated_bonus3=?, accumulated_bonus4=?, date=? WHERE id=0";
    public static final String SEVEN_SIGNS_DATA_FILE = "config/signs.properties";
    public static final String SEVEN_SIGNS_HTML_PATH = "data/html/seven_signs/";
    public static final int PERIOD_START_HOUR = 18;
    public static final int PERIOD_START_MINS = 0;
    public static final int PERIOD_START_DAY = 2;
    public static final int PERIOD_MINOR_LENGTH = 900000;
    public static final int PERIOD_MAJOR_LENGTH = 603900000;
    public static final int RECORD_SEVEN_SIGNS_ID = 5707;
    public static final int CERTIFICATE_OF_APPROVAL_ID = 6388;
    public static final int RECORD_SEVEN_SIGNS_COST = 500;
    public static final int ADENA_JOIN_DAWN_COST = 50000;
    public static final int ORATOR_NPC_ID = 31094;
    public static final int PREACHER_NPC_ID = 31093;
    public static final int MAMMON_MERCHANT_ID = 31113;
    public static final int MAMMON_BLACKSMITH_ID = 31126;
    public static final int MAMMON_MARKETEER_ID = 31092;
    public static final int LILITH_NPC_ID = 25283;
    public static final int ANAKIM_NPC_ID = 25286;
    public static final int CREST_OF_DAWN_ID = 31170;
    public static final int CREST_OF_DUSK_ID = 31171;
    public static final int SEAL_STONE_BLUE_ID = 6360;
    public static final int SEAL_STONE_GREEN_ID = 6361;
    public static final int SEAL_STONE_RED_ID = 6362;
    public static final int SEAL_STONE_BLUE_VALUE = 3;
    public static final int SEAL_STONE_GREEN_VALUE = 5;
    public static final int SEAL_STONE_RED_VALUE = 10;
    private final Calendar _nextPeriodChange = Calendar.getInstance();
    private Calendar _lastSave = Calendar.getInstance();
    protected PeriodType _activePeriod;
    protected int _currentCycle;
    protected double _dawnStoneScore;
    protected double _duskStoneScore;
    protected int _dawnFestivalScore;
    protected int _duskFestivalScore;
    protected CabalType _previousWinner;
    private final Map<Integer, StatsSet> _playersData = new HashMap<Integer, StatsSet>();
    private final Map<SealType, CabalType> _sealOwners = new HashMap<SealType, CabalType>();
    private final Map<SealType, Integer> _duskScores = new HashMap<SealType, Integer>();
    private final Map<SealType, Integer> _dawnScores = new HashMap<SealType, Integer>();
    private static AutoSpawn _merchantSpawn;
    private static AutoSpawn _blacksmithSpawn;
    private static AutoSpawn _lilithSpawn;
    private static AutoSpawn _anakimSpawn;
    private static Map<Integer, AutoSpawn> _crestofdawnspawns;
    private static Map<Integer, AutoSpawn> _crestofduskspawns;
    private static Map<Integer, AutoSpawn> _oratorSpawns;
    private static Map<Integer, AutoSpawn> _preacherSpawns;
    private static Map<Integer, AutoSpawn> _marketeerSpawns;

    /** L2 Impure: SevenSignsAlwaysActive de events.properties (Fase Admin 6). */
    protected static final boolean ALWAYS_ACTIVE = loadAlwaysActive();

    private static boolean loadAlwaysActive() {
        try {
            net.sf.l2j.commons.config.ExProperties p = new net.sf.l2j.commons.config.ExProperties();
            p.load("./config/events.properties");
            return p.getProperty("SevenSignsAlwaysActive", false);
        } catch (Exception e) {
            return false;
        }
    }

    protected SevenSignsManager() {
        this.restoreSevenSignsData();
        LOGGER.info((Object)"Currently on {} period.", this._activePeriod.getName());
        this.initializeSeals();
        CabalType winningCabal = this.getCabalHighestScore();
        if (this.isSealValidationPeriod()) {
            if (winningCabal == CabalType.NORMAL) {
                LOGGER.info("The Seven Signs competition ended with a tie last week.");
            } else {
                LOGGER.info((Object)"{} were victorious on Seven Signs competition last week.", winningCabal.getFullName());
            }
        } else if (winningCabal == CabalType.NORMAL) {
            LOGGER.info("The Seven Signs competition will end in a tie this week.");
        } else {
            LOGGER.info((Object)"{} are leading on Seven Signs competition this week.", winningCabal.getFullName());
        }
        long milliToChange = 0L;
        if (this.isNextPeriodChangeInPast()) {
            LOGGER.info("Next Seven Signs period is already computed.");
        } else {
            this.setCalendarForNextPeriodChange();
            milliToChange = this.getMilliToPeriodChange();
        }
        // L2 Impure Fase Admin 6: always-active fast-forward até COMPETITION.
        if (ALWAYS_ACTIVE && this._activePeriod != PeriodType.COMPETITION) {
            milliToChange = Math.min(Math.max(milliToChange, 0L), 900000L);
            LOGGER.info((Object)"SevenSigns always-active: fast-forwarding {} period (change in <= 15 min).", this._activePeriod.getName());
        }
        ThreadPool.schedule(new SevenSignsPeriodChange(), milliToChange);
        double numSecs = milliToChange / 1000L % 60L;
        double countDown = ((double)(milliToChange / 1000L) - numSecs) / 60.0;
        int numMins = (int)Math.floor(countDown % 60.0);
        countDown = (countDown - (double)numMins) / 60.0;
        int numHours = (int)Math.floor(countDown % 24.0);
        int numDays = (int)Math.floor((countDown - (double)numHours) / 24.0);
        LOGGER.info((Object)"Next Seven Signs period begins in {} days, {} hours and {} mins.", numDays, numHours, numMins);
    }

    private boolean isNextPeriodChangeInPast() {
        Calendar lastPeriodChange = Calendar.getInstance();
        switch (this._activePeriod) {
            case SEAL_VALIDATION: 
            case COMPETITION: {
                lastPeriodChange.set(7, 2);
                lastPeriodChange.set(11, 18);
                lastPeriodChange.set(12, 0);
                lastPeriodChange.set(13, 0);
                if (!Calendar.getInstance().before(lastPeriodChange)) break;
                lastPeriodChange.add(10, -168);
                break;
            }
            case RECRUITING: 
            case RESULTS: {
                lastPeriodChange.setTimeInMillis(this._lastSave.getTimeInMillis() + 900000L);
            }
        }
        return this._lastSave.getTimeInMillis() > 7L && this._lastSave.before(lastPeriodChange);
    }

    public void spawnSevenSignsNPC() {
        block30: {
            block28: {
                block29: {
                    CabalType avariceSealOwner;
                    _merchantSpawn = AutoSpawnTable.getInstance().getAutoSpawnInstance(31113, false);
                    _blacksmithSpawn = AutoSpawnTable.getInstance().getAutoSpawnInstance(31126, false);
                    _marketeerSpawns = AutoSpawnTable.getInstance().getAutoSpawnInstances(31092);
                    _lilithSpawn = AutoSpawnTable.getInstance().getAutoSpawnInstance(25283, false);
                    _anakimSpawn = AutoSpawnTable.getInstance().getAutoSpawnInstance(25286, false);
                    _crestofdawnspawns = AutoSpawnTable.getInstance().getAutoSpawnInstances(31170);
                    _crestofduskspawns = AutoSpawnTable.getInstance().getAutoSpawnInstances(31171);
                    _oratorSpawns = AutoSpawnTable.getInstance().getAutoSpawnInstances(31094);
                    _preacherSpawns = AutoSpawnTable.getInstance().getAutoSpawnInstances(31093);
                    if (!this.isSealValidationPeriod() && !this.isCompResultsPeriod()) break block28;
                    for (AutoSpawn spawnInst : _marketeerSpawns.values()) {
                        AutoSpawnTable.getInstance().setSpawnActive(spawnInst, true);
                    }
                    CabalType winningCabal = this.getCabalHighestScore();
                    CabalType gnosisSealOwner = this.getSealOwner(SealType.GNOSIS);
                    if (gnosisSealOwner == winningCabal && gnosisSealOwner != CabalType.NORMAL) {
                        if (!Config.ANNOUNCE_MAMMON_SPAWN) {
                            _blacksmithSpawn.setBroadcast(false);
                        }
                        if (!AutoSpawnTable.getInstance().getAutoSpawnInstance(_blacksmithSpawn.getObjectId(), true).isSpawnActive()) {
                            AutoSpawnTable.getInstance().setSpawnActive(_blacksmithSpawn, true);
                        }
                        for (AutoSpawn spawnInst : _oratorSpawns.values()) {
                            if (AutoSpawnTable.getInstance().getAutoSpawnInstance(spawnInst.getObjectId(), true).isSpawnActive()) continue;
                            AutoSpawnTable.getInstance().setSpawnActive(spawnInst, true);
                        }
                        for (AutoSpawn spawnInst : _preacherSpawns.values()) {
                            if (AutoSpawnTable.getInstance().getAutoSpawnInstance(spawnInst.getObjectId(), true).isSpawnActive()) continue;
                            AutoSpawnTable.getInstance().setSpawnActive(spawnInst, true);
                        }
                    } else {
                        AutoSpawnTable.getInstance().setSpawnActive(_blacksmithSpawn, false);
                        for (AutoSpawn spawnInst : _oratorSpawns.values()) {
                            AutoSpawnTable.getInstance().setSpawnActive(spawnInst, false);
                        }
                        for (AutoSpawn spawnInst : _preacherSpawns.values()) {
                            AutoSpawnTable.getInstance().setSpawnActive(spawnInst, false);
                        }
                    }
                    if ((avariceSealOwner = this.getSealOwner(SealType.AVARICE)) != winningCabal || avariceSealOwner == CabalType.NORMAL) break block29;
                    if (!Config.ANNOUNCE_MAMMON_SPAWN) {
                        _merchantSpawn.setBroadcast(false);
                    }
                    if (!AutoSpawnTable.getInstance().getAutoSpawnInstance(_merchantSpawn.getObjectId(), true).isSpawnActive()) {
                        AutoSpawnTable.getInstance().setSpawnActive(_merchantSpawn, true);
                    }
                    switch (winningCabal) {
                        case DAWN: {
                            if (!AutoSpawnTable.getInstance().getAutoSpawnInstance(_lilithSpawn.getObjectId(), true).isSpawnActive()) {
                                AutoSpawnTable.getInstance().setSpawnActive(_lilithSpawn, true);
                            }
                            AutoSpawnTable.getInstance().setSpawnActive(_anakimSpawn, false);
                            for (AutoSpawn dawnCrest : _crestofdawnspawns.values()) {
                                if (AutoSpawnTable.getInstance().getAutoSpawnInstance(dawnCrest.getObjectId(), true).isSpawnActive()) continue;
                                AutoSpawnTable.getInstance().setSpawnActive(dawnCrest, true);
                            }
                            for (AutoSpawn duskCrest : _crestofduskspawns.values()) {
                                AutoSpawnTable.getInstance().setSpawnActive(duskCrest, false);
                            }
                            break block30;
                        }
                        case DUSK: {
                            if (!AutoSpawnTable.getInstance().getAutoSpawnInstance(_anakimSpawn.getObjectId(), true).isSpawnActive()) {
                                AutoSpawnTable.getInstance().setSpawnActive(_anakimSpawn, true);
                            }
                            AutoSpawnTable.getInstance().setSpawnActive(_lilithSpawn, false);
                            for (AutoSpawn duskCrest : _crestofduskspawns.values()) {
                                if (AutoSpawnTable.getInstance().getAutoSpawnInstance(duskCrest.getObjectId(), true).isSpawnActive()) continue;
                                AutoSpawnTable.getInstance().setSpawnActive(duskCrest, true);
                            }
                            for (AutoSpawn dawnCrest : _crestofdawnspawns.values()) {
                                AutoSpawnTable.getInstance().setSpawnActive(dawnCrest, false);
                            }
                            break;
                        }
                    }
                    break block30;
                }
                AutoSpawnTable.getInstance().setSpawnActive(_merchantSpawn, false);
                AutoSpawnTable.getInstance().setSpawnActive(_lilithSpawn, false);
                AutoSpawnTable.getInstance().setSpawnActive(_anakimSpawn, false);
                for (AutoSpawn dawnCrest : _crestofdawnspawns.values()) {
                    AutoSpawnTable.getInstance().setSpawnActive(dawnCrest, false);
                }
                for (AutoSpawn duskCrest : _crestofduskspawns.values()) {
                    AutoSpawnTable.getInstance().setSpawnActive(duskCrest, false);
                }
                break block30;
            }
            AutoSpawnTable.getInstance().setSpawnActive(_merchantSpawn, false);
            AutoSpawnTable.getInstance().setSpawnActive(_blacksmithSpawn, false);
            AutoSpawnTable.getInstance().setSpawnActive(_lilithSpawn, false);
            AutoSpawnTable.getInstance().setSpawnActive(_anakimSpawn, false);
            for (AutoSpawn dawnCrest : _crestofdawnspawns.values()) {
                AutoSpawnTable.getInstance().setSpawnActive(dawnCrest, false);
            }
            for (AutoSpawn duskCrest : _crestofduskspawns.values()) {
                AutoSpawnTable.getInstance().setSpawnActive(duskCrest, false);
            }
            for (AutoSpawn spawnInst : _oratorSpawns.values()) {
                AutoSpawnTable.getInstance().setSpawnActive(spawnInst, false);
            }
            for (AutoSpawn spawnInst : _preacherSpawns.values()) {
                AutoSpawnTable.getInstance().setSpawnActive(spawnInst, false);
            }
            for (AutoSpawn spawnInst : _marketeerSpawns.values()) {
                AutoSpawnTable.getInstance().setSpawnActive(spawnInst, false);
            }
        }
    }

    public static int calcScore(int blueCount, int greenCount, int redCount) {
        return blueCount * 3 + greenCount * 5 + redCount * 10;
    }

    public final int getCurrentCycle() {
        return this._currentCycle;
    }

    public final PeriodType getCurrentPeriod() {
        return this._activePeriod;
    }

    private final int getDaysToPeriodChange() {
        int numDays = this._nextPeriodChange.get(7) - 2;
        if (numDays < 0) {
            return 0 - numDays;
        }
        return 7 - numDays;
    }

    public final long getMilliToPeriodChange() {
        return this._nextPeriodChange.getTimeInMillis() - System.currentTimeMillis();
    }

    protected void setCalendarForNextPeriodChange() {
        switch (this._activePeriod) {
            case SEAL_VALIDATION: 
            case COMPETITION: {
                int daysToChange = this.getDaysToPeriodChange();
                if (daysToChange == 7) {
                    if (this._nextPeriodChange.get(11) < 18) {
                        daysToChange = 0;
                    } else if (this._nextPeriodChange.get(11) == 18 && this._nextPeriodChange.get(12) < 0) {
                        daysToChange = 0;
                    }
                }
                if (daysToChange > 0) {
                    this._nextPeriodChange.add(5, daysToChange);
                }
                this._nextPeriodChange.set(11, 18);
                this._nextPeriodChange.set(12, 0);
                this._nextPeriodChange.set(13, 0);
                this._nextPeriodChange.set(14, 0);
                break;
            }
            case RECRUITING: 
            case RESULTS: {
                this._nextPeriodChange.add(14, 900000);
            }
        }
        LOGGER.info((Object)"Next Seven Signs period change set to {}.", this._nextPeriodChange.getTime());
    }

    public final boolean isRecruitingPeriod() {
        return this._activePeriod == PeriodType.RECRUITING;
    }

    public final boolean isSealValidationPeriod() {
        return this._activePeriod == PeriodType.SEAL_VALIDATION;
    }

    public final boolean isCompResultsPeriod() {
        return this._activePeriod == PeriodType.RESULTS;
    }

    public final int getCurrentScore(CabalType cabal) {
        double totalStoneScore = this._dawnStoneScore + this._duskStoneScore;
        switch (cabal) {
            case DAWN: {
                return Math.round((float)(this._dawnStoneScore / ((float)totalStoneScore == 0.0f ? 1.0 : totalStoneScore)) * 500.0f) + this._dawnFestivalScore;
            }
            case DUSK: {
                return Math.round((float)(this._duskStoneScore / ((float)totalStoneScore == 0.0f ? 1.0 : totalStoneScore)) * 500.0f) + this._duskFestivalScore;
            }
        }
        return 0;
    }

    public final double getCurrentStoneScore(CabalType cabal) {
        switch (cabal) {
            case DAWN: {
                return this._dawnStoneScore;
            }
            case DUSK: {
                return this._duskStoneScore;
            }
        }
        return 0.0;
    }

    public final int getCurrentFestivalScore(CabalType cabal) {
        switch (cabal) {
            case DAWN: {
                return this._dawnFestivalScore;
            }
            case DUSK: {
                return this._duskFestivalScore;
            }
        }
        return 0;
    }

    public final CabalType getCabalHighestScore() {
        int dawnScore;
        int duskScore = this.getCurrentScore(CabalType.DUSK);
        if (duskScore == (dawnScore = this.getCurrentScore(CabalType.DAWN))) {
            return CabalType.NORMAL;
        }
        if (duskScore > dawnScore) {
            return CabalType.DUSK;
        }
        return CabalType.DAWN;
    }

    public final CabalType getSealOwner(SealType seal) {
        return this._sealOwners.get((Object)seal);
    }

    public final Map<SealType, CabalType> getSealOwners() {
        return this._sealOwners;
    }

    public final int getSealProportion(SealType seal, CabalType cabal) {
        switch (cabal) {
            case DAWN: {
                return this._dawnScores.get((Object)seal);
            }
            case DUSK: {
                return this._duskScores.get((Object)seal);
            }
        }
        return 0;
    }

    public final int getTotalMembers(CabalType cabal) {
        int cabalMembers = 0;
        for (StatsSet set : this._playersData.values()) {
            if (set.getEnum("cabal", CabalType.class) != cabal) continue;
            ++cabalMembers;
        }
        return cabalMembers;
    }

    public int getPlayerStoneContrib(int objectId) {
        StatsSet set = this._playersData.get(objectId);
        if (set == null) {
            return 0;
        }
        return set.getInteger("red_stones") + set.getInteger("green_stones") + set.getInteger("blue_stones");
    }

    public int getPlayerContribScore(int objectId) {
        StatsSet set = this._playersData.get(objectId);
        if (set == null) {
            return 0;
        }
        return set.getInteger("contribution_score");
    }

    public int getPlayerAdenaCollect(int objectId) {
        StatsSet set = this._playersData.get(objectId);
        if (set == null) {
            return 0;
        }
        return set.getInteger("ancient_adena_amount");
    }

    public SealType getPlayerSeal(int objectId) {
        StatsSet set = this._playersData.get(objectId);
        if (set == null) {
            return SealType.NONE;
        }
        return set.getEnum("seal", SealType.class);
    }

    public CabalType getPlayerCabal(int objectId) {
        StatsSet set = this._playersData.get(objectId);
        if (set == null) {
            return CabalType.NORMAL;
        }
        return set.getEnum("cabal", CabalType.class);
    }

    protected void restoreSevenSignsData() {
        // Reescrito (fix de artefato CFR): dois statements com try-with-resources
        // próprios — semântica idêntica ao bytecode original.
        try (Connection con = ConnectionPool.getConnection();){
            try (PreparedStatement ps = con.prepareStatement(LOAD_DATA);
                 ResultSet rs = ps.executeQuery();){
                while (rs.next()) {
                    int objectId = rs.getInt("char_obj_id");
                    StatsSet set = new StatsSet();
                    set.set("char_obj_id", objectId);
                    set.set("cabal", Enum.valueOf(CabalType.class, rs.getString("cabal")));
                    set.set("seal", Enum.valueOf(SealType.class, rs.getString("seal")));
                    set.set("red_stones", rs.getInt("red_stones"));
                    set.set("green_stones", rs.getInt("green_stones"));
                    set.set("blue_stones", rs.getInt("blue_stones"));
                    set.set("ancient_adena_amount", rs.getDouble("ancient_adena_amount"));
                    set.set("contribution_score", rs.getDouble("contribution_score"));
                    this._playersData.put(objectId, set);
                }
            }
            try (PreparedStatement ps = con.prepareStatement(LOAD_STATUS);
                 ResultSet rs = ps.executeQuery();){
                while (rs.next()) {
                    this._currentCycle = rs.getInt("current_cycle");
                    this._activePeriod = Enum.valueOf(PeriodType.class, rs.getString("active_period"));
                    this._previousWinner = Enum.valueOf(CabalType.class, rs.getString("previous_winner"));
                    this._dawnStoneScore = rs.getDouble("dawn_stone_score");
                    this._dawnFestivalScore = rs.getInt("dawn_festival_score");
                    this._duskStoneScore = rs.getDouble("dusk_stone_score");
                    this._duskFestivalScore = rs.getInt("dusk_festival_score");
                    this._sealOwners.put(SealType.AVARICE, Enum.valueOf(CabalType.class, rs.getString("avarice_owner")));
                    this._sealOwners.put(SealType.GNOSIS, Enum.valueOf(CabalType.class, rs.getString("gnosis_owner")));
                    this._sealOwners.put(SealType.STRIFE, Enum.valueOf(CabalType.class, rs.getString("strife_owner")));
                    this._dawnScores.put(SealType.AVARICE, rs.getInt("avarice_dawn_score"));
                    this._dawnScores.put(SealType.GNOSIS, rs.getInt("gnosis_dawn_score"));
                    this._dawnScores.put(SealType.STRIFE, rs.getInt("strife_dawn_score"));
                    this._duskScores.put(SealType.AVARICE, rs.getInt("avarice_dusk_score"));
                    this._duskScores.put(SealType.GNOSIS, rs.getInt("gnosis_dusk_score"));
                    this._duskScores.put(SealType.STRIFE, rs.getInt("strife_dusk_score"));
                    this._lastSave.setTimeInMillis(rs.getLong("date"));
                }
            }
        }
        catch (Exception e) {
            LOGGER.error((Object)"Couldn't load Seven Signs data.", e);
        }
    }

    public void saveSevenSignsData() {
        try (Connection con = ConnectionPool.getConnection();
             PreparedStatement ps = con.prepareStatement(UPDATE_PLAYER);){
            for (StatsSet set : this._playersData.values()) {
                ps.setString(1, set.getString("cabal"));
                ps.setString(2, set.getString("seal"));
                ps.setInt(3, set.getInteger("red_stones"));
                ps.setInt(4, set.getInteger("green_stones"));
                ps.setInt(5, set.getInteger("blue_stones"));
                ps.setDouble(6, set.getDouble("ancient_adena_amount"));
                ps.setDouble(7, set.getDouble("contribution_score"));
                ps.setInt(8, set.getInteger("char_obj_id"));
                ps.addBatch();
            }
            ps.executeBatch();
        }
        catch (Exception e) {
            LOGGER.error((Object)"Couldn't save Seven Signs player data.", e);
        }
    }

    public final void saveSevenSignsStatus() {
        try (Connection con = ConnectionPool.getConnection();
             PreparedStatement ps = con.prepareStatement(UPDATE_STATUS);){
            ps.setInt(1, this._currentCycle);
            ps.setString(2, this._activePeriod.toString());
            ps.setString(3, this._previousWinner.toString());
            ps.setDouble(4, this._dawnStoneScore);
            ps.setInt(5, this._dawnFestivalScore);
            ps.setDouble(6, this._duskStoneScore);
            ps.setInt(7, this._duskFestivalScore);
            ps.setString(8, this._sealOwners.get((Object)SealType.AVARICE).toString());
            ps.setString(9, this._sealOwners.get((Object)SealType.GNOSIS).toString());
            ps.setString(10, this._sealOwners.get((Object)SealType.STRIFE).toString());
            ps.setInt(11, this._dawnScores.get((Object)SealType.AVARICE));
            ps.setInt(12, this._dawnScores.get((Object)SealType.GNOSIS));
            ps.setInt(13, this._dawnScores.get((Object)SealType.STRIFE));
            ps.setInt(14, this._duskScores.get((Object)SealType.AVARICE));
            ps.setInt(15, this._duskScores.get((Object)SealType.GNOSIS));
            ps.setInt(16, this._duskScores.get((Object)SealType.STRIFE));
            ps.setInt(17, FestivalOfDarknessManager.getInstance().getCurrentFestivalCycle());
            for (int i = 0; i < 5; ++i) {
                ps.setInt(18 + i, FestivalOfDarknessManager.getInstance().getAccumulatedBonus(i));
            }
            this._lastSave = Calendar.getInstance();
            ps.setLong(23, this._lastSave.getTimeInMillis());
            ps.execute();
        }
        catch (Exception e) {
            LOGGER.error((Object)"Couldn't save Seven Signs status data.", e);
        }
    }

    protected void resetPlayerData() {
        for (StatsSet set : this._playersData.values()) {
            set.set("cabal", CabalType.NORMAL);
            set.set("seal", SealType.NONE);
            set.set("contribution_score", 0);
        }
    }

    public CabalType setPlayerInfo(int objectId, CabalType cabal, SealType seal) {
        StatsSet set = this._playersData.get(objectId);
        if (set != null) {
            set.set("cabal", cabal);
            set.set("seal", seal);
        } else {
            set = new StatsSet();
            set.set("char_obj_id", objectId);
            set.set("cabal", cabal);
            set.set("seal", seal);
            set.set("red_stones", 0);
            set.set("green_stones", 0);
            set.set("blue_stones", 0);
            set.set("ancient_adena_amount", 0);
            set.set("contribution_score", 0);
            this._playersData.put(objectId, set);
            try (Connection con = ConnectionPool.getConnection();
                 PreparedStatement ps = con.prepareStatement(INSERT_PLAYER);){
                ps.setInt(1, objectId);
                ps.setString(2, cabal.toString());
                ps.setString(3, seal.toString());
                ps.execute();
            }
            catch (Exception e) {
                LOGGER.error((Object)"Couldn't save Seven Signs player info data.", e);
            }
        }
        if (cabal == CabalType.DAWN) {
            this._dawnScores.put(seal, this._dawnScores.get((Object)seal) + 1);
        } else {
            this._duskScores.put(seal, this._duskScores.get((Object)seal) + 1);
        }
        return cabal;
    }

    public int getAncientAdenaReward(int objectId) {
        StatsSet set = this._playersData.get(objectId);
        int rewardAmount = set.getInteger("ancient_adena_amount");
        set.set("red_stones", 0);
        set.set("green_stones", 0);
        set.set("blue_stones", 0);
        set.set("ancient_adena_amount", 0);
        return rewardAmount;
    }

    public int addPlayerStoneContrib(int objectId, int blueCount, int greenCount, int redCount) {
        StatsSet set = this._playersData.get(objectId);
        int contribScore = SevenSignsManager.calcScore(blueCount, greenCount, redCount);
        int totalAncientAdena = set.getInteger("ancient_adena_amount") + contribScore;
        int totalContribScore = set.getInteger("contribution_score") + contribScore;
        if (totalContribScore > Config.ALT_MAXIMUM_PLAYER_CONTRIB) {
            return -1;
        }
        set.set("red_stones", set.getInteger("red_stones") + redCount);
        set.set("green_stones", set.getInteger("green_stones") + greenCount);
        set.set("blue_stones", set.getInteger("blue_stones") + blueCount);
        set.set("ancient_adena_amount", totalAncientAdena);
        set.set("contribution_score", totalContribScore);
        switch (this.getPlayerCabal(objectId)) {
            case DAWN: {
                this._dawnStoneScore += (double)contribScore;
                break;
            }
            case DUSK: {
                this._duskStoneScore += (double)contribScore;
            }
        }
        return contribScore;
    }

    public void addFestivalScore(CabalType cabal, int amount) {
        if (cabal == CabalType.DUSK) {
            this._duskFestivalScore += amount;
            if (this._dawnFestivalScore >= amount) {
                this._dawnFestivalScore -= amount;
            }
        } else {
            this._dawnFestivalScore += amount;
            if (this._duskFestivalScore >= amount) {
                this._duskFestivalScore -= amount;
            }
        }
    }

    protected void initializeSeals() {
        for (Map.Entry<SealType, CabalType> sealEntry : this._sealOwners.entrySet()) {
            SealType currentSeal = sealEntry.getKey();
            CabalType sealOwner = sealEntry.getValue();
            if (sealOwner != CabalType.NORMAL) {
                if (this.isSealValidationPeriod()) {
                    LOGGER.info((Object)"The {} have won {}.", sealOwner.getFullName(), currentSeal.getFullName());
                    continue;
                }
                LOGGER.info((Object)"The {} is currently owned by {}.", currentSeal.getFullName(), sealOwner.getFullName());
                continue;
            }
            LOGGER.info((Object)"The {} remains unclaimed.", currentSeal.getFullName());
        }
    }

    protected void resetSeals() {
        this._dawnScores.put(SealType.AVARICE, 0);
        this._dawnScores.put(SealType.GNOSIS, 0);
        this._dawnScores.put(SealType.STRIFE, 0);
        this._duskScores.put(SealType.AVARICE, 0);
        this._duskScores.put(SealType.GNOSIS, 0);
        this._duskScores.put(SealType.STRIFE, 0);
    }

    /*
     * Enabled aggressive block sorting
     */
    protected void calcNewSealOwners() {
        Iterator<SealType> iterator = this._dawnScores.keySet().iterator();
        block24: while (iterator.hasNext()) {
            SealType seal = iterator.next();
            CabalType prevSealOwner = this._sealOwners.get((Object)seal);
            int dawnProportion = this.getSealProportion(seal, CabalType.DAWN);
            int totalDawnMembers = Math.max(1, this.getTotalMembers(CabalType.DAWN));
            int dawnPercent = Math.round((float)dawnProportion / (float)totalDawnMembers * 100.0f);
            int duskProportion = this.getSealProportion(seal, CabalType.DUSK);
            int totalDuskMembers = Math.max(1, this.getTotalMembers(CabalType.DUSK));
            int duskPercent = Math.round((float)duskProportion / (float)totalDuskMembers * 100.0f);
            CabalType newSealOwner = CabalType.NORMAL;
            switch (prevSealOwner) {
                case NORMAL: {
                    switch (this.getCabalHighestScore()) {
                        case DAWN: {
                            if (dawnPercent < 35) break;
                            newSealOwner = CabalType.DAWN;
                            break;
                        }
                        case DUSK: {
                            if (duskPercent < 35) break;
                            newSealOwner = CabalType.DUSK;
                            break;
                        }
                    }
                    break;
                }
                case DAWN: {
                    switch (this.getCabalHighestScore()) {
                        case NORMAL: {
                            if (dawnPercent < 10) break;
                            newSealOwner = CabalType.DAWN;
                            break;
                        }
                        case DAWN: {
                            if (dawnPercent < 10) break;
                            newSealOwner = CabalType.DAWN;
                            break;
                        }
                        case DUSK: {
                            if (duskPercent >= 35) {
                                newSealOwner = CabalType.DUSK;
                                break;
                            }
                            if (dawnPercent < 10) break;
                            newSealOwner = CabalType.DAWN;
                            break;
                        }
                    }
                    break;
                }
                case DUSK: {
                    switch (this.getCabalHighestScore()) {
                        case NORMAL: {
                            if (duskPercent < 10) break;
                            newSealOwner = CabalType.DUSK;
                            break;
                        }
                        case DAWN: {
                            if (dawnPercent >= 35) {
                                newSealOwner = CabalType.DAWN;
                                break;
                            }
                            if (duskPercent < 10) break;
                            newSealOwner = CabalType.DUSK;
                            break;
                        }
                        case DUSK: {
                            if (duskPercent < 10) break;
                            newSealOwner = CabalType.DUSK;
                        }
                    }
                    break;
                }
            }
            this._sealOwners.put(seal, newSealOwner);
            switch (seal) {
                case AVARICE: {
                    if (newSealOwner == CabalType.DAWN) {
                        World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DAWN_OBTAINED_AVARICE));
                        break;
                    }
                    if (newSealOwner != CabalType.DUSK) continue block24;
                    World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DUSK_OBTAINED_AVARICE));
                    break;
                }
                case GNOSIS: {
                    if (newSealOwner == CabalType.DAWN) {
                        World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DAWN_OBTAINED_GNOSIS));
                        break;
                    }
                    if (newSealOwner != CabalType.DUSK) continue block24;
                    World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DUSK_OBTAINED_GNOSIS));
                    break;
                }
                case STRIFE: {
                    if (newSealOwner == CabalType.DAWN) {
                        World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DAWN_OBTAINED_STRIFE));
                    } else if (newSealOwner == CabalType.DUSK) {
                        World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DUSK_OBTAINED_STRIFE));
                    }
                    CastleManager.getInstance().validateTaxes(newSealOwner);
                    continue block24;
                }
            }
        }
        return;
    }

    protected void teleLosingCabalFromDungeons(CabalType winningCabal) {
        for (Player player : World.getInstance().getPlayers()) {
            if (player.isGM() || !player.isIn7sDungeon()) continue;
            StatsSet set = this._playersData.get(player.getObjectId());
            if (set != null) {
                CabalType playerCabal = set.getEnum("cabal", CabalType.class);
                if (this.isSealValidationPeriod() || this.isCompResultsPeriod() ? playerCabal == winningCabal : playerCabal == CabalType.NORMAL) continue;
            }
            player.teleportTo(MapRegionData.TeleportType.TOWN);
            player.setIsIn7sDungeon(false);
        }
    }

    public void giveSosEffect(CabalType strifeOwner) {
        for (Player player : World.getInstance().getPlayers()) {
            CabalType cabal = this.getPlayerCabal(player.getObjectId());
            if (cabal == CabalType.NORMAL) continue;
            if (cabal == strifeOwner) {
                player.addSkill(SkillTable.FrequentSkill.THE_VICTOR_OF_WAR.getSkill(), false);
                continue;
            }
            player.addSkill(SkillTable.FrequentSkill.THE_VANQUISHED_OF_WAR.getSkill(), false);
        }
    }

    public void removeSosEffect() {
        for (Player player : World.getInstance().getPlayers()) {
            player.removeSkill(SkillTable.FrequentSkill.THE_VICTOR_OF_WAR.getSkill().getId(), false);
            player.removeSkill(SkillTable.FrequentSkill.THE_VANQUISHED_OF_WAR.getSkill().getId(), false);
        }
    }

    public static SevenSignsManager getInstance() {
        return SingletonHolder.INSTANCE;
    }

    protected class SevenSignsPeriodChange
    implements Runnable {
        protected SevenSignsPeriodChange() {
        }

        @Override
        public void run() {
            // L2 Impure Fase Admin 6: always-active = COMPETITION nunca acaba.
            // Nada de calcNewSealOwners/cancel do Festival — só reagenda.
            if (ALWAYS_ACTIVE && SevenSignsManager.this._activePeriod == PeriodType.COMPETITION) {
                SevenSignsManager.this.saveSevenSignsData();
                SevenSignsManager.this.saveSevenSignsStatus();
                SevenSignsManager.this.setCalendarForNextPeriodChange();
                long extendDelay = Math.max(900000L, SevenSignsManager.this.getMilliToPeriodChange());
                ThreadPool.schedule(new SevenSignsPeriodChange(), extendDelay);
                LOGGER.info("SevenSigns always-active: COMPETITION period extended (weekly calendar ignored).");
                return;
            }
            PeriodType periodEnded = SevenSignsManager.this._activePeriod;
            SevenSignsManager.this._activePeriod = PeriodType.VALUES[(SevenSignsManager.this._activePeriod.ordinal() + 1) % PeriodType.VALUES.length];
            switch (periodEnded) {
                case RECRUITING: {
                    FestivalOfDarknessManager.getInstance().startFestivalManager();
                    CastleManager.getInstance().resetCertificates();
                    World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.QUEST_EVENT_PERIOD_BEGUN));
                    break;
                }
                case COMPETITION: {
                    World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.QUEST_EVENT_PERIOD_ENDED));
                    CabalType winningCabal = SevenSignsManager.this.getCabalHighestScore();
                    FestivalOfDarknessManager.getInstance().getFestivalManagerSchedule().cancel(false);
                    FestivalOfDarknessManager.getInstance().rewardHighestRanked();
                    SevenSignsManager.this.calcNewSealOwners();
                    switch (winningCabal) {
                        case DAWN: {
                            World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DAWN_WON));
                            break;
                        }
                        case DUSK: {
                            World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.DUSK_WON));
                        }
                    }
                    SevenSignsManager.this._previousWinner = winningCabal;
                    break;
                }
                case RESULTS: {
                    SevenSignsManager.this.initializeSeals();
                    SevenSignsManager.this.giveSosEffect(SevenSignsManager.this.getSealOwner(SealType.STRIFE));
                    World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.SEAL_VALIDATION_PERIOD_BEGUN));
                    LOGGER.info((Object)"The {} have won the competition with {} points.", SevenSignsManager.this._previousWinner.getFullName(), SevenSignsManager.this.getCurrentScore(SevenSignsManager.this._previousWinner));
                    break;
                }
                case SEAL_VALIDATION: {
                    SevenSignsManager.this._activePeriod = PeriodType.RECRUITING;
                    World.toAllOnlinePlayers(SystemMessage.getSystemMessage(SystemMessageId.SEAL_VALIDATION_PERIOD_ENDED));
                    SevenSignsManager.this.removeSosEffect();
                    SevenSignsManager.this.resetPlayerData();
                    SevenSignsManager.this.resetSeals();
                    ++SevenSignsManager.this._currentCycle;
                    FestivalOfDarknessManager.getInstance().resetFestivalData(false);
                    SevenSignsManager.this._dawnStoneScore = 0.0;
                    SevenSignsManager.this._duskStoneScore = 0.0;
                    SevenSignsManager.this._dawnFestivalScore = 0;
                    SevenSignsManager.this._duskFestivalScore = 0;
                }
            }
            SevenSignsManager.this.saveSevenSignsData();
            SevenSignsManager.this.saveSevenSignsStatus();
            SevenSignsManager.this.teleLosingCabalFromDungeons(SevenSignsManager.this.getCabalHighestScore());
            World.toAllOnlinePlayers(SSQInfo.sendSky());
            SevenSignsManager.this.spawnSevenSignsNPC();
            LOGGER.info((Object)"The {} period of Seven Signs has begun.", SevenSignsManager.this._activePeriod.getName());
            SevenSignsManager.this.setCalendarForNextPeriodChange();
            long nextDelay = SevenSignsManager.this.getMilliToPeriodChange();
            // L2 Impure Fase Admin 6: always-active encurta SEAL_VALIDATION
            // (semana inteira) pra 15 min — RECRUITING/RESULTS já são 15 min.
            if (ALWAYS_ACTIVE && SevenSignsManager.this._activePeriod != PeriodType.COMPETITION) {
                nextDelay = Math.min(Math.max(nextDelay, 0L), 900000L);
            }
            ThreadPool.schedule(new SevenSignsPeriodChange(), nextDelay);
        }
    }

    private static class SingletonHolder {
        protected static final SevenSignsManager INSTANCE = new SevenSignsManager();

        private SingletonHolder() {
        }
    }
}
