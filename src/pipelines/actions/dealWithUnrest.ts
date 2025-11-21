/**
 * Deal with Unrest Action Pipeline
 *
 * Address grievances and calm tensions through various approaches.
 * Data from: data/player-actions/deal-with-unrest.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

// Store reference for execute function
const pipeline = createActionPipeline('deal-with-unrest', {
  // No cost - always available
  requirements: () => ({ met: true }),

  // No preview needed - JSON modifiers auto-converted by PipelineCoordinator
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from JSON outcomes
    await applyPipelineModifiers(pipeline, ctx.outcome);
    return { success: true };
  }
});

export const dealWithUnrestPipeline = pipeline;
