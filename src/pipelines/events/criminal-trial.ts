/**
 * Criminal Trial Event Pipeline
 *
 * Generated from data/events/criminal-trial.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const criminalTrialPipeline: CheckPipeline = {
  id: 'criminal-trial',
  name: 'Criminal Trial',
  description: 'Authorities catch a notorious criminal or resolve a major injustice.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'intimidation', description: 'show of force' },
      { skill: 'diplomacy', description: 'public ceremony' },
      { skill: 'society', description: 'legal proceedings' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Justice triumphs.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Justice is served.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Complications arise from the trial.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Justice is miscarried.',
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
    await applyPipelineModifiers(criminalTrialPipeline, ctx.outcome);
    return { success: true };
  }
};
