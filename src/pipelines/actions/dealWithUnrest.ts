/**
 * Deal with Unrest Action Pipeline
 *
 * Address grievances and calm tensions through various approaches.
 * Data from: data/player-actions/deal-with-unrest.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

import { textBadge } from '../../types/OutcomeBadge';
// Store reference for execute function
const pipeline = createActionPipeline('deal-with-unrest', {
  // No cost - always available
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const unrestMap: Record<string, number> = {
        criticalSuccess: -3,
        success: -2,
        failure: -1,
        criticalFailure: 0
      };
      const unrestChange = unrestMap[ctx.outcome] || 0;
      
      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        outcomeBadges: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from JSON outcomes
    await applyPipelineModifiers(pipeline, ctx.outcome);
    return { success: true };
  }
});

export const dealWithUnrestPipeline = pipeline;
