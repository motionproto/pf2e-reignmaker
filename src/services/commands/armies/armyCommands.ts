/**
 * Army Commands
 * 
 * Handles army-related game commands:
 * - recruitArmy: Create new army with prepare/commit pattern
 * - disbandArmy: Remove army with prepare/commit pattern
 * - trainArmy: Level up army with prepare/commit pattern
 * - outfitArmy: Equipment upgrades (legacy ResolveResult for interactive prompts)
 * - deployArmy: Move army with animation (legacy ResolveResult)
 * - Helper functions for party level, equipment effects
 */

import { updateKingdom, getKingdomActor } from '../../../stores/KingdomStore';
import type { Army } from '../../buildQueue/BuildProject';
import { logger } from '../../../utils/Logger';
import type { PreparedCommand } from '../../../types/game-commands';
import type { ResolveResult } from '../types';
import { calculateRandomNearbyHex, applyConditionToActor } from '../combat/conditionHelpers';

/**
 * Recruit Army - Create a new army unit at specified level with NPC actor
 * Uses pending data from globalThis.__pendingRecruitArmy (set by dialog)
 * REFACTORED: Uses prepare/commit pattern
 * 
 * @param level - Army level (typically party level)
 * @param name - Optional custom name for the army (deprecated, use pending data)
 * @param exemptFromUpkeep - If true, army is allied and exempt from upkeep costs
 * @returns PreparedCommand with preview + commit function
 */
export async function recruitArmy(level: number, name?: string, exemptFromUpkeep?: boolean): Promise<PreparedCommand> {
  logger.info(`🎖️ [recruitArmy] PREPARING recruitment at level ${level} (exempt: ${exemptFromUpkeep})`);
  
  // PHASE 1: PREPARE - Validate everything needed for preview (NO state changes)
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  if (level < 1) {
    throw new Error('Army level must be at least 1');
  }

  const pendingData = (globalThis as any).__pendingRecruitArmy;
  if (!pendingData) {
    throw new Error('No army recruitment data available');
  }

  const { name: armyName, settlementId, armyType } = pendingData;

  // Army limit validation is done at faction selection dialog (RequestMilitaryAidDialog.svelte)
  // so we don't need to check here - if we got this far, the faction is eligible

  const { ARMY_TYPES } = await import('../../../utils/armyHelpers');
  if (!ARMY_TYPES[armyType as keyof typeof ARMY_TYPES]) {
    throw new Error(`Invalid army type: ${armyType}`);
  }

  // Get settlement name for message
  let settlementName = '';
  if (settlementId) {
    const kingdom = actor.getKingdomData();
    const settlement = kingdom?.settlements?.find((s: any) => s.id === settlementId);
    if (settlement) {
      settlementName = settlement.name;
    }
  }
  
  const message = exemptFromUpkeep
    ? `Allied reinforcements arrive: ${armyName} (no upkeep cost)`
    : (settlementName 
        ? `Recruited ${armyName} in ${settlementName}`
        : `Recruited ${armyName} (no settlement support)`);
  
  logger.info(`🎖️ [recruitArmy] PREPARED: ${message}`);

  // PHASE 2: RETURN - Preview data + commit function
  return {
    outcomeBadge: {
      icon: exemptFromUpkeep ? 'fa-handshake' : 'fa-shield-alt',
      template: exemptFromUpkeep ? 'Allied reinforcements: {{value}} {{name}}' : 'Recruited {{value}} {{name}}',
      value: { type: 'static', amount: 1 },
      context: { name: armyName },
      variant: 'positive'
    },
    commit: async () => {
      logger.info(`🎖️ [recruitArmy] COMMITTING: Creating ${armyName}`);
      
      const { armyService } = await import('../../army');
      
      // Get supportedBy from pending data (for allied armies)
      const supportedBy = pendingData.supportedBy || undefined;
      
      const createdArmy = await armyService.createArmy(armyName, level, {
        type: armyType,
        image: ARMY_TYPES[armyType as keyof typeof ARMY_TYPES].image,
        settlementId: settlementId,
        exemptFromUpkeep: exemptFromUpkeep,
        supportedBy: supportedBy  // Pass faction name for allied armies (who pays upkeep)
        // ledBy remains PLAYER_KINGDOM by default (player commands the army)
      });

      // NEW: Add "Allied Army" effect if exempt from upkeep
      if (exemptFromUpkeep && createdArmy.actorId) {
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
          
          logger.info(`✨ [recruitArmy] Added Allied Army effect to ${armyName}`);
        }
      }

      delete (globalThis as any).__pendingRecruitArmy;
      
      logger.info(`✅ [recruitArmy] Successfully recruited ${armyName}`);
    }
  };
}

