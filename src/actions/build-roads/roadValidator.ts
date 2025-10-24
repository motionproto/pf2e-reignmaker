/**
 * Road Validation Module
 * Validates hex selections for road building
 * 
 * Rules:
 * - Roads can only be built on claimed hexes (claimedBy === 1)
 * - Roads must be adjacent to existing roads OR settlements
 * - Settlements count as roads for adjacency purposes
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { getKingdomData } from '../../stores/KingdomStore';
import { getAdjacentHexIds, isAdjacentToAny } from '../shared/hexValidation';

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
  
  // Check if any adjacent hex has an existing road
  const existingRoads = kingdom.roadsBuilt || [];
  if (adjacentHexIds.some(id => existingRoads.includes(id))) {
    return true;
  }
  
  // Check if any adjacent hex has a pending road
  if (adjacentHexIds.some(id => pendingRoads.includes(id))) {
    return true;
  }
  
  // Check if any adjacent hex has a settlement (settlements = roads)
  for (const settlement of kingdom.settlements || []) {
    if (!settlement.location || (settlement.location.x === 0 && settlement.location.y === 0)) {
      continue; // Skip unmapped settlements
    }
    
    const settlementHexId = `${settlement.location.x}.${String(settlement.location.y).padStart(2, '0')}`;
    if (adjacentHexIds.includes(settlementHexId)) {
      return true;
    }
  }
  
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
  
  const existingRoads = kingdom.roadsBuilt || [];
  
  for (const adjacentId of adjacentHexIds) {
    // Check if adjacent hex has an existing road
    if (existingRoads.includes(adjacentId)) {
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
      const settlementHexId = `${s.location.x}.${String(s.location.y).padStart(2, '0')}`;
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
  const hex = kingdom.hexes.find((h: any) => h.id === hexId);
  if (!hex || hex.claimedBy !== 1) {
    console.log(`[RoadValidator] ❌ Hex ${hexId} not claimed`);
    return false;
  }
  
  // Check 2: Cannot already have a road
  const existingRoads = kingdom.roadsBuilt || [];
  if (existingRoads.includes(hexId)) {
    console.log(`[RoadValidator] ❌ Hex ${hexId} already has a road`);
    return false;
  }
  
  // Check 3: Cannot already be selected as a pending road
  if (pendingRoads.includes(hexId)) {
    console.log(`[RoadValidator] ❌ Hex ${hexId} already selected`);
    return false;
  }
  
  // Check 4: Must be adjacent to existing roads, pending roads, or settlements
  if (!isAdjacentToRoadOrSettlement(hexId, kingdom, pendingRoads)) {
    console.log(`[RoadValidator] ❌ Hex ${hexId} not adjacent to roads/settlements`);
    return false;
  }
  
  console.log(`[RoadValidator] ✅ Hex ${hexId} valid for road`);
  return true;
}
