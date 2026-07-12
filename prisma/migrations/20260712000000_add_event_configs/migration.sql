-- Event configs (Fase Admin 3A) — eventos do gameserver editáveis pelo
-- painel. Rollback: DROP TABLE "event_configs";

CREATE TABLE "event_configs" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(48) NOT NULL,
    "display_name" VARCHAR(64) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "file_target" VARCHAR(96) NOT NULL,
    "file_mapping" JSONB NOT NULL,
    "last_applied_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_configs_slug_key" ON "event_configs"("slug");

-- Seed com os valores REAIS lidos da VPS em 2026-07-12 (fonte de verdade:
-- /root/l2j-server/gameserver/config/*). last_applied_at nasce NULL =
-- "importado, nunca aplicado pelo painel". Idempotente (ON CONFLICT).
INSERT INTO "event_configs" ("slug", "display_name", "enabled", "config", "file_target", "file_mapping") VALUES
('olympiad', 'Olympiad', true,
 '{"startHour": 18, "startMin": 0, "classedParticipants": 5, "nonClassedParticipants": 9, "classedReward": "6651-50", "nonClassedReward": "6651-30", "announceGames": true}',
 'events.properties',
 '{"startHour": "AltOlyStartTime", "startMin": "AltOlyMin", "classedParticipants": "AltOlyClassedParticipants", "nonClassedParticipants": "AltOlyNonClassedParticipants", "classedReward": "AltOlyClassedReward", "nonClassedReward": "AltOlyNonClassedReward", "announceGames": "AltOlyAnnounceGames"}'),

('sevensigns', 'Seven Signs & Festival', true,
 '{"festivalMinPlayers": 5, "castleForDawn": true, "castleForDusk": true, "maxPlayerContrib": 1000000}',
 'events.properties',
 '{"festivalMinPlayers": "AltFestivalMinPlayer", "castleForDawn": "AltCastleForDawn", "castleForDusk": "AltCastleForDusk", "maxPlayerContrib": "AltMaxPlayerContrib"}'),

('tvt', 'TvT (Team vs Team)', true,
 '{"interval": "03:00,08:22,10:00,15:00", "minPlayers": 2, "winnerRewards": "3470,10", "drawRewards": "3470,10", "runningTimeMin": 2}',
 'events/eventengine.properties',
 '{"enabled": "AllowTvTEvent", "interval": "TvTEventInterval", "minPlayers": "TvTMinPlayers", "winnerRewards": "TvTWinnerRewards", "drawRewards": "TvTDrawRewards", "runningTimeMin": "TvTRunningTime"}'),

('ctf', 'CTF (Capture the Flag)', true,
 '{"interval": "00:00,04:00,08:00,12:00", "minPlayers": 2, "onScoreRewards": "3470,3", "winnerRewards": "3470,10", "drawRewards": "3470,10", "runningTimeMin": 5}',
 'events/eventengine.properties',
 '{"enabled": "AllowCTFEvent", "interval": "CTFEventInterval", "minPlayers": "CTFMinPlayers", "onScoreRewards": "CTFOnScoreRewards", "winnerRewards": "CTFWinnerRewards", "drawRewards": "CTFDrawRewards", "runningTimeMin": "CTFRunningTime"}'),

('dm', 'DM (Deathmatch)', true,
 '{"interval": "01:00,05:00,09:00,13:00", "minPlayers": 2, "onKillRewards": "3470,2", "winnerRewards": "3470,10", "runningTimeMin": 2}',
 'events/eventengine.properties',
 '{"enabled": "AllowDMEvent", "interval": "DMEventInterval", "minPlayers": "DMMinPlayers", "onKillRewards": "DMOnKillRewards", "winnerRewards": "DMWinnerRewards", "runningTimeMin": "DMRunningTime"}'),

('pvpevent', 'PvP Zone Event', true,
 '{"interval": "01:30,06:00,08:15,13:30", "runningTimeMin": 30, "winnerReward": "9554,100"}',
 'events/pvpEvent.properties',
 '{"enabled": "PvPEventEnabled", "interval": "PvPZEventInterval", "runningTimeMin": "PvPZEventRunningTime", "winnerReward": "PvPEventWinnerReward"}'),

('killtheboss', 'Kill the Boss', true,
 '{"eventTimes": "10:30,15:30,03:30,05:30", "minPlayers": 1, "minDamage": 2000, "generalRewards": "57,100000;3470,10", "registrationTimeSec": 60}',
 'events/killTheBossEvent.properties',
 '{"eventTimes": "EventTime", "minPlayers": "MinPlayers", "minDamage": "MinDamage", "generalRewards": "GeneralRewards", "registrationTimeSec": "RegistrationTime"}'),

('tournament', 'Tournament (2x2/4x4/9x9)', true,
 '{"startTimes": "09:15,16:15,06:15", "eventTimeMin": 90, "rewardId": 3470, "winRewardCount": 10, "lostRewardCount": 5}',
 'events/tournament.properties',
 '{"enabled": "TournamentStartOn", "startTimes": "TournamentStartTime", "eventTimeMin": "TournamentEventTime", "rewardId": "ArenaRewardId", "winRewardCount": "ArenaWinRewardCount", "lostRewardCount": "ArenaLostRewardCount"}'),

('partyfarm', 'Party Farm', true,
 '{"startTimes": "11:00,14:00,19:00,22:00,02:00,05:00,08:00", "eventTimeMin": 30, "dropList": "3470,100,1,2"}',
 'events/partyfarm.properties',
 '{"enabled": "PartyFarmEventEnabled", "startTimes": "BestFarmStartTime", "eventTimeMin": "EventBestFarmTime", "dropList": "PartyDropList"}'),

('pcbang', 'PC Bang Points', true,
 '{"minLevel": 20, "minCount": 10, "maxCount": 10, "intervalSec": 3600, "dualChance": 0}',
 'events/pcBangEvent.properties',
 '{"enabled": "PcBangPointEnable", "minLevel": "PcBangPointMinLevel", "minCount": "PcBangPointMinCount", "maxCount": "PcBangPointMaxCount", "intervalSec": "PcBangPointTimeStamp", "dualChance": "PcBangPointDualChance"}')
ON CONFLICT ("slug") DO NOTHING;
