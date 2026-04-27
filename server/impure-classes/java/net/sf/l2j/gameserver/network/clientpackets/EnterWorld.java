/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  enginemods.main.EngineModsManager
 *  mods.dungeon.DungeonManager
 *  mods.pvpZone.RandomZoneManager
 *  net.sf.l2j.Config
 *  net.sf.l2j.commons.pool.ConnectionPool
 *  net.sf.l2j.gameserver.communitybbs.Manager.MailBBSManager
 *  net.sf.l2j.gameserver.data.DollsData
 *  net.sf.l2j.gameserver.data.SkillTable
 *  net.sf.l2j.gameserver.data.SkillTable$FrequentSkill
 *  net.sf.l2j.gameserver.data.manager.CastleManager
 *  net.sf.l2j.gameserver.data.manager.ClanHallManager
 *  net.sf.l2j.gameserver.data.manager.CoupleManager
 *  net.sf.l2j.gameserver.data.manager.DailyLoginRewardManager
 *  net.sf.l2j.gameserver.data.manager.DimensionalRiftManager
 *  net.sf.l2j.gameserver.data.manager.PetitionManager
 *  net.sf.l2j.gameserver.data.manager.SevenSignsManager
 *  net.sf.l2j.gameserver.data.xml.AdminData
 *  net.sf.l2j.gameserver.data.xml.AnnouncementData
 *  net.sf.l2j.gameserver.data.xml.MapRegionData$TeleportType
 *  net.sf.l2j.gameserver.data.xml.ScriptData
 *  net.sf.l2j.gameserver.enums.CabalType
 *  net.sf.l2j.gameserver.enums.SealType
 *  net.sf.l2j.gameserver.enums.SiegeSide
 *  net.sf.l2j.gameserver.enums.ZoneId
 *  net.sf.l2j.gameserver.enums.actors.ClassRace
 *  net.sf.l2j.gameserver.events.eventengine.NextEventsInfo
 *  net.sf.l2j.gameserver.events.partyfarm.PartyFarm
 *  net.sf.l2j.gameserver.events.soloboss.SoloBossManager
 *  net.sf.l2j.gameserver.events.tournament.ArenaTask
 *  net.sf.l2j.gameserver.hwid.Hwid
 *  net.sf.l2j.gameserver.model.L2Skill
 *  net.sf.l2j.gameserver.model.World
 *  net.sf.l2j.gameserver.model.actor.Creature
 *  net.sf.l2j.gameserver.model.actor.Player
 *  net.sf.l2j.gameserver.model.actor.instance.ClassMaster
 *  net.sf.l2j.gameserver.model.actor.player.SubClass
 *  net.sf.l2j.gameserver.model.clanhall.ClanHall
 *  net.sf.l2j.gameserver.model.entity.Castle
 *  net.sf.l2j.gameserver.model.entity.Siege
 *  net.sf.l2j.gameserver.model.holder.IntIntHolder
 *  net.sf.l2j.gameserver.model.olympiad.Olympiad
 *  net.sf.l2j.gameserver.model.pledge.Clan
 *  net.sf.l2j.gameserver.model.pledge.SubPledge
 *  net.sf.l2j.gameserver.network.GameClient
 *  net.sf.l2j.gameserver.network.GameClient$GameClientState
 *  net.sf.l2j.gameserver.network.SystemMessageId
 *  net.sf.l2j.gameserver.network.clientpackets.L2GameClientPacket
 *  net.sf.l2j.gameserver.network.serverpackets.ActionFailed
 *  net.sf.l2j.gameserver.network.serverpackets.CreatureSay
 *  net.sf.l2j.gameserver.network.serverpackets.Die
 *  net.sf.l2j.gameserver.network.serverpackets.Earthquake
 *  net.sf.l2j.gameserver.network.serverpackets.EtcStatusUpdate
 *  net.sf.l2j.gameserver.network.serverpackets.ExMailArrived
 *  net.sf.l2j.gameserver.network.serverpackets.ExRedSky
 *  net.sf.l2j.gameserver.network.serverpackets.ExShowScreenMessage
 *  net.sf.l2j.gameserver.network.serverpackets.ExStorageMaxCount
 *  net.sf.l2j.gameserver.network.serverpackets.FriendList
 *  net.sf.l2j.gameserver.network.serverpackets.HennaInfo
 *  net.sf.l2j.gameserver.network.serverpackets.ItemList
 *  net.sf.l2j.gameserver.network.serverpackets.L2GameServerPacket
 *  net.sf.l2j.gameserver.network.serverpackets.MagicSkillUse
 *  net.sf.l2j.gameserver.network.serverpackets.NpcHtmlMessage
 *  net.sf.l2j.gameserver.network.serverpackets.PlaySound
 *  net.sf.l2j.gameserver.network.serverpackets.PledgeShowMemberListAll
 *  net.sf.l2j.gameserver.network.serverpackets.PledgeShowMemberListUpdate
 *  net.sf.l2j.gameserver.network.serverpackets.PledgeSkillList
 *  net.sf.l2j.gameserver.network.serverpackets.PledgeStatusChanged
 *  net.sf.l2j.gameserver.network.serverpackets.QuestList
 *  net.sf.l2j.gameserver.network.serverpackets.ShortCutInit
 *  net.sf.l2j.gameserver.network.serverpackets.SkillCoolTime
 *  net.sf.l2j.gameserver.network.serverpackets.SystemMessage
 *  net.sf.l2j.gameserver.network.serverpackets.UserInfo
 *  net.sf.l2j.gameserver.scripting.Quest
 *  net.sf.l2j.gameserver.scripting.QuestState
 *  net.sf.l2j.gameserver.scripting.scripts.feature.TutorialQuest
 *  net.sf.l2j.gameserver.taskmanager.GameTimeTaskManager
 */
