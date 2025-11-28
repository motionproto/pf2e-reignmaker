/**
 * upgradeSettlement Action Pipeline
 * Data from: data/player-actions/upgrade-settlement.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { settlementService } from '../../services/settlements';
import type { ResourceType } from '../../types/modifiers';

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
      filter: (settlement: any) => {
        // Show all settlements, but provide info about upgradeability
        return true;
      },
      getSupplementaryInfo: (settlement: any) => {
        // Use settlement service for consistent upgrade info display
        // Note: Must be synchronous - can't use async import here
        // Importing at module level instead (see top of file)
        return settlementService.getSettlementUpgradeInfo(settlement);
      },
      onComplete: async (data: any, ctx: any) => {
        // UnifiedCheckHandler returns { id: '...', name: '...' }
        // Extract just the ID for simplicity
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
        console.error('[upgradeSettlement] Settlement not found in preview. settlementId:', settlementId);
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
      
      // Show upgrade message for success outcomes
      if (ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push({
          type: 'text' as const,
          message: `Will upgrade ${settlement.name} to level ${newLevel}`,
          icon: 'fa-arrow-up',
          variant: 'positive' as const
        });
      }
      
      // Show cost badge for all outcomes (cost applies regardless)
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
        variant: 'negative' as const  // All gold costs are red (negative resources)
      });

      return {
        resources: [],  // Don't return resources - we're manually creating badges instead
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    const settlementId = ctx.metadata?.settlementId;
    
    if (!settlementId) {
      console.error('[upgradeSettlement] Missing settlementId in execute. metadata:', ctx.metadata);
      throw new Error('Settlement ID not found in context');
    }

    // Get fresh kingdom data in case of rerolls
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
      console.error('[upgradeSettlement] Settlement not found. settlementId:', settlementId, 'Available settlements:', freshKingdom.settlements?.map((s: any) => s.id));
      throw new Error(`Settlement not found: ${settlementId}`);
    }

    const outcome = ctx.outcome;
    const currentLevel = settlement.level;
    const newLevel = currentLevel + 1;
    
    // Calculate gold cost based on outcome (must match preview calculation)
    const fullCost = newLevel;
    const halfCost = Math.ceil(newLevel / 2);
    const goldCost = outcome === 'criticalSuccess' ? halfCost :
                    outcome === 'success' ? fullCost :
                    outcome === 'failure' ? halfCost :
                    fullCost;  // critical failure
    
    // Apply gold cost using GameCommandsService for proper shortfall tracking
    const { createGameCommandsService } = await import('../../services/GameCommandsService');
    const gameCommandsService = await createGameCommandsService();
    
    console.log(`🎯 [upgradeSettlement] Applying gold cost via applyOutcome:`, {
      goldCost,
      outcome: ctx.outcome,
      settlementName: settlement.name
    });
    
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
    
    console.log(`💰 [upgradeSettlement] applyOutcome result:`, applyResult);
    
    console.log(`💰 [upgradeSettlement] Applied gold cost: -${goldCost} (outcome: ${outcome})`);
    
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
    // For failure and critical failure: gold already deducted via preview, no upgrade happens

    return { success: true };
  }
});
