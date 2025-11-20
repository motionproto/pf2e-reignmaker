/**
 * Claim Hex Validation Module
 * Validates hex selections for claiming territory
 * 
 * Rules:
 * - Cannot claim already claimed hexes (claimedBy === PLAYER_KINGDOM)
 * - Must be explored (if World Explorer available)
 * - First hex can be claimed anywhere (bootstrap rule)
 * - Subsequent hexes must be adjacent to existing claimed OR pending claims
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { getKingdomData } from '../../stores/KingdomStore';
import { isAdjacentToAny, isHexClaimedByPlayer, isHexPending } from '../shared/hexValidation';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { worldExplorerService } from '../../services/WorldExplorerService';

/**
 * Validation result - either boolean for backward compatibility or object with message
 */
export type ValidationResult = boolean | { valid: boolean; message?: string };

/**
 * Validate a hex for claiming
 * Gets fresh kingdom data on each call to avoid stale data issues
 * 
 * @param hexId - Hex ID to validate
 * @param pendingClaims - Array of hex IDs for claims that are selected but not yet saved
 */
export function validateClaimHex(hexId: string, pendingClaims: string[] = []): ValidationResult {
  // Get FRESH kingdom data on each validation call (not stale snapshot)
  const kingdom = getKingdomData();
  
  // Check 1: Cannot claim already claimed hex
  if (isHexClaimedByPlayer(hexId, kingdom)) {
    return {
      valid: false,
      message: 'Hex is already claimed by your kingdom'
    };
  }
  
  // Check 2: Cannot already be selected as a pending claim
  if (isHexPending(hexId, pendingClaims)) {
    return {
      valid: false,
      message: 'Hex is already selected'
    };
  }
  
  // Get all currently claimed hexes
  const claimedHexIds = kingdom.hexes
    .filter((h: any) => h.claimedBy === PLAYER_KINGDOM)
    .map((h: any) => h.id);
  
  // Check 3: First claim (bootstrap rule) - any unclaimed hex is valid
  // Skip exploration check for first hex to allow bootstrapping
  if (claimedHexIds.length === 0 && pendingClaims.length === 0) {
    return true;
  }
  
  // Check 4: Must be explored (if World Explorer available)
  if (worldExplorerService.isAvailable()) {
    const isExplored = worldExplorerService.isRevealed(hexId);
    if (!isExplored) {
      return {
        valid: false,
        message: 'Cannot claim unexplored hex - send scouts first'
      };
    }
  }
  
  // Check 5: Must be adjacent to existing claimed OR pending claims
  const allClaimedIds = [...claimedHexIds, ...pendingClaims];
  const isAdjacent = isAdjacentToAny(hexId, allClaimedIds);
  
  if (!isAdjacent) {
    return {
      valid: false,
      message: 'Hex must be adjacent to your territory'
    };
  }

  return true;
}
