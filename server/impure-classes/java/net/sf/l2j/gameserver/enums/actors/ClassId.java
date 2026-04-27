/*
 * L2 Impure - ClassId.java MODIFICADO
 * Alteração: DUMMY_1~4 substituídos por IMPURE_FIGHTER/WARRIOR/GLADIATOR/CHAMPION
 */
package net.sf.l2j.gameserver.enums.actors;

import java.util.EnumSet;
import net.sf.l2j.gameserver.model.actor.Player;

public enum ClassId {
    HUMAN_FIGHTER(ClassRace.HUMAN, ClassType.FIGHTER, 0, "Human Fighter", null),
    WARRIOR(ClassRace.HUMAN, ClassType.FIGHTER, 1, "Warrior", HUMAN_FIGHTER),
    GLADIATOR(ClassRace.HUMAN, ClassType.FIGHTER, 2, "Gladiator", WARRIOR),
    WARLORD(ClassRace.HUMAN, ClassType.FIGHTER, 2, "Warlord", WARRIOR),
    KNIGHT(ClassRace.HUMAN, ClassType.FIGHTER, 1, "Human Knight", HUMAN_FIGHTER),
    PALADIN(ClassRace.HUMAN, ClassType.FIGHTER, 2, "Paladin", KNIGHT),
    DARK_AVENGER(ClassRace.HUMAN, ClassType.FIGHTER, 2, "Dark Avenger", KNIGHT),
    ROGUE(ClassRace.HUMAN, ClassType.FIGHTER, 1, "Rogue", HUMAN_FIGHTER),
    TREASURE_HUNTER(ClassRace.HUMAN, ClassType.FIGHTER, 2, "Treasure Hunter", ROGUE),
    HAWKEYE(ClassRace.HUMAN, ClassType.FIGHTER, 2, "Hawkeye", ROGUE),
    HUMAN_MYSTIC(ClassRace.HUMAN, ClassType.MYSTIC, 0, "Human Mystic", null),
    HUMAN_WIZARD(ClassRace.HUMAN, ClassType.MYSTIC, 1, "Human Wizard", HUMAN_MYSTIC),
    SORCERER(ClassRace.HUMAN, ClassType.MYSTIC, 2, "Sorcerer", HUMAN_WIZARD),
    NECROMANCER(ClassRace.HUMAN, ClassType.MYSTIC, 2, "Necromancer", HUMAN_WIZARD),
    WARLOCK(ClassRace.HUMAN, ClassType.MYSTIC, 2, "Warlock", HUMAN_WIZARD),
    CLERIC(ClassRace.HUMAN, ClassType.PRIEST, 1, "Cleric", HUMAN_MYSTIC),
    BISHOP(ClassRace.HUMAN, ClassType.PRIEST, 2, "Bishop", CLERIC),
    PROPHET(ClassRace.HUMAN, ClassType.PRIEST, 2, "Prophet", CLERIC),
    ELVEN_FIGHTER(ClassRace.ELF, ClassType.FIGHTER, 0, "Elven Fighter", null),
    ELVEN_KNIGHT(ClassRace.ELF, ClassType.FIGHTER, 1, "Elven Knight", ELVEN_FIGHTER),
    TEMPLE_KNIGHT(ClassRace.ELF, ClassType.FIGHTER, 2, "Temple Knight", ELVEN_KNIGHT),
    SWORD_SINGER(ClassRace.ELF, ClassType.FIGHTER, 2, "Sword Singer", ELVEN_KNIGHT),
    ELVEN_SCOUT(ClassRace.ELF, ClassType.FIGHTER, 1, "Elven Scout", ELVEN_FIGHTER),
    PLAINS_WALKER(ClassRace.ELF, ClassType.FIGHTER, 2, "Plains Walker", ELVEN_SCOUT),
    SILVER_RANGER(ClassRace.ELF, ClassType.FIGHTER, 2, "Silver Ranger", ELVEN_SCOUT),
    ELVEN_MYSTIC(ClassRace.ELF, ClassType.MYSTIC, 0, "Elven Mystic", null),
    ELVEN_WIZARD(ClassRace.ELF, ClassType.MYSTIC, 1, "Elven Wizard", ELVEN_MYSTIC),
    SPELLSINGER(ClassRace.ELF, ClassType.MYSTIC, 2, "Spellsinger", ELVEN_WIZARD),
    ELEMENTAL_SUMMONER(ClassRace.ELF, ClassType.MYSTIC, 2, "Elemental Summoner", ELVEN_WIZARD),
    ELVEN_ORACLE(ClassRace.ELF, ClassType.PRIEST, 1, "Elven Oracle", ELVEN_MYSTIC),
    ELVEN_ELDER(ClassRace.ELF, ClassType.PRIEST, 2, "Elven Elder", ELVEN_ORACLE),
    DARK_FIGHTER(ClassRace.DARK_ELF, ClassType.FIGHTER, 0, "Dark Fighter", null),
    PALUS_KNIGHT(ClassRace.DARK_ELF, ClassType.FIGHTER, 1, "Palus Knight", DARK_FIGHTER),
    SHILLIEN_KNIGHT(ClassRace.DARK_ELF, ClassType.FIGHTER, 2, "Shillien Knight", PALUS_KNIGHT),
    BLADEDANCER(ClassRace.DARK_ELF, ClassType.FIGHTER, 2, "Bladedancer", PALUS_KNIGHT),
    ASSASSIN(ClassRace.DARK_ELF, ClassType.FIGHTER, 1, "Assassin", DARK_FIGHTER),
    ABYSS_WALKER(ClassRace.DARK_ELF, ClassType.FIGHTER, 2, "Abyss Walker", ASSASSIN),
    PHANTOM_RANGER(ClassRace.DARK_ELF, ClassType.FIGHTER, 2, "Phantom Ranger", ASSASSIN),
    DARK_MYSTIC(ClassRace.DARK_ELF, ClassType.MYSTIC, 0, "Dark Mystic", null),
    DARK_WIZARD(ClassRace.DARK_ELF, ClassType.MYSTIC, 1, "Dark Wizard", DARK_MYSTIC),
    SPELLHOWLER(ClassRace.DARK_ELF, ClassType.MYSTIC, 2, "Spellhowler", DARK_WIZARD),
    PHANTOM_SUMMONER(ClassRace.DARK_ELF, ClassType.MYSTIC, 2, "Phantom Summoner", DARK_WIZARD),
    SHILLIEN_ORACLE(ClassRace.DARK_ELF, ClassType.PRIEST, 1, "Shillien Oracle", DARK_MYSTIC),
    SHILLIEN_ELDER(ClassRace.DARK_ELF, ClassType.PRIEST, 2, "Shillien Elder", SHILLIEN_ORACLE),
    ORC_FIGHTER(ClassRace.ORC, ClassType.FIGHTER, 0, "Orc Fighter", null),
    ORC_RAIDER(ClassRace.ORC, ClassType.FIGHTER, 1, "Orc Raider", ORC_FIGHTER),
    DESTROYER(ClassRace.ORC, ClassType.FIGHTER, 2, "Destroyer", ORC_RAIDER),
    MONK(ClassRace.ORC, ClassType.FIGHTER, 1, "Monk", ORC_FIGHTER),
    TYRANT(ClassRace.ORC, ClassType.FIGHTER, 2, "Tyrant", MONK),
    ORC_MYSTIC(ClassRace.ORC, ClassType.MYSTIC, 0, "Orc Mystic", null),
    ORC_SHAMAN(ClassRace.ORC, ClassType.MYSTIC, 1, "Orc Shaman", ORC_MYSTIC),
    OVERLORD(ClassRace.ORC, ClassType.MYSTIC, 2, "Overlord", ORC_SHAMAN),
    WARCRYER(ClassRace.ORC, ClassType.MYSTIC, 2, "Warcryer", ORC_SHAMAN),
    DWARVEN_FIGHTER(ClassRace.DWARF, ClassType.FIGHTER, 0, "Dwarven Fighter", null),
    SCAVENGER(ClassRace.DWARF, ClassType.FIGHTER, 1, "Scavenger", DWARVEN_FIGHTER),
    BOUNTY_HUNTER(ClassRace.DWARF, ClassType.FIGHTER, 2, "Bounty Hunter", SCAVENGER),
    ARTISAN(ClassRace.DWARF, ClassType.FIGHTER, 1, "Artisan", DWARVEN_FIGHTER),
    WARSMITH(ClassRace.DWARF, ClassType.FIGHTER, 2, "Warsmith", ARTISAN),

