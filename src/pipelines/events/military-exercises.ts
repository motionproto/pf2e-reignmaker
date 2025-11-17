/**
 * Military Exercises Event Pipeline
 *
 * Generated from data/events/military-exercises.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const militaryExercisesPipeline: CheckPipeline = {
  id: 'military-exercises',
  name: 'Military Exercises',
  description: 'Your kingdom conducts large-scale military training maneuvers.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'athletics', description: 'physical conditioning drills' },
      { skill: 'acrobatics', description: 'agility and combat maneuvers' },
      { skill: 'intimidation', description: 'discipline and morale' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'The exercises forge elite forces.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The training goes well.',
      modifiers: []
    },
    failure: {
      description: 'The training is ineffective.',
      modifiers: []
    },
    criticalFailure: {
      description: 'A training accident occurs.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(militaryExercisesPipeline, ctx.outcome);
    return { success: true };
  }
};
