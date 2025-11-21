/**
 * Emigration Threat Incident Pipeline
 *
 * Generated from data/incidents/minor/emigration-threat.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const emigrationThreatPipeline: CheckPipeline = {
  id: 'emigration-threat',
  name: 'Emigration Threat',
  description: 'Citizens threaten to leave your kingdom permanently',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'convince to stay' },
      { skill: 'society', description: 'address concerns' },
      { skill: 'religion', description: 'appeal to faith' },
      { skill: 'nature', description: 'improve local conditions' },
    ],

  outcomes: {
    success: {
      description: 'The population stays.',
      modifiers: []
    },
    failure: {
      description: 'Citizens abandon ongoing projects.',
      modifiers: [],
      manualEffects: ["Choose or roll for one random ongoing worksite. That worksite is destroyed (remove all progress)"]
    },
    criticalFailure: {
      description: 'Mass emigration causes chaos.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random ongoing worksite. That worksite is destroyed (remove all progress)"]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(emigrationThreatPipeline, ctx.outcome);
    return { success: true };
  }
};
