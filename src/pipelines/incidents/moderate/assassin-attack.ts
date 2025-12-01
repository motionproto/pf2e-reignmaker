/**
 * Assassination Attempt Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const assassinAttackPipeline: CheckPipeline = {
  id: 'assassin-attack',
  name: 'Assassin Attack',
  description: 'An assassin targets one of your kingdom\'s leaders',
  checkType: 'incident',
  tier: 2,

  skills: [
    { skill: 'athletics', description: 'protect target' },
    { skill: 'medicine', description: 'treat wounds' },
    { skill: 'stealth', description: 'avoid the assassin' },
  ],

  outcomes: {
    success: {
      description: 'The assassination is prevented.',
      modifiers: []
    },
    failure: {
      description: 'The leader escapes.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The leader is wounded and cannot act.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      gameCommands: [
        {
          type: 'spendPlayerAction',
          characterSelection: 'random'
        }
      ]
    },
  },

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  traits: ["dangerous"],
};
