/**
 * Crime Wave Incident Pipeline
 *
 * Generated from data/incidents/minor/crime-wave.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const crimeWavePipeline: CheckPipeline = {
  id: 'crime-wave',
  name: 'Crime Wave',
  description: 'Criminal activity surges throughout your settlements',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'intimidation', description: 'crack down on criminals' },
      { skill: 'thievery', description: 'infiltrate gangs' },
      { skill: 'society', description: 'legal reform' },
      { skill: 'occultism', description: 'divine the source' },
    ],

  outcomes: {
    success: {
      description: 'Crime is suppressed.',
      modifiers: []
    },
    failure: {
      description: 'A crime wave hits.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A major crime wave erupts.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' },
      ]
    },
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];

      // Failure: 1d4 gold loss
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
      }

      // Critical Failure: 2d4 gold loss + 1 unrest
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
        resources.push({ resource: 'unrest', value: 1 });
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
    await applyPipelineModifiers(crimeWavePipeline, ctx.outcome);
    return { success: true };
  }
};
