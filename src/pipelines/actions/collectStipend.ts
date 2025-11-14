/**
 * Collect Stipend Action Pipeline
 *
 * Extract personal income from kingdom treasury.
 * Converted from data/player-actions/collect-stipend.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { giveActorGoldExecution } from '../../execution/resources/giveActorGold';

export const collectStipendPipeline: CheckPipeline = {
  id: 'collect-stipend',
  name: 'Collect Stipend',
  description: 'Draw personal funds from the kingdom\'s treasury as compensation for your service.',
  checkType: 'action',
  category: 'economic-resources',

  skills: [
    { skill: 'intimidation', description: 'demand payment' },
    { skill: 'deception', description: 'creative accounting' },
    { skill: 'diplomacy', description: 'formal request' },
    { skill: 'society', description: 'proper procedures' },
    { skill: 'performance', description: 'justify worth' },
    { skill: 'thievery', description: 'skim the treasury' }
  ],

  // Pre-roll: Select settlement (determines income tier)
  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlementId',
      label: 'Select settlement with Counting House',
      entityType: 'settlement'
    }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'You are handsomely compensated.',
      modifiers: []
    },
    success: {
      description: 'You receive your stipend.',
      modifiers: []
    },
    failure: {
      description: 'The treasury struggles to pay you.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The treasury is empty.',
      modifiers: [
        { type: 'dice', resource: 'unrest', formula: '1d4', duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: (ctx) => {
      // Calculate based on settlement taxation tier
      const multiplier = ctx.outcome === 'criticalSuccess' ? 2 :
                        ctx.outcome === 'success' ? 1 :
                        ctx.outcome === 'failure' ? 0.5 : 0;

      const resources = [];
      if (ctx.outcome === 'failure') {
        resources.push({ resource: 'unrest', value: 1 });
      } else if (ctx.outcome === 'criticalFailure') {
        // Dice roll for unrest
        resources.push({ resource: 'unrest', value: 2 }); // Estimated
      }

      return {
        resources,
        specialEffects: multiplier > 0 ? [{
          type: 'status' as const,
          message: `Will transfer gold to player (${multiplier}x stipend)`,
          variant: 'positive' as const
        }] : [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    const multiplier = ctx.outcome === 'criticalSuccess' ? 2 :
                      ctx.outcome === 'success' ? 1 :
                      ctx.outcome === 'failure' ? 0.5 : 0;

    if (multiplier > 0) {
      // Get settlement and calculate stipend
      const { getKingdomTaxationTier, calculateIncome } = await import('../../services/commands/resources/playerRewards');

      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === ctx.metadata.settlementId);
      if (!settlement) throw new Error('Settlement not found');

      const taxationInfo = getKingdomTaxationTier(ctx.kingdom);
      const baseIncome = calculateIncome(settlement.level, taxationInfo.tier);
      const goldAmount = Math.round(baseIncome * multiplier);
      const kingdomGoldCost = goldAmount; // 1:1 transfer

      const game = (globalThis as any).game;
      const actorId = game.user?.character?.id;
      if (!actorId) throw new Error('No character assigned to current user');

      await giveActorGoldExecution({
        actorId,
        goldAmount,
        kingdomGoldCost
      });
    }
  }
};
