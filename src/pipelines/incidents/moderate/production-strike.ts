/**
 * Production Strike Incident Pipeline
 *
 * Generated from data/incidents/moderate/production-strike.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const productionStrikePipeline: CheckPipeline = {
  id: 'production-strike',
  name: 'Production Strike',
  description: 'Workers strike, halting resource production',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'negotiate with workers' },
      { skill: 'society', description: 'arbitrate' },
      { skill: 'crafting', description: 'work alongside' },
      { skill: 'arcana', description: 'automate production' },
    ],

  outcomes: {
    success: {
      description: 'The strike ends.',
      modifiers: []
    },
    failure: {
      description: 'The strike causes resource losses.',
      modifiers: [
        { type: 'choice-buttons', resources: ["lumber", "ore", "stone"], value: '1d4-1', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A prolonged strike devastates production.',
      modifiers: [
        { type: 'choice-buttons', resources: ["lumber", "ore", "stone"], value: '2d4-1', negative: true, duration: 'immediate' }
      ]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure/Critical Failure: resource loss (choice will be shown via ChoiceButtons)
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-industry',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4-1' },
          suffix: 'of chosen resource',
          variant: 'negative'
        });
      }

      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-industry',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4-1' },
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
    await applyPipelineModifiers(productionStrikePipeline, ctx.outcome);
    return { success: true };
  }
};
