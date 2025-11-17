/**
 * International Crisis Incident Pipeline
 *
 * Generated from data/incidents/major/international-crisis.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const internationalCrisisPipeline: CheckPipeline = {
  id: 'international-crisis',
  name: 'International Crisis',
  description: 'Multiple kingdoms turn against you due to internal chaos',
  checkType: 'incident',
  tier: 'major',

  skills: [
      { skill: 'diplomacy', description: 'damage control' },
      { skill: 'deception', description: 'blame shifting' },
      { skill: 'society', description: 'formal reparations' },
      { skill: 'performance', description: 'public relations' },
    ],

  outcomes: {
    success: {
      description: 'The crisis is contained.',
      modifiers: []
    },
    failure: {
      description: 'Diplomatic relations are severely damaged.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Multiple kingdoms turn against you.',
      modifiers: [
        { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    providedByInteraction: false
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(internationalCrisisPipeline, ctx.outcome);
    return { success: true };
  }
};