/**
 * Disband Army - Remove an army unit and refund resources
 * REFACTORED: Uses prepare/commit pattern
 * 
 * @param armyId - ID of army to disband
 * @param deleteActor - Whether to delete the linked NPC actor (default: true)
 * @returns PreparedCommand with preview + commit function
 */
export async function disbandArmy(armyId: string, deleteActor: boolean = true): Promise<PreparedCommand> {
  logger.info(`🪖 [disbandArmy] PREPARING to disband army ${armyId}`);
  
  // PHASE 1: PREPARE - Validate everything needed for preview (NO state changes)
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Find the army
  const army = kingdom.armies?.find((a: Army) => a.id === armyId);
  if (!army) {
    throw new Error(`Army ${armyId} not found`);
  }

  // Format message (refund will be calculated and applied in commit phase)
  const message = `Disbanded ${army.name}`;
  
  logger.info(`🪖 [disbandArmy] PREPARED: Will disband ${army.name} with refund`);

  // PHASE 2: RETURN - Preview data + commit function
  return {
    outcomeBadge: {
      icon: 'fa-times-circle',
      template: 'Disbanded {{value}} {{name}}',
      value: { type: 'static', amount: 1 },
      context: { name: army.name },
      variant: 'negative'
    },
    commit: async () => {
      logger.info(`🪖 [disbandArmy] COMMITTING: Disbanding ${army.name}`);
      
      // Execute actual disband
      const { armyService } = await import('../../army');
      await armyService.disbandArmy(armyId, deleteActor);
      
      logger.info(`✅ [disbandArmy] Successfully disbanded ${army.name}`);
    }
  };
}

/**
 * Train Army - Improve army level to party level and apply training effects
 * REFACTORED: Uses prepare/commit pattern
 * 
 * @param armyId - ID of army to train
 * @param outcome - Action outcome (criticalSuccess, success, failure, criticalFailure)
 * @returns PreparedCommand with preview + commit function
 */
export async function trainArmy(armyId: string, outcome: string): Promise<PreparedCommand> {
  logger.info(`🎖️ [trainArmy] PREPARING to train army ${armyId} with outcome ${outcome}`);
  
  // PHASE 1: PREPARE - Validate everything needed for preview (NO state changes)
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom) {
    throw new Error('No kingdom data available');
  }

  // Find the army
  const army = kingdom.armies?.find((a: Army) => a.id === armyId);
  if (!army) {
    throw new Error(`Army ${armyId} not found`);
  }

  // Get party level from kingdom data (synced by partyLevelHooks)
  const partyLevel = kingdom.partyLevel || 1;
  
  // Check if army is already at party level (unless failure)
  if (army.level >= partyLevel && outcome !== 'failure') {
    throw new Error(`${army.name} is already at party level (${partyLevel})`);
  }

  // Determine preview message based on outcome
  let message: string;
  let icon: string;
  let variant: 'positive' | 'negative' | 'info';

  if (outcome === 'failure') {
    message = `Training had no effect on ${army.name}`;
    icon = 'fa-times';
    variant = 'negative';
  } else if (outcome === 'criticalSuccess') {
    message = `${army.name} trained to level ${partyLevel} with Heroism!`;
    icon = 'fa-star';
    variant = 'positive';
  } else if (outcome === 'criticalFailure') {
    message = `${army.name} trained to level ${partyLevel} but is Frightened`;
    icon = 'fa-exclamation-triangle';
    variant = 'info';
  } else {
    // Success
    message = `${army.name} trained to level ${partyLevel}`;
    icon = 'fa-level-up-alt';
    variant = 'positive';
  }

  logger.info(`🎖️ [trainArmy] PREPARED: ${message}`);

  // PHASE 2: RETURN - Preview data + commit function
  return {
    outcomeBadge: {
      icon: icon,
      template: outcome === 'failure' 
        ? 'Training failed: {{name}}'
        : 'Trained {{name}} to level {{value}}',
      value: outcome === 'failure' ? undefined : { type: 'static', amount: partyLevel },
      context: { name: army.name },
      variant: variant
    },
    commit: async () => {
      logger.info(`🎖️ [trainArmy] COMMITTING: Training ${army.name}`);
      
      // Failure: No changes
      if (outcome === 'failure') {
        logger.info(`✅ [trainArmy] No changes for failure outcome`);
        return;
      }

      // Update army level to party level
      const { armyService } = await import('../../army');
      await armyService.updateArmyLevel(armyId, partyLevel);
      logger.info(`✅ [trainArmy] Updated ${army.name} to level ${partyLevel}`);

      // Apply outcome-specific effects
      if (outcome === 'criticalSuccess' && army.actorId) {
        // Add Heroism effect to actor
        try {
          const heroism = await fromUuid('Compendium.pf2e.spell-effects.Item.l9HRQggofFGIxEse');
          if (heroism) {
            await armyService.addItemToArmy(army.actorId, heroism.toObject());
            logger.info(`✨ [trainArmy] Added Heroism to ${army.name}`);
          }
        } catch (error) {
          logger.warn(`⚠️ [trainArmy] Failed to add Heroism effect:`, error);
        }
      } else if (outcome === 'criticalFailure' && army.actorId) {
        // Add Frightened condition (10-minute duration) to actor
        try {
          const frightened = await fromUuid('Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL');
          if (frightened) {
            // Clone and modify duration
            const modifiedFrightened = frightened.clone({
              'system.duration': { value: 10, unit: 'minutes', sustained: false, expiry: 'turn-end' }
            });
            await armyService.addItemToArmy(army.actorId, modifiedFrightened.toObject());
            logger.info(`😰 [trainArmy] Added Frightened to ${army.name}`);
          }
        } catch (error) {
          logger.warn(`⚠️ [trainArmy] Failed to add Frightened condition:`, error);
        }
      }

      logger.info(`✅ [trainArmy] Successfully trained ${army.name}`);
    }
  };
}

