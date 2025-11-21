/**
 * Boomtown Event Pipeline
 *
 * Generated from data/events/boomtown.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const boomtownPipeline: CheckPipeline = {
  id: 'boomtown',
  name: 'Boomtown',
  description: 'A settlement experiences sudden, dramatic growth.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'society', description: 'manage growth' },
      { skill: 'crafting', description: 'expand infrastructure' },
      { skill: 'diplomacy', description: 'maintain order' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The settlement experiences major growth.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', duration: 'immediate' }
      ]
    },
    success: {
      description: 'The settlement expands steadily.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The growth stalls.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Corruption and greed flourish.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(boomtownPipeline, ctx.outcome);
    return { success: true };
  }
};
