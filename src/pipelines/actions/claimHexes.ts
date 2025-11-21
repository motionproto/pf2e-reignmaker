/**
 * claimHexes Action Pipeline
 * Data from: data/player-actions/claim-hexes.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

// Claim Hexes has no requirements - always available
// Adjacency is enforced by the hex selector during selection
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const claimHexesPipeline = createActionPipeline('claim-hexes', {
  // No cost - always available. Adjacency enforced by hex selector.
  requirements: () => ({ met: true }),

  preview: {
    providedByInteraction: true  // Map selection shows hexes in real-time
  },

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success':
        // Explicit hex selection and claiming logic
        const hexIds = ctx.resolutionData.compoundData?.selectedHexes;
        if (!hexIds || hexIds.length === 0) {
          return { success: false, error: 'No hexes selected' };
        }
        await claimHexesExecution(hexIds);
        return { success: true };
        
      case 'failure':
        // Explicitly do nothing for failure (no modifiers defined)
        return { success: true };
        
      case 'criticalFailure':
        // Explicitly apply +1 unrest modifier from pipeline
        await applyPipelineModifiers(claimHexesPipeline, ctx.outcome);
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
});
