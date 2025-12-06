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
      description: 'The criminal is caught and stolen goods are recovered!',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The crime is solved and the public is reassured.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The criminal escapes with their ill-gotten gains.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Copycat crimes emerge, spreading fear and losses.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1d3', negative: true, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  traits: ["dangerous"],
};
