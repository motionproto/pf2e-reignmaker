/**
 * Visiting Celebrity Event Pipeline
 *
 * Generated from data/events/visiting-celebrity.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const visitingCelebrityPipeline: CheckPipeline = {
  id: 'visiting-celebrity',
  name: 'Visiting Celebrity',
  description: 'A famous person visits your kingdom, bringing attention and opportunity.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'diplomacy', description: 'formal reception' },
      { skill: 'performance', description: 'entertainment' },
      { skill: 'society', description: 'social events' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The visit is spectacular.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' },
      ]
    },
    success: {
      description: 'The visit is pleasant.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The visit is mediocre.',
      modifiers: []
    },
    criticalFailure: {
      description: 'The celebrity is offended.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(visitingCelebrityPipeline, ctx.outcome);
    return { success: true };
  }
};
