/**
 * Bandit Activity Event Pipeline
 *
 * Generated from data/events/bandit-activity.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const banditActivityPipeline: CheckPipeline = {
  id: 'bandit-activity',
  name: 'Bandit Activity',
  description: 'Bandits have been spotted raiding caravans and settlements in your territory.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'drive them off with force' },
      { skill: 'diplomacy', description: 'negotiate safe passage' },
      { skill: 'stealth', description: 'track them to their hideout' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The bandits are captured and reformed.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The bandits flee into the wilderness.',
      modifiers: []
    },
    failure: {
      description: 'The bandits evade capture.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'The bandits grow bolder.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(banditActivityPipeline, ctx.outcome);
    return { success: true };
  }
};
