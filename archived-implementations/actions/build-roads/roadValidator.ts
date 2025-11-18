/**
 * Road Validation Module
 * Validates hex selections for road building
 * 
 * Rules:
 * - Roads can only be built on claimed hexes (claimedBy === PLAYER_KINGDOM)
 * - Roads must be adjacent to existing roads OR settlements
 * - Settlements count as roads for adjacency purposes
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { getKingdomData } from '../../stores/KingdomStore';
import { getAdjacentHexIds, isHexClaimedByPlayer, isHexPending, hexHasSettlement, hexHasRoads } from '../shared/hexValidation';
import { PLAYER_KINGDOM } from '../../types/ownership';

/**
 * Check if hex is adjacent to existing roads, pending roads, or settlements
 * 
 * RULE: Settlements count as roads for adjacency purposes
 * This means you can build roads starting from any settlement
 * 
 * @param pendingRoads - Array of hex IDs for roads that are selected but not yet saved
 */
export function isAdjacentToRoadOrSettlement(hexId: string, kingdom: KingdomData, pendingRoads: string[] = []): boolean {
  const adjacentHexIds = getAdjacentHexIds(hexId);
  console.log(`🔍 [RoadValidator] Checking adjacency for ${hexId}, adjacent hexes:`, adjacentHexIds);
  
  // Check if any adjacent hex has an existing road (hasRoad flag)
  for (const adjHexId of adjacentHexIds) {
    const adjHex = kingdom.hexes.find((h: any) => h.id === adjHexId);
    if (adjHex?.hasRoad) {
      console.log(`✅ [RoadValidator] ${hexId} is adjacent to road at ${adjHexId}`);
      return true;
    }
  }
  
  // Check if any adjacent hex has a pending road
  if (adjacentHexIds.some(id => pendingRoads.includes(id))) {
    return true;
  }
  
  // Check if any adjacent hex has a settlement (settlements = roads)
  const settlements = kingdom.settlements || [];
  console.log(`🏘️ [RoadValidator] Checking ${settlements.length} settlements`);
  for (const settlement of settlements) {
    if (!settlement.location || (settlement.location.x === 0 && settlement.location.y === 0)) {
      continue; // Skip unmapped settlements
    }
    
    const settlementHexId = `${settlement.location.x}.${settlement.location.y}`;
    console.log(`   Settlement "${settlement.name}" at ${settlementHexId}`);
    if (adjacentHexIds.includes(settlementHexId)) {
      console.log(`✅ [RoadValidator] ${hexId} is adjacent to settlement at ${settlementHexId}`);
      return true;
    }
  }
  
  console.log(`❌ [RoadValidator] ${hexId} is not adjacent to any roads or settlements`);
  return false;
}

/**
 * Get adjacent hexes that have roads, pending roads, or settlements
 * Used for road preview visualization
 * 
 * @param pendingRoads - Array of hex IDs for roads that are selected but not yet saved
 */
export function getAdjacentRoadsAndSettlements(hexId: string, kingdom: KingdomData, pendingRoads: string[] = []): string[] {
  const adjacentHexIds = getAdjacentHexIds(hexId);
  const result: string[] = [];
  
  for (const adjacentId of adjacentHexIds) {
    // Check if adjacent hex has an existing road (hasRoad flag)
    const adjHex = kingdom.hexes.find((h: any) => h.id === adjacentId);
    if (adjHex?.hasRoad) {
      result.push(adjacentId);
      continue;
    }
    
    // Check if adjacent hex has a pending road
    if (pendingRoads.includes(adjacentId)) {
      result.push(adjacentId);
      continue;
    }
    
    // Check if adjacent hex has a settlement (settlements = roads)
    const hasSettlement = (kingdom.settlements || []).some(s => {
      if (!s.location || (s.location.x === 0 && s.location.y === 0)) return false;
      const settlementHexId = `${s.location.x}.${s.location.y}`;
      return settlementHexId === adjacentId;
    });
    
    if (hasSettlement) {
      result.push(adjacentId);
    }
  }
  
  return result;
}

/**
 * Validate a hex for road building
 * Gets fresh kingdom data on each call to avoid stale data issues
 * 
 * @param hexId - Hex ID to validate
 * @param pendingRoads - Array of hex IDs for roads that are selected but not yet saved
 */
export function validateRoadHex(hexId: string, pendingRoads: string[] = []): boolean {
  // Get FRESH kingdom data on each validation call (not stale snapshot)
  const kingdom = getKingdomData();
  
  // Check 1: Must be claimed by kingdom
  if (!isHexClaimedByPlayer(hexId, kingdom)) {

    return false;
  }
  
  // Check 2: Cannot already have a road (includes settlement check)
  if (hexHasRoads(hexId, kingdom)) {
    if (hexHasSettlement(hexId, kingdom)) {

    } else {

    }
    return false;
  }
  
  // Check 3: Cannot already be selected as a pending road
  if (isHexPending(hexId, pendingRoads)) {

    return false;
  }
  
  // Check 4: Must be adjacent to existing roads, pending roads, or settlements
  // EXCEPTION: If there are NO roads and NO settlements yet, allow first road anywhere
  const hasAnyRoads = kingdom.hexes.some((h: any) => h.hasRoad);
  const hasAnySettlements = (kingdom.settlements || []).some(s => 
    s.location && !(s.location.x === 0 && s.location.y === 0)
  );
  const hasAnyPendingRoads = pendingRoads.length > 0;
  
  // If there are roads, settlements, or pending roads, enforce adjacency
  if (hasAnyRoads || hasAnySettlements || hasAnyPendingRoads) {
    if (!isAdjacentToRoadOrSettlement(hexId, kingdom, pendingRoads)) {
      return false;
    }
  }
  // Otherwise (first road), allow anywhere in claimed territory

  return true;
}
