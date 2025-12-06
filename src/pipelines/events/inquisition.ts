/**
 * Inquisition Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const inquisitionPipeline: CheckPipeline = {
  id: 'inquisition',
  name: 'Inquisition',
  description: 'Zealots mobilize against a minority group or belief.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'theological debate' },
      { skill: 'intimidation', description: 'suppress zealots' },
      { skill: 'diplomacy', description: 'protect victims' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The situation is peacefully resolved.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The zealots are dispersed.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The persecution spreads.',
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
