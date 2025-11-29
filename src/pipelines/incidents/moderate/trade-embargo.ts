/**
 * Trade Embargo Incident Pipeline
 *
 * Generated from data/incidents/moderate/trade-embargo.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const tradeEmbargoPipeline: CheckPipeline = {
  id: 'trade-embargo',
  name: 'Trade Embargo',
  description: 'Neighboring kingdoms impose trade restrictions',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'diplomacy', description: 'negotiate' },
      { skill: 'society', description: 'find loopholes' },
      { skill: 'deception', description: 'smuggling routes' },
      { skill: 'occultism', description: 'divine trade routes' },
    ],

  outcomes: {
    success: {
      description: 'Trade continues.',
      modifiers: []
    },
    failure: {
      description: 'A trade embargo disrupts your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'choice-buttons', resources: ["lumber", "ore", "food", "stone"], value: '1d4+1', negative: true, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'A complete trade embargo cripples your economy.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'choice-buttons', resources: ["lumber", "ore", "food", "stone"], value: '1d4+1', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1d4 gold loss + choice of resource
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-boxes',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4+1' },
          suffix: 'of chosen resource',
          variant: 'negative'
        });
      }

      // Critical Failure: 2d4 gold loss + choice of resource + 1 unrest
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        outcomeBadges.push({
          icon: 'fa-boxes',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4+1' },
          suffix: 'of chosen resource',
          variant: 'negative'
        });
        resources.push({ resource: 'unrest', value: 1 });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
          ? ['Choose which resource to lose']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome - choice will be resolved by UI before this
    await applyPipelineModifiers(tradeEmbargoPipeline, ctx.outcome);
    return { success: true };
  }
};
