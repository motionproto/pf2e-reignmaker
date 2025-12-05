/**
 * Nature's Blessing Event Pipeline
 *
 * Critical Success: +1 Fame, +2d3 food
 * Success: +1d3 food
 * Failure: Nothing
 * Critical Failure: Nothing (beneficial event, no punishment)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const naturesBlessingPipeline: CheckPipeline = {
  id: 'natures-blessing',
  name: "Nature's Blessing",
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
      description: 'Word spreads of the wonder, and nature provides a bountiful harvest.',
      modifiers: [
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
        { type: 'dice', resource: 'food', formula: '2d3', duration: 'immediate' },
      ]
    },
    success: {
      description: 'The blessing yields a bountiful harvest.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The wonder fades before it can be celebrated.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Debates over its meaning are harmless.',
      modifiers: []
    },
  },

  preview: {
  },

  traits: ["beneficial"],
};
