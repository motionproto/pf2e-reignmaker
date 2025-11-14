/**
 * Establish Diplomatic Relations Action Pipeline
 *
 * Improve relations with a faction.
 * Converted from data/player-actions/establish-diplomatic-relations.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { adjustFactionAttitudeExecution } from '../../execution/factions/adjustFactionAttitude';

export const establishDiplomaticRelationsPipeline: CheckPipeline = {
  id: 'establish-diplomatic-relations',
  name: 'Establish Diplomatic Relations',
  description: 'Send envoys to improve your kingdom\'s standing with neighboring powers and influential organizations',
  checkType: 'action',
  category: 'foreign-affairs',

  skills: [
    { skill: 'diplomacy', description: 'formal negotiations' },
    { skill: 'society', description: 'cultural exchange' },
    { skill: 'performance', description: 'diplomatic ceremonies' },
    { skill: 'deception', description: 'strategic positioning' },
    { skill: 'occultism', description: 'mystical bonds' },
    { skill: 'religion', description: 'sacred alliances' }
  ],

  // Pre-roll: Select faction
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'factionId',
      label: 'Select faction for diplomatic mission',
      entityType: 'faction'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The diplomatic mission is a resounding success.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Relations improve.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -4, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The diplomatic mission fails.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'Your diplomats offend the faction.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -4, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      const goldCost = ctx.outcome === 'criticalSuccess' ? -2 :
                      ctx.outcome === 'success' ? -4 :
                      ctx.outcome === 'failure' ? -2 : -4;

      const attitudeChange = ctx.outcome === 'criticalSuccess' ? 1 :
                            ctx.outcome === 'success' ? 1 :
                            ctx.outcome === 'criticalFailure' ? -1 : 0;

      const specialEffects = [];
      if (attitudeChange !== 0) {
        specialEffects.push({
          type: 'status' as const,
          message: `${attitudeChange > 0 ? 'Improve' : 'Worsen'} relations with ${ctx.metadata.factionName || 'faction'}`,
          variant: (attitudeChange > 0 ? 'positive' : 'negative') as const
        });
      }

      return {
        resources: [{ resource: 'gold', value: goldCost }],
        specialEffects,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    const steps = ctx.outcome === 'criticalSuccess' ? 1 :
                 ctx.outcome === 'success' ? 1 :
                 ctx.outcome === 'criticalFailure' ? -1 : 0;

    const options = ctx.outcome === 'success' ? { maxLevel: 'Friendly' } : undefined;

    if (steps !== 0) {
      await adjustFactionAttitudeExecution(ctx.metadata.factionId, steps, options);
    }
  }
};
