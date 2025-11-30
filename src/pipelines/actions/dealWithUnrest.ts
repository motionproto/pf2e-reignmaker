/**
 * Deal with Unrest Action Pipeline
 *
 * Address grievances and calm tensions through various approaches.
 * Data from: data/player-actions/deal-with-unrest.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

// Store reference for execute function
const pipeline = createActionPipeline('deal-with-unrest', {
  // No cost - always available
  requirements: () => ({ met: true }),

  // No preview needed - JSON modifiers auto-converted by PipelineCoordinator
  preview: undefined

  // ✅ REMOVED: No longer needed - UnifiedCheckHandler handles modifiers automatically
});

export const dealWithUnrestPipeline = pipeline;
