/**
 * Natural Disaster Event Pipeline
 *
 * Generated from data/events/natural-disaster.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const naturalDisasterPipeline: CheckPipeline = {
  id: 'natural-disaster',
  name: 'Natural Disaster',
  description: 'Earthquake, tornado, wildfire, or severe flooding strikes the kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'survival', description: 'evacuation and rescue' },
      { skill: 'crafting', description: 'emergency shelters' },
      { skill: 'society', description: 'coordinate relief' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Damage is minimal.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Some damage occurs.',
      modifiers: [
        { type: 'choice', resources: ["lumber", "ore", "food", "stone"], value: 1, negative: true, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'Major damage occurs.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The disaster is devastating.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(naturalDisasterPipeline, ctx.outcome);
    return { success: true };
  }
};
