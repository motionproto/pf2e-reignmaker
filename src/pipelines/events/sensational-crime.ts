/**
 * Sensational Crime Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const sensationalCrimePipeline: CheckPipeline = {
  id: 'sensational-crime',
  name: 'Sensational Crime',
  description: 'A notorious crime captures public attention.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'harsh justice' },
      { skill: 'society', description: 'investigation' },
      { skill: 'diplomacy', description: 'calm fears' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The criminal is caught spectacularly.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The crime is solved.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The criminal escapes.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Copycat crimes emerge.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous"],
};
