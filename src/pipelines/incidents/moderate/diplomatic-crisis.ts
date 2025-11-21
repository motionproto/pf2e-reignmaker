/**
 * Diplomatic Crisis Incident Pipeline
 *
 * Generated from data/incidents/moderate/diplomatic-crisis.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const diplomaticCrisisPipeline: CheckPipeline = {
  id: 'diplomatic-crisis',
  name: 'Diplomatic Crisis',
  description: 'A serious diplomatic crisis threatens relations',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'smooth over' },
      { skill: 'deception', description: 'deny responsibility' },
      { skill: 'society', description: 'formal apology' },
    ],

  outcomes: {
    success: {
      description: 'Relations are maintained.',
      modifiers: []
    },
    failure: {
      description: 'A neighboring kingdom\'s attitude worsens.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Multiple kingdoms turn against you.',
      modifiers: []
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(diplomaticCrisisPipeline, ctx.outcome);
    return { success: true };
  }
};
