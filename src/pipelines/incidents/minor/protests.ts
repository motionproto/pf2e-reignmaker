/**
 * Protests Incident Pipeline
 *
 * Generated from data/incidents/minor/protests.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const protestsPipeline: CheckPipeline = {
  id: 'protests',
  name: 'Protests',
  description: 'Citizens take to the streets in organized protests',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'diplomacy', description: 'address crowd' },
      { skill: 'intimidation', description: 'disperse crowds' },
      { skill: 'performance', description: 'distract crowds' },
      { skill: 'arcana', description: 'magical calming' },
    ],

  outcomes: {
    success: {
      description: 'The protests are resolved peacefully.',
      modifiers: []
    },
    failure: {
      description: 'Property damage occurs.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Widespread damage and disorder erupt.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1d4 gold loss (property damage)
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
      }

      // Critical Failure: 2d4 gold loss + 1 fame loss
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        resources.push({ resource: 'fame', value: -1 });
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
    await applyPipelineModifiers(protestsPipeline, ctx.outcome);
    return { success: true };
  }
};
