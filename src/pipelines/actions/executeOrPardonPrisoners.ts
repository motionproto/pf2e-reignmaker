/**
 * Execute or Pardon Prisoners Action Pipeline
 *
 * Deal with imprisoned unrest through justice.
 * Converted from data/player-actions/execute-or-pardon-prisoners.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { reduceImprisonedExecution } from '../../execution/unrest/reduceImprisoned';

export const executeOrPardonPrisonersPipeline: CheckPipeline = {
  id: 'execute-or-pardon-prisoners',
  name: 'Execute or Pardon Prisoners',
  description: 'Pass judgment on those who have threatened the kingdom\'s stability, choosing between mercy and justice',
  checkType: 'action',
  category: 'uphold-stability',

  skills: [
    { skill: 'intimidation', description: 'harsh justice (execute)' },
    { skill: 'society', description: 'legal proceedings (execute)' },
    { skill: 'diplomacy', description: 'clemency (pardon)' },
    { skill: 'religion', description: 'divine forgiveness (pardon)' },
    { skill: 'performance', description: 'public ceremony (pardon)' }
  ],

  // Pre-roll: Select settlement with imprisoned unrest
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlementId',
      label: 'Select settlement with imprisoned unrest',
      entityType: 'settlement'
    }
  ],

  // Post-roll: Dice for success outcome (if applicable)
  postRollInteractions: [
    {
      type: 'dice',
      id: 'imprisonedReduction',
      formula: '1d4',
      storeAs: 'imprisonedReduction',
      condition: (ctx) => ctx.outcome === 'success'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Justice is served perfectly.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Justice is served.',
      modifiers: []
    },
    failure: {
      description: 'The prisoners you choose are inconsequential.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your judgment causes outrage.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      const resources = [];

      if (ctx.outcome === 'criticalSuccess') {
        resources.push({ resource: 'unrest', value: -1 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      const specialEffects = [];
      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status' as const,
          message: 'All imprisoned unrest removed',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        const amount = ctx.resolutionData.diceRolls.imprisonedReduction || 2;
        specialEffects.push({
          type: 'status' as const,
          message: `${amount} imprisoned unrest removed`,
          variant: 'positive' as const
        });
      }

      return { resources, specialEffects, warnings: [] };
    }
  },

  execute: async (ctx) => {
    const amount = ctx.outcome === 'criticalSuccess' ? 'all' as const :
                  ctx.outcome === 'success' ? ctx.resolutionData.diceRolls.imprisonedReduction || 2 :
                  0;

    if (amount !== 0) {
      await reduceImprisonedExecution(ctx.metadata.settlementId, amount);
    }
  }
};
