/**
 * Festive Invitation Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const festiveInvitationPipeline: CheckPipeline = {
  id: 'festive-invitation',
  name: 'Festive Invitation',
  description: 'A neighboring kingdom invites your leaders to a grand festival.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'formal attendance' },
      { skill: 'performance', description: 'entertain hosts' },
      { skill: 'society', description: 'navigate customs' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Your leaders are the stars of the festival.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'Your leaders enjoy a pleasant visit.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The visit is uneventful.',
      endsEvent: false,
      modifiers: []
    },
    criticalFailure: {
      description: 'Your leaders commit a diplomatic blunder.',
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
