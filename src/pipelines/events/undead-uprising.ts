/**
 * Undead Uprising Event Pipeline
 *
 * Generated from data/events/undead-uprising.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const undeadUprisingPipeline: CheckPipeline = {
  id: 'undead-uprising',
  name: 'Undead Uprising',
  description: 'The dead rise from their graves to threaten the living.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'consecrate and bless' },
      { skill: 'arcana', description: 'magical containment' },
      { skill: 'intimidation', description: 'destroy by force' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The undead are destroyed.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The undead are put down.',
      modifiers: []
    },
    failure: {
      description: 'The undead spread.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A major outbreak occurs.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(undeadUprisingPipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
