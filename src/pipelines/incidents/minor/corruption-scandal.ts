/**
 * Corruption Scandal Incident Pipeline
 *
 * Generated from data/incidents/minor/corruption-scandal.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const corruptionScandalPipeline: CheckPipeline = {
  id: 'corruption-scandal',
  name: 'Corruption Scandal',
  description: 'Corruption among your officials is exposed',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'society', description: 'investigation' },
      { skill: 'deception', description: 'cover-up' },
      { skill: 'intimidation', description: 'purge corrupt officials' },
      { skill: 'diplomacy', description: 'manage public relations' },
    ],

  outcomes: {
    success: {
      description: 'The scandal is contained.',
      modifiers: []
    },
    failure: {
      description: 'Embezzlement and graft are discovered.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Major corruption is exposed publicly.',
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
    await applyPipelineModifiers(corruptionScandalPipeline, ctx.outcome);
    return { success: true };
  }
};
