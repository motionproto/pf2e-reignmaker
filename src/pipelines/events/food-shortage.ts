/**
 * Food Shortage Event Pipeline
 *
 * Generated from data/events/food-shortage.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const foodShortagePipeline: CheckPipeline = {
  id: 'food-shortage',
  name: 'Food Shortage',
  description: 'Disease, weather, or pests destroy agricultural production.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'nature', description: 'agricultural expertise' },
      { skill: 'survival', description: 'emergency measures' },
      { skill: 'diplomacy', description: 'coordinate relief' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The crisis is averted.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The shortage is controlled.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '1d6+1', negative: true, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'A severe shortage develops.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'Famine threatens the kingdom.',
      modifiers: [
        { type: 'dice', resource: 'food', formula: '2d6+1', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(foodShortagePipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
