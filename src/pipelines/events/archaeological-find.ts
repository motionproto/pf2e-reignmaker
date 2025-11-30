/**
 * Archaeological Find Event Pipeline
 *
 * Generated from data/events/archaeological-find.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const archaeologicalFindPipeline: CheckPipeline = {
  id: 'archaeological-find',
  name: 'Archaeological Find',
  description: 'Ancient ruins or artifacts are discovered in your territory.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'society', description: 'historical research' },
      { skill: 'religion', description: 'divine significance' },
      { skill: 'occultism', description: 'arcane investigation' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A major discovery brings wealth and fame.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
      ]
    },
    success: {
      description: 'Valuable artifacts are uncovered.',
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Only minor artifacts are found.',
      modifiers: [
        { type: 'choice', resources: ["food", "lumber", "ore", "stone"], value: 1, negative: false, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The site awakens something dangerous.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(archaeologicalFindPipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
