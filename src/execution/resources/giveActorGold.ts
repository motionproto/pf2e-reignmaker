/**
 * giveActorGold execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 * Global variables have been eliminated (replaced with CheckContext.metadata).
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute gold transfer from kingdom to player character
 *
 * @param transfer - Transfer configuration
 */
export async function giveActorGoldExecution(
  transfer: {
    actorId: string;
    goldAmount: number;
    kingdomGoldCost: number;
  }
): Promise<void> {
  logger.info(`💰 [giveActorGoldExecution] Transferring ${transfer.goldAmount} gold to actor ${transfer.actorId}`);

  // Deduct gold from kingdom
  await updateKingdom(kingdom => {
    kingdom.resources.gold = (kingdom.resources.gold || 0) - transfer.kingdomGoldCost;
  });

  // Add gold to player character
  const game = (globalThis as any).game;
  const character = game.actors.get(transfer.actorId);

  if (!character) {
    throw new Error(`Character ${transfer.actorId} not found`);
  }

  const currentGold = character.system.currency?.gp || 0;
  await character.update({
    "system.currency.gp": currentGold + transfer.goldAmount
  });

  logger.info(`✅ [giveActorGoldExecution] Successfully transferred gold (Kingdom: -${transfer.kingdomGoldCost}, Player: +${transfer.goldAmount})`);
}
