/**
 * Undead Uprising Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

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
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The undead are put down.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The undead spread.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A major outbreak occurs.',
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
