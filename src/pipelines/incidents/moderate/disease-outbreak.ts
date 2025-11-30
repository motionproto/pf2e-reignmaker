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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diseaseOutbreakPipeline, ctx.outcome, ctx);

    // Critical failure: damage a Medicine or Faith structure
    if (ctx.outcome === 'criticalFailure') {
      const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      await resolver.damageStructure(undefined, undefined, 1);
    }

    return { success: true };
  }
};
