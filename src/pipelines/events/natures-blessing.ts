/**
 * Natures Blessing Event Pipeline
 *
 * Generated from data/events/natures-blessing.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const naturesBlessingPipeline: CheckPipeline = {
  id: 'natures-blessing',
  name: 'Natures Blessing',
  description: 'A natural wonder appears in your kingdom - rare flowers, aurora, or returning wildlife.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'nature', description: 'understand the blessing' },
      { skill: 'performance', description: 'celebrate it' },
      { skill: 'society', description: 'organize festivals' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The blessing inspires the kingdom.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The omen is pleasant.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The wonder fades quickly.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Arguments erupt over its meaning.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(naturesBlessingPipeline, ctx.outcome);
    return { success: true };
  }
};
