/**
 * Upgrade Settlement Action Pipeline
 * Increase settlement level by 1
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { settlementService } from '../../services/settlements';
import type { ResourceType } from '../../types/modifiers';

export const upgradeSettlementPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'upgrade-settlement',
  name: 'Upgrade Settlement',
  description: 'Invest in infrastructure and development to advance your settlement\'s capabilities and unlock access to more advanced structures',
  brief: 'Increase settlement level by 1',
  category: 'urban-planning',
  checkType: 'action',
  special: 'Cost equals the settlement\'s NEW level in gold.',

  skills: [
    { skill: 'performance', description: 'inspire growth', doctrine: 'idealist' },
    { skill: 'medicine', description: 'public health improvements', doctrine: 'idealist' },
    { skill: 'crafting', description: 'infrastructure expansion', doctrine: 'practical' },
    { skill: 'society', description: 'urban planning', doctrine: 'practical' },
    { skill: 'arcana', description: 'magical enhancement', doctrine: 'practical' },
    { skill: 'deception', description: 'lure investors', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The settlement grows rapidly. Upgrade at half cost.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Upgrade settlement', 'fa-arrow-up', 'positive')
      ]
    },
    success: {
      description: 'The settlement grows. Upgrade at full cost.',
      modifiers: []
    },
    failure: {
      description: 'Construction setbacks waste resources. Lose half cost, no upgrade.',
      modifiers: []
    },
    criticalFailure: {
      description: 'Accidents and incompetence waste the investment. Lose full cost, no upgrade.',
      modifiers: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    const settlements = kingdom.settlements || [];
    const availableGold = kingdom.resources?.gold || 0;
    
    if (settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements available to upgrade'
      };
    }
    
    const canUpgradeAny = settlements.some(s => {
      return s.level < 20;
    });
    
    if (!canUpgradeAny) {
      return {
        met: false,
        reason: 'No settlements meet structure and level requirements for tier upgrade'
      };
    }
    
    const minCost = Math.min(
      ...settlements
        .filter(s => s.level < 20)
        .map(s => s.level + 1)
    );
    
    if (availableGold < minCost) {
      return {
        met: false,
        reason: `Insufficient gold to upgrade (need ${minCost} gold)`
      };
    }
    
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'settlementId',
      label: 'Select settlement to upgrade',
      entityType: 'settlement',
      filter: (settlement: any) => {
        return true;
      },
      getSupplementaryInfo: (settlement: any) => {
        return settlementService.getSettlementUpgradeInfo(settlement);
      },
      onComplete: async (data: any, ctx: any) => {
        ctx.metadata = ctx.metadata || {};
        ctx.metadata.settlementId = data.id;
      }
    }
  ],

  preview: {
    calculate: (ctx) => {
      const settlementId = ctx.metadata?.settlementId;
      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === settlementId);
      if (!settlement) {
        return { resources: [], outcomeBadges: [], warnings: ['Settlement not found'] };
      }

      const currentLevel = settlement.level;
      const newLevel = currentLevel + 1;
      const fullCost = newLevel;
      const halfCost = Math.ceil(newLevel / 2);

      const goldCost = ctx.outcome === 'criticalSuccess' ? -halfCost :
                      ctx.outcome === 'success' ? -fullCost :
                      ctx.outcome === 'failure' ? -halfCost :
                      -fullCost;

      const outcomeBadges = [];
      
      if (ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push({
          type: 'text' as const,
          message: `Will upgrade ${settlement.name} to level ${newLevel}`,
          icon: 'fa-arrow-up',
          variant: 'positive' as const
        });
      }
      
      const costAmount = Math.abs(goldCost);
      const costMessage = ctx.outcome === 'criticalSuccess' 
        ? `Gold cost: ${costAmount} (50% discount)`
        : ctx.outcome === 'failure'
        ? `Wasted gold: ${costAmount} (50% of full cost)`
        : ctx.outcome === 'criticalFailure'
        ? `Wasted gold: ${costAmount}`
        : `Gold cost: ${costAmount}`;
      
      outcomeBadges.push({
        type: 'text' as const,
        message: costMessage,
        icon: 'fa-coins',
        variant: 'negative' as const
      });

      return {
        resources: [],
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    const settlementId = ctx.metadata?.settlementId;
    
    if (!settlementId) {
      throw new Error('Settlement ID not found in context');
    }

    const { getKingdomActor, updateKingdom } = await import('../../stores/KingdomStore');
    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('Kingdom actor not found');
    }
    
    const freshKingdom = actor.getKingdomData();
    if (!freshKingdom) {
      throw new Error('Kingdom data not found');
    }
    
    const settlement = freshKingdom.settlements?.find((s: any) => s.id === settlementId);
    if (!settlement) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }

    const outcome = ctx.outcome;
    const currentLevel = settlement.level;
    const newLevel = currentLevel + 1;
    
    const fullCost = newLevel;
    const halfCost = Math.ceil(newLevel / 2);
    const goldCost = outcome === 'criticalSuccess' ? halfCost :
                    outcome === 'success' ? fullCost :
                    outcome === 'failure' ? halfCost :
                    fullCost;
    
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    const applyResult = await gameCommandsService.applyOutcome({
      type: 'action',
      sourceId: 'upgrade-settlement',
      sourceName: `Upgrade Settlement: ${settlement.name}`,
      outcome: ctx.outcome,
      modifiers: [{
        type: 'static',
        resource: 'gold' as ResourceType,
        value: -goldCost,
        duration: 'immediate'
      }]
    });
    
    if (outcome === 'success' || outcome === 'criticalSuccess') {
      const { settlementService } = await import('../../services/settlements');
      await settlementService.updateSettlementLevel(settlementId, newLevel);
      
      const updatedKingdom = actor.getKingdomData();
      const updatedSettlement = updatedKingdom?.settlements?.find((s: any) => s.id === settlementId);
      
      if (updatedSettlement) {
        const tierChanged = updatedSettlement.tier !== settlement.tier;
        
        if (tierChanged) {
          const game = (window as any).game;
          game?.ui?.notifications?.info(`✨ ${settlement.name} upgraded to level ${newLevel} and became a ${updatedSettlement.tier}!`);
        }
        
        return { 
          success: true,
          message: `${settlement.name} upgraded to level ${newLevel}${tierChanged ? ` (now a ${updatedSettlement.tier})` : ''}`
        };
      }
    }

    return { success: true };
  }
};
