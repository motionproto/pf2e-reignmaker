/**
 * Riot Incident Pipeline
 *
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

  // Auto-convert JSON modifiers to badges
  preview: undefined,

  execute: async (ctx) => {
    // Apply modifiers from outcome
    await applyPipelineModifiers(riotPipeline, ctx.outcome, ctx);

    const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();

    // Failure: damage 1 structure
    if (ctx.outcome === 'failure') {
      await resolver.damageStructure(undefined, undefined, 1);
    }

    // Critical failure: destroy/downgrade and damage 1 structure
    if (ctx.outcome === 'criticalFailure') {
      // Destroy reduces tier by 1, or removes if tier 0
      await resolver.destroyStructure(undefined, undefined, 1);
    }

    return { success: true };
  }
};
