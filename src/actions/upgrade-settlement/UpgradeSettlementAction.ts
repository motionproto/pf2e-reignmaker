/**
 * UpgradeSettlementAction - Custom implementation for Upgrade Settlement
 * 
 * Handles settlement level increases with automatic tier transitions
 * and structure requirement validation at tier boundaries.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { SettlementTier } from '../../models/Settlement';
import { getKingdomActor } from '../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  replaceTemplatePlaceholders,
  type ResolveResult
} from '../shared/ActionHelpers';

/**
 * Check if a settlement meets structure requirements for tier upgrade
 */
function canUpgradeSettlement(settlement: any): {
  canUpgrade: boolean;
  reason?: string;
} {
  const structureCount = settlement.structureIds?.length || 0;
  
  // Check structure requirements based on current tier
  switch (settlement.tier) {
    case SettlementTier.VILLAGE:
      if (structureCount < 3) {
        return { canUpgrade: false, reason: '3 structures required for Town' };
      }
      return { canUpgrade: true };
      
    case SettlementTier.TOWN:
      if (structureCount < 6) {
        return { canUpgrade: false, reason: '6 structures required for City' };
      }
      return { canUpgrade: true };
      
    case SettlementTier.CITY:
      if (structureCount < 9) {
        return { canUpgrade: false, reason: '9 structures required for Metropolis' };
      }
      return { canUpgrade: true };
      
    case SettlementTier.METROPOLIS:
      return { canUpgrade: false, reason: 'Already at maximum tier' };
      
    default:
      return { canUpgrade: false, reason: 'Unknown tier' };
  }
}

