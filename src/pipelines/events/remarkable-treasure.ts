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
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d3', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'A valuable treasure is found.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The treasure is of modest value.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The treasure is cursed.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial"],
};
