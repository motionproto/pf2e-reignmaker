/**
 * International Scandal Incident Pipeline
 *
 * Generated from data/incidents/major/international-scandal.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const internationalScandalPipeline: CheckPipeline = {
  id: 'international-scandal',
  name: 'International Scandal',
  description: 'A massive scandal ruins your kingdom\'s reputation',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'performance', description: 'grand gesture' },
      { skill: 'diplomacy', description: 'public relations' },
      { skill: 'deception', description: 'propaganda' },
    ],

  outcomes: {
    success: {
      description: 'Your reputation is maintained.',
      modifiers: []
    },
    failure: {
      description: 'Your kingdom\'s reputation suffers.',
      modifiers: [
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A devastating scandal destroys your kingdom\'s standing.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      manualEffects: ["Your kingdom's fame is reduced to 0 for the remainder of this turn (regardless of current value)", "Your kingdom cannot gain fame for the remainder of this turn"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1 fame loss + 1d4 gold loss
      if (ctx.outcome === 'failure') {
        resources.push({ resource: 'fame', value: -1 });
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
      }

      // Critical Failure: 2d4 gold loss + 1 unrest + fame reduced to 0
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-star',
          prefix: '',
          value: { type: 'text', text: 'Fame reduced to 0' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'criticalFailure'
          ? ['Your kingdom cannot gain fame for the remainder of this turn']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(internationalScandalPipeline, ctx.outcome);
    return { success: true };
  }
};
