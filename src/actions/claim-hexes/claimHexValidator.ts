/**
 * Claim Hex Validation Module
 * Validates hex selections for claiming territory
 * 
 * Rules:
 * - Cannot claim already claimed hexes (claimedBy === PLAYER_KINGDOM)
 * - First hex can be claimed anywhere (bootstrap rule)
 * - Subsequent hexes must be adjacent to existing claimed OR pending claims
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { getKingdomData } from '../../stores/KingdomStore';
import { isAdjacentToAny, isHexClaimedByPlayer, isHexPending } from '../shared/hexValidation';
import { PLAYER_KINGDOM } from '../../types/ownership';

/**
 * Validate a hex for claiming
 * Gets fresh kingdom data on each call to avoid stale data issues
 * 
 * @param hexId - Hex ID to validate
 * @param pendingClaims - Array of hex IDs for claims that are selected but not yet saved
 */
export function validateClaimHex(hexId: string, pendingClaims: string[] = []): boolean {
  // Get FRESH kingdom data on each validation call (not stale snapshot)
  const kingdom = getKingdomData();
  
  // Check 1: Cannot claim already claimed hex
  if (isHexClaimedByPlayer(hexId, kingdom)) {
    console.log(`[ClaimValidator] ❌ Hex ${hexId} already claimed`);
    return false;
  }
  
  // Check 2: Cannot already be selected as a pending claim
  if (isHexPending(hexId, pendingClaims)) {
    console.log(`[ClaimValidator] ❌ Hex ${hexId} already selected`);
    return false;
  }
  
  // Get all currently claimed hexes
  const claimedHexIds = kingdom.hexes
    .filter((h: any) => h.claimedBy === PLAYER_KINGDOM)
    .map((h: any) => h.id);
  
  // Check 3: First claim (bootstrap rule) - any unclaimed hex is valid
  if (claimedHexIds.length === 0 && pendingClaims.length === 0) {
    console.log(`[ClaimValidator] ✅ Hex ${hexId} valid (first claim)`);
    return true;
  }
  
  // Check 4: Must be adjacent to existing claimed OR pending claims
  const allClaimedIds = [...claimedHexIds, ...pendingClaims];
  const isAdjacent = isAdjacentToAny(hexId, allClaimedIds);
  
  if (!isAdjacent) {
    console.log(`[ClaimValidator] ❌ Hex ${hexId} not adjacent to claimed territory`);
    return false;
  }
  
  console.log(`[ClaimValidator] ✅ Hex ${hexId} valid for claim`);
  return true;
}
