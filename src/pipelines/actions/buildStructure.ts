/**
 * buildStructure Action Pipeline
 * Data from: data/player-actions/build-structure.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { textBadge } from '../../types/OutcomeBadge';

// Store reference for execute function
const pipeline = createActionPipeline('build-structure', {
  requirements: (kingdom) => {
    if (!kingdom.settlements || kingdom.settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements available for construction'
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
      
      // Add building badge for success/critical success
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        // Extract from buildingDetails (where configuration interaction stores it)
        const buildingDetails = ctx.metadata.buildingDetails || {};
        const structureName = buildingDetails.structureName || 'structure';
        const settlementName = buildingDetails.settlementName || 'settlement';
        outcomeBadges.push(
          textBadge(`Will build ${structureName} in ${settlementName}`, 'fa-hammer', 'positive')
        );
        
        // Critical success gets cost reduction
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
    // Modifiers (unrest changes) applied automatically by execute-first pattern
    
    // Get structure and settlement IDs from buildingDetails (where configuration interaction stores it)
    const buildingDetails = ctx.metadata.buildingDetails || {};
    const structureId = buildingDetails.structureId;
    const settlementId = buildingDetails.settlementId;
    
    if (!structureId || !settlementId) {
      return { success: false, error: 'Missing structure or settlement data' };
    }
    
    // Import required services
    const { structuresService } = await import('../../services/structures');
    const { createBuildStructureController } = await import('../../controllers/BuildStructureController');
    const { getKingdomActor } = await import('../../stores/KingdomStore');
    
    // Validate structure exists
    const structure = structuresService.getStructure(structureId);
    if (!structure) {
      return { success: false, error: 'Structure not found' };
    }
    
    // Add to build queue
    const buildController = await createBuildStructureController();
    const result = await buildController.addToBuildQueue(structureId, settlementId);
    
    if (!result.success || !result.project) {
      return { success: false, error: result.error || 'Failed to add to build queue' };
    }
    
    // Apply cost modifier for critical success (50% off)
    if (ctx.outcome === 'criticalSuccess') {
      const costModifier = 0.5;
      const actor = getKingdomActor();
      
      if (actor) {
        await actor.updateKingdomData((kingdom: any) => {
          const project = kingdom.buildQueue?.find((p: any) => p.id === result.project!.id);
          if (project && project.totalCost) {
            // Work with plain objects (already converted by BuildQueueService)
            const totalCostObj = project.totalCost as any;
            const remainingCostObj = project.remainingCost as any;
            
            // Update totalCost with reduced amounts (rounded up)
            for (const [resource, amount] of Object.entries(totalCostObj)) {
              totalCostObj[resource] = Math.ceil((amount as number) * costModifier);
            }
            
            // Also update remainingCost to match
            if (remainingCostObj) {
              for (const [resource, amount] of Object.entries(remainingCostObj)) {
                remainingCostObj[resource] = Math.ceil((amount as number) * costModifier);
              }
            }
          }
        });
      }
    }
    
    // Show appropriate success message
    const game = (window as any).game;
    if (ctx.outcome === 'criticalSuccess') {
      game?.ui?.notifications?.info(`🎉 Critical Success! ${structure.name} added to build queue at half cost!`);
    } else {
      game?.ui?.notifications?.info(`✅ ${structure.name} added to build queue!`);
    }
    
    game?.ui?.notifications?.info(`Pay for construction during the Upkeep phase.`);
    
    return { success: true, message: `${structure.name} added to build queue` };
  }
});

export const buildStructurePipeline = pipeline;
