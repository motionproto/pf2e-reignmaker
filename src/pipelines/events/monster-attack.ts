/**
 * Monster Attack Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const monsterAttackPipeline: CheckPipeline = {
  id: 'monster-attack',
  name: 'Monster Attack',
  description: 'A dangerous creature attacks a settlement or travellers.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'drive it off' },
      { skill: 'nature', description: 'understand and redirect' },
      { skill: 'stealth', description: 'track and ambush' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The monster is defeated.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The monster is driven away.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The monster causes damage.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The monster rampages.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous"],
};
