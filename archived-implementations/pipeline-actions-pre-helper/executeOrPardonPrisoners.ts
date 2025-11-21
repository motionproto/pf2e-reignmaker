/**
 * executeOrPardonPrisoners Action Pipeline
 * Data from: data/player-actions/execute-or-pardon-prisoners.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const executeOrPardonPrisonersPipeline = createActionPipeline('execute-or-pardon-prisoners', {
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
});
