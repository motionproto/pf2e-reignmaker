/**
 * Land Rush Event Pipeline
 *
 * Generated from data/events/land-rush.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const landRushPipeline: CheckPipeline = {
  id: 'land-rush',
  name: 'Land Rush',
  description: 'Settlers attempt to claim wilderness at the kingdom\'s border.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'negotiate with settlers' },
      { skill: 'survival', description: 'guide their efforts' },
      { skill: 'intimidation', description: 'assert control' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Settlers expand the kingdom.',
      modifiers: [
        { type: 'static', resource: 'claim_hex', value: 2, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Settlers claim new land.',
      modifiers: [
        { type: 'static', resource: 'claim_hex', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The settlers disperse.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts at the border.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(landRushPipeline, ctx.outcome);
    return { success: true };
  }
};
