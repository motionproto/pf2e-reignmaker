/**
 * repairStructure Action Pipeline
 * Data from: data/player-actions/repair-structure.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { updateKingdom } from '../../stores/KingdomStore';
import { settlementStructureManagement } from '../../services/structures/management';
import { structuresService } from '../../services/structures';
import { StructureCondition } from '../../models/Settlement';
import { textBadge } from '../../types/OutcomeBadge';
import { createGameCommandsService } from '../../services/GameCommandsService';
import type { ResourceType } from '../../types/modifiers';

export const repairStructurePipeline = createActionPipeline('repair-structure', {
  requirements: (kingdom) => {
    // Check if any settlement has damaged structures
    const hasDamagedStructures = kingdom.settlements?.some(s => 
      s.structureConditions && 
      Object.values(s.structureConditions).some(condition => condition === 'damaged')
    );
    
    if (!hasDamagedStructures) {
      return {
        met: false,
        reason: 'No damaged structures to repair'
      };
    }
    
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'configuration',
      id: 'repairDetails',
      component: 'RepairStructureDialog',
      componentProps: {
        show: true
      },
      onComplete: async (data: any, ctx: any) => {
        // Store structure details in metadata for preview/execute
        ctx.metadata = ctx.metadata || {};
        ctx.metadata.structureId = data.structureId;
        ctx.metadata.settlementId = data.settlementId;
        ctx.metadata.structureName = structuresService.getStructure(data.structureId)?.name || 'structure';
      }
    }
  ],

  preview: {
    calculate: (ctx: any) => {
      const resources = [];
      const outcomeBadges = [];
      const structureName = ctx.metadata?.structureName || 'structure';

      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'gold', value: -1 });
        outcomeBadges.push(
          textBadge(`Time and money are wasted. The ${structureName} remains damaged.`, 'negative')
        );
      } else if (ctx.outcome === 'failure') {
        outcomeBadges.push(
          textBadge(`Despite your efforts, the ${structureName} remains damaged.`, 'negative')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge(`The ${structureName} is repaired.`, 'positive')
        );
        // Cost shown in custom component (dice or half cost) - not predictable
      } else if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge(`Citizens volunteer their time and materials. The ${structureName} is repaired for free!`, 'positive')
        );
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  // Custom component for success (cost choice)
  // MOVED: From postApplyInteractions to postRollInteractions so it displays inline in OutcomeDisplay
  postRollInteractions: [
    {
      id: 'repairCost',
      type: 'configuration',
      component: 'RepairCostChoice',
      condition: (ctx: any) => ctx.outcome === 'success',
      componentProps: {
        show: true
      }
    }
  ],

  execute: async (ctx: any) => {
    const { structureId, settlementId, structureName } = ctx.metadata;
    
    if (!structureId || !settlementId) {
      throw new Error('Missing structure or settlement ID');
    }

    // Handle cost based on outcome
    if (ctx.outcome === 'criticalFailure') {
      // Critical failure: lose 1 gold, structure remains damaged
      const gameCommandsService = await createGameCommandsService();
      await gameCommandsService.applyOutcome({
        type: 'action',
        sourceId: 'repair-structure',
        sourceName: `Repair ${structureName} (failed)`,
        outcome: 'criticalFailure',
        modifiers: [{
          type: 'static' as const,
          resource: 'gold' as ResourceType,
          value: -1,
          duration: 'immediate' as const
        }]
      });
      
      return {
        success: true,
        message: `Time and money are wasted. The ${structureName} remains damaged.`
      };
    }

    if (ctx.outcome === 'failure') {
      // Failure: structure remains damaged, no cost
      return {
        success: true,
        message: `Despite your efforts, the ${structureName} remains damaged.`
      };
    }

    // Success or Critical Success: repair the structure
    let isFree = false;

    if (ctx.outcome === 'criticalSuccess') {
      // Critical success: free repair
      isFree = true;
    } else if (ctx.outcome === 'success') {
      // Success: get cost from custom component
      const costData = ctx.resolutionData?.customComponentData?.['repairCost'];
      
      if (!costData || !costData.cost) {
        throw new Error('Missing cost selection');
      }

      const cost = costData.cost as Record<string, number>;

      // ✅ Use GameCommandsService.applyOutcome for proper shortfall tracking
      // This handles debt (negative resources) and automatic unrest penalties
      const modifiers = Object.entries(cost)
        .filter(([_, amount]) => amount !== undefined && amount > 0)
        .map(([resource, amount]) => ({
          type: 'static' as const,
          resource: resource as ResourceType,
          value: -(amount as number),  // Negative to deduct
          duration: 'immediate' as const
        }));

      const gameCommandsService = await createGameCommandsService();
      const result = await gameCommandsService.applyOutcome({
        type: 'action',
        sourceId: 'repair-structure',
        sourceName: `Repair ${structureName}`,
        outcome: 'success',
        modifiers
      });

      if (!result.success) {
        throw new Error(`Failed to apply repair costs: ${result.error}`);
      }

      // Note: Shortfalls are automatically handled by applyOutcome:
      // - Resources go negative (debt)
      // - +1 unrest per resource type you can't afford
      // - Structure is still repaired (repair happens even if you can't afford it)
    }

    // Repair the structure (update condition to GOOD)
    await settlementStructureManagement.updateStructureCondition(
      structureId,
      settlementId,
      StructureCondition.GOOD
    );

    // Return appropriate message
    if (isFree) {
      return {
        success: true,
        message: `Citizens volunteer their time and materials. The ${structureName} is repaired for free!`
      };
    } else {
      return {
        success: true,
        message: `The ${structureName} is repaired.`
      };
    }
  }
});
