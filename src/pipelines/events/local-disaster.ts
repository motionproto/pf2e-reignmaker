/**
 * Local Disaster Event Pipeline
 *
 * Generated from data/events/local-disaster.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const localDisasterPipeline: CheckPipeline = {
  id: 'local-disaster',
  name: 'Local Disaster',
  description: 'Fire, flood, or structural collapse strikes a settlement.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'crafting', description: 'emergency repairs' },
      { skill: 'survival', description: 'evacuation and rescue' },
      { skill: 'society', description: 'organize response' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The disaster is contained.',
      modifiers: []
    },
    success: {
      description: 'Damage is limited.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Major damage occurs.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The disaster is catastrophic.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(localDisasterPipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
