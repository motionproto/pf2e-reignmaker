/**
 * Demand Structure Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const demandStructurePipeline: CheckPipeline = {
  id: 'demand-structure',
  name: 'Demand Structure',
  description: 'Citizens demand that a specific structure be built.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'negotiate a compromise' },
      { skill: 'intimidation', description: 'enforce order' },
      { skill: 'society', description: 'understand their needs' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The citizens are convinced.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The demands are satisfied.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The protests continue.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts.',
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
