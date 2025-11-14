/**
 * recruitArmy execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { logger } from '../../utils/Logger';

/**
 * Execute army recruitment
 *
 * @param armyData - Army configuration data
 */
export async function recruitArmyExecution(
  armyData: {
    name: string;
    level: number;
    type: string;
    image: string;
    settlementId?: string;
    exemptFromUpkeep?: boolean;
    supportedBy?: string;
  }
): Promise<void> {
  logger.info(`🎖️ [recruitArmyExecution] Creating ${armyData.name}`);

  const { armyService } = await import('../../services/army');
  const { ARMY_TYPES } = await import('../../utils/armyHelpers');

  // Create the army
  const createdArmy = await armyService.createArmy(armyData.name, armyData.level, {
    type: armyData.type,
    image: armyData.image,
    settlementId: armyData.settlementId,
    exemptFromUpkeep: armyData.exemptFromUpkeep,
    supportedBy: armyData.supportedBy  // Pass faction name for allied armies
  });

  // Add "Allied Army" effect if exempt from upkeep
  if (armyData.exemptFromUpkeep && createdArmy.actorId) {
    const game = (globalThis as any).game;
    const armyActor = game.actors.get(createdArmy.actorId);

    if (armyActor) {
      await armyActor.createEmbeddedDocuments('Item', [{
        type: 'effect',
        name: 'Allied Army',
        img: 'icons/sundries/flags/banner-standard-green.webp',
        system: {
          slug: 'allied-army',
          badge: null,
          description: {
            value: '<p>This army is provided by an allied faction and does not count toward your kingdom\'s army upkeep costs. If relations with the ally drop below Friendly, the army returns home.</p>'
          },
          duration: {
            value: -1,
            unit: 'unlimited',
            sustained: false,
            expiry: null
          },
          rules: []
        }
      }]);

      logger.info(`✨ [recruitArmyExecution] Added Allied Army effect to ${armyData.name}`);
    }
  }

  logger.info(`✅ [recruitArmyExecution] Successfully recruited ${armyData.name}`);
}
