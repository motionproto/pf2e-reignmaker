/**
 * executeOrPardonPrisoners Action Pipeline
 * Data from: data/player-actions/execute-or-pardon-prisoners.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { structuresService } from '../../services/structures';
import { reduceImprisonedExecution } from '../../execution';
import { textBadge, diceBadge, valueBadge } from '../../types/OutcomeBadge';
import { convertModifiersToBadges } from '../shared/convertModifiersToBadges';

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
    calculate: (ctx) => {
      const outcomeBadges = [];
      const settlementName = ctx.metadata?.settlement?.name || 'settlement';
      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === ctx.metadata?.settlement?.id);
      
      if (ctx.outcome === 'criticalSuccess') {
        // Show actual imprisoned count for "all"
        const imprisonedCount = settlement?.imprisonedUnrest || 0;
        outcomeBadges.push(textBadge(`Clear all imprisoned unrest from ${settlementName}`, 'fa-gavel', 'positive'));
        outcomeBadges.push(valueBadge('Lose {{value}} Unrest', 'fa-fist-raised', 1, 'positive'));
      } else if (ctx.outcome === 'success') {
        // Use dice badge for 1d4 roll
        outcomeBadges.push(diceBadge(`Remove {{value}} imprisoned unrest from ${settlementName}`, 'fa-gavel', '1d4', 'positive'));
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(valueBadge('Gain {{value}} Unrest', 'fa-fist-raised', 1, 'negative'));
      }
      // failure: no badge needed (no effect)
      
      return { outcomeBadges };
    }
  },

  execute: async (ctx) => {
    console.log('🎯 [executeOrPardonPrisoners] Execute function called');
    console.log('🎯 [executeOrPardonPrisoners] Context:', ctx);
    console.log('🎯 [executeOrPardonPrisoners] Metadata:', ctx.metadata);
    console.log('🎯 [executeOrPardonPrisoners] Outcome:', ctx.outcome);
    console.log('🎯 [executeOrPardonPrisoners] ResolutionData:', ctx.resolutionData);
    
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
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    if (ctx.outcome === 'criticalSuccess') {
      // Reduce all imprisoned unrest
      await reduceImprisonedExecution(settlementId, 'all');

      // Apply -1 unrest via proper service
      await gameCommandsService.applyNumericModifiers([
        { resource: 'unrest', value: -1 }
      ], ctx.outcome);

      return { success: true, message: `All imprisoned unrest cleared in ${settlement.name}` };
    } else if (ctx.outcome === 'success') {
      // ✅ Get already-rolled value from resolutionData (rolled in DiceRoller component)
      // Find the imprisoned unrest modifier from the badge roll
      const imprisonedModifier = ctx.resolutionData?.numericModifiers?.find((m: any) => 
        m.resource === 'imprisonedUnrest' || m.resource === 'imprisoned'
      );
      
      // Extract the rolled value (use absolute value since badges handle negation)
      const amount = imprisonedModifier ? Math.abs(imprisonedModifier.value) : 0;
      
      console.log('🎯 [executeOrPardonPrisoners] Using rolled value from badge:', {
        imprisonedModifier,
        amount,
        allModifiers: ctx.resolutionData?.numericModifiers
      });

      if (amount > 0) {
        await reduceImprisonedExecution(settlementId, amount);
        return { success: true, message: `Reduced ${amount} imprisoned unrest in ${settlement.name}` };
      } else {
        return { success: false, error: 'No valid dice roll found in resolution data' };
      }
    } else if (ctx.outcome === 'failure') {
      // No change
      return { success: true, message: 'The prisoners you choose are inconsequential' };
    } else if (ctx.outcome === 'criticalFailure') {
      // +1 unrest via proper service
      await gameCommandsService.applyNumericModifiers([
        { resource: 'unrest', value: 1 }
      ], ctx.outcome);

      return { success: true, message: 'Your judgment causes outrage (+1 Unrest)' };
    }

    return { success: true };
  }
});