    // ========== CLASSES IMPURAS (substituem DUMMY_1~4) ==========
    IMPURE_FIGHTER(ClassRace.HUMAN, ClassType.FIGHTER, 0, "Impure Fighter", null),       // id=58
    IMPURE_WARRIOR(ClassRace.HUMAN, ClassType.FIGHTER, 1, "Impure Warrior", IMPURE_FIGHTER),  // id=59
    IMPURE_GLADIATOR(ClassRace.HUMAN, ClassType.FIGHTER, 2, "Impure Gladiator", IMPURE_WARRIOR), // id=60
    IMPURE_CHAMPION(ClassRace.HUMAN, ClassType.FIGHTER, 3, "Impure Champion", IMPURE_GLADIATOR), // id=61

    // ========== DUMMYs restantes (62-87) — reservados para futuras classes ==========
    DUMMY_5(null, null, -1, "dummy 5", null),
    DUMMY_6(null, null, -1, "dummy 6", null),
    DUMMY_7(null, null, -1, "dummy 7", null),
    DUMMY_8(null, null, -1, "dummy 8", null),
    DUMMY_9(null, null, -1, "dummy 9", null),
    DUMMY_10(null, null, -1, "dummy 10", null),
    DUMMY_11(null, null, -1, "dummy 11", null),
    DUMMY_12(null, null, -1, "dummy 12", null),
    DUMMY_13(null, null, -1, "dummy 13", null),
    DUMMY_14(null, null, -1, "dummy 14", null),
    DUMMY_15(null, null, -1, "dummy 15", null),
    DUMMY_16(null, null, -1, "dummy 16", null),
    DUMMY_17(null, null, -1, "dummy 17", null),
    DUMMY_18(null, null, -1, "dummy 18", null),
    DUMMY_19(null, null, -1, "dummy 19", null),
    DUMMY_20(null, null, -1, "dummy 20", null),
    DUMMY_21(null, null, -1, "dummy 21", null),
    DUMMY_22(null, null, -1, "dummy 22", null),
    DUMMY_23(null, null, -1, "dummy 23", null),
    DUMMY_24(null, null, -1, "dummy 24", null),
    DUMMY_25(null, null, -1, "dummy 25", null),
    DUMMY_26(null, null, -1, "dummy 26", null),
    DUMMY_27(null, null, -1, "dummy 27", null),
    DUMMY_28(null, null, -1, "dummy 28", null),
    DUMMY_29(null, null, -1, "dummy 29", null),
    DUMMY_30(null, null, -1, "dummy 30", null),

