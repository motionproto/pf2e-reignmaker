/**
 * Arrest Dissidents Action Pipeline
 *
 * Convert current unrest to imprisoned unrest.
 * Data from: data/player-actions/arrest-dissidents.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { hasUnrestToArrest, calculateImprisonmentCapacity } from '../shared/ActionHelpers';

import { textBadge } from '../../types/OutcomeBadge';
export const arrestDissidentsPipeline = createActionPipeline('arrest-dissidents', {
  requirements: (kingdom) => {
    // Check if there's any unrest to arrest
    if (!hasUnrestToArrest(kingdom)) {
      return { met: false, reason: 'No unrest to arrest' };
    }
    
    // Check imprisonment capacity
    const capacity = calculateImprisonmentCapacity(kingdom);
    if (capacity.available <= 0) {
      return { met: false, reason: 'No justice structures with available capacity' };
    }
    
    return { met: true };
  },

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
          outcomeBadges: [],
          warnings: []
        };
      }

      return {
        resources: [],
        outcomeBadges: [
          textBadge('Will convert unrest to imprisoned unrest', 'fa-gavel', 'positive')
        ],
        warnings: []
      };
    }
  }

  // NOTE: Execution handled by custom implementation
});
