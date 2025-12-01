/**
 * Scholarly Discovery Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const scholarlyDiscoveryPipeline: CheckPipeline = {
  id: 'scholarly-discovery',
  name: 'Scholarly Discovery',
  description: 'Researchers in your kingdom make an important academic breakthrough.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'lore', description: 'historical research' },
      { skill: 'arcana', description: 'theoretical magic' },
      { skill: 'society', description: 'social sciences' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A revolutionary discovery is made.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'Important findings emerge.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The research is inconclusive.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'An academic scandal erupts.',
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
