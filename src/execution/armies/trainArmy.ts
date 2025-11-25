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

  // Helper function to remove effect by slug
  async function removeEffectBySlug(actorId: string, slug: string): Promise<void> {
    const game = (globalThis as any).game;
    const actor = game?.actors?.get(actorId);
    if (!actor) {
      logger.warn(`⚠️ [trainArmyExecution] Actor not found: ${actorId}`);
      return;
    }

    // Find item by slug - actor.items is a Collection/Map
    const items = Array.from(actor.items.values());
    logger.info(`🔍 [trainArmyExecution] Searching for effect with slug "${slug}" in ${items.length} items on actor "${actor.name}"`);
    
    const item = items.find((i: any) => {
      const itemSlug = i.system?.slug;
      return itemSlug === slug;
    });
    
    if (item) {
      logger.info(`🗑️ [trainArmyExecution] Found effect "${item.name}" (id: ${item.id}), removing...`);
      // Use armyService to remove item (handles permissions and HMR properly)
      await armyService.removeItemFromArmy(actorId, item.id);
      logger.info(`✅ [trainArmyExecution] Successfully removed effect "${item.name}" (slug: "${slug}")`);
    } else {
      logger.info(`ℹ️ [trainArmyExecution] No effect found with slug "${slug}" on actor "${actor.name}"`);
    }
  }

  // Apply training effects based on outcome (permanent effects)
  // ✅ FIX: Use armyService.addItemToArmy like outfit-army does (works with HMR)
  if (outcome === 'criticalSuccess') {
    // Remove Poorly Trained if it exists
    await removeEffectBySlug(army.actorId, 'poorly-trained');
    
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
    // Remove Well Trained if it exists
    await removeEffectBySlug(army.actorId, 'well-trained');
    
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