package net.sf.l2j.gameserver.network.clientpackets;

import enginemods.main.EngineModsManager;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Map;
import mods.dungeon.DungeonManager;
import mods.pvpZone.RandomZoneManager;
import net.sf.l2j.Config;
import net.sf.l2j.commons.pool.ConnectionPool;
import net.sf.l2j.gameserver.communitybbs.Manager.MailBBSManager;
import net.sf.l2j.gameserver.data.DollsData;
import net.sf.l2j.gameserver.data.SkillTable;
import net.sf.l2j.gameserver.data.manager.CastleManager;
import net.sf.l2j.gameserver.data.manager.ClanHallManager;
import net.sf.l2j.gameserver.data.manager.CoupleManager;
import net.sf.l2j.gameserver.data.manager.DailyLoginRewardManager;
import net.sf.l2j.gameserver.data.manager.DimensionalRiftManager;
import net.sf.l2j.gameserver.data.manager.PetitionManager;
import net.sf.l2j.gameserver.data.manager.SevenSignsManager;
import net.sf.l2j.gameserver.data.xml.AdminData;
import net.sf.l2j.gameserver.data.xml.AnnouncementData;
import net.sf.l2j.gameserver.data.xml.MapRegionData;
import net.sf.l2j.gameserver.data.xml.ScriptData;
import net.sf.l2j.gameserver.enums.CabalType;
import net.sf.l2j.gameserver.enums.SealType;
import net.sf.l2j.gameserver.enums.SiegeSide;
import net.sf.l2j.gameserver.enums.ZoneId;
import net.sf.l2j.gameserver.enums.actors.ClassRace;
import net.sf.l2j.gameserver.events.eventengine.NextEventsInfo;
import net.sf.l2j.gameserver.events.partyfarm.PartyFarm;
import net.sf.l2j.gameserver.events.soloboss.SoloBossManager;
import net.sf.l2j.gameserver.events.tournament.ArenaTask;
import net.sf.l2j.gameserver.hwid.Hwid;
import net.sf.l2j.gameserver.model.L2Skill;
import net.sf.l2j.gameserver.model.World;
import net.sf.l2j.gameserver.model.actor.Creature;
import net.sf.l2j.gameserver.model.actor.Player;
import net.sf.l2j.gameserver.model.actor.instance.ClassMaster;
import net.sf.l2j.gameserver.model.actor.player.SubClass;
import net.sf.l2j.gameserver.model.clanhall.ClanHall;
import net.sf.l2j.gameserver.model.entity.Castle;
import net.sf.l2j.gameserver.model.entity.Siege;
import net.sf.l2j.gameserver.model.holder.IntIntHolder;
import net.sf.l2j.gameserver.model.olympiad.Olympiad;
import net.sf.l2j.gameserver.model.pledge.Clan;
import net.sf.l2j.gameserver.model.pledge.SubPledge;
import net.sf.l2j.gameserver.network.GameClient;
import net.sf.l2j.gameserver.network.SystemMessageId;
import net.sf.l2j.gameserver.network.clientpackets.L2GameClientPacket;
import net.sf.l2j.gameserver.network.serverpackets.ActionFailed;
import net.sf.l2j.gameserver.network.serverpackets.CreatureSay;
import net.sf.l2j.gameserver.network.serverpackets.Die;
import net.sf.l2j.gameserver.network.serverpackets.Earthquake;
import net.sf.l2j.gameserver.network.serverpackets.EtcStatusUpdate;
import net.sf.l2j.gameserver.network.serverpackets.ExMailArrived;
import net.sf.l2j.gameserver.network.serverpackets.ExRedSky;
import net.sf.l2j.gameserver.network.serverpackets.ExShowScreenMessage;
import net.sf.l2j.gameserver.network.serverpackets.ExStorageMaxCount;
import net.sf.l2j.gameserver.network.serverpackets.FriendList;
import net.sf.l2j.gameserver.network.serverpackets.HennaInfo;
import net.sf.l2j.gameserver.network.serverpackets.ItemList;
import net.sf.l2j.gameserver.network.serverpackets.L2GameServerPacket;
import net.sf.l2j.gameserver.network.serverpackets.MagicSkillUse;
import net.sf.l2j.gameserver.network.serverpackets.NpcHtmlMessage;
import net.sf.l2j.gameserver.network.serverpackets.PlaySound;
import net.sf.l2j.gameserver.network.serverpackets.PledgeShowMemberListAll;
import net.sf.l2j.gameserver.network.serverpackets.PledgeShowMemberListUpdate;
import net.sf.l2j.gameserver.network.serverpackets.PledgeSkillList;
import net.sf.l2j.gameserver.network.serverpackets.PledgeStatusChanged;
import net.sf.l2j.gameserver.network.serverpackets.QuestList;
import net.sf.l2j.gameserver.network.serverpackets.ShortCutInit;
import net.sf.l2j.gameserver.network.serverpackets.SkillCoolTime;
import net.sf.l2j.gameserver.network.serverpackets.SystemMessage;
import net.sf.l2j.gameserver.network.serverpackets.UserInfo;
import net.sf.l2j.gameserver.scripting.Quest;
import net.sf.l2j.gameserver.scripting.QuestState;
import net.sf.l2j.gameserver.scripting.scripts.feature.TutorialQuest;
import net.sf.l2j.gameserver.taskmanager.GameTimeTaskManager;

