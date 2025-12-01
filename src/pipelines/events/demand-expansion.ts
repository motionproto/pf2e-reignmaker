/**
 * Demand Expansion Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

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
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The people accept your promises.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The people continue to demand expansion.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The people grow angry at your inaction.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous", "ongoing"],
};
