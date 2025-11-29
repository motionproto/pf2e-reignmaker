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
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: worksite destroyed
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-hammer',
          prefix: '',
          value: { type: 'text', text: '1 worksite destroyed' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 1 unrest + worksite destroyed
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-hammer',
          prefix: '',
          value: { type: 'text', text: '1 worksite destroyed' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
          ? ['One random ongoing worksite will be destroyed (remove all progress)']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(emigrationThreatPipeline, ctx.outcome);
    // Note: destroyWorksite command not implemented - handled as manual effect
    return { success: true };
  }
};
