/**
 * Collect Stipend Action Pipeline
 * Extract personal income (requires Counting House)
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { giveActorGoldExecution } from '../../execution';
import type { UnifiedOutcomeBadge } from '../../types/OutcomeBadge';

export const collectStipendPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'collect-stipend',
  name: 'Collect Stipend',
  description: 'Draw personal funds from the kingdom\'s treasury as compensation for your service.',
  brief: 'Extract personal income (requires Counting House)',
  category: 'economic-resources',
  checkType: 'action',

  skills: [
    { skill: 'diplomacy', description: 'formal request', doctrine: 'virtuous' },
    { skill: 'society', description: 'proper procedures', doctrine: 'practical' },
    { skill: 'performance', description: 'justify worth', doctrine: 'practical' },
    { skill: 'intimidation', description: 'demand payment', doctrine: 'ruthless' },
    { skill: 'deception', description: 'creative accounting', doctrine: 'ruthless' },
    { skill: 'thievery', description: 'skim the treasury', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'You are handsomely compensated.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Collect stipend', 'fa-coins', 'positive')
      ]
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
      description: 'Your demands spark outrage.',
      modifiers: [
        { type: 'dice', resource: 'unrest', formula: '1d4', duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
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
      const multiplier = ctx.outcome === 'criticalSuccess' ? 2 :
                        ctx.outcome === 'success' ? 1 :
                        ctx.outcome === 'failure' ? 0.5 : 0;

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

            const badge: UnifiedOutcomeBadge = {
              icon: 'fa-coins',
              template: `${characterName} receives {{value}} gold`,
              value: { type: 'static', amount: goldAmount },
              variant: 'positive'
            };
            
            return {
              resources: [],
              outcomeBadges: [badge],
              warnings: []
            };
          }
        }
      }

      return {
        resources: [],
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    const multiplier = ctx.outcome === 'criticalSuccess' ? 2 :
                      ctx.outcome === 'success' ? 1 :
                      ctx.outcome === 'failure' ? 0.5 : 0;

    if (multiplier > 0) {
      const settlements = ctx.kingdom.settlements || [];
      if (settlements.length === 0) {
        return { success: false, error: 'No settlements available' };
      }

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
      const kingdomGoldCost = 0;

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

    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    if (ctx.outcome === 'failure') {
      await gameCommandsService.applyNumericModifiers([
        { resource: 'unrest', value: 1 }
      ], ctx.outcome);
    } else if (ctx.outcome === 'criticalFailure') {
      const unrestModifier = ctx.resolutionData?.numericModifiers?.find((m: any) => m.resource === 'unrest');
      
      if (unrestModifier) {
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
};
