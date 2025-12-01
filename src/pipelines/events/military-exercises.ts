/**
 * Military Exercises Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const militaryExercisesPipeline: CheckPipeline = {
  id: 'military-exercises',
  name: 'Military Exercises',
  description: 'Your kingdom conducts large-scale military training maneuvers.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'athletics', description: 'physical conditioning drills' },
      { skill: 'acrobatics', description: 'agility and combat maneuvers' },
      { skill: 'intimidation', description: 'discipline and morale' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The exercises forge elite forces.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The training goes well.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The training is ineffective.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'A training accident occurs.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial"],
};
