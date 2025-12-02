/**
 * Outfit Army Command
 * 
 * Equips armies with armor, weapons, runes, or equipment upgrades.
 * Uses prepare/commit pattern for consistent behavior.
 */

import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import type { Army } from '../../../models/Army';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { createEquipmentEffect, getEquipmentDisplayName } from './armyCommands';

/**
 * Outfit Army - Equip army with gear upgrades
 * Applies PF2e effects (armor, runes, weapons, equipment) to army actor
 * Each army can receive each equipment type only once
 * 
 * @param armyId - ID of army to outfit (required)
 * @param equipmentType - Type of equipment: 'armor', 'runes', 'weapons', 'equipment'
 * @param outcome - Action outcome (success, criticalSuccess, failure, criticalFailure)
 * @param fallbackToGold - If true and no valid army, grant 1 gold instead
 * @returns PreparedCommand with preview + commit function
 */
export async function outfitArmy(
  armyId: string,
  equipmentType: string,
  outcome: string,
  fallbackToGold?: boolean
): Promise<PreparedCommand> {
  logger.info(`⚔️ [outfitArmy] PREPARING to outfit army ${armyId} with ${equipmentType} (outcome: ${outcome}, fallback: ${fallbackToGold})`);

  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Validate equipment type
  const validTypes = ['armor', 'runes', 'weapons', 'equipment'];
  if (!validTypes.includes(equipmentType)) {
    throw new Error(`Invalid equipment type: ${equipmentType}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Find the army
  const army = kingdom.armies?.find((a: Army) => a.id === armyId);
  if (!army) {
    // Fallback to gold if enabled
    if (fallbackToGold) {
      logger.info(`💰 [outfitArmy] Army not found, fallback to 1 gold`);
      return {
        outcomeBadge: {
          icon: 'fa-coins',
          template: 'Received {{value}}',
          value: { type: 'static', amount: 1 },
          suffix: 'Gold (army not available)',
          variant: 'positive'
        },
        commit: async () => {
          await updateKingdom(k => {
            k.resources.gold = (k.resources.gold || 0) + 1;
          });
          logger.info(`✅ [outfitArmy] Granted 1 gold as fallback`);
        }
      };
    }
    
    throw new Error(`Army ${armyId} not found`);
  }

  if (!army.actorId) {
    throw new Error(`${army.name} has no linked NPC actor`);
  }

  // Check if army already has this equipment
  const equipmentKey = equipmentType as keyof typeof army.equipment;
  if (army.equipment?.[equipmentKey]) {
    throw new Error(`${army.name} already has ${equipmentType} upgrade`);
  }

  // Failure outcomes: No effect
  if (outcome === 'failure' || outcome === 'criticalFailure') {
    const message = outcome === 'failure'
      ? `Failed to outfit ${army.name}`
      : `Suppliers took the gold, no equipment provided`;
    
    return {
      outcomeBadge: {
        icon: 'fa-times-circle',
        template: message,
        variant: 'negative'
      },
      commit: async () => {
        logger.info(`✅ [outfitArmy] ${message} - no changes`);
      }
    };
  }

  // Success/Critical Success: Apply equipment upgrade
  const bonus = outcome === 'criticalSuccess' ? 2 : 1;
  const equipmentName = getEquipmentDisplayName(equipmentType);
  const bonusText = bonus === 2 ? ' (exceptional, +2)' : '';

  return {
    outcomeBadge: {
      icon: 'fa-shield-alt',
      template: `Outfitting ${army.name} with ${equipmentName}${bonusText}`,
      variant: 'positive'
    },
    commit: async () => {
      logger.info(`⚔️ [outfitArmy] COMMITTING: Applying ${equipmentType} (+${bonus}) to ${army.name}`);

      // Create PF2e effect with Rule Elements
      const effectData = createEquipmentEffect(equipmentType, bonus);

      // Add effect to army actor
      const { armyService } = await import('../../army');
      await armyService.addItemToArmy(army.actorId!, effectData);

      // Mark equipment as applied in kingdom data
      await updateKingdom(k => {
        const a = k.armies?.find((army: Army) => army.id === armyId);
        if (a) {
          if (!a.equipment) a.equipment = {};
          a.equipment[equipmentKey] = true;
        }
      });

      logger.info(`✅ [outfitArmy] Successfully applied ${equipmentType} (+${bonus}) to ${army.name}`);
    }
  };
}


