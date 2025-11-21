/**
 * Mass Exodus Incident Pipeline
 *
 * Generated from data/incidents/moderate/mass-exodus.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const massExodusPipeline: CheckPipeline = {
  id: 'mass-exodus',
  name: 'Mass Exodus',
  description: 'Large numbers of citizens flee your kingdom',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'convince to stay' },
      { skill: 'performance', description: 'inspire hope' },
      { skill: 'religion', description: 'spiritual guidance' },
    ],

  outcomes: {
    success: {
      description: 'The population remains.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon projects.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random ongoing worksite. That worksite is destroyed (remove all progress)"]
    },
    criticalFailure: {
      description: 'A mass exodus damages your kingdom.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ],
      manualEffects: ["Choose or roll for one random ongoing worksite. That worksite is destroyed (remove all progress)"]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(massExodusPipeline, ctx.outcome);
    return { success: true };
  }
};
