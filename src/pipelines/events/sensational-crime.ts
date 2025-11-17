/**
 * Sensational Crime Event Pipeline
 *
 * Generated from data/events/sensational-crime.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const sensationalCrimePipeline: CheckPipeline = {
  id: 'sensational-crime',
  name: 'Sensational Crime',
  description: 'A notorious crime captures public attention.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'harsh justice' },
      { skill: 'society', description: 'investigation' },
      { skill: 'diplomacy', description: 'calm fears' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The criminal is caught spectacularly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The crime is solved.',
      modifiers: []
    },
    failure: {
      description: 'The criminal escapes.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Copycat crimes emerge.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(sensationalCrimePipeline, ctx.outcome);
    return { success: true };
  }
};
