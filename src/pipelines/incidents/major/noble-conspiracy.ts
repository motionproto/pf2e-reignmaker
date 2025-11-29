/**
 * Noble Conspiracy Incident Pipeline
 *
 * Generated from data/incidents/major/noble-conspiracy.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const nobleConspiracyPipeline: CheckPipeline = {
  id: 'noble-conspiracy',
  name: 'Noble Conspiracy',
  description: 'Nobles plot to overthrow the kingdom\'s leadership',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'stealth', description: 'uncover plot' },
      { skill: 'intimidation', description: 'arrests' },
      { skill: 'society', description: 'political maneuvering' },
      { skill: 'occultism', description: 'divine truth' },
    ],

  outcomes: {
    success: {
      description: 'The conspiracy is exposed.',
      modifiers: []
    },
    failure: {
      description: 'The conspiracy undermines your kingdom.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
      ]
    },
    criticalFailure: {
      description: 'The conspiracy strikes a devastating blow.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ],
      manualEffects: ["Choose or roll for one random PC leader. That PC loses their kingdom action this turn (they are dealing with the conspiracy)"]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1d4 gold loss + 1 fame loss
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        resources.push({ resource: 'fame', value: -1 });
      }

      // Critical Failure: 2d4 gold loss + 1 fame loss + 1 unrest + leader loses action
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        resources.push({ resource: 'fame', value: -1 });
        resources.push({ resource: 'unrest', value: 1 });
        outcomeBadges.push({
          icon: 'fa-user-slash',
          prefix: '',
          value: { type: 'text', text: 'Leader loses action' },
          suffix: '',
          variant: 'negative'
        });
      }

      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'criticalFailure'
          ? ['One PC leader loses their Kingdom Action this turn (dealing with conspiracy)']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(nobleConspiracyPipeline, ctx.outcome);
    return { success: true };
  }
};
