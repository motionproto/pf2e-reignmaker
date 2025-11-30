/**
 * Remarkable Treasure Event Pipeline
 *
 * Generated from data/events/remarkable-treasure.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const remarkableTreasurePipeline: CheckPipeline = {
  id: 'remarkable-treasure',
  name: 'Remarkable Treasure',
  description: 'Explorers discover valuable resources or ancient treasure.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'society', description: 'appraise value' },
      { skill: 'thievery', description: 'secure it safely' },
      { skill: 'diplomacy', description: 'negotiate claims' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A legendary treasure is discovered.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d6+1', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'A valuable treasure is found.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The treasure is of modest value.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The treasure is cursed.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(remarkableTreasurePipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
