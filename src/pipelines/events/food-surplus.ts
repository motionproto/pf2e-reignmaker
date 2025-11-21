/**
 * Food Surplus Event Pipeline
 *
 * Generated from data/events/food-surplus.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

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
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4+1', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The harvest is bountiful.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'A modest surplus is gathered.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Much of the surplus spoils.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(foodSurplusPipeline, ctx.outcome);
    return { success: true };
  }
};
