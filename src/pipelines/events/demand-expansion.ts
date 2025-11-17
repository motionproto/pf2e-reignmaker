/**
 * Demand Expansion Event Pipeline
 *
 * Generated from data/events/demand-expansion.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const demandExpansionPipeline: CheckPipeline = {
  id: 'demand-expansion',
  name: 'Demand Expansion',
  description: 'Citizens demand the kingdom claim new territory.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'promise future growth' },
      { skill: 'survival', description: 'show expansion plans' },
      { skill: 'intimidation', description: 'demand patience' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The people are inspired by your vision of growth.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The people accept your promises.',
      modifiers: []
    },
    failure: {
      description: 'The people continue to demand expansion.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The people grow angry at your inaction.',
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
    await applyPipelineModifiers(demandExpansionPipeline, ctx.outcome);
    return { success: true };
  }
};
