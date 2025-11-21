/**
 * Arrest Dissidents Action Pipeline
 *
 * Convert current unrest to imprisoned unrest.
 * Data from: data/player-actions/arrest-dissidents.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const arrestDissidentsPipeline = createActionPipeline('arrest-dissidents', {
  // Custom post-roll interaction for settlement/amount selection
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'arrestDetails',
      label: 'Select arrest details'
    }
  ],

  preview: {
    calculate: (ctx) => {
      if (ctx.outcome === 'criticalFailure') {
        return {
          resources: [{ resource: 'unrest', value: 1 }],
          specialEffects: [],
          warnings: []
        };
      }

      return {
        resources: [],
        specialEffects: [{
          type: 'status' as const,
          message: 'Will convert unrest to imprisoned unrest',
          variant: 'positive' as const
        }],
        warnings: []
      };
    }
  }

  // NOTE: Execution handled by custom implementation
});
