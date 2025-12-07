/**
 * Exploration Logic - Pure Functions
 * 
 * Handles hex exploration (scouting) operations.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { getAdjacentHexIds } from './adjacencyLogic';

/**
 * Get hexes that can be explored (adjacent to claimed, not already explored)
 * 
 * @param kingdom - Kingdom data
 * @param exploredHexIds - Set of already explored hex IDs
 * @param faction - Faction to check (default: player)
 * @returns Array of explorable hex objects
 */
export function getExplorableHexes(
  kingdom: KingdomData,
  exploredHexIds: Set<string>,
  faction: string = PLAYER_KINGDOM
): any[] {
  const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === faction) || [];
  const explorable: any[] = [];
  const seen = new Set<string>();
  
  for (const hex of claimedHexes) {
    const neighbors = getAdjacentHexIds(hex.row, hex.col);
    for (const neighborId of neighbors) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      
      const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
      if (neighborHex && !neighborHex.claimedBy && !exploredHexIds.has(neighborId)) {
        explorable.push(neighborHex);
      }
    }
  }
  
  return explorable;
}

/**
 * Apply exploration to hexes (adds them to explored set)
 * 
 * @param exploredHexIds - Set to mutate with new explored hexes
 * @param hexIds - Hex IDs to mark as explored
 * @returns Number of newly explored hexes
 */
export function applyExploreHexes(
  exploredHexIds: Set<string>,
  hexIds: string[]
): number {
  let newlyExplored = 0;
  
  for (const hexId of hexIds) {
    if (!exploredHexIds.has(hexId)) {
      exploredHexIds.add(hexId);
      newlyExplored++;
    }
  }
  
  return newlyExplored;
}

/**
 * Initialize explored hexes from current kingdom state
 * All hexes adjacent to claimed territory start as explored
 * 
 * @param kingdom - Kingdom data
 * @param faction - Faction to initialize for (default: player)
 * @returns Set of initially explored hex IDs
 */
export function initializeExploredHexes(
  kingdom: KingdomData,
  faction: string = PLAYER_KINGDOM
): Set<string> {
  const exploredHexIds = new Set<string>();
  const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === faction) || [];
  
  // All claimed hexes are explored
  for (const hex of claimedHexes) {
    exploredHexIds.add(hex.id);
  }
  
  // All hexes adjacent to claimed are explored
  for (const hex of claimedHexes) {
    const neighbors = getAdjacentHexIds(hex.row, hex.col);
    for (const neighborId of neighbors) {
      const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
      if (neighborHex && !neighborHex.claimedBy) {
        exploredHexIds.add(neighborId);
      }
    }
  }
  
  return exploredHexIds;
}

/**
 * Check if there are any unexplored hexes adjacent to claimed territory
 * 
 * @param kingdom - Kingdom data
 * @param exploredHexIds - Set of explored hex IDs
 * @param faction - Faction to check (default: player)
 * @returns True if there are unexplored adjacent hexes
 */
export function hasUnexploredAdjacentHexes(
  kingdom: KingdomData,
  exploredHexIds: Set<string>,
  faction: string = PLAYER_KINGDOM
): boolean {
  const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === faction) || [];
  
  for (const hex of claimedHexes) {
    const neighbors = getAdjacentHexIds(hex.row, hex.col);
    for (const neighborId of neighbors) {
      const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
      if (neighborHex && !neighborHex.claimedBy && !exploredHexIds.has(neighborId)) {
        return true;
      }
    }
  }
  
  return false;
}

