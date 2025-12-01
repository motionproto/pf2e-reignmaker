/**
 * Land Rush Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

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
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'claim_hex', value: 2, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Settlers claim new land.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'claim_hex', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The settlers disperse.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Violence erupts at the border.',
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
