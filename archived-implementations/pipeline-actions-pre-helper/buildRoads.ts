/**
 * buildRoads Action Pipeline
 * Data from: data/player-actions/build-roads.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const buildRoadsPipeline = createActionPipeline('build-roads', {
  preview: {
    providedByInteraction: true,  // Map selection shows roads in real-time
    calculate: (ctx) => {
      const resources = [];
      
      // Show resource costs for all outcomes
      resources.push({ resource: 'lumber', value: -1 });
      resources.push({ resource: 'stone', value: -1 });
      
      // Show unrest on critical failure
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }
      
      return {
        resources,
        specialEffects: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Read hex selections from resolutionData (populated by postApplyInteractions)
        const selectedHexes = ctx.resolutionData?.compoundData?.selectedHexes;
        if (!selectedHexes || selectedHexes.length === 0) {
          console.log('⏭️ [buildRoads] User cancelled hex selection, skipping execution gracefully');
          return { success: true };  // Graceful cancellation - no error thrown
        }
        
        // Deduct costs and build roads
        await applyActionCost(buildRoadsPipeline);
        await buildRoadsExecution(selectedHexes);
        return { success: true };
        
      case 'failure':
        // Deduct costs even on failure (action was attempted)
        await applyActionCost(buildRoadsPipeline);
        return { success: true };
        
      case 'criticalFailure':
        // Deduct costs and apply +1 unrest modifier
        await applyActionCost(buildRoadsPipeline);
        await applyPipelineModifiers(buildRoadsPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
