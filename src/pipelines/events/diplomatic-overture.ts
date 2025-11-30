/**
 * Diplomatic Overture Event Pipeline
 *
 * Generated from data/events/diplomatic-overture.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const diplomaticOverturePipeline: CheckPipeline = {
  id: 'diplomatic-overture',
  name: 'Diplomatic Overture',
  description: 'A neighboring kingdom reaches out to establish or improve diplomatic relations.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'formal negotiations' },
      { skill: 'society', description: 'cultural exchange' },
      { skill: 'deception', description: 'gain advantage' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Relations with the neighboring kingdom improve greatly.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'Relations with the neighboring kingdom improve.',
      modifiers: []
    },
    failure: {
      description: 'The negotiations go nowhere.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The negotiations turn sour.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diplomaticOverturePipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
