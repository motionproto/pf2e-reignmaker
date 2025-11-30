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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(nobleConspiracyPipeline, ctx.outcome, ctx);
    return { success: true };
  }
};
