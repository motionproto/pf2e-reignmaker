/**
 * Work Stoppage Incident Pipeline
 *
 * Generated from data/incidents/minor/work-stoppage.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const workStoppagePipeline: CheckPipeline = {
  id: 'work-stoppage',
  name: 'Work Stoppage',
  description: 'Workers in your kingdom refuse to continue their labor',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with workers' },
      { skill: 'intimidation', description: 'force work' },
      { skill: 'performance', description: 'inspire workers' },
      { skill: 'medicine', description: 'address health concerns' },
    ],

  outcomes: {
    success: {
      description: 'The workers return.',
      modifiers: []
    },
    failure: {
      description: 'Work stoppage halts production.',
      modifiers: [
        { type: 'choice-buttons', resources: ["lumber", "ore", "stone"], value: 1, negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Widespread work stoppage causes chaos.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
        { type: 'choice-buttons', resources: ["lumber", "ore", "stone"], value: 2, negative: true, duration: 'immediate' },
      ]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: lose 1 of chosen resource
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-industry',
          prefix: 'Lose',
          value: { type: 'static', value: 1 },
          suffix: 'of chosen resource',
          variant: 'negative'
        });
      }

      // Critical Failure: 1 unrest + lose 2 of chosen resource
      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-industry',
          prefix: 'Lose',
          value: { type: 'static', value: 2 },
          suffix: 'of chosen resource',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
          ? ['Choose which resource to lose: Lumber, Ore, or Stone']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome - choice will be resolved by UI before this
    await applyPipelineModifiers(workStoppagePipeline, ctx.outcome);
    return { success: true };
  }
};
