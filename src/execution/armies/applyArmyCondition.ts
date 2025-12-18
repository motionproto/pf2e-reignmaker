/**
 * applyArmyCondition execution function
 *
 * Applies conditions or custom effects to an army.
 * Supports both PF2e conditions (sickened, enfeebled, etc.) and custom effects (well-trained, poorly-trained).
 * Used by events like Food Shortage, Natural Disaster, Pilgrimage, etc.
 */

import { logger } from '../../utils/Logger';
import { armyService } from '../../services/army';
import { removeEffectFromActor } from '../../services/commands/combat/conditionHelpers';

// Definition for conditions and effects
interface ConditionDefinition {
  name: string;
  slug: string;
  img: string;
  description: string;
  itemType: 'condition' | 'effect';
  // For effects that apply rules (like flat modifiers)
  rules?: Array<{
    key: string;
    selector: string;
    value: number;
    type: string;
  }>;
  // Slug of mutually exclusive condition/effect (applying this removes the other)
  excludes?: string;
  // Whether the value can stack (increase when reapplied)
  stackable?: boolean;
}

// Condition and effect definitions with PF2e system data
const CONDITION_DEFINITIONS: Record<string, ConditionDefinition> = {
  // Standard PF2e conditions
  sickened: {
    name: 'Sickened',
    slug: 'sickened',
    img: 'systems/pf2e/icons/conditions/sickened.webp',
    description: '<p>You feel ill and your body is weakened.</p>',
    itemType: 'condition',
    stackable: true
  },
  enfeebled: {
    name: 'Enfeebled',
    slug: 'enfeebled',
    img: 'systems/pf2e/icons/conditions/enfeebled.webp',
    description: '<p>You\'re physically weakened.</p>',
    itemType: 'condition',
    stackable: true
  },
  frightened: {
    name: 'Frightened',
    slug: 'frightened',
    img: 'systems/pf2e/icons/conditions/frightened.webp',
    description: '<p>You\'re gripped by fear.</p>',
    itemType: 'condition',
    stackable: true
  },
  clumsy: {
    name: 'Clumsy',
    slug: 'clumsy',
    img: 'systems/pf2e/icons/conditions/clumsy.webp',
    description: '<p>Your movements are impaired.</p>',
    itemType: 'condition',
    stackable: true
  },
  fatigued: {
    name: 'Fatigued',
    slug: 'fatigued',
    img: 'systems/pf2e/icons/conditions/fatigued.webp',
    description: '<p>You\'re tired and less capable.</p>',
    itemType: 'condition',
    stackable: false
  },
  // Custom army effects
  'well-trained': {
    name: 'Well Trained',
    slug: 'well-trained',
    img: 'icons/magic/life/cross-worn-green.webp',
    description: '<p>Exceptional training provides +1 to all saving throws.</p>',
    itemType: 'effect',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'saving-throw',
        value: 1,
        type: 'circumstance'
      }
    ],
    excludes: 'poorly-trained',
    stackable: true
  },
  'poorly-trained': {
    name: 'Poorly Trained',
    slug: 'poorly-trained',
    img: 'icons/magic/death/skull-humanoid-white-red.webp',
    description: '<p>Poor training imposes -1 to all saving throws.</p>',
    itemType: 'effect',
    rules: [
      {
        key: 'FlatModifier',
        selector: 'saving-throw',
        value: -1,
        type: 'circumstance'
      }
    ],
    excludes: 'well-trained',
    stackable: true
  }
};

/**
 * Apply a condition or effect to an army actor
 *
 * @param actorId - The Foundry actor ID for the army
 * @param condition - The condition/effect slug (sickened, enfeebled, well-trained, etc.)
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

  // Remove mutually exclusive condition/effect if it exists
  if (conditionDef.excludes) {
    await removeEffectFromActor(actor, conditionDef.excludes);
    logger.info(`🔄 [applyArmyConditionExecution] Removed mutually exclusive ${conditionDef.excludes}`);
  }

  // Check if condition/effect already exists
  const items = Array.from(actor.items.values()) as any[];
  const existingItem = items.find((i: any) => i.system?.slug === conditionDef.slug);

  if (existingItem && conditionDef.stackable) {
    // Increase existing condition/effect value
    const currentValue = existingItem.system?.badge?.value || 1;
    const newValue = currentValue + value;

    // Build update data
    const updateData: Record<string, any> = {
      'system.badge.value': newValue
    };

    // Update rules with new value if this is an effect with rules
    if (conditionDef.rules && conditionDef.rules.length > 0) {
      updateData['system.rules'] = conditionDef.rules.map(rule => ({
        ...rule,
        value: rule.value > 0 ? newValue : -newValue
      }));
    }

    await armyService.updateItemOnArmy(actorId, existingItem.id, updateData);

    logger.info(`🔼 [applyArmyConditionExecution] Increased ${condition} from ${currentValue} to ${newValue}`);
  } else if (!existingItem) {
    // Add new condition/effect
    const itemData: Record<string, any> = {
      name: conditionDef.name,
      type: conditionDef.itemType,
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

    // Add rules for effects that have them
    if (conditionDef.rules && conditionDef.rules.length > 0) {
      itemData.system.rules = conditionDef.rules.map(rule => ({
        ...rule,
        value: rule.value > 0 ? value : -value
      }));
    }

    await armyService.addItemToArmy(actorId, itemData as any);
    logger.info(`✨ [applyArmyConditionExecution] Applied ${condition} ${value}`);
  } else {
    // Non-stackable and already exists - no action needed
    logger.info(`ℹ️ [applyArmyConditionExecution] ${condition} already exists and is non-stackable`);
  }

  logger.info(`✅ [applyArmyConditionExecution] ${conditionDef.name} applied successfully`);
}
