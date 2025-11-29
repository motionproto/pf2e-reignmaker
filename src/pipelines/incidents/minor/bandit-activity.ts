/**
 * Bandit Activity Incident Pipeline
 *
 * Generated from data/incidents/minor/bandit-activity.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const banditActivityPipeline: CheckPipeline = {
  id: 'bandit-activity',
  name: 'Bandit Activity',
  description: 'Bandit raids threaten your trade routes and settlements',
  checkType: 'incident',
  tier: 'minor',

  skills: [
      { skill: 'intimidation', description: 'show force' },
      { skill: 'stealth', description: 'infiltrate bandits' },
      { skill: 'survival', description: 'track to lair' },
      { skill: 'occultism', description: 'scrying' },
    ],

  outcomes: {
    success: {
      description: 'The bandits are deterred.',
      modifiers: []
    },
    failure: {
      description: 'The bandits raid your holdings.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d4', negative: true, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Major bandit raids devastate the area.',
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '2d4', negative: true, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random ongoing worksite. That worksite is destroyed (remove all progress)"]
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

      // Critical Failure: 2d4 gold loss + worksite destroyed
      if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-coins',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Gold',
          variant: 'negative'
        });
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
        warnings: ctx.outcome === 'criticalFailure'
          ? ['One random ongoing worksite will be destroyed (remove all progress)']
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(banditActivityPipeline, ctx.outcome);
    // Note: destroyWorksite command not implemented - handled as manual effect
    return { success: true };
  }
};
