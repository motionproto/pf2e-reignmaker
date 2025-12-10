/**
 * Economic Surge Event Pipeline
 *
 * Trade and productivity boom throughout your kingdom.
 * Uses ChoiceModifier for simple resource selection.
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
      description: 'Trade flourishes - choose how to invest the windfall.',
      endsEvent: false,
      modifiers: [
        { type: 'choice', resources: ['gold', 'fame'], value: 4, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The economy grows steadily - choose the benefit.',
      endsEvent: false,
      modifiers: [
        { type: 'choice', resources: ['gold', 'fame'], value: 3, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The economic surge slows.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The economic bubble bursts.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      // ChoiceModifier is handled automatically by the system
      return { resources: [], outcomeBadges: [] };
    }
  },

  traits: ['beneficial', 'ongoing'],
};
