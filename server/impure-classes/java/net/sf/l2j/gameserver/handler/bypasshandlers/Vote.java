package net.sf.l2j.gameserver.handler.bypasshandlers;

import net.sf.l2j.gameserver.handler.IBypassHandler;
import net.sf.l2j.gameserver.model.actor.Player;
import net.sf.l2j.gameserver.model.vote.VoteManager;

public class Vote implements IBypassHandler {
    private static final String[] COMMANDS = { "vote_main", "vote_open", "vote_claim", "vote_exchange" };

    @Override
    public boolean handleBypass(String command, Player player) {
        if (player == null) return false;

        if (command.equals("vote_main")) {
            VoteManager.getInstance().showMainPopup(player);
            return true;
        }
        if (command.startsWith("vote_open ")) {
            String site = command.substring("vote_open ".length()).trim();
            VoteManager.getInstance().openVoteUrl(player, site);
            return true;
        }
        if (command.startsWith("vote_claim ")) {
            String site = command.substring("vote_claim ".length()).trim();
            VoteManager.getInstance().claimReward(player, site);
            return true;
        }
        if (command.equals("vote_exchange")) {
            VoteManager.getInstance().exchange(player);
            return true;
        }
        return false;
    }

    @Override
    public String[] getBypassHandlersList() {
        return COMMANDS;
    }
}