/**
 * Helper: Get party level from game actors
 */
export function getPartyLevel(): number {
  const game = (globalThis as any).game;
  if (game?.actors) {
    const partyActors = Array.from(game.actors).filter((a: any) => 
      a.type === 'character' && a.hasPlayerOwner
    );
    if (partyActors.length > 0) {
      return (partyActors[0] as any).level || 1;
    }
  }
  return 1;
}

/**
 * Helper: Create PF2e effect data for equipment upgrade
 */
export function createEquipmentEffect(equipmentType: string, bonus: number): any {
  const baseEffect = {
    type: 'effect',
    system: {
      slug: `army-equipment-${equipmentType}`,
      badge: null,  // Hide token icon
      rules: [] as any[]
    }
  };

  // Icon paths for each equipment type
  const equipmentIcons: Record<string, string> = {
    armor: 'icons/equipment/shield/heater-steel-boss-red.webp',
    runes: 'icons/magic/symbols/triangle-glowing-green.webp',
    weapons: 'icons/weapons/swords/sword-guard-worn-purple.webp',
    equipment: 'icons/containers/bags/pack-leather-black-brown.webp'
  };

  switch (equipmentType) {
    case 'armor':
      return {
        ...baseEffect,
        name: `Army Equipment: Armor (+${bonus} AC)`,
        img: equipmentIcons.armor,
        system: {
          ...baseEffect.system,
          rules: [{
            key: 'FlatModifier',
            selector: 'ac',
            value: bonus,
            type: 'item'
          }]
        }
      };

    case 'runes':
      return {
        ...baseEffect,
        name: `Army Equipment: Runes (+${bonus} to hit)`,
        img: equipmentIcons.runes,
        system: {
          ...baseEffect.system,
          rules: [{
            key: 'FlatModifier',
            selector: 'strike-attack-roll',
            value: bonus,
            type: 'item'
          }]
        }
      };

    case 'weapons':
      return {
        ...baseEffect,
        name: `Army Equipment: Weapons (+${bonus} damage dice)`,
        img: equipmentIcons.weapons,
        system: {
          ...baseEffect.system,
          rules: [{
            key: 'DamageDice',
            selector: 'strike-damage',
            diceNumber: bonus
          }]
        }
      };

    case 'equipment':
      return {
        ...baseEffect,
        name: `Army Equipment: Enhanced Gear (+${bonus} saves)`,
        img: equipmentIcons.equipment,
        system: {
          ...baseEffect.system,
          rules: [{
            key: 'FlatModifier',
            selector: 'saving-throw',
            value: bonus,
            type: 'item'
          }]
        }
      };

    default:
      throw new Error(`Unknown equipment type: ${equipmentType}`);
  }
}

/**
 * Helper: Get display name for equipment type
 */
export function getEquipmentDisplayName(equipmentType: string): string {
  switch (equipmentType) {
    case 'armor': return 'Armor';
    case 'runes': return 'Runes';
    case 'weapons': return 'Weapons';
    case 'equipment': return 'Enhanced Gear';
    default: return equipmentType;
  }
}
