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
      description: 'The celebrity is utterly charmed and sings your praises across the land.',
      modifiers: [
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The celebrity enjoys the festivities and leaves generous gifts behind.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The celebrity departs without fanfare, already forgetting your name.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The celebrity storms off in a huff, loudly complaining about your hospitality.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial"],
};
