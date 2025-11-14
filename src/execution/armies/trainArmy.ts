/**
 * trainArmy execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { logger } from '../../utils/Logger';
import { getKingdomActor } from '../../stores/KingdomStore';

/**
 * Execute army training
 *
 * @param armyId - ID of army to train
 * @param partyLevel - Current party level to train to
 * @param outcome - Action outcome for determining training bonuses
 */
export async function trainArmyExecution(
  armyId: string,
  partyLevel: number,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
): Promise<void> {
  logger.info(`🎖️ [trainArmyExecution] Training army ${armyId} to level ${partyLevel} (${outcome})`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  const { armyService } = await import('../../services/army');

  // Level up army to party level
  await armyService.levelUpArmy(armyId, partyLevel);

  // Apply training bonuses based on outcome
  const army = kingdom.armies?.find((a: any) => a.id === armyId);
  if (!army?.actorId) {
    logger.warn(`⚠️ [trainArmyExecution] Army ${armyId} has no linked actor for training bonuses`);
    return;
  }

  const game = (globalThis as any).game;
  const armyActor = game.actors.get(army.actorId);
  if (!armyActor) {
    logger.warn(`⚠️ [trainArmyExecution] Could not find actor for army ${armyId}`);
    return;
  }

  // Apply training effect based on outcome
  if (outcome === 'criticalSuccess') {
    // +2 to attacks and AC for 1 month
    await armyActor.createEmbeddedDocuments('Item', [{
      type: 'effect',
      name: 'Elite Training',
      img: 'icons/skills/melee/blade-tips-triple-steel.webp',
      system: {
        slug: 'elite-training',
        badge: { value: 2 },
        description: {
          value: '<p>Exceptional training provides +2 to attack rolls and AC.</p>'
        },
        duration: {
          value: 1,
          unit: 'months',
          sustained: false,
          expiry: 'turn-end'
        },
        rules: [
          {
            key: 'FlatModifier',
            selector: 'attack',
            value: 2,
            type: 'circumstance'
          },
          {
            key: 'FlatModifier',
            selector: 'ac',
            value: 2,
            type: 'circumstance'
          }
        ]
      }
    }]);
    logger.info(`✨ [trainArmyExecution] Applied Elite Training effect (+2 attack/AC)`);
  } else if (outcome === 'success') {
    // +1 to attacks for 1 month
    await armyActor.createEmbeddedDocuments('Item', [{
      type: 'effect',
      name: 'Standard Training',
      img: 'icons/skills/melee/sword-shield-stylized-white.webp',
      system: {
        slug: 'standard-training',
        badge: { value: 1 },
        description: {
          value: '<p>Standard training provides +1 to attack rolls.</p>'
        },
        duration: {
          value: 1,
          unit: 'months',
          sustained: false,
          expiry: 'turn-end'
        },
        rules: [
          {
            key: 'FlatModifier',
            selector: 'attack',
            value: 1,
            type: 'circumstance'
          }
        ]
      }
    }]);
    logger.info(`✨ [trainArmyExecution] Applied Standard Training effect (+1 attack)`);
  }
  // Failure/critical failure: No bonus effect

  logger.info(`✅ [trainArmyExecution] Successfully trained army`);
}
