/**
 * outfitArmy Action Pipeline
 * Data from: data/player-actions/outfit-army.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const outfitArmyPipeline = createActionPipeline('outfit-army', {
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    return { met: true };
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];

      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        resources.push({ resource: 'ore', value: -1 });
        resources.push({ resource: 'gold', value: -2 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'gold', value: -2 });
      }

      const outcomeBadges = [];
      if (ctx.outcome !== 'failure') {
        const bonus = ctx.outcome === 'criticalSuccess' ? '+2' : '+1';
        specialEffects.push({
          type: 'status' as const,
          message: `Army will receive ${bonus} equipment bonus`,
          variant: (ctx.outcome === 'criticalFailure' ? 'negative' : 'positive') as const
        });
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  }
});
