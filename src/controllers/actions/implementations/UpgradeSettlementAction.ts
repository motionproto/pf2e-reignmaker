/**
 * UpgradeSettlementAction - Custom implementation for Upgrade Settlement
 * 
 * Handles settlement level increases with automatic tier transitions
 * and structure requirement validation at tier boundaries.
 */

import type { KingdomData } from '../../../actors/KingdomActor';
import type { ActionRequirement } from '../action-resolver';
import type { ResolutionData } from '../../../types/modifiers';
import { SettlementTier } from '../../../models/Settlement';
import { getKingdomActor } from '../../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  replaceTemplatePlaceholders,
  type ResolveResult
} from './ActionHelpers';
import UpgradeSettlementDialog from '../../../view/kingdom/components/UpgradeSettlementDialog.svelte';

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
      if (structureCount < 2) {
        return { canUpgrade: false, reason: '2 structures required for Town' };
      }
      return { canUpgrade: true };
      
    case SettlementTier.TOWN:
      if (structureCount < 4) {
        return { canUpgrade: false, reason: '4 structures required for City' };
      }
      return { canUpgrade: true };
      
    case SettlementTier.CITY:
      if (structureCount < 8) {
        return { canUpgrade: false, reason: '8 structures required for Metropolis' };
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
   * Check if action can be performed
   * Validates that at least one settlement meets structure requirements and has gold for upgrade
   */
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    console.log('🔍 [UpgradeSettlement] Checking requirements');
    
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
    
    console.log('💰 [UpgradeSettlement] Gold check:', {
      availableGold,
      minCost,
      settlements: settlementsWithStructures.map(s => ({
        name: s.name,
        level: s.level,
        cost: s.level + 1
      }))
    });
    
    if (availableGold < minCost) {
      console.log(`❌ [UpgradeSettlement] Insufficient gold: need ${minCost}, have ${availableGold}`);
      return {
        met: false,
        reason: `Insufficient gold to upgrade (need ${minCost} gold)`
      };
    }
    
    console.log(`✅ [UpgradeSettlement] ${settlementsWithStructures.length} eligible settlement(s)`);
    
    return {
      met: true
    };
  },
  
  customResolution: {
    component: UpgradeSettlementDialog,
    
    validateData(resolutionData: ResolutionData): boolean {
      const data = resolutionData.customComponentData;
      
      console.log('🔍 [UpgradeSettlement] Validating resolution data:', {
        hasData: !!data,
        hasSettlementId: !!data?.settlementId,
        settlementId: data?.settlementId
      });
      
      // Require settlement selection
      if (!data?.settlementId) {
        console.log('❌ [UpgradeSettlement] Validation failed: No settlement selected');
        return false;
      }
      
      console.log('✅ [UpgradeSettlement] Validation passed');
      return true;
    },
    
    async execute(resolutionData: ResolutionData): Promise<ResolveResult> {
      const { settlementId, outcome } = resolutionData.customComponentData;
      
      logActionStart('upgrade-settlement', `Upgrading settlement ${settlementId}`);
      
      try {
        const actor = getKingdomActor();
        if (!actor) {
          return createErrorResult('No kingdom actor available');
        }
        
        const kingdom = actor.getKingdom();
        if (!kingdom) {
          return createErrorResult('No kingdom data available');
        }
        
        const settlement = kingdom.settlements.find(s => s.id === settlementId);
        if (!settlement) {
          return createErrorResult('Settlement not found');
        }
        
        const currentLevel = settlement.level;
        const newLevel = currentLevel + 1;
        const fullCost = newLevel;
        
        // Calculate actual cost based on outcome
        const isCriticalSuccess = outcome === 'criticalSuccess';
        const actualCost = isCriticalSuccess ? Math.ceil(fullCost / 2) : fullCost;
        
        console.log('💰 [UpgradeSettlement] Cost calculation:', {
          currentLevel,
          newLevel,
          fullCost,
          isCriticalSuccess,
          actualCost
        });
        
        // Deduct gold cost
        const { updateKingdom } = await import('../../../stores/KingdomStore');
        
        await updateKingdom(k => {
          if (k.resources.gold >= actualCost) {
            k.resources.gold -= actualCost;
          } else {
            throw new Error(`Insufficient gold: need ${actualCost}, have ${k.resources.gold}`);
          }
        });
        
        console.log(`✅ [UpgradeSettlement] Deducted ${actualCost} gold`);
        
        // Upgrade settlement level (handles automatic tier transitions)
        const { settlementService } = await import('../../../services/settlements');
        await settlementService.updateSettlementLevel(settlementId, newLevel);
        
        // Get updated settlement for message
        const updatedKingdom = actor.getKingdom();
        const updatedSettlement = updatedKingdom?.settlements.find(s => s.id === settlementId);
        
        if (!updatedSettlement) {
          return createErrorResult('Failed to retrieve updated settlement');
        }
        
        // Check if tier changed
        const tierChanged = updatedSettlement.tier !== settlement.tier;
        
        const message = tierChanged
          ? `${updatedSettlement.name} upgraded to level ${newLevel} and became a ${updatedSettlement.tier}!`
          : `${updatedSettlement.name} upgraded to level ${newLevel}`;
        
        logActionSuccess('upgrade-settlement', message);
        
        return createSuccessResult(message);
        
      } catch (error) {
        console.error('❌ [UpgradeSettlement] Error:', error);
        logActionError('upgrade-settlement', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to upgrade settlement');
      }
    }
  },
  
  /**
   * Both success and critical success need custom dialog for settlement selection
   */
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }
};

export default UpgradeSettlementAction;
