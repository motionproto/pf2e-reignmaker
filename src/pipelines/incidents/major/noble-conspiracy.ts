/**
 * Noble Conspiracy Incident Pipeline
 *
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';

export const nobleConspiracyPipeline: CheckPipeline = {
  id: 'noble-conspiracy',
  name: 'Noble Conspiracy',
  description: 'Nobles plot to overthrow the kingdom\'s leadership',
  checkType: 'incident',
  tier: 3,

  skills: [
      { skill: 'stealth', description: 'uncover plot' },
      { skill: 'intimidation', description: 'arrests' },
      { skill: 'society', description: 'political maneuvering' },
      { skill: 'occultism', description: 'divine truth' },
    ],

  outcomes: {
    success: {
      description: 'The conspiracy is exposed.',
      modifiers: []
    },
    failure: {
      description: 'The conspiracy undermines your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'The conspiracy strikes and a leader is compromised.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
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
