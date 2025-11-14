/**
 * releaseImprisoned execution function
 *
 * Extracted from immediate-execute pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

/**
 * Execute imprisoned unrest release
 *
 * @param percentage - Percentage to release (0.5 = half, 1 or 'all' = all)
 */
export async function releaseImprisonedExecution(percentage: number | 'all'): Promise<{ released: number }> {
  logger.info(`🔓 [releaseImprisonedExecution] Releasing ${percentage === 'all' ? 'all' : percentage * 100 + '%'} imprisoned unrest`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Calculate total imprisoned unrest across all settlements
  let totalImprisoned = 0;
  for (const settlement of kingdom.settlements || []) {
    totalImprisoned += settlement.imprisonedUnrest || 0;
  }

  if (totalImprisoned === 0) {
    return { released: 0 };
  }

  // Calculate amount to release
  const releasePercentage = percentage === 'all' ? 1 : percentage;
  const amountToRelease = Math.floor(totalImprisoned * releasePercentage);

  if (amountToRelease === 0) {
    return { released: 0 };
  }

  // Release imprisoned unrest from settlements and convert to regular unrest
  await updateKingdom(k => {
    let remaining = amountToRelease;

    // Release from each settlement proportionally
    for (const settlement of k.settlements || []) {
      if (remaining <= 0) break;

      const currentImprisoned = settlement.imprisonedUnrest || 0;
      if (currentImprisoned === 0) continue;

      const toRelease = Math.min(remaining, Math.ceil(currentImprisoned * releasePercentage));
      settlement.imprisonedUnrest = Math.max(0, currentImprisoned - toRelease);
      remaining -= toRelease;

      logger.info(`  🔓 Released ${toRelease} imprisoned unrest from ${settlement.name}`);
    }

    // Add released unrest to kingdom unrest
    k.unrest = (k.unrest || 0) + amountToRelease;
    logger.info(`  ⚠️ Added ${amountToRelease} to kingdom unrest (now ${k.unrest})`);
  });

  logger.info(`✅ [releaseImprisonedExecution] Released ${amountToRelease} imprisoned unrest`);

  return { released: amountToRelease };
}
