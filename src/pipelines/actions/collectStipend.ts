/**
 * collectStipend Action Pipeline
 * Data from: data/player-actions/collect-stipend.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { giveActorGoldExecution } from '../../execution';
import type { UnifiedOutcomeBadge } from '../../types/OutcomeBadge';

export const collectStipendPipeline = createActionPipeline('collect-stipend', {
  requirements: (kingdom) => {
    const REVENUE_STRUCTURES = ['counting-house', 'treasury', 'exchequer'];
    const hasTaxationStructure = kingdom.settlements?.some(s => 
      s.structureIds?.some(id => REVENUE_STRUCTURES.includes(id))
    );
    
    if (!hasTaxationStructure) {
      return {
        met: false,
        reason: 'Requires Counting House (T2) or higher Taxation structure'
      };
    }
    
    return { met: true };
  },

  preview: {
    calculate: async (ctx) => {
      console.log('🪙 [collectStipend] preview.calculate called with ctx:', {
        outcome: ctx.outcome,
        actor: ctx.actor,
        actorName: ctx.actor?.actorName
      });
      
      const multiplier = ctx.outcome === 'criticalSuccess' ? 2 :
                        ctx.outcome === 'success' ? 1 :
                        ctx.outcome === 'failure' ? 0.5 : 0;

      let goldMessage = '';
      if (multiplier > 0) {
        const settlements = ctx.kingdom.settlements || [];
        if (settlements.length > 0) {
          const highestSettlement = settlements.reduce((highest: any, current: any) => {
            return current.level > highest.level ? current : highest;
          }, settlements[0]);

          const { getKingdomTaxationTier, calculateIncome } = await import('../../services/commands/resources/playerRewards');

          const taxationInfo = getKingdomTaxationTier(ctx.kingdom);
          if (taxationInfo) {
            const baseIncome = calculateIncome(highestSettlement.level, taxationInfo.tier);
            const goldAmount = Math.round(baseIncome * multiplier);
            const characterName = ctx.actor?.actorName || 'Player';
            
            console.log('🪙 [collectStipend] Generated outcomeBadge:', {
              characterName,
              goldAmount,
              multiplier
            });

            // ✅ NEW: Unified badge format
            const badge: UnifiedOutcomeBadge = {
              icon: 'fa-coins',
              template: `${characterName} receives {{value}} gold`,
              value: { type: 'static', amount: goldAmount },
              variant: 'positive'
            };
            
            const result = {
              resources: [],
              outcomeBadges: [badge],
              warnings: []
            };
            
            console.log('🪙 [collectStipend] Returning preview:', result);
            return result;
          }
        }
      }

      const result = {
        resources: [],
        outcomeBadges: [],
        warnings: []
      };
      
      console.log('🪙 [collectStipend] Returning preview:', result);
      return result;
    }
  },

  execute: async (ctx) => {
    const multiplier = ctx.outcome === 'criticalSuccess' ? 2 :
                      ctx.outcome === 'success' ? 1 :
                      ctx.outcome === 'failure' ? 0.5 : 0;

    // Handle gold transfer for successful outcomes
    if (multiplier > 0) {
      // Find highest-level settlement automatically
      const settlements = ctx.kingdom.settlements || [];
      if (settlements.length === 0) {
        return { success: false, error: 'No settlements available' };
      }

      // Get highest level settlement
      const highestSettlement = settlements.reduce((highest: any, current: any) => {
        return current.level > highest.level ? current : highest;
      }, settlements[0]);

      const { getKingdomTaxationTier, calculateIncome } = await import('../../services/commands/resources/playerRewards');

      const taxationInfo = getKingdomTaxationTier(ctx.kingdom);
      if (!taxationInfo) {
        return { success: false, error: 'Unable to determine taxation tier' };
      }

      const baseIncome = calculateIncome(highestSettlement.level, taxationInfo.tier);
      const goldAmount = Math.round(baseIncome * multiplier);
      const kingdomGoldCost = 0; // ✅ Don't deduct from kingdom - free stipend

      const game = (globalThis as any).game;
      const actorId = game.user?.character?.id;
      if (!actorId) {
        return { success: false, error: 'No character assigned to current user' };
      }

      await giveActorGoldExecution({
        actorId,
        goldAmount,
        kingdomGoldCost
      });
    }

    // Handle unrest penalties for failures via proper service
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    if (ctx.outcome === 'failure') {
      // Apply +1 unrest
      await gameCommandsService.applyNumericModifiers([
        { resource: 'unrest', value: 1 }
      ], ctx.outcome);
    } else if (ctx.outcome === 'criticalFailure') {
      // ✅ Get already-rolled value from resolutionData (rolled in DiceRoller component)
      const unrestModifier = ctx.resolutionData?.numericModifiers?.find((m: any) => m.resource === 'unrest');
      
      if (unrestModifier) {
        // Use the pre-rolled value
        const unrestAmount = Math.abs(unrestModifier.value || 0);
        
        await gameCommandsService.applyNumericModifiers([
          { resource: 'unrest', value: unrestAmount }
        ], ctx.outcome);
      }
    }

    return { 
      success: true, 
      message: multiplier > 0 ? `Transferred gold` : 'Stipend collection complete'
    };
  }
});
