/*
 * L2 Impure - NewCharacter.java MODIFICADO
 * Alteração: Adicionado IMPURE_FIGHTER na lista de classes da tela de criação
 */
package net.sf.l2j.gameserver.network.clientpackets;

import net.sf.l2j.gameserver.data.xml.PlayerData;
import net.sf.l2j.gameserver.enums.actors.ClassId;
import net.sf.l2j.gameserver.network.serverpackets.CharTemplates;

public final class NewCharacter extends L2GameClientPacket {
    protected void readImpl() {
    }

    protected void runImpl() {
        CharTemplates ct = new CharTemplates();
        ct.addChar(PlayerData.getInstance().getTemplate(0));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.HUMAN_FIGHTER));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.HUMAN_MYSTIC));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.ELVEN_FIGHTER));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.ELVEN_MYSTIC));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.DARK_FIGHTER));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.DARK_MYSTIC));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.ORC_FIGHTER));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.ORC_MYSTIC));
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.DWARVEN_FIGHTER));

        // ========== CLASSE IMPURA ==========
        ct.addChar(PlayerData.getInstance().getTemplate(ClassId.IMPURE_FIGHTER));

        this.sendPacket(ct);
    }
}
