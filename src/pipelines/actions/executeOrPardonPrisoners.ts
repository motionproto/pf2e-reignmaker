/**
 * Execute or Pardon Prisoners Action Pipeline
 *
 * Deal with imprisoned unrest through justice (execution or pardon).
 * Converted from data/player-actions/execute-or-pardon-prisoners.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { reduceImprisonedExecution } from '../../execution/unrest/reduceImprisoned';
import { structuresService } from '../../services/structures';

export const executeOrPardonPrisonersPipeline: CheckPipeline = {
  id: 'execute-or-pardon-prisoners',
  name: 'Execute or Pardon Prisoners',
  description: 'Pass judgment on those who have threatened the kingdom\'s stability, choosing between mercy and justice',
  checkType: 'action',
  category: 'uphold-stability',

  /**
   * Requirements: At least one settlement with imprisoned unrest and capacity
   */
  requirements: (kingdom) => {
    const hasEligibleSettlement = kingdom.settlements?.some((s: any) => {
      const imprisonedUnrest = s.imprisonedUnrest || 0;
      const capacity = structuresService.calculateImprisonedUnrestCapacity(s);
      return imprisonedUnrest > 0 && capacity > 0;
    });
    
    return {
      met: hasEligibleSettlement || false,
      reason: hasEligibleSettlement ? undefined : 'No settlements with imprisoned unrest'
    };
  },

  /**
   * Pre-roll interaction: Select settlement with imprisoned unrest
   * NOTE: The filter function acts as the requirements check - if no settlements
   * pass the filter, the action is unavailable.
   */
  preRollInteractions: [
    {
      id: 'settlement',
      type: 'entity-selection',
      entityType: 'settlement',
      label: 'Select Settlement with Imprisoned Unrest',
      filter: (settlement: any) => {
        const imprisonedUnrest = settlement.imprisonedUnrest || 0;
        const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
        return imprisonedUnrest > 0 && capacity > 0;
      }
    }
  ],

  /**
   * Skills - includes conditional pardon skills
   * Note: Pardon skills (diplomacy/religion/performance) are conditionally available
   * based on tier 3+ justice structure, but we include them here for skill list display.
   * The actual availability check happens in the UI.
   */
  skills: [
    { skill: 'intimidation', description: 'harsh justice (execute)' },
    { skill: 'society', description: 'legal proceedings (execute)' },
    { skill: 'diplomacy', description: 'clemency (pardon)' },
    { skill: 'religion', description: 'divine forgiveness (pardon)' },
    { skill: 'performance', description: 'public ceremony (pardon)' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Justice is served perfectly',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Justice is served',
      modifiers: []
    },
    failure: {
      description: 'The prisoners you choose are inconsequential',
      modifiers: []
    },
    criticalFailure: {
      description: 'Your judgment causes outrage',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  preview: {
    calculate: async (ctx) => {
      const settlementId = ctx.metadata?.settlement?.id;
      if (!settlementId) {
        return {
          resources: [],
          specialEffects: [],
          warnings: ['No settlement selected']
        };
      }

      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === settlementId);
      if (!settlement) {
        return {
          resources: [],
          specialEffects: [],
          warnings: ['Settlement not found']
        };
      }

      const imprisonedUnrest = settlement.imprisonedUnrest || 0;
      const effects: any[] = [];

      // Show imprisoned reduction based on outcome
      if (ctx.outcome === 'criticalSuccess') {
        effects.push({
          type: 'status' as const,
          message: `All imprisoned unrest cleared (${imprisonedUnrest}) in ${settlement.name}`,
          variant: 'positive' as const
        });
        // Also show unrest reduction
        effects.push({
          type: 'resource' as const,
          message: '-1 Unrest',
          variant: 'positive' as const
        });
      } else if (ctx.outcome === 'success') {
        // For success, we need to handle the dice roll
        // If resolutionData has the rolled amount, show it; otherwise show the formula
        const rolledAmount = ctx.resolutionData?.diceRolls?.imprisoned;
        if (rolledAmount !== undefined) {
          effects.push({
            type: 'status' as const,
            message: `${rolledAmount} imprisoned unrest reduced in ${settlement.name}`,
            variant: 'positive' as const
          });
        } else {
          effects.push({
            type: 'status' as const,
            message: `1d4 imprisoned unrest reduced in ${settlement.name}`,
            variant: 'positive' as const
          });
        }
      } else if (ctx.outcome === 'criticalFailure') {
        effects.push({
          type: 'resource' as const,
          message: '+1 Unrest',
          variant: 'negative' as const
        });
      }

      return {
        resources: [],  // Modifiers handle unrest changes
        specialEffects: effects,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    console.log('🎯 [executeOrPardonPrisoners] Execute function called');
    console.log('🎯 [executeOrPardonPrisoners] Context:', ctx);
    console.log('🎯 [executeOrPardonPrisoners] Metadata:', ctx.metadata);
    console.log('🎯 [executeOrPardonPrisoners] Outcome:', ctx.outcome);
    
    const settlementId = ctx.metadata?.settlement?.id;
    console.log('🎯 [executeOrPardonPrisoners] Settlement ID:', settlementId);
    
    if (!settlementId) {
      console.error('❌ [executeOrPardonPrisoners] No settlement selected');
      return { success: false, error: 'No settlement selected' };
    }

    const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === settlementId);
    if (!settlement) {
      return { success: false, error: 'Settlement not found' };
    }

    const { updateKingdom } = await import('../../stores/KingdomStore');

    // Handle outcomes
    if (ctx.outcome === 'criticalSuccess') {
      // Reduce all imprisoned unrest
      await reduceImprisonedExecution(settlementId, 'all');

      // Apply -1 unrest
      await updateKingdom(kingdom => {
        kingdom.unrest = Math.max(0, (kingdom.unrest || 0) - 1);
      });

      return { success: true, message: `All imprisoned unrest cleared in ${settlement.name}` };
    } else if (ctx.outcome === 'success') {
      // Roll 1d4 and reduce that amount
      const roll = await new Roll('1d4').evaluate();
      const amount = roll.total || 0;

      await reduceImprisonedExecution(settlementId, amount);

      return { success: true, message: `Reduced ${amount} imprisoned unrest in ${settlement.name}` };
    } else if (ctx.outcome === 'failure') {
      // No change
      return { success: true, message: 'The prisoners you choose are inconsequential' };
    } else if (ctx.outcome === 'criticalFailure') {
      // +1 unrest
      await updateKingdom(kingdom => {
        kingdom.unrest = (kingdom.unrest || 0) + 1;
      });

      return { success: true, message: 'Your judgment causes outrage (+1 Unrest)' };
    }

    return { success: true };
  }
};
