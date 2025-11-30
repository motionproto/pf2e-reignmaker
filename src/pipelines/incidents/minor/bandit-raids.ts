/**
 * Bandit Raids Incident Pipeline
 *
 * Renamed from bandit-activity to avoid ID conflict with event
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const banditRaidsPipeline: CheckPipeline = {
  id: 'bandit-raids',
  name: 'Bandit Raids',
  description: 'Bandit raids threaten your trade routes and settlements',
  checkType: 'incident',
  tier: 1,

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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(banditRaidsPipeline, ctx.outcome, ctx);
    // Note: destroyWorksite command not implemented - handled as manual effect
    return { success: true };
  }
};
