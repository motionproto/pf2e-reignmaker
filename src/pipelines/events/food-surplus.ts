/**
 * Food Surplus Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';

export const foodSurplusPipeline: CheckPipeline = {
  id: 'food-surplus',
  name: 'Food Surplus',
  description: 'Exceptional harvests provide abundant food.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'nature', description: 'maximize the bounty' },
      { skill: 'society', description: 'organize distribution' },
      { skill: 'crafting', description: 'preserve excess' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A massive surplus fills the granaries.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4+1', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The harvest is bountiful.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'A modest surplus is gathered.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Much of the surplus spoils.',
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
