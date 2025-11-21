/**
 * Riot Incident Pipeline
 *
 * Generated from data/incidents/moderate/riot.json
 */

import type { CheckPipeline } from '../../../types/CheckPipeline';
import { applyPipelineModifiers } from '../../shared/applyPipelineModifiers';

export const riotPipeline: CheckPipeline = {
  id: 'riot',
  name: 'Riot',
  description: 'Violent riots break out in your settlements',
  checkType: 'incident',
  tier: 'moderate',

  skills: [
      { skill: 'intimidation', description: 'suppress riot' },
      { skill: 'diplomacy', description: 'negotiate with rioters' },
      { skill: 'athletics', description: 'contain riot' },
      { skill: 'medicine', description: 'treat injured' },
    ],

  outcomes: {
    success: {
      description: 'The riot is quelled.',
      modifiers: []
    },
    failure: {
      description: 'The riot damages property.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random structure in a random settlement. Mark that structure as damaged"]
    },
    criticalFailure: {
      description: 'A violent riot destroys property.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      manualEffects: ["Choose or roll for one random structure in a random settlement. Reduce that structure's tier by one and mark it as damaged. If the tier is reduced to zero, remove it entirely"]
    },
  },

  preview: {
  },

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(riotPipeline, ctx.outcome);
    return { success: true };
  }
};
