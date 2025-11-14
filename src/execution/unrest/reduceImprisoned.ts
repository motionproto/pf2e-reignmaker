/**
 * reduceImprisoned execution function
 *
 * Extracted from immediate-execute pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute imprisoned unrest reduction
 *
 * @param settlementId - Settlement ID containing prisoners
 * @param amount - Amount to reduce (numeric value or 'all')
 */
export async function reduceImprisonedExecution(
  settlementId: string,
  amount: number | 'all'
): Promise<{ amountReduced: number; remainingImprisoned: number }> {
  logger.info(`⚖️ [reduceImprisonedExecution] Reducing imprisoned unrest in settlement ${settlementId} by ${amount}`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Find the settlement
  const settlement = kingdom.settlements?.find((s: any) => s.id === settlementId);
  if (!settlement) {
    throw new Error(`Settlement ${settlementId} not found`);
  }

  const currentImprisoned = settlement.imprisonedUnrest || 0;
  if (currentImprisoned === 0) {
    return { amountReduced: 0, remainingImprisoned: 0 };
  }

  // Calculate amount to reduce
  const amountToReduce = amount === 'all' ? currentImprisoned : Math.min(amount, currentImprisoned);

  // Update settlement imprisoned unrest
  await updateKingdom(kingdom => {
    const settlement = kingdom.settlements?.find(s => s.id === settlementId);
    if (settlement) {
      settlement.imprisonedUnrest = Math.max(0, (settlement.imprisonedUnrest || 0) - amountToReduce);
    }
  });

  logger.info(`✅ [reduceImprisonedExecution] Reduced ${amountToReduce} imprisoned unrest`);

  return {
    amountReduced: amountToReduce,
    remainingImprisoned: Math.max(0, currentImprisoned - amountToReduce)
  };
}
