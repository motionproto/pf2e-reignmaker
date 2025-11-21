/**
 * Magical Discovery Event Pipeline
 *
 * Generated from data/events/magical-discovery.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const magicalDiscoveryPipeline: CheckPipeline = {
  id: 'magical-discovery',
  name: 'Magical Discovery',
  description: 'A powerful magical site or artifact is discovered in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'arcana', description: 'understand the magic' },
      { skill: 'religion', description: 'divine its purpose' },
      { skill: 'occultism', description: 'unlock its secrets' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'A major magical boon is revealed.',
      modifiers: []
    },
    success: {
      description: 'The discovery proves useful.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The magic proves dangerous.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'A magical disaster erupts.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(magicalDiscoveryPipeline, ctx.outcome);
    return { success: true };
  }
};