public class EnterWorld
extends L2GameClientPacket {
    private static final String LOAD_PLAYER_QUESTS = "SELECT name,var,value FROM character_quests WHERE charId=?";

    protected void readImpl() {
    }

    protected void runImpl() {
        L2Skill skill;
        Clan clan;
        if (this.getClient() == null) {
            return;
        }
        Player player = ((GameClient)this.getClient()).getPlayer();
        if (player == null) {
            ((GameClient)this.getClient()).closeNow();
            return;
        }
        ((GameClient)this.getClient()).setState(GameClient.GameClientState.IN_GAME);
        int objectId = player.getObjectId();
        if (player.isGM()) {
            if (Config.GM_STARTUP_INVULNERABLE && AdminData.getInstance().hasAccess("admin_invul", player.getAccessLevel())) {
                player.setIsInvul(true);
            }
            if (Config.GM_STARTUP_INVISIBLE && AdminData.getInstance().hasAccess("admin_hide", player.getAccessLevel())) {
                player.getAppearance().setInvisible();
            }
            if (Config.GM_STARTUP_SILENCE && AdminData.getInstance().hasAccess("admin_silence", player.getAccessLevel())) {
                player.setInRefusalMode(true);
            }
            if (Config.GM_STARTUP_AUTO_LIST && AdminData.getInstance().hasAccess("admin_gmlist", player.getAccessLevel())) {
                AdminData.getInstance().addGm(player, false);
            } else {
                AdminData.getInstance().addGm(player, true);
            }
            if (Config.GM_SUPER_HASTE) {
                SkillTable.getInstance().getInfo(7029, 4).getEffects((Creature)player, (Creature)player);
            }
        }
        if (player.getCurrentHp() < 0.5 && player.isMortal()) {
            player.setIsDead(true);
            if (Config.ENABLE_EFFECT_ON_DIE) {
                ExRedSky packet = new ExRedSky(7);
                this.sendPacket((L2GameServerPacket)packet);
            }
        }
        if ((clan = player.getClan()) != null) {
            Player apprentice;
            player.sendPacket((L2GameServerPacket)new PledgeSkillList(clan));
            clan.getClanMember(objectId).setPlayerInstance(player);
            SystemMessage msg = SystemMessage.getSystemMessage((SystemMessageId)SystemMessageId.CLAN_MEMBER_S1_LOGGED_IN).addCharName((Creature)player);
            PledgeShowMemberListUpdate pledgeShowMemberListUpdate = new PledgeShowMemberListUpdate(player);
            for (Player member : clan.getOnlineMembers()) {
                if (member == player) continue;
                member.sendPacket((L2GameServerPacket)msg);
                member.sendPacket((L2GameServerPacket)pledgeShowMemberListUpdate);
            }
            if (player.getSponsor() != 0) {
                Player sponsor = World.getInstance().getPlayer(player.getSponsor());
                if (sponsor != null) {
                    sponsor.sendPacket((L2GameServerPacket)SystemMessage.getSystemMessage((SystemMessageId)SystemMessageId.YOUR_APPRENTICE_S1_HAS_LOGGED_IN).addCharName((Creature)player));
                }
            } else if (player.getApprentice() != 0 && (apprentice = World.getInstance().getPlayer(player.getApprentice())) != null) {
                apprentice.sendPacket((L2GameServerPacket)SystemMessage.getSystemMessage((SystemMessageId)SystemMessageId.YOUR_SPONSOR_S1_HAS_LOGGED_IN).addCharName((Creature)player));
            }
            ClanHall clanHall = ClanHallManager.getInstance().getClanHallByOwner(clan);
            if (clanHall != null && !clanHall.getPaid()) {
                player.sendPacket(SystemMessageId.PAYMENT_FOR_YOUR_CLAN_HALL_HAS_NOT_BEEN_MADE_PLEASE_MAKE_PAYMENT_TO_YOUR_CLAN_WAREHOUSE_BY_S1_TOMORROW);
            }
            for (Castle castle : CastleManager.getInstance().getCastles()) {
                Siege siege = castle.getSiege();
                if (!siege.isInProgress()) continue;
                SiegeSide type = siege.getSide(clan);
                if (type == SiegeSide.ATTACKER) {
                    player.setSiegeState((byte)1);
                    continue;
                }
                if (type != SiegeSide.DEFENDER && type != SiegeSide.OWNER) continue;
                player.setSiegeState((byte)2);
            }
            player.sendPacket((L2GameServerPacket)new PledgeShowMemberListAll(clan, 0));
            for (SubPledge sp : clan.getAllSubPledges()) {
                player.sendPacket((L2GameServerPacket)new PledgeShowMemberListAll(clan, sp.getId()));
            }
            player.sendPacket((L2GameServerPacket)new UserInfo(player));
            player.sendPacket((L2GameServerPacket)new PledgeStatusChanged(clan));
        }
        if (SevenSignsManager.getInstance().isSealValidationPeriod() && SevenSignsManager.getInstance().getSealOwner(SealType.STRIFE) != CabalType.NORMAL) {
            CabalType cabal = SevenSignsManager.getInstance().getPlayerCabal(objectId);
            if (cabal != CabalType.NORMAL) {
                if (cabal == SevenSignsManager.getInstance().getSealOwner(SealType.STRIFE)) {
                    player.addSkill(SkillTable.FrequentSkill.THE_VICTOR_OF_WAR.getSkill(), false);
                } else {
                    player.addSkill(SkillTable.FrequentSkill.THE_VANQUISHED_OF_WAR.getSkill(), false);
                }
            }
        } else {
            player.removeSkill(SkillTable.FrequentSkill.THE_VICTOR_OF_WAR.getSkill().getId(), false);
            player.removeSkill(SkillTable.FrequentSkill.THE_VANQUISHED_OF_WAR.getSkill().getId(), false);
        }
        if (Config.PLAYER_SPAWN_PROTECTION > 0) {
            player.setSpawnProtection(true);
        }
        if (Config.ALLOW_DAILY_REWARD) {
            DailyLoginRewardManager.claimDailyReward((Player)player);
        }
        player.spawnMe();
        if (Config.ALLOW_WEDDING) {
            for (Map.Entry entry : CoupleManager.getInstance().getCouples().entrySet()) {
                IntIntHolder couple = (IntIntHolder)entry.getValue();
                if (couple.getId() != objectId && couple.getValue() != objectId) continue;
                player.setCoupleId(((Integer)entry.getKey()).intValue());
                break;
            }
        }
        if (player.isSubClassActive() && ((SubClass)player.getSubClasses().get(player.getClassIndex())).getLevel() > Config.SUBCLASS_MAX_LEVEL - 1) {
            ((SubClass)player.getSubClasses().get(player.getClassIndex())).setLevel((byte)(Config.SUBCLASS_MAX_LEVEL - 1));
        }
        player.checkEquipmentXPvps();
        Hwid.enterlog((Player)player, (GameClient)((GameClient)this.getClient()));
        if (DungeonManager.getInstance().getDungeonParticipants().contains(player.getObjectId())) {
            DungeonManager.getInstance().getDungeonParticipants().remove((Object)player.getObjectId());
            player.teleportTo(82635, 148798, -3464, 25);
        }
        player.sendPacket(SystemMessageId.WELCOME_TO_LINEAGE);
        player.sendPacket(SevenSignsManager.getInstance().getCurrentPeriod().getMessageId());
        AnnouncementData.getInstance().showAnnouncements(player, false);
        player.loadAutoFarmSettings();
        if (Config.PCB_ENABLE) {
            player.showPcBangWindow();
        }
        if (player.getRace() == ClassRace.DARK_ELF && player.hasSkill(294)) {
            player.sendPacket((L2GameServerPacket)SystemMessage.getSystemMessage((SystemMessageId)(GameTimeTaskManager.getInstance().isNight() ? SystemMessageId.NIGHT_S1_EFFECT_APPLIES : SystemMessageId.DAY_S1_EFFECT_DISAPPEARS)).addSkillName(294));
        }
        player.removeSpoilSkillinZone();
        DollsData.refreshAllDollSkills((Player)player);
        player.getMacroList().sendUpdate();
        player.sendPacket((L2GameServerPacket)new UserInfo(player));
        player.sendPacket((L2GameServerPacket)new HennaInfo(player));
        player.sendPacket((L2GameServerPacket)new FriendList(player));
        player.sendPacket((L2GameServerPacket)new ItemList(player, false));
        player.sendPacket((L2GameServerPacket)new ShortCutInit(player));
        player.sendPacket((L2GameServerPacket)new ExStorageMaxCount(player));
        if (player.isAlikeDead()) {
            player.sendPacket((L2GameServerPacket)new Die((Creature)player));
        }
        player.updateEffectIcons();
        player.sendPacket((L2GameServerPacket)new EtcStatusUpdate(player));
        player.sendSkillList();
        try (Connection con = ConnectionPool.getConnection();
             PreparedStatement preparedStatement = con.prepareStatement(LOAD_PLAYER_QUESTS);){
            preparedStatement.setInt(1, objectId);
            try (ResultSet rs = preparedStatement.executeQuery();){
                while (rs.next()) {
                    String questName = rs.getString("name");
                    Quest quest = ScriptData.getInstance().getQuest(questName);
                    if (quest == null) {
                        LOGGER.warn((Object)"Unknown quest {} for player {}.", new Object[]{questName, player.getName()});
                        continue;
                    }
                    String var = rs.getString("var");
                    if (var.equals("<state>")) {
                        new QuestState(player, quest, rs.getByte("value"));
                        if (!quest.getOnEnterWorld()) continue;
                        quest.notifyEnterWorld(player);
                        continue;
                    }
                    QuestState qs = player.getQuestState(questName);
                    if (qs == null) {
                        LOGGER.warn((Object)"Unknown quest state {} for player {}.", new Object[]{questName, player.getName()});
                        continue;
                    }
                    qs.setInternal(var, rs.getString("value"));
                }
            }
        }
        catch (Exception e) {
            LOGGER.error((Object)"Couldn't load quests for player {}.", (Throwable)e, new Object[]{player.getName()});
        }
        player.sendPacket((L2GameServerPacket)new QuestList(player));
        if (Config.ENABLE_COMMUNITY_BOARD && MailBBSManager.getInstance().checkUnreadMail(player) > 0) {
            player.sendPacket(SystemMessageId.NEW_MAIL);
            player.sendPacket((L2GameServerPacket)new PlaySound("systemmsg_e.1233"));
            player.sendPacket((L2GameServerPacket)ExMailArrived.STATIC_PACKET);
        }
        if (Config.ENABLE_COMMUNITY_BOARD && clan != null && clan.isNoticeEnabled()) {
            NpcHtmlMessage html = new NpcHtmlMessage(0);
            html.setFile("data/html/clan_notice.htm");
            html.replace("%clan_name%", clan.getName());
            html.replace("%notice_text%", clan.getNotice().replaceAll("\r\n", "<br>").replaceAll("action", "").replaceAll("bypass", ""));
            this.sendPacket((L2GameServerPacket)html);
        } else if (Config.SERVER_NEWS) {
            NpcHtmlMessage html = new NpcHtmlMessage(0);
            html.setFile("data/html/servnews.htm");
            this.sendPacket((L2GameServerPacket)html);
        }
        PetitionManager.getInstance().checkPetitionMessages(player);
        TutorialQuest.onCreate((Player)player);
        player.onPlayerEnter();
        this.sendPacket((L2GameServerPacket)new SkillCoolTime(player));
        if (Olympiad.getInstance().playerInStadia(player)) {
            player.teleportTo(MapRegionData.TeleportType.TOWN);
        }
        if (DimensionalRiftManager.getInstance().checkIfInRiftZone(player.getX(), player.getY(), player.getZ(), false)) {
            DimensionalRiftManager.getInstance().teleportToWaitingRoom(player);
        }
        if (player.getClanJoinExpiryTime() > System.currentTimeMillis()) {
            player.sendPacket(SystemMessageId.CLAN_MEMBERSHIP_TERMINATED);
        }
        if (!(player.isGM() || player.isInSiege() && player.getSiegeState() >= 2 || !player.isInsideZone(ZoneId.SIEGE))) {
            player.teleportTo(MapRegionData.TeleportType.TOWN);
        }
        EngineModsManager.onEnterWorld((Player)player);
        ClassMaster.showQuestionMark((Player)player);
        if (Config.ALLOW_DM_EVENT) {
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 1, "[DeathMatch] Next event: ", NextEventsInfo.getInstance().NextDMEvent()));
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 2, "[DeathMatch] Next event: ", NextEventsInfo.getInstance().NextDMEvent()));
        }
        if (Config.ALLOW_TVT_EVENT) {
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 1, "[Team vs Team] Next event: ", NextEventsInfo.getInstance().NextTvtEvent()));
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 2, "[Team vs Team] Next event: ", NextEventsInfo.getInstance().NextTvtEvent()));
        }
        if (Config.ALLOW_CTF_EVENT) {
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 1, "[Capture the Flag] Next event: ", NextEventsInfo.getInstance().NextCtfEvent()));
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 2, "[Capture the Flag] Next event: ", NextEventsInfo.getInstance().NextCtfEvent()));
        }
        if (ArenaTask.is_started() && Config.ARENA_MESSAGE_ENABLED) {
            player.sendPacket((L2GameServerPacket)new ExShowScreenMessage(Config.ARENA_MESSAGE_TEXT, Config.ARENA_MESSAGE_TIME, 2, true));
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 1, "[Party Farm] : ", Config.ARENA_MESSAGE_TEXT));
        }
        if (PartyFarm.is_started() && Config.PARTY_FARM_BY_TIME_OF_DAY) {
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 17, "[Party Farm] : ", Config.PARTY_FARM_MESSAGE_TEXT));
            player.sendPacket((L2GameServerPacket)new ExShowScreenMessage(Config.PARTY_FARM_MESSAGE_TEXT, 3));
        }
        if (Config.ENABLE_AUTO_PVP_ZONE) {
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 1, "[PvP Zone]", "Current zone: " + RandomZoneManager.getInstance().getCurrentZone().getName()));
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 1, "[PvP Zone]", "will be changed in " + RandomZoneManager.getInstance().getLeftTime()));
        }
        if (Config.SOLOBOSS_EVENT_ENABLE && SoloBossManager.isActive()) {
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 1, "[Solo Boss]", " Event is active: " + SoloBossManager.getInstance().getEventMessage()));
        }
        if (Config.ENABLE_EFFECT_ON_LOGIN) {
            player.sendPacket((L2GameServerPacket)new Earthquake(player.getX(), player.getY(), player.getZ(), 65, 12));
            player.sendPacket((L2GameServerPacket)new PlaySound("skillsound7.sound_crystal_smelting"));
        }
        if (player.isNewChar() && (skill = SkillTable.getInstance().getInfo(2025, 1)) != null) {
            MagicSkillUse magicSkillUse = new MagicSkillUse((Creature)player, (Creature)player, 2025, 1, 1, 0);
            player.sendPacket((L2GameServerPacket)magicSkillUse);
            player.broadcastPacket((L2GameServerPacket)magicSkillUse);
            player.useMagic(skill, false, false);
        }
        if (Config.WELLCOME_MESSAGE_ACTIVE) {
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 2, "Have Fun and Nice Stay on ", Config.WELLCOME_SERVER_NAME));
            player.sendPacket((L2GameServerPacket)new CreatureSay(0, 2, player.getName(), Config.WELLCOME_SERVER_SECOND_MESSAGE));
        }
        net.sf.l2j.gameserver.model.vote.VoteManager.getInstance().onEnterWorld(player);
        player.sendPacket((L2GameServerPacket)ActionFailed.STATIC_PACKET);
    }

    protected boolean triggersOnActionRequest() {
        return false;
    }
}
