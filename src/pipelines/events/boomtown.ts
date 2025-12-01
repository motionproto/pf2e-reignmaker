/**
 * Boomtown Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const boomtownPipeline: CheckPipeline = {
  id: 'boomtown',
  name: 'Boomtown',
  description: 'A settlement experiences sudden, dramatic growth.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'society', description: 'manage growth' },
      { skill: 'crafting', description: 'expand infrastructure' },
      { skill: 'diplomacy', description: 'maintain order' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The settlement experiences major growth.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', duration: 'immediate' }
      ]
    },
    success: {
      description: 'The settlement expands steadily.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The growth stalls.',
      endsEvent: true,
      modifiers: []
    },
    criticalFailure: {
      description: 'Corruption and greed flourish.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial", "ongoing"],
};
