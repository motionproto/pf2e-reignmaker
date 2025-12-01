/**
 * Diplomatic Overture Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const diplomaticOverturePipeline: CheckPipeline = {
  id: 'diplomatic-overture',
  name: 'Diplomatic Overture',
  description: 'A neighboring kingdom reaches out to establish or improve diplomatic relations.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'formal negotiations' },
      { skill: 'society', description: 'cultural exchange' },
      { skill: 'deception', description: 'gain advantage' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Relations with the neighboring kingdom improve greatly.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'Relations with the neighboring kingdom improve.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The negotiations go nowhere.',
      endsEvent: true,
      modifiers: []
    },
    criticalFailure: {
      description: 'The negotiations turn sour.',
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
