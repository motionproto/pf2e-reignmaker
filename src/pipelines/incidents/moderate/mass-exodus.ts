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
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1 unrest + worksite destroyed
      if (ctx.outcome === 'failure') {
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-hammer',
          prefix: '',
          value: { type: 'text', text: '1 worksite destroyed' },
          suffix: '',
          variant: 'negative'
        });
      }

      // Critical Failure: 1 unrest + 1 fame loss + worksite destroyed
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
        resources.push({ resource: 'fame', value: -1 });
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
    await applyPipelineModifiers(massExodusPipeline, ctx.outcome);
    // Note: destroyWorksite command not implemented - handled as manual effect
    return { success: true };
  }
};
