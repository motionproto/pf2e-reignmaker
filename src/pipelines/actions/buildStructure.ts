/**
 * buildStructure Action Pipeline
 * Data from: data/player-actions/build-structure.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const buildStructurePipeline = createActionPipeline('build-structure', {
  requirements: (kingdom) => {
    if (kingdom.settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements available'
      };
    }
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'compound',
      id: 'buildingDetails',
      label: 'Select settlement and structure'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const resources = ctx.outcome === 'criticalFailure' ?
        [{ resource: 'unrest', value: 1 }] : [];

      const outcomeBadges = [];
      if (ctx.outcome !== 'failure' && ctx.outcome !== 'criticalFailure') {
        specialEffects.push({
          type: 'entity' as const,
          message: `Will build ${ctx.metadata.structureName || 'structure'} in ${ctx.metadata.settlementName || 'settlement'}`,
          variant: 'positive' as const
        });
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  }
});
