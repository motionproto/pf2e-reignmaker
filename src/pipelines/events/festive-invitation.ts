/**
 * Festive Invitation Event Pipeline
 *
 * Generated from data/events/festive-invitation.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

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
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'Your leaders enjoy a pleasant visit.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The visit is uneventful.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your leaders commit a diplomatic blunder.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  }
};
