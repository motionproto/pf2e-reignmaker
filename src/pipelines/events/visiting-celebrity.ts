/**
 * Visiting Celebrity Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const visitingCelebrityPipeline: CheckPipeline = {
  id: 'visiting-celebrity',
  name: 'Visiting Celebrity',
  description: 'A famous person visits your kingdom, bringing attention and opportunity.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'formal reception' },
      { skill: 'performance', description: 'entertainment' },
      { skill: 'society', description: 'social events' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The visit is spectacular.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The visit is pleasant.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The visit is mediocre.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'The celebrity is offended.',
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