export const UpgradeSettlementAction = {
  id: 'upgrade-settlement',
  
  /**
   * Pre-roll dialog configuration
   */
  preRollDialog: {
    dialogId: 'upgrade-settlement',
    extractMetadata: (dialogResult: any) => ({
      settlementId: dialogResult.settlementId,
      settlementName: dialogResult.settlementName
    })
  },
  
  /**
   * Check if action can be performed
   * Validates that at least one settlement meets structure requirements and has gold for upgrade
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {

    const settlements = kingdomData.settlements || [];
    const availableGold = kingdomData.resources?.gold || 0;
    
    if (settlements.length === 0) {
      return {
        met: false,
        reason: 'No settlements available to upgrade'
      };
    }
    
    // First check: settlements with structure requirements met
    const settlementsWithStructures = settlements.filter(s => {
      const check = canUpgradeSettlement(s);
      return check.canUpgrade;
    });
    
    if (settlementsWithStructures.length === 0) {
      return {
        met: false,
        reason: 'No settlements meet structure requirements for tier upgrade'
      };
    }
    
    // Second check: can we afford to upgrade any of them?
    const minCost = Math.min(...settlementsWithStructures.map(s => s.level + 1));

    if (availableGold < minCost) {

      return {
        met: false,
        reason: `Insufficient gold to upgrade (need ${minCost} gold)`
      };
    }

    return {
      met: true
    };
  },
  
  /**
   * Custom resolution for upgrade settlement
   * Handles settlement level upgrade with automatic tier transitions
   */
  customResolution: {
    component: null, // Uses UpgradeSettlementSelectionDialog handled by ActionsPhase
    
    /**
     * Validate that resolution data contains required settlement info
     */
    validateData(resolutionData: ResolutionData): boolean {
      return !!(
        resolutionData.customComponentData?.settlementId
      );
    },
    
    /**
     * Execute custom resolution logic
     * Upgrades settlement level and handles tier transitions
     */
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('upgrade-settlement', 'Upgrading settlement');
      
      const { settlementId } = resolutionData.customComponentData || {};
      
      if (!settlementId) {
        return createErrorResult('Settlement upgrade data missing');
      }
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return createErrorResult('No kingdom actor available');
        }
        
        const kingdom = actor.getKingdomData();
        if (!kingdom) {
          return createErrorResult('No kingdom data available');
        }
        
        const settlement = kingdom.settlements.find((s: any) => s.id === settlementId);
        if (!settlement) {
          return createErrorResult('Settlement not found');
        }
        
        // Get outcome from instance metadata
        const outcome = instance?.metadata?.outcome || 'success';
        
        const currentLevel = settlement.level;
        const newLevel = currentLevel + 1;
        const fullCost = newLevel;
        
        // Load action JSON to get outcome descriptions
        const { actionLoader } = await import('../../controllers/actions/action-loader');
        const action = actionLoader.getAllActions().find(a => a.id === 'upgrade-settlement');
        
        // Get description template for this outcome
        const description = (action as any)?.[outcome]?.description || 'Settlement upgrade attempted';
        
        // For success and critical success: upgrade the settlement
        if (outcome === 'success' || outcome === 'criticalSuccess') {
          // Calculate actual cost based on outcome
          let actualCost = fullCost;
          if (outcome === 'criticalSuccess') {
            actualCost = Math.ceil(fullCost / 2);
          }
          
          // Deduct gold cost
          await actor.updateKingdomData((k: KingdomData) => {
            if (k.resources.gold >= actualCost) {
              k.resources.gold -= actualCost;
            } else {
              throw new Error(`Insufficient gold: need ${actualCost}, have ${k.resources.gold}`);
            }
          });
          
          // Upgrade settlement level (handles automatic tier transitions)
          const { settlementService } = await import('../../services/settlements');
          await settlementService.updateSettlementLevel(settlementId, newLevel);
          
          // Get updated settlement for message
          const updatedKingdom = actor.getKingdomData();
          const updatedSettlement = updatedKingdom?.settlements.find((s: any) => s.id === settlementId);
          
          if (updatedSettlement) {
            // Replace placeholders with actual settlement data
            const finalMessage = replaceTemplatePlaceholders(description, { 
              settlement: updatedSettlement.name,
              level: newLevel.toString()
            });
            
            // Check if tier changed for bonus notification
            const tierChanged = updatedSettlement.tier !== settlement.tier;
            const game = (window as any).game;
            
            if (tierChanged) {
              game?.ui?.notifications?.info(`✨ ${finalMessage} and became a ${updatedSettlement.tier}!`);
            } else if (outcome === 'criticalSuccess') {
              game?.ui?.notifications?.info(`🎉 Critical Success! ${finalMessage}`);
            } else {
              game?.ui?.notifications?.info(`✅ ${finalMessage}`);
            }
            
            logActionSuccess('upgrade-settlement', finalMessage);
            return createSuccessResult(finalMessage);
          }
        } else {
          // For failure and critical failure: only deduct cost, don't upgrade
          let actualCost = fullCost;
          if (outcome === 'failure') {
            actualCost = Math.ceil(fullCost / 2);
          }
          
          // Deduct gold cost
          await actor.updateKingdomData((k: KingdomData) => {
            if (k.resources.gold >= actualCost) {
              k.resources.gold -= actualCost;
            } else {
              throw new Error(`Insufficient gold: need ${actualCost}, have ${k.resources.gold}`);
            }
          });
          
          // Replace placeholders (no level change, so just show settlement name)
          const finalMessage = replaceTemplatePlaceholders(description, { 
            settlement: settlement.name
          });
          
          const game = (window as any).game;
          game?.ui?.notifications?.warn(`⚠️ ${finalMessage}`);
          
          logActionSuccess('upgrade-settlement', finalMessage);
          return createSuccessResult(finalMessage);
        }
        
        return createSuccessResult('Settlement upgrade completed');
        
      } catch (error) {
        logActionError('upgrade-settlement', error as Error);
        return createErrorResult(
          error instanceof Error ? error.message : 'Failed to upgrade settlement'
        );
      }
    }
  },
  
  /**
   * Determine which outcomes need custom resolution
   * For upgrade-settlement: all outcomes need custom resolution to inject settlement name
   * Success/criticalSuccess also upgrade the settlement
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return true; // All outcomes need settlement name in description
  }
};

export default UpgradeSettlementAction;
