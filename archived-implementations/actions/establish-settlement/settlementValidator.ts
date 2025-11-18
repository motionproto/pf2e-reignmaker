/**
 * Establish Settlement Validation Module
 * Validates hex selections for settlement placement
 * 
 * Rules:
 * - Cannot be adjacent to another settlement (1-hex minimum spacing)
 * - Must be in claimed territory (claimedBy === PLAYER_KINGDOM)
 * - First settlement rule: Waive claimed territory requirement
 * - Cannot place on already occupied settlement hex
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { getKingdomData } from '../../stores/KingdomStore';
import { getAdjacentHexIds, isHexClaimedByPlayer, isHexPending } from '../shared/hexValidation';
import { PLAYER_KINGDOM } from '../../types/ownership';

/**
 * Validate a hex for settlement placement
 * Gets fresh kingdom data on each call to avoid stale data issues
 * 
 * @param hexId - Hex ID to validate
 * @param pendingClaims - Array of hex IDs for settlements that are selected but not yet saved
 */
export function validateSettlementPlacement(hexId: string, pendingClaims: string[] = []): boolean {
  // Get FRESH kingdom data on each validation call (not stale snapshot)
  const kingdom = getKingdomData();
  
  // Check 1: Cannot already be selected as a pending placement
  if (isHexPending(hexId, pendingClaims)) {

    return false;
  }
  
  // Get all existing settlements with valid map locations
  const existingSettlements = (kingdom.settlements || [])
    .filter((s: any) => {
      // Filter out unmapped settlements (location.x === 0, location.y === 0)
      if (!s.location || s.location.x === 0 || s.location.y === 0) {
        return false;
      }
      return true;
    })
    .map((s: any) => `${s.location.x}.${s.location.y}`);
  
  const isFirstSettlement = existingSettlements.length === 0 && pendingClaims.length === 0;
  
  // Check 2: Cannot place on hex that already has a settlement
  if (existingSettlements.includes(hexId)) {

    return false;
  }
  
  // Check 3: Cannot be adjacent to any existing settlements
  const adjacentHexIds = getAdjacentHexIds(hexId);
  const allSettlementHexes = [...existingSettlements, ...pendingClaims];
  const isAdjacentToSettlement = adjacentHexIds.some(adjHex => allSettlementHexes.includes(adjHex));
  
  if (isAdjacentToSettlement) {

    return false;
  }
  
  // Check 4: Must be in claimed territory (unless first settlement)
  if (!isFirstSettlement) {
    if (!isHexClaimedByPlayer(hexId, kingdom)) {

      return false;
    }
  }

  return true;
}
