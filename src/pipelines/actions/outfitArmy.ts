/**
 * Outfit Army Action Pipeline
 * Equip troops with armor, weapons, runes, or equipment
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import type { Army } from '../../models/Army';

export const outfitArmyPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'outfit-army',
  name: 'Outfit Army',
  description: 'Equip your troops with superior arms, armor, and supplies to enhance their battlefield effectiveness',
  brief: 'Equip troops with armor, weapons, runes, or equipment',
  category: 'military-operations',
  checkType: 'action',
  cost: { ore: 1, gold: 2 },

  skills: [
    { skill: 'crafting', description: 'forge equipment' },
    { skill: 'society', description: 'requisition supplies' },
    { skill: 'intimidation', description: 'commandeer resources' },
    { skill: 'thievery', description: 'acquire through subterfuge' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Army receives +2 equipment bonus',
      modifiers: []
    },
    success: {
      description: 'Army receives +1 equipment bonus',
      modifiers: []
    },
    failure: {
      description: 'Failed to find a suitable supplier',
      modifiers: []
    },
    criticalFailure: {
      description: 'Resources lost to corruption and waste',
      modifiers: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    const oreCost = 1;
    const goldCost = 2;
    const currentOre = kingdom.resources?.ore || 0;
    const currentGold = kingdom.resources?.gold || 0;
    
    const missingResources: string[] = [];
    if (currentOre < oreCost) {
      missingResources.push(`${oreCost} Ore (have ${currentOre})`);
    }
    if (currentGold < goldCost) {
      missingResources.push(`${goldCost} Gold (have ${currentGold})`);
    }
    
    if (missingResources.length > 0) {
      return {
        met: false,
        reason: `Insufficient resources: need ${missingResources.join(', ')}`
      };
    }

    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }

    const eligibleArmies = kingdom.armies.filter((army: Army) => {
      const equipmentCount = army.equipment 
        ? Object.values(army.equipment).filter(Boolean).length 
        : 0;
      return equipmentCount < 4 && army.actorId;
    });

    if (eligibleArmies.length === 0) {
      return {
        met: false,
        reason: 'No armies with available equipment slots (all armies fully upgraded or missing actors)'
      };
    }

    return { met: true };
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];

      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        resources.push({ resource: 'ore', value: -1 });
        resources.push({ resource: 'gold', value: -2 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'gold', value: -2 });
      }

      const outcomeBadges = [];
      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        const bonus = ctx.outcome === 'criticalSuccess' ? '+2' : '+1';
        outcomeBadges.push(
          textBadge(`Army will receive ${bonus} equipment bonus`, 'positive')
        );
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(
          textBadge('Suppliers took the gold but provided no equipment', 'negative')
        );
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  postApplyInteractions: [
    {
      type: 'configuration',
      id: 'outfit-army-resolution',
      condition: (ctx: any) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      component: 'OutfitArmyResolution',
      componentProps: {
        show: true
      },
      onComplete: async (data: any, ctx: any) => {
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['outfit-army-resolution'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
      await gameCommandsService.applyNumericModifiers([
        { resource: 'ore', value: -1 },
        { resource: 'gold', value: -2 }
      ], ctx.outcome);
    } else if (ctx.outcome === 'criticalFailure') {
      await gameCommandsService.applyNumericModifiers([
        { resource: 'gold', value: -2 }
      ], ctx.outcome);
      
      return { 
        success: true, 
        message: 'Suppliers took the gold but provided no equipment'
      };
    } else if (ctx.outcome === 'failure') {
      return { 
        success: true, 
        message: 'Failed to outfit army'
      };
    }

    const outfitData = ctx.resolutionData?.customComponentData?.['outfit-army-resolution'];
    
    if (!outfitData) {
      return { 
        success: true, 
        message: 'Army outfitting cancelled - no equipment was applied',
        cancelled: true 
      };
    }

    const armyId = outfitData.armyId;
    const equipmentType = outfitData.equipmentType;

    if (!armyId) {
      return { success: false, error: 'No army selected' };
    }

    if (!equipmentType) {
      return { success: false, error: 'No equipment type selected' };
    }

    const army = ctx.kingdom.armies?.find((a: Army) => a.id === armyId);
    if (!army) {
      return { success: false, error: 'Army not found' };
    }

    const equipmentKey = equipmentType as keyof Army['equipment'];
    if (army.equipment && army.equipment[equipmentKey]) {
      return { success: false, error: `Army already has ${equipmentType}` };
    }

    const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
    const registry = getGameCommandRegistry();

    const preparedCommand = await registry.process(
      {
        type: 'outfitArmy',
        armyId,
        equipmentType,
        outcome: ctx.outcome,
        fallbackToGold: false
      },
      { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
    );

    if (preparedCommand && 'commit' in preparedCommand && preparedCommand.commit) {
      await preparedCommand.commit();
      return { success: true, message: `Successfully outfitted ${army.name} with ${equipmentType}` };
    }

    if (preparedCommand && 'success' in preparedCommand) {
      if (!preparedCommand.success) {
        return { success: false, error: preparedCommand.error || 'Failed to outfit army' };
      }
      return { success: true, message: `Successfully outfitted ${army.name} with ${equipmentType}` };
    }

    return { success: false, error: 'Unexpected response from outfit army command' };
  }
};
