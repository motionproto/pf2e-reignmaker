/**
 * Economic Surge Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const economicSurgePipeline: CheckPipeline = {
  id: 'economic-surge',
  name: 'Economic Surge',
  description: 'Trade and productivity boom throughout your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'society', description: 'manage growth' },
      { skill: 'diplomacy', description: 'attract traders' },
      { skill: 'crafting', description: 'increase production' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Trade flourishes throughout the kingdom.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d3', duration: 'immediate' }
      ]
    },
    success: {
      description: 'The economy grows steadily.',
      endsEvent: false,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The economic surge slows.',
      endsEvent: true,
      modifiers: []
    },
    criticalFailure: {
      description: 'The economic bubble bursts.',
      endsEvent: true,
      modifiers: []
    },
  },

  preview: {
  },

  traits: ["beneficial", "ongoing"],
};
