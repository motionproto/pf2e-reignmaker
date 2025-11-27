/**
 * upgradeSettlement Action Pipeline
 * Data from: data/player-actions/upgrade-settlement.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

export const upgradeSettlementPipeline = createActionPipeline('upgrade-settlement', {
  requirements: (kingdom) => {
    const settlements = kingdom.settlements || [];
    const availableGold = kingdom.resources?.gold || 0;
    
    if (settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements available to upgrade'
      };
    }
    
    // Check if any settlement can be upgraded
    // Note: Can always upgrade level (up to 20), but tier transitions require structures
    const canUpgradeAny = settlements.some(s => {
      return s.level < 20; // Can upgrade if not at max level
    });
    
    if (!canUpgradeAny) {
      return {
        met: false,
        reason: 'No settlements meet structure and level requirements for tier upgrade'
      };
    }
    
    // Check if we can afford to upgrade any eligible settlement
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
      onComplete: async (data: any, ctx: any) => {
        // Store settlement name in metadata for preview/execute
        const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === data);
        if (settlement) {
          ctx.metadata = ctx.metadata || {};
          ctx.metadata.settlementId = data;
          ctx.metadata.settlementName = settlement.name;
        }
      }
    }
  ],

  preview: {
    calculate: (ctx) => {
      const settlement = ctx.kingdom.settlements?.find((s: any) => s.id === ctx.metadata?.settlementId);
      if (!settlement) {
        console.error('[upgradeSettlement] Settlement not found in preview. settlementId:', ctx.metadata?.settlementId);
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
        const settlementName = ctx.metadata?.settlementName || settlement.name;
        outcomeBadges.push({
          type: 'text' as const,
          message: `Will upgrade ${settlementName} to level ${newLevel}`,
          icon: 'fa-arrow-up',
          variant: 'positive' as const
        });
      }

      return {
        resources: [{ resource: 'gold', value: goldCost }],
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    const settlementId = ctx.metadata?.settlementId;
    const settlementName = ctx.metadata?.settlementName;
    
    if (!settlementId) {
      console.error('[upgradeSettlement] Missing settlementId in execute. metadata:', ctx.metadata);
      throw new Error('Settlement ID not found in context');
    }

    // Get fresh kingdom data in case of rerolls
    const { getKingdomActor } = await import('../../stores/KingdomStore');
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
      console.error('[upgradeSettlement] Settlement not found. settlementId:', settlementId, 'Available settlements:', freshKingdom.settlements?.map((s: any) => s.id));
      throw new Error(`Settlement not found: ${settlementId}`);
    }

    const outcome = ctx.outcome;
    const currentLevel = settlement.level;
    const newLevel = currentLevel + 1;
    
    // For success and critical success: upgrade the settlement
    if (outcome === 'success' || outcome === 'criticalSuccess') {
      // Import settlement service to handle tier transitions
      const { settlementService } = await import('../../services/settlements');
      await settlementService.updateSettlementLevel(settlementId, newLevel);
      
      // Get updated settlement to check for tier change
      const updatedKingdom = actor.getKingdomData();
      const updatedSettlement = updatedKingdom?.settlements?.find((s: any) => s.id === settlementId);
      
      if (updatedSettlement) {
        const tierChanged = updatedSettlement.tier !== settlement.tier;
        const displayName = settlementName || settlement.name;
        
        if (tierChanged) {
          const game = (window as any).game;
          game?.ui?.notifications?.info(`✨ ${displayName} upgraded to level ${newLevel} and became a ${updatedSettlement.tier}!`);
        }
        
        return { 
          success: true,
          message: `${displayName} upgraded to level ${newLevel}${tierChanged ? ` (now a ${updatedSettlement.tier})` : ''}`
        };
      }
    }
    // For failure and critical failure: gold already deducted via preview, no upgrade happens

    return { success: true };
  }
});
