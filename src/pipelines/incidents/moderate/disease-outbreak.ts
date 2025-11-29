/**
 * Disease Outbreak Incident Pipeline
 *
 * Generated from data/incidents/moderate/disease-outbreak.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const diseaseOutbreakPipeline: CheckPipeline = {
  id: 'disease-outbreak',
  name: 'Disease Outbreak',
  description: 'A dangerous disease spreads through your settlements',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'medicine', description: 'treat disease' },
      { skill: 'nature', description: 'natural remedies' },
      { skill: 'religion', description: 'divine healing' },
    ],

  outcomes: {
    success: {
      description: 'The disease is contained.',
      modifiers: []
    },
    failure: {
      description: 'The disease spreads through settlements.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'The disease devastates your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      manualEffects: ["Choose or roll for one Medicine or Faith structure. Mark that structure as damaged"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1d4 food loss + 1 unrest
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-apple-alt',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4' },
          suffix: 'Food',
          variant: 'negative'
        });
        resources.push({ resource: 'unrest', value: 1 });
      }

      // Critical Failure: 2d4 food loss + 1 unrest + structure damage
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-apple-alt',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Food',
          variant: 'negative'
        });
        resources.push({ resource: 'unrest', value: 1 });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'criticalFailure'
          ? ['One Medicine or Faith structure will be damaged']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diseaseOutbreakPipeline, ctx.outcome);

    // Critical failure: damage a Medicine or Faith structure
    if (ctx.outcome === 'criticalFailure') {
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      await resolver.damageStructure(undefined, undefined, 1);
    }

    return { success: true };
  }
};
