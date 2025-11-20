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
  description: 'Draw personal funds from the kingdom\'s treasury as compensation for your service. Stipend is based on your highest-level settlement.',
  checkType: 'action',
  category: 'economic-resources',

  // Requirements: Must have a taxation structure (Counting House T2+)
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

  skills: [
    { skill: 'intimidation', description: 'demand payment' },
    { skill: 'deception', description: 'creative accounting' },
    { skill: 'diplomacy', description: 'formal request' },
    { skill: 'society', description: 'proper procedures' },
    { skill: 'performance', description: 'justify worth' },
    { skill: 'thievery', description: 'skim the treasury' }
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
      description: 'Your demands sparks outrage.',
      modifiers: [
        { type: 'dice', resource: 'unrest', formula: '1d4', duration: 'immediate' }
      ]
    }
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
            goldMessage = `${characterName} receives ${goldAmount} gold`;
            
            console.log('🪙 [collectStipend] Generated outcomeBadge:', {
              characterName,
              goldAmount,
              goldMessage,
              multiplier
            });
          }
        }
      }

      const result = {
        resources: [],
        outcomeBadges: goldMessage ? [{
          icon: 'fa-coins',
          message: goldMessage
        }] : [],
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

    // Handle unrest penalties for failures
    const { updateKingdom } = await import('../../stores/KingdomStore');
    
    if (ctx.outcome === 'failure') {
      // Apply +1 unrest
      await updateKingdom(kingdom => {
        kingdom.unrest = (kingdom.unrest || 0) + 1;
      });
    } else if (ctx.outcome === 'criticalFailure') {
      // ✅ Get already-rolled value from resolutionData (rolled in DiceRoller component)
      const unrestModifier = ctx.resolutionData?.numericModifiers?.find((m: any) => m.resource === 'unrest');
      const unrestAmount = unrestModifier?.value || 0;
      
      await updateKingdom(kingdom => {
        kingdom.unrest = (kingdom.unrest || 0) + unrestAmount;
      });
    }

    return { 
      success: true, 
      message: multiplier > 0 ? `Transferred gold` : 'Stipend collection complete'
    };
  }
};
