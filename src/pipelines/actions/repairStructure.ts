/**
 * Repair Structure Action Pipeline
 * Fix damaged buildings to restore functionality
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { updateKingdom } from '../../stores/KingdomStore';
import { settlementStructureManagement } from '../../services/structures/management';
import { structuresService } from '../../services/structures';
import { StructureCondition } from '../../models/Settlement';
import { textBadge } from '../../types/OutcomeBadge';
import { createGameCommandsService } from '../../services/GameCommandsService';
import type { ResourceType } from '../../types/modifiers';

export const repairStructurePipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'repair-structure',
  name: 'Repair Structure',
  description: 'Repair damaged structures within a settlement to restore its capabilities. You must select a structure first, then perform the skill check. Only the lowest tier damaged structure per category can be repaired.',
  brief: 'Fix damaged buildings to restore functionality',
  category: 'urban-planning',
  checkType: 'action',

  skills: [
    { skill: 'crafting', description: 'construction expertise' },
    { skill: 'society', description: 'organize workforce' },
    { skill: 'athletics', description: 'physical labor' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Structure repaired for free.',
      modifiers: []
    },
    success: {
      description: 'Structure repaired.',
      modifiers: []
    },
    failure: {
      description: 'Structure remains damaged.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Time and money wasted.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
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
      } else if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge(`Citizens volunteer their time and materials. The ${structureName} is repaired for free!`, 'positive')
        );
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

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

    if (ctx.outcome === 'criticalFailure') {
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
      return {
        success: true,
        message: `Despite your efforts, the ${structureName} remains damaged.`
      };
    }

    let isFree = false;

    if (ctx.outcome === 'criticalSuccess') {
      isFree = true;
    } else if (ctx.outcome === 'success') {
      const costData = ctx.resolutionData?.customComponentData?.['repairCost'];
      
      if (!costData || !costData.cost) {
        throw new Error('Missing cost selection');
      }

      const cost = costData.cost as Record<string, number>;

      const modifiers = Object.entries(cost)
        .filter(([_, amount]) => amount !== undefined && amount > 0)
        .map(([resource, amount]) => ({
          type: 'static' as const,
          resource: resource as ResourceType,
          value: -(amount as number),
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
    }

    await settlementStructureManagement.updateStructureCondition(
      structureId,
      settlementId,
      StructureCondition.GOOD
    );

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
};
