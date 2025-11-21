/**
 * Plague Event Pipeline
 *
 * Generated from data/events/plague.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const plaguePipeline: CheckPipeline = {
  id: 'plague',
  name: 'Plague',
  description: 'Disease spreads rapidly through your settlements.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'medicine', description: 'treat the sick' },
      { skill: 'religion', description: 'divine healing' },
      { skill: 'society', description: 'quarantine measures' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The plague is cured.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The plague is contained.',
      modifiers: []
    },
    failure: {
      description: 'The plague spreads.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A devastating outbreak occurs.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(plaguePipeline, ctx.outcome);
    return { success: true };
  }
};
