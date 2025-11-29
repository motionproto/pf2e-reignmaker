/**
 * Rising Tensions Incident Pipeline
 *
 * Generated from data/incidents/minor/rising-tensions.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const risingTensionsPipeline: CheckPipeline = {
  id: 'rising-tensions',
  name: 'Rising Tensions',
  description: 'General tensions rise throughout your kingdom',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'calm populace' },
      { skill: 'religion', description: 'spiritual guidance' },
      { skill: 'performance', description: 'entertainment' },
      { skill: 'arcana', description: 'magical displays' },
    ],

  outcomes: {
    success: {
      description: 'Tensions ease.',
      modifiers: []
    },
    failure: {
      description: 'Tensions escalate.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Tensions escalate dramatically.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1 unrest
      if (ctx.outcome === 'failure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      // Critical Failure: 2 unrest
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 2 });
      }

      return {
        resources,
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(risingTensionsPipeline, ctx.outcome);
    return { success: true };
  }
};
