/**
 * Feud Event Pipeline
 *
 * Generated from data/events/feud.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const feudPipeline: CheckPipeline = {
  id: 'feud',
  name: 'Feud',
  description: 'Two prominent families are engaged in a bitter feud that threatens to tear the community apart.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'mediate between families' },
      { skill: 'intimidation', description: 'force them to stop' },
      { skill: 'deception', description: 'manipulate resolution' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The families become allies.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The feud is resolved.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The feud escalates.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts in the streets.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 3, duration: 'immediate' },
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(feudPipeline, ctx.outcome);
    return { success: true };
  }
};