    // ========== 3rd JOB CLASSES (88-118) ==========
    DUELIST(ClassRace.HUMAN, ClassType.FIGHTER, 3, "Duelist", GLADIATOR),
    DREADNOUGHT(ClassRace.HUMAN, ClassType.FIGHTER, 3, "Dreadnought", WARLORD),
    PHOENIX_KNIGHT(ClassRace.HUMAN, ClassType.FIGHTER, 3, "Phoenix Knight", PALADIN),
    HELL_KNIGHT(ClassRace.HUMAN, ClassType.FIGHTER, 3, "Hell Knight", DARK_AVENGER),
    SAGGITARIUS(ClassRace.HUMAN, ClassType.FIGHTER, 3, "Sagittarius", HAWKEYE),
    ADVENTURER(ClassRace.HUMAN, ClassType.FIGHTER, 3, "Adventurer", TREASURE_HUNTER),
    ARCHMAGE(ClassRace.HUMAN, ClassType.MYSTIC, 3, "Archmage", SORCERER),
    SOULTAKER(ClassRace.HUMAN, ClassType.MYSTIC, 3, "Soultaker", NECROMANCER),
    ARCANA_LORD(ClassRace.HUMAN, ClassType.MYSTIC, 3, "Arcana Lord", WARLOCK),
    CARDINAL(ClassRace.HUMAN, ClassType.PRIEST, 3, "Cardinal", BISHOP),
    HIEROPHANT(ClassRace.HUMAN, ClassType.PRIEST, 3, "Hierophant", PROPHET),
    EVAS_TEMPLAR(ClassRace.ELF, ClassType.FIGHTER, 3, "Eva's Templar", TEMPLE_KNIGHT),
    SWORD_MUSE(ClassRace.ELF, ClassType.FIGHTER, 3, "Sword Muse", SWORD_SINGER),
    WIND_RIDER(ClassRace.ELF, ClassType.FIGHTER, 3, "Wind Rider", PLAINS_WALKER),
    MOONLIGHT_SENTINEL(ClassRace.ELF, ClassType.FIGHTER, 3, "Moonlight Sentinel", SILVER_RANGER),
    MYSTIC_MUSE(ClassRace.ELF, ClassType.MYSTIC, 3, "Mystic Muse", SPELLSINGER),
    ELEMENTAL_MASTER(ClassRace.ELF, ClassType.MYSTIC, 3, "Elemental Master", ELEMENTAL_SUMMONER),
    EVAS_SAINT(ClassRace.ELF, ClassType.PRIEST, 3, "Eva's Saint", ELVEN_ELDER),
    SHILLIEN_TEMPLAR(ClassRace.DARK_ELF, ClassType.FIGHTER, 3, "Shillien Templar", SHILLIEN_KNIGHT),
    SPECTRAL_DANCER(ClassRace.DARK_ELF, ClassType.FIGHTER, 3, "Spectral Dancer", BLADEDANCER),
    GHOST_HUNTER(ClassRace.DARK_ELF, ClassType.FIGHTER, 3, "Ghost Hunter", ABYSS_WALKER),
    GHOST_SENTINEL(ClassRace.DARK_ELF, ClassType.FIGHTER, 3, "Ghost Sentinel", PHANTOM_RANGER),
    STORM_SCREAMER(ClassRace.DARK_ELF, ClassType.MYSTIC, 3, "Storm Screamer", SPELLHOWLER),
    SPECTRAL_MASTER(ClassRace.DARK_ELF, ClassType.MYSTIC, 3, "Spectral Master", PHANTOM_SUMMONER),
    SHILLIEN_SAINT(ClassRace.DARK_ELF, ClassType.PRIEST, 3, "Shillien Saint", SHILLIEN_ELDER),
    TITAN(ClassRace.ORC, ClassType.FIGHTER, 3, "Titan", DESTROYER),
    GRAND_KHAVATARI(ClassRace.ORC, ClassType.FIGHTER, 3, "Grand Khavatari", TYRANT),
    DOMINATOR(ClassRace.ORC, ClassType.MYSTIC, 3, "Dominator", OVERLORD),
    DOOMCRYER(ClassRace.ORC, ClassType.MYSTIC, 3, "Doom Cryer", WARCRYER),
    FORTUNE_SEEKER(ClassRace.DWARF, ClassType.FIGHTER, 3, "Fortune Seeker", BOUNTY_HUNTER),
    MAESTRO(ClassRace.DWARF, ClassType.FIGHTER, 3, "Maestro", WARSMITH);

