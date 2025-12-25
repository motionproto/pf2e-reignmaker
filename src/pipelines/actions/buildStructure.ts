/**
 * Build Structure Action Pipeline
 * Add markets, temples, barracks, and other structures
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { SettlementTierConfig } from '../../models/Settlement';

export const buildStructurePipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'build-structure',
  name: 'Build Structure',
  description: 'Construct new buildings and infrastructure within a settlement to enhance its capabilities',
  brief: 'Add markets, temples, barracks, and other structures',
  category: 'urban-planning',
  checkType: 'action',

  skills: [
    { skill: 'religion', description: 'blessed construction', doctrine: 'virtuous' },
    { skill: 'crafting', description: 'construction expertise', doctrine: 'practical' },
    { skill: 'society', description: 'organize workforce', doctrine: 'practical' },
    { skill: 'arcana', description: 'magically assisted', doctrine: 'practical' },
    { skill: 'athletics', description: 'forced labor', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The structure is constructed efficiently.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Build structure with discount', 'fa-building', 'positive')
      ]
    },
    success: {
      description: 'Construction begins on the structure.',
      modifiers: []
    },
    failure: {
      description: 'Construction of the structure fails.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Accidents and disputes plague the structure project.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    // Check if any settlements exist
    if (!kingdom.settlements || kingdom.settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements available for construction'
      };
    }

    // Count structures in build queue per settlement
    const buildQueueCountBySettlement = new Map<string, number>();
    for (const project of kingdom.buildQueue || []) {
      const count = buildQueueCountBySettlement.get(project.settlementName) || 0;
      buildQueueCountBySettlement.set(project.settlementName, count + 1);
    }

    // Check if any settlement has room for more structures
    const settlementsWithCapacity = kingdom.settlements.filter(settlement => {
      const tierConfig = SettlementTierConfig[settlement.tier as keyof typeof SettlementTierConfig];
      const maxStructures = tierConfig?.maxStructures || 0;

      // Metropolis has unlimited capacity (Infinity)
      if (maxStructures === Infinity) return true;

      const currentStructures = settlement.structureIds?.length || 0;
      const queuedStructures = buildQueueCountBySettlement.get(settlement.name) || 0;

      return currentStructures + queuedStructures < maxStructures;
    });

    if (settlementsWithCapacity.length === 0) {
      return {
        met: false,
        reason: 'All settlements at capacity. Upgrade a settlement or found a new one.'
      };
    }

    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'configuration',
      id: 'buildingDetails',
      component: 'BuildStructureDialog',
      label: 'Select settlement and structure'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const resources = ctx.outcome === 'criticalFailure' ?
        [{ resource: 'unrest', value: 1 }] : [];

      const outcomeBadges = [];
      
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        const buildingDetails = ctx.metadata.buildingDetails || {};
        const structureName = buildingDetails.structureName || 'structure';
        const settlementName = buildingDetails.settlementName || 'settlement';
        outcomeBadges.push(
          textBadge(`Will build ${structureName} in ${settlementName}`, 'fa-hammer', 'positive')
        );
        
        if (ctx.outcome === 'criticalSuccess') {
          outcomeBadges.push(
            textBadge('50% cost reduction', 'fa-coins', 'positive')
          );
        }
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  execute: async (ctx: any) => {
    // On failure outcomes, don't queue the structure
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      const game = (window as any).game;
      if (ctx.outcome === 'criticalFailure') {
        game?.ui?.notifications?.warn(`Construction failed catastrophically. The kingdom gains 1 Unrest.`);
      } else {
        game?.ui?.notifications?.warn(`Construction efforts failed. No structure was built.`);
      }
      return { success: true, message: 'Construction failed - no structure queued' };
    }

    const buildingDetails = ctx.metadata.buildingDetails || {};
    const structureId = buildingDetails.structureId;
    const settlementId = buildingDetails.settlementId;

    if (!structureId || !settlementId) {
      return { success: false, error: 'Missing structure or settlement data' };
    }

    const { structuresService } = await import('../../services/structures');
    const { createBuildStructureController } = await import('../../controllers/BuildStructureController');
    const { getKingdomActor } = await import('../../stores/KingdomStore');

    const structure = structuresService.getStructure(structureId);
    if (!structure) {
      return { success: false, error: 'Structure not found' };
    }

    const buildController = await createBuildStructureController();
    const result = await buildController.addToBuildQueue(structureId, settlementId);

    if (!result.success || !result.project) {
      return { success: false, error: result.error || 'Failed to add to build queue' };
    }

    if (ctx.outcome === 'criticalSuccess') {
      const costModifier = 0.5;
      const actor = getKingdomActor();

      if (actor) {
        await actor.updateKingdomData((kingdom: any) => {
          const project = kingdom.buildQueue?.find((p: any) => p.id === result.project!.id);
          if (project && project.totalCost) {
            const totalCostObj = project.totalCost as any;
            const remainingCostObj = project.remainingCost as any;

            for (const [resource, amount] of Object.entries(totalCostObj)) {
              totalCostObj[resource] = Math.ceil((amount as number) * costModifier);
            }

            if (remainingCostObj) {
              for (const [resource, amount] of Object.entries(remainingCostObj)) {
                remainingCostObj[resource] = Math.ceil((amount as number) * costModifier);
              }
            }
          }
        });
      }
    }

    const game = (window as any).game;
    if (ctx.outcome === 'criticalSuccess') {
      game?.ui?.notifications?.info(`🎉 Critical Success! ${structure.name} added to build queue at half cost!`);
    } else {
      game?.ui?.notifications?.info(`✅ ${structure.name} added to build queue!`);
    }

    game?.ui?.notifications?.info(`Pay for construction during the Upkeep phase.`);

    return { success: true, message: `${structure.name} added to build queue` };
  }
};
