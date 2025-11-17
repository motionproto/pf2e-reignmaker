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
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(banditActivityPipeline, ctx.outcome);
    return { success: true };
  }
};
