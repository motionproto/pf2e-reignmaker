/**
 * disbandArmy execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { logger } from '../../utils/Logger';

/**
 * Execute army disbanding
 *
 * @param armyId - ID of army to disband
 * @param deleteActor - Whether to delete the linked NPC actor (default: true)
 */
export async function disbandArmyExecution(
  armyId: string,
  deleteActor: boolean = true
): Promise<void> {
  logger.info(`🪖 [disbandArmyExecution] Disbanding army ${armyId}`);

  // Execute actual disband (delegates to armyService)
  const { armyService } = await import('../../services/army');
  await armyService.disbandArmy(armyId, deleteActor);

  logger.info(`✅ [disbandArmyExecution] Successfully disbanded army`);
}