    public static final ClassId[] VALUES;
    private final int _id = this.ordinal();
    private final ClassRace _race;
    private final ClassType _type;
    private final int _level;
    private final String _name;
    private final ClassId _parent;
    private EnumSet<ClassId> _subclasses;

    private ClassId(ClassRace race, ClassType type, int level, String name, ClassId parent) {
        this._race = race;
        this._type = type;
        this._level = level;
        this._name = name;
        this._parent = parent;
    }

    public final int getId() {
        return this._id;
    }

    public final ClassRace getRace() {
        return this._race;
    }

    public final ClassType getType() {
        return this._type;
    }

    public final int level() {
        return this._level;
    }

    public String toString() {
        return this._name;
    }

    public final ClassId getParent() {
        return this._parent;
    }

    public final boolean childOf(ClassId classId) {
        if (this._parent == null) {
            return false;
        }
        if (this._parent == classId) {
            return true;
        }
        return this._parent.childOf(classId);
    }

    public final boolean equalsOrChildOf(ClassId classId) {
        return this == classId || this.childOf(classId);
    }

    private final void createSubclasses() {
        if (this._level != 2) {
            this._subclasses = null;
            return;
        }
        this._subclasses = EnumSet.noneOf(ClassId.class);
        for (ClassId classId : VALUES) {
            if (classId._level != 2 || classId == OVERLORD || classId == WARSMITH || classId == this || this._race == ClassRace.ELF && classId._race == ClassRace.DARK_ELF || this._race == ClassRace.DARK_ELF && classId._race == ClassRace.ELF) continue;
            this._subclasses.add(classId);
        }
        switch (this.ordinal()) {
            case 5:
            case 6:
            case 20:
            case 33: {
                this._subclasses.removeAll(EnumSet.of(DARK_AVENGER, PALADIN, TEMPLE_KNIGHT, SHILLIEN_KNIGHT));
                break;
            }
            case 8:
            case 23:
            case 36: {
                this._subclasses.removeAll(EnumSet.of(TREASURE_HUNTER, ABYSS_WALKER, PLAINS_WALKER));
                break;
            }
            case 9:
            case 24:
            case 37: {
                this._subclasses.removeAll(EnumSet.of(HAWKEYE, SILVER_RANGER, PHANTOM_RANGER));
                break;
            }
            case 14:
            case 28:
            case 41: {
                this._subclasses.removeAll(EnumSet.of(WARLOCK, ELEMENTAL_SUMMONER, PHANTOM_SUMMONER));
                break;
            }
            case 12:
            case 27:
            case 40: {
                this._subclasses.removeAll(EnumSet.of(SORCERER, SPELLSINGER, SPELLHOWLER));
            }
        }
    }

    public static final EnumSet<ClassId> getAvailableSubclasses(Player player) {
        ClassId classId = VALUES[player.getBaseClass()];
        if (classId._level < 2) {
            return null;
        }
        if (classId._level == 3) {
            classId = classId._parent;
        }
        return EnumSet.copyOf(classId._subclasses);
    }

    public static final ClassId getClassById(int classId) {
        try {
            for (ClassId id : ClassId.values()) {
                if (id.getRace() == null || id.ordinal() != classId) continue;
                return id;
            }
        } catch (Exception e) {
            return null;
        }
        return ClassId.values()[0];
    }

    static {
        for (ClassId classId : VALUES = ClassId.values()) {
            classId.createSubclasses();
        }
    }
}
