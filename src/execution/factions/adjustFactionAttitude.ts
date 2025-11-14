/**
 * adjustFactionAttitude execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { updateKingdom, getKingdomActor } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';
import type { AttitudeLevel } from '../../models/Faction';

/**
 * Execute faction attitude adjustment
 *
 * @param factionId - ID of faction to adjust (null = random eligible faction)
 * @param steps - Number of steps to adjust (positive = improve, negative = worsen)
 * @param options - Optional constraints (maxLevel, minLevel, count)
 */
export async function adjustFactionAttitudeExecution(
  factionId: string | null,
  steps: number,
  options?: {
    maxLevel?: AttitudeLevel;
    minLevel?: AttitudeLevel;
    count?: number;
  }
): Promise<void> {
  logger.info(`🤝 [adjustFactionAttitudeExecution] Adjusting faction ${factionId || 'random'} by ${steps} steps`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Import faction service and helpers
  const { factionService } = await import('../../services/factions');
  const { adjustAttitudeBySteps } = await import('../../utils/faction-attitude-adjuster');

  // Determine target faction(s)
  let targetFactions: string[] = [];

  if (factionId) {
    // Specific faction
    targetFactions = [factionId];
  } else {
    // Random faction - filter by constraints
    const allFactions = kingdom.factions || [];
    const count = options?.count || 1;

    const eligibleFactions = allFactions.filter((f: any) => {
      // Calculate what the new attitude would be
      const nextLevel = adjustAttitudeBySteps(f.attitude, steps, {
        maxLevel: options?.maxLevel,
        minLevel: options?.minLevel
      });

      // If adjustment returns null, this faction is not eligible
      if (!nextLevel) {
        return false;
      }

      return true;
    });

    // Select random factions
    const shuffled = [...eligibleFactions].sort(() => Math.random() - 0.5);
    targetFactions = shuffled.slice(0, count).map(f => f.id);
  }

  // Apply attitude adjustments
  for (const targetId of targetFactions) {
    const result = await factionService.adjustAttitude(targetId, steps, {
      maxLevel: options?.maxLevel,
      minLevel: options?.minLevel
    });

    if (result.success) {
      logger.info(`🤝 [adjustFactionAttitudeExecution] Adjusted faction ${targetId} from ${result.oldAttitude} to ${result.newAttitude}`);
    } else {
      logger.warn(`⚠️ [adjustFactionAttitudeExecution] Failed to adjust faction ${targetId}: ${result.reason}`);
    }
  }

  logger.info(`✅ [adjustFactionAttitudeExecution] Successfully adjusted ${targetFactions.length} faction(s)`);
}
