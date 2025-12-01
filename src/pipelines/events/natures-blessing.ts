/**
 * Natures Blessing Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const naturesBlessingPipeline: CheckPipeline = {
  id: 'natures-blessing',
  name: 'Natures Blessing',
  description: 'A natural wonder appears in your kingdom - rare flowers, aurora, or returning wildlife.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'nature', description: 'understand the blessing' },
      { skill: 'performance', description: 'celebrate it' },
      { skill: 'society', description: 'organize festivals' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The blessing inspires the kingdom.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The omen is pleasant.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The wonder fades quickly.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'Arguments erupt over its meaning.',
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
