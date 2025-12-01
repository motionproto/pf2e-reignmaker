/**
 * Raiders Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const raidersPipeline: CheckPipeline = {
  id: 'raiders',
  name: 'Raiders',
  description: 'Armed raiders threaten settlements and trade routes.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'military response' },
      { skill: 'diplomacy', description: 'negotiate tribute' },
      { skill: 'stealth', description: 'track to their base' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The raiders are defeated.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The raiders are repelled.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The raiders plunder your holdings.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A major raid devastates the area.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous", "ongoing"],
};
