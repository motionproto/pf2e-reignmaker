/**
 * Cult Activity Event Pipeline
 *
 * Generated from data/events/cult-activity.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const cultActivityPipeline: CheckPipeline = {
  id: 'cult-activity',
  name: 'Cult Activity',
  description: 'A dangerous cult has been discovered operating in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'counter with true faith' },
      { skill: 'diplomacy', description: 'reason with cultists' },
      { skill: 'intimidation', description: 'forcibly disband them' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The cultists are converted.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The cult is disbanded.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The cult evades your forces.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The cult\'s influence spreads.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
        { type: 'dice', resource: 'gold', formula: '1', negative: true, duration: 'immediate' },
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(cultActivityPipeline, ctx.outcome);
    return { success: true };
  }
};
