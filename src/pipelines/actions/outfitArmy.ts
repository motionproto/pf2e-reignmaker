/**
 * outfitArmy Action Pipeline
 * Data from: data/player-actions/outfit-army.json
 * 
 * Simplified flow:
 * - No pre-roll interactions
 * - Post-apply: Combined army + equipment selection in single component
 * - Army dropdown updates equipment grid reactively
 * - Game command execution to apply equipment
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import type { Army } from '../../models/Army';

export const outfitArmyPipeline = createActionPipeline('outfit-army', {
  requirements: (kingdom) => {
    // Check 1: Resource costs (ore: 1, gold: 2)
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

    // Check 2: Army availability
    if (!kingdom.armies || kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }

    // Check 3: Eligible armies (available equipment slots and has actor)
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

  // No pre-roll interactions - army selection happens post-roll

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
        // Store both army and equipment selections for execute step
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['outfit-army-resolution'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    // Apply resource changes from preview (since we have custom execute)
    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
      await updateKingdom(kingdom => {
        kingdom.resources.ore -= 1;
        kingdom.resources.gold -= 2;
      });
    } else if (ctx.outcome === 'criticalFailure') {
      // Critical failure: lose gold but get no equipment
      await updateKingdom(kingdom => {
        kingdom.resources.gold -= 2;
      });
      return { 
        success: true, 
        message: 'Suppliers took the gold but provided no equipment'
      };
    } else if (ctx.outcome === 'failure') {
      // Regular failure: no cost, no equipment
      return { 
        success: true, 
        message: 'Failed to outfit army'
      };
    }

    // Get outfit data from postApplyInteractions resolution
    const outfitData = ctx.resolutionData?.customComponentData?.['outfit-army-resolution'];
    
    // Handle cancellation gracefully (user cancelled selection)
    if (!outfitData) {
      return { 
        success: true, 
        message: 'Army outfitting cancelled - no equipment was applied',
        cancelled: true 
      };
    }

    const armyId = outfitData.armyId;
    const equipmentType = outfitData.equipmentType;

    // Validate selections
    if (!armyId) {
      return { success: false, error: 'No army selected' };
    }

    if (!equipmentType) {
      return { success: false, error: 'No equipment type selected' };
    }

    // Validate equipment not already owned
    const army = ctx.kingdom.armies?.find((a: Army) => a.id === armyId);
    if (!army) {
      return { success: false, error: 'Army not found' };
    }

    const equipmentKey = equipmentType as keyof Army['equipment'];
    if (army.equipment && army.equipment[equipmentKey]) {
      return { success: false, error: `Army already has ${equipmentType}` };
    }

    // Use GameCommandsResolver to apply equipment
    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    const preparedCommand = await resolver.outfitArmy(armyId, equipmentType, ctx.outcome);

    // Handle prepare/commit pattern (like recruit-unit)
    if ('commit' in preparedCommand && preparedCommand.commit) {
      await preparedCommand.commit();
      return { success: true, message: `Successfully outfitted ${army.name} with ${equipmentType}` };
    }

    // Handle direct result pattern
    if ('success' in preparedCommand) {
      if (!preparedCommand.success) {
        return { success: false, error: preparedCommand.error || 'Failed to outfit army' };
      }
      return { success: true, message: `Successfully outfitted ${army.name} with ${equipmentType}` };
    }

    return { success: false, error: 'Unexpected response from outfit army command' };
  }
});
