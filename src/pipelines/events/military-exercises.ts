/**
 * Military Exercises Event Pipeline
 *
 * Critical Success: Free equipment slot to random army
 * Success: Apply "Well Trained" condition to random army
 * Failure: Nothing
 * Critical Failure: Apply "Enfeebled 1" to random army
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { textBadge } from '../../types/OutcomeBadge';
import { logger } from '../../utils/Logger';
import { EQUIPMENT_ICONS, EQUIPMENT_NAMES } from '../../utils/presentation';
import { PLAYER_KINGDOM } from '../../types/ownership';

export const militaryExercisesPipeline: CheckPipeline = {
  id: 'military-exercises',
  name: 'Military Exercises',
  description: 'Your kingdom conducts large-scale military training maneuvers.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'athletics', description: 'physical conditioning drills' },
      { skill: 'acrobatics', description: 'agility and combat maneuvers' },
      { skill: 'intimidation', description: 'discipline and morale' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The exercises attract skilled smiths who donate arms to your troops.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Random army receives free equipment', '', 'positive')
      ]
    },
    success: {
      description: 'Elite drills forge exceptional troops.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Random army becomes Well Trained (+1 saves)', 'fa-star', 'positive')
      ]
    },
    failure: {
      description: 'The training is routine.',
      modifiers: []
    },
    criticalFailure: {
      description: 'A training accident injures troops.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Random army becomes Enfeebled', 'fa-exclamation-triangle', 'negative')
      ]
    },
  },

  requirements: (kingdom) => {
    // Need at least one army for military exercises to matter
    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: true, // Still allow the event, just won't have army effects
        reason: 'No armies available for exercises'
      };
    }
    return { met: true };
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      // Initialize metadata
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      
      const kingdom = ctx.kingdom;
      // Only include player-led armies with linked actors
      const playerArmies = kingdom.armies?.filter((a: any) => 
        a.actorId && a.ledBy === PLAYER_KINGDOM
      ) || [];
      
      if (playerArmies.length === 0) {
        if (ctx.outcome !== 'failure') {
          warnings.push('No armies available - military effects will not apply');
        }
        return { resources: [], outcomeBadges: [], warnings };
      }
      
      // Critical Success: Free equipment to random army
      if (ctx.outcome === 'criticalSuccess') {
        // Find armies with available equipment slots
        const armiesWithSlots = playerArmies.filter((a: any) => {
          const equipment = a.equipment || {};
          return !equipment.armor || !equipment.weapons || !equipment.runes || !equipment.equipment;
        });
        
        if (armiesWithSlots.length === 0) {
          warnings.push('All armies fully equipped - no equipment to grant');
          return { resources: [], outcomeBadges: [], warnings };
        }
        
        // Pick random army
        const randomArmyIndex = Math.floor(Math.random() * armiesWithSlots.length);
        const selectedArmy = armiesWithSlots[randomArmyIndex];
        
        // Find available equipment slot
        const equipment = selectedArmy.equipment || {};
        const availableSlots = ['armor', 'weapons', 'runes', 'equipment'].filter(
          slot => !equipment[slot]
        );
        const randomSlotIndex = Math.floor(Math.random() * availableSlots.length);
        const selectedSlot = availableSlots[randomSlotIndex];
        
        // Store for execute
        ctx.metadata.selectedArmyId = selectedArmy.id;
        ctx.metadata.selectedArmyName = selectedArmy.name;
        ctx.metadata.selectedEquipmentSlot = selectedSlot;
        
        const equipName = EQUIPMENT_NAMES[selectedSlot as keyof typeof EQUIPMENT_NAMES];
        const equipIcon = EQUIPMENT_ICONS[selectedSlot as keyof typeof EQUIPMENT_ICONS];
        outcomeBadges.push(
          textBadge(`${selectedArmy.name} receives ${equipName}`, equipIcon, 'positive')
        );
      }
      
      // Success: Well Trained to random army
      if (ctx.outcome === 'success') {
        const randomIndex = Math.floor(Math.random() * playerArmies.length);
        const selectedArmy = playerArmies[randomIndex];
        
        ctx.metadata.selectedArmyId = selectedArmy.id;
        ctx.metadata.selectedArmyName = selectedArmy.name;
        ctx.metadata.selectedArmyActorId = selectedArmy.actorId;
        
        outcomeBadges.push(
          textBadge(`${selectedArmy.name} becomes Well Trained (+1 saves)`, 'fa-star', 'positive')
        );
      }
      
      // Critical Failure: Enfeebled to random army
      if (ctx.outcome === 'criticalFailure') {
        const randomIndex = Math.floor(Math.random() * playerArmies.length);
        const selectedArmy = playerArmies[randomIndex];
        
        ctx.metadata.selectedArmyId = selectedArmy.id;
        ctx.metadata.selectedArmyName = selectedArmy.name;
        ctx.metadata.selectedArmyActorId = selectedArmy.actorId;
        
        outcomeBadges.push(
          textBadge(`${selectedArmy.name} becomes Enfeebled 1`, 'fa-exclamation-triangle', 'negative')
        );
      }
      
      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    const { armyService } = await import('../../services/army');
    const { removeEffectFromActor } = await import('../../services/commands/combat/conditionHelpers');
    
    const game = (globalThis as any).game;
    
    // Critical Success: Apply free equipment
    if (ctx.outcome === 'criticalSuccess') {
      const armyId = ctx.metadata?.selectedArmyId;
      const equipmentSlot = ctx.metadata?.selectedEquipmentSlot;
      const armyName = ctx.metadata?.selectedArmyName;
      
      if (!armyId || !equipmentSlot) {
        return { success: true, message: 'No army available for equipment' };
      }
      
      // Use outfit army command
      const { outfitArmy } = await import('../../services/commands/armies/outfitArmy');
      const prepared = await outfitArmy(armyId, equipmentSlot, 'success', false);
      
      if (prepared?.commit) {
        await prepared.commit();
        const equipName = EQUIPMENT_NAMES[equipmentSlot as keyof typeof EQUIPMENT_NAMES];
        return { success: true, message: `${armyName} received free ${equipName}` };
      }
      
      return { success: true, message: 'Equipment application failed' };
    }
    
    // Success: Apply Well Trained
    if (ctx.outcome === 'success') {
      const actorId = ctx.metadata?.selectedArmyActorId;
      const armyName = ctx.metadata?.selectedArmyName;
      
      if (!actorId) {
        return { success: true, message: 'No army available for training' };
      }
      
      const armyActor = game?.actors?.get(actorId);
      if (!armyActor) {
        return { success: true, message: 'Army actor not found' };
      }
      
      // Remove existing training effects
      await removeEffectFromActor(armyActor, 'poorly-trained');
      await removeEffectFromActor(armyActor, 'well-trained');
      
      // Apply Well Trained effect
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
      
      await armyService.addItemToArmy(actorId, wellTrainedEffect);
      logger.info(`✨ [Military Exercises] Applied Well Trained to ${armyName}`);
      
      return { success: true, message: `${armyName} is now Well Trained (+1 saves)` };
    }
    
    // Critical Failure: Apply Enfeebled
    if (ctx.outcome === 'criticalFailure') {
      const actorId = ctx.metadata?.selectedArmyActorId;
      const armyName = ctx.metadata?.selectedArmyName;
      
      if (!actorId) {
        return { success: true, message: 'No army available' };
      }
      
      const armyActor = game?.actors?.get(actorId);
      if (!armyActor) {
        return { success: true, message: 'Army actor not found' };
      }
      
      // Check if enfeebled already exists
      const items = Array.from(armyActor.items.values()) as any[];
      const enfeebledEffect = items.find((i: any) => i.system?.slug === 'enfeebled');
      
      if (enfeebledEffect) {
        // Increase existing enfeebled value
        const currentValue = enfeebledEffect.system?.badge?.value || 1;
        const newValue = currentValue + 1;
        
        await armyService.updateItemOnArmy(actorId, enfeebledEffect.id, {
          'system.badge.value': newValue
        });
        
        logger.info(`⚠️ [Military Exercises] Increased ${armyName}'s enfeebled from ${currentValue} to ${newValue}`);
        return { success: true, message: `${armyName}'s Enfeebled increased to ${newValue}` };
      } else {
        // Add Enfeebled 1
        const enfeebledCondition = {
          name: 'Enfeebled',
          type: 'condition',
          img: 'systems/pf2e/icons/conditions/enfeebled.webp',
          system: {
            slug: 'enfeebled',
            badge: { value: 1 },
            description: {
              value: '<p>Training accident has weakened the troops.</p>'
            },
            duration: {
              value: -1,
              unit: 'unlimited',
              sustained: false,
              expiry: null
            }
          }
        };
        
        await armyService.addItemToArmy(actorId, enfeebledCondition as any);
        logger.info(`⚠️ [Military Exercises] Applied Enfeebled 1 to ${armyName}`);
        return { success: true, message: `${armyName} is now Enfeebled 1` };
      }
    }
    
    // Failure: Nothing
    return { success: true };
  },

  traits: ["beneficial"],
};
