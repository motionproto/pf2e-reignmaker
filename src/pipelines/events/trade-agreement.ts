/**
 * Trade Agreement Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const tradeAgreementPipeline: CheckPipeline = {
  id: 'trade-agreement',
  name: 'Trade Agreement',
  description: 'Merchants propose a lucrative trade arrangement.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'negotiate terms' },
      { skill: 'society', description: 'assess markets' },
      { skill: 'deception', description: 'leverage position' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'An exclusive trade deal is secured.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d3', duration: 'immediate' }
      ]
    },
    success: {
      description: 'A standard agreement is reached.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The terms are poor.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A trade dispute erupts.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
  },

  preview: {
  },

  traits: ["beneficial"],
};
