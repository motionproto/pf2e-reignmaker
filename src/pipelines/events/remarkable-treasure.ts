/**
 * Remarkable Treasure Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const remarkableTreasurePipeline: CheckPipeline = {
  id: 'remarkable-treasure',
  name: 'Remarkable Treasure',
  description: 'Explorers discover valuable resources or ancient treasure.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'society', description: 'appraise value' },
      { skill: 'thievery', description: 'secure it safely' },
      { skill: 'diplomacy', description: 'negotiate claims' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A legendary treasure is discovered.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d6+1', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'A valuable treasure is found.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The treasure is of modest value.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The treasure is cursed.',
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
