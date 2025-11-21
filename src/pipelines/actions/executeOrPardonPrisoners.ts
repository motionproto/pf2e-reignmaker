/**
 * Execute or Pardon Prisoners Action Pipeline
 *
 * Deal with imprisoned unrest through justice (execution or pardon).
 * Converted from data/player-actions/execute-or-pardon-prisoners.json
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { UnifiedOutcomeBadge } from '../../types/OutcomeBadge';
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
      required: true,  // Cancelling this dialog should abort the action
      filter: (settlement: any) => {
        const imprisonedUnrest = settlement.imprisonedUnrest || 0;
        const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
        
        // Hide settlements with zero capacity (no justice structures)
        if (capacity === 0) {
          return false;
        }
        
        // Must have some imprisoned unrest to be eligible
        // (You execute/pardon EXISTING prisoners, so being "full" doesn't matter)
        if (imprisonedUnrest === 0) {
          return false;
        }
        
        return true;
      },
      getSupplementaryInfo: (settlement: any) => {
        const imprisoned = settlement.imprisonedUnrest || 0;
        const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
        return `${imprisoned} / ${capacity} imprisoned`;
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
      description: 'The prison is emptied.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'Justice is served.',
      modifiers: []  // Dice modifier added in preview.calculate based on settlement
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
    calculate: async (ctx) => {
      const settlementId = ctx.metadata?.settlement?.id;
      const settlementName = ctx.metadata?.settlement?.name;
      
      if (!settlementId) {
        return {
          resources: [],
          outcomeBadges: [],
          warnings: ['No settlement selected']
        };
      }

      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === settlementId);
      const outcomeBadges: UnifiedOutcomeBadge[] = [];
      
      // Handle outcomes based on type
      if (ctx.outcome === 'criticalSuccess') {
        // Show outcome badge for all imprisoned cleared
        const imprisonedCount = settlement?.imprisonedUnrest || 0;
        outcomeBadges.push({
          icon: 'fa-gavel',
          prefix: 'Remove all',
          value: { type: 'static', amount: imprisonedCount },
          suffix: `imprisoned unrest from ${settlement?.name || settlementName || 'settlement'}`,
          variant: 'positive'
        });
      } else if (ctx.outcome === 'success') {
        // ✅ NEW: Show dice badge that user can click to roll
        outcomeBadges.push({
          icon: 'fa-gavel',
          prefix: 'Remove',
          value: { type: 'dice', formula: '1d4' },
          suffix: `imprisoned unrest from ${settlement?.name || settlementName || 'settlement'}`,
          variant: 'positive'
        });
      }

      return {
        resources: [],  // Modifiers handle resource changes automatically
        outcomeBadges,
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
      // Get rolled value from resolutionData (rolled by DiceRoller component)
      const imprisonedModifier = ctx.resolutionData?.numericModifiers?.find((m: any) => m.resource === 'imprisonedUnrest');
      const amount = Math.abs(imprisonedModifier?.value || 0);  // Use absolute value since it's a reduction

      if (amount > 0) {
        await reduceImprisonedExecution(settlementId, amount);
      }

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
