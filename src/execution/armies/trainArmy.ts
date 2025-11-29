/**
 * trainArmy execution function
 *
 * Extracted from prepare/commit pattern - pure execution logic only.
 * Preview logic has been moved to pipeline configuration.
 */

import { logger } from '../../utils/Logger';
import { getKingdomActor } from '../../stores/KingdomStore';
import { removeEffectFromActor } from '../../services/commands/combat/conditionHelpers';

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

  // Get army for applying effects
  const army = kingdom.armies?.find((a: any) => a.id === armyId);
  if (!army?.actorId) {
    logger.warn(`⚠️ [trainArmyExecution] Army ${armyId} has no linked actor for training effects`);
    return;
  }

  // ✅ FIX: Only level up army on success or critical success
  // Failure and critical failure: No level increase
  if (outcome === 'criticalSuccess' || outcome === 'success') {
    // Level up army to party level
    await armyService.updateArmyLevel(armyId, partyLevel);
    logger.info(`📈 [trainArmyExecution] Army leveled up to ${partyLevel}`);
  } else {
    logger.info(`⚠️ [trainArmyExecution] Training failed - no level increase`);
  }

  // Get Foundry actor for applying effects
  const game = (globalThis as any).game;
  const armyActor = game?.actors?.get(army.actorId);
  if (!armyActor) {
    logger.warn(`⚠️ [trainArmyExecution] Actor not found: ${army.actorId}`);
    return;
  }

  // Apply training effects based on outcome (permanent effects)
  // ✅ FIX: Use armyService.addItemToArmy like outfit-army does (works with HMR)
  if (outcome === 'criticalSuccess') {
    // Remove Poorly Trained and existing Well Trained if they exist (prevents stacking)
    await removeEffectFromActor(armyActor, 'poorly-trained');
    await removeEffectFromActor(armyActor, 'well-trained');
    
    // +1 to all saving throws (Well Trained effect - permanent)
    const wellTrainedEffect = {
      type: 'effect',
      name: 'Well Trained',
      img: 'icons/magic/life/cross-worn-green.webp',
      system: {
        slug: 'well-trained',
        badge: { value: 1 },
        description: {
          value: '<p>Exceptional training provides +1 to all saving throws.</p>'
        },
        duration: {
          value: -1,
          unit: 'unlimited',
          sustained: false,
          expiry: null
        },
        rules: [
          {
            key: 'FlatModifier',
            selector: 'saving-throw',
            value: 1,
            type: 'circumstance'
          }
        ]
      }
    };
    await armyService.addItemToArmy(army.actorId, wellTrainedEffect);
    logger.info(`✨ [trainArmyExecution] Applied Well Trained effect (+1 to all saving throws)`);
  } else if (outcome === 'success') {
    // Success: Only level up, no additional effect
    logger.info(`✨ [trainArmyExecution] Army leveled up (no additional training effect)`);
  } else if (outcome === 'criticalFailure') {
    // Remove Well Trained and existing Poorly Trained if they exist (prevents stacking)
    await removeEffectFromActor(armyActor, 'well-trained');
    await removeEffectFromActor(armyActor, 'poorly-trained');
    
    // -1 to all saving throws (Poorly Trained - permanent)
    const poorlyTrainedEffect = {
      type: 'effect',
      name: 'Poorly Trained',
      img: 'icons/magic/movement/chevrons-down-yellow.webp',
      system: {
        slug: 'poorly-trained',
        badge: { value: -1 },
        description: {
          value: '<p>Poor training results in -1 to all saving throws.</p>'
        },
        duration: {
          value: -1,
          unit: 'unlimited',
          sustained: false,
          expiry: null
        },
        rules: [
          {
            key: 'FlatModifier',
            selector: 'saving-throw',
            value: -1,
            type: 'circumstance'
          }
        ]
      }
    };
    await armyService.addItemToArmy(army.actorId, poorlyTrainedEffect);
    logger.info(`⚠️ [trainArmyExecution] Applied Poorly Trained effect (-1 to all saving throws)`);
  }
  // Failure: No effect

  logger.info(`✅ [trainArmyExecution] Successfully trained army`);
}
