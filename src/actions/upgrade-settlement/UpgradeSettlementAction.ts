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
  
};

export default UpgradeSettlementAction;
