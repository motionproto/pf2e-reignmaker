/**
 * Mass Exodus Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const massExodusPipeline: CheckPipeline = {
  id: 'mass-exodus',
  name: 'Mass Exodus',
  description: 'Large numbers of citizens flee your kingdom',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'convince to stay' },
      { skill: 'performance', description: 'inspire hope' },
      { skill: 'religion', description: 'spiritual guidance' },
    ],

  outcomes: {
    success: {
      description: 'The population remains.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon projects.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      gameCommands: [
        { type: 'destroyWorksite', count: 1 }
      ]
    },
    criticalFailure: {
      description: 'A mass exodus damages your kingdom.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ],
      gameCommands: [
        { type: 'destroyWorksite', count: 1 },
        { type: 'damageStructure', count: 1 }
      ]
    },
  },

  // PipelineCoordinator handles gameCommands automatically
  execute: undefined,

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"]
};
