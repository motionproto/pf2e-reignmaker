/**
 * applyArmyCondition execution function
 *
 * Applies a condition (sickened, enfeebled, frightened, etc.) to an army.
 * Used by events like Food Shortage and Natural Disaster.
 */

import { logger } from '../../utils/Logger';
import { armyService } from '../../services/army';

// Condition definitions with PF2e system data
const CONDITION_DEFINITIONS: Record<string, {
  name: string;
  slug: string;
  img: string;
  description: string;
}> = {
  sickened: {
    name: 'Sickened',
    slug: 'sickened',
    img: 'systems/pf2e/icons/conditions/sickened.webp',
    description: '<p>You feel ill and your body is weakened.</p>'
  },
  enfeebled: {
    name: 'Enfeebled',
    slug: 'enfeebled',
    img: 'systems/pf2e/icons/conditions/enfeebled.webp',
    description: '<p>You\'re physically weakened.</p>'
  },
  frightened: {
    name: 'Frightened',
    slug: 'frightened',
    img: 'systems/pf2e/icons/conditions/frightened.webp',
    description: '<p>You\'re gripped by fear.</p>'
  },
  clumsy: {
    name: 'Clumsy',
    slug: 'clumsy',
    img: 'systems/pf2e/icons/conditions/clumsy.webp',
    description: '<p>Your movements are impaired.</p>'
  },
  fatigued: {
    name: 'Fatigued',
    slug: 'fatigued',
    img: 'systems/pf2e/icons/conditions/fatigued.webp',
    description: '<p>You\'re tired and less capable.</p>'
  }
};

/**
 * Apply a condition to an army actor
 *
 * @param actorId - The Foundry actor ID for the army
 * @param condition - The condition slug (sickened, enfeebled, frightened, clumsy, fatigued)
 * @param value - The condition value (default 1)
 */
export async function applyArmyConditionExecution(
  actorId: string,
  condition: string,
  value: number = 1
): Promise<void> {
  logger.info(`🎖️ [applyArmyConditionExecution] Applying ${condition} ${value} to army actor ${actorId}`);

  const game = (globalThis as any).game;
  const actor = game?.actors?.get(actorId) as any;
  if (!actor) {
    logger.warn(`⚠️ [applyArmyConditionExecution] Actor not found: ${actorId}`);
    return;
  }

  const conditionDef = CONDITION_DEFINITIONS[condition];
  if (!conditionDef) {
    logger.warn(`⚠️ [applyArmyConditionExecution] Unknown condition: ${condition}`);
    return;
  }

  // Check if condition already exists
  const items = Array.from(actor.items.values()) as any[];
  const existingCondition = items.find((i: any) => i.system?.slug === conditionDef.slug);

  if (existingCondition) {
    // Increase existing condition value
    const currentValue = existingCondition.system?.badge?.value || 1;
    const newValue = currentValue + value;

    await armyService.updateItemOnArmy(actorId, existingCondition.id, {
      'system.badge.value': newValue
    });

    logger.info(`⚠️ [applyArmyConditionExecution] Increased ${condition} from ${currentValue} to ${newValue}`);
  } else {
    // Add new condition
    const conditionItem = {
      name: conditionDef.name,
      type: 'condition',
      img: conditionDef.img,
      system: {
        slug: conditionDef.slug,
        badge: { value },
        description: {
          value: conditionDef.description
        },
        duration: {
          value: -1,
          unit: 'unlimited',
          sustained: false,
          expiry: null
        }
      }
    };

    await armyService.addItemToArmy(actorId, conditionItem as any);
    logger.info(`⚠️ [applyArmyConditionExecution] Applied ${condition} ${value} condition`);
  }

  logger.info(`✅ [applyArmyConditionExecution] Condition applied successfully`);
}
