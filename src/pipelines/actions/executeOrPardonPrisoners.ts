/**
 * Execute or Pardon Prisoners Action Pipeline
 * Deal with imprisoned unrest through justice
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { structuresService } from '../../services/structures';
import { reduceImprisonedExecution } from '../../execution';
import { textBadge, diceBadge, valueBadge } from '../../types/OutcomeBadge';

export const executeOrPardonPrisonersPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'execute-or-pardon-prisoners',
  name: 'Execute or Pardon Prisoners',
  description: 'Pass judgment on those who have threatened the kingdom\'s stability, choosing between mercy and justice',
  brief: 'Deal with imprisoned unrest through justice',
  category: 'uphold-stability',
  checkType: 'action',

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
      modifiers: []
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
      modifiers: []
    }
  },

  // === TYPESCRIPT LOGIC ===
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
      required: true,
      filter: (settlement: any) => {
        const imprisonedUnrest = settlement.imprisonedUnrest || 0;
        const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
        
        if (capacity === 0) {
          return false;
        }
        
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
        outcomeBadges.push(textBadge(`Clear all imprisoned unrest from ${settlementName}`, 'fa-gavel', 'positive'));
        outcomeBadges.push(valueBadge('Lose {{value}} Unrest', 'fa-fist-raised', 1, 'positive'));
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(diceBadge(`Remove {{value}} imprisoned unrest from ${settlementName}`, 'fa-gavel', '1d4', 'positive'));
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push(valueBadge('Gain {{value}} Unrest', 'fa-fist-raised', 1, 'negative'));
      }
      
      return { outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const settlementId = ctx.metadata?.settlement?.id;
    
    if (!settlementId) {
      return { success: false, error: 'No settlement selected' };
    }

    const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === settlementId);
    if (!settlement) {
      return { success: false, error: 'Settlement not found' };
    }

    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    if (ctx.outcome === 'criticalSuccess') {
      await reduceImprisonedExecution(settlementId, 'all');

      await gameCommandsService.applyNumericModifiers([
        { resource: 'unrest', value: -1 }
      ], ctx.outcome);

      return { success: true, message: `All imprisoned unrest cleared in ${settlement.name}` };
    } else if (ctx.outcome === 'success') {
      const imprisonedModifier = ctx.resolutionData?.numericModifiers?.find((m: any) => 
        m.resource === 'imprisonedUnrest' || m.resource === 'imprisoned'
      );
      
      const amount = imprisonedModifier ? Math.abs(imprisonedModifier.value) : 0;

      if (amount > 0) {
        await reduceImprisonedExecution(settlementId, amount);
        return { success: true, message: `Reduced ${amount} imprisoned unrest in ${settlement.name}` };
      } else {
        return { success: false, error: 'No valid dice roll found in resolution data' };
      }
    } else if (ctx.outcome === 'failure') {
      return { success: true, message: 'The prisoners you choose are inconsequential' };
    } else if (ctx.outcome === 'criticalFailure') {
      await gameCommandsService.applyNumericModifiers([
        { resource: 'unrest', value: 1 }
      ], ctx.outcome);

      return { success: true, message: 'Your judgment causes outrage (+1 Unrest)' };
    }

    return { success: true };
  }
};
