/**
 * Hex Adjacency Logic - Pure Functions
 * 
 * Calculates hex neighbors based on offset coordinate system.
 * This is the foundational logic for territory operations.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';

/**
 * Get adjacent hex IDs for a given hex position
 * Uses offset coordinate system where even/odd rows have different neighbor patterns
 * 
 * @param row - Hex row coordinate
 * @param col - Hex column coordinate
 * @returns Array of adjacent hex IDs in format "row.col"
 */
export function getAdjacentHexIds(row: number, col: number): string[] {
  const neighbors: string[] = [];
  const isEvenRow = row % 2 === 0;
  
  if (isEvenRow) {
    // Even row neighbors
    neighbors.push(`${row - 1}.${col - 1}`, `${row - 1}.${col}`);
    neighbors.push(`${row}.${col - 1}`, `${row}.${col + 1}`);
    neighbors.push(`${row + 1}.${col - 1}`, `${row + 1}.${col}`);
  } else {
    // Odd row neighbors
    neighbors.push(`${row - 1}.${col}`, `${row - 1}.${col + 1}`);
    neighbors.push(`${row}.${col - 1}`, `${row}.${col + 1}`);
    neighbors.push(`${row + 1}.${col}`, `${row + 1}.${col + 1}`);
  }
  
  // Filter out invalid coordinates (negative values)
  return neighbors.filter(id => {
    const [r, c] = id.split('.').map(Number);
    return r >= 0 && c >= 0;
  });
}

/**
 * Get adjacent hex IDs from a hex ID string
 * 
 * @param hexId - Hex ID in format "row.col"
 * @returns Array of adjacent hex IDs
 */
export function getAdjacentHexIdsFromId(hexId: string): string[] {
  const [row, col] = hexId.split('.').map(Number);
  if (isNaN(row) || isNaN(col)) {
    return [];
  }
  return getAdjacentHexIds(row, col);
}

/**
 * Check if a hex is adjacent to any claimed territory
 * 
 * @param hexId - Hex ID to check
 * @param kingdom - Kingdom data containing hex information
 * @param faction - Faction to check adjacency for (default: player)
 * @returns True if adjacent to claimed territory
 */
export function isAdjacentToClaimed(
  hexId: string, 
  kingdom: KingdomData, 
  faction: string = PLAYER_KINGDOM
): boolean {
  const adjacentIds = getAdjacentHexIdsFromId(hexId);
  
  return adjacentIds.some(adjId => {
    const adjHex = kingdom.hexes?.find(h => h.id === adjId);
    return adjHex?.claimedBy === faction;
  });
}

/**
 * Get all hexes adjacent to claimed territory that are claimable
 * 
 * @param kingdom - Kingdom data
 * @param exploredHexIds - Set of hex IDs that have been explored
 * @param faction - Faction to check (default: player)
 * @returns Array of claimable hex objects
 */
export function getClaimableHexes(
  kingdom: KingdomData,
  exploredHexIds: Set<string>,
  faction: string = PLAYER_KINGDOM
): any[] {
  return (kingdom.hexes || []).filter(hex => 
    !hex.claimedBy && 
    exploredHexIds.has(hex.id) &&
    isAdjacentToClaimed(hex.id, kingdom, faction)
  );
}

/**
 * Get all unexplored hexes adjacent to claimed territory
 * 
 * @param kingdom - Kingdom data
 * @param exploredHexIds - Set of hex IDs that have been explored
 * @param faction - Faction to check (default: player)
 * @returns Array of unexplored adjacent hex objects
 */
export function getUnexploredAdjacentHexes(
  kingdom: KingdomData,
  exploredHexIds: Set<string>,
  faction: string = PLAYER_KINGDOM
): any[] {
  const claimedHexes = kingdom.hexes?.filter(h => h.claimedBy === faction) || [];
  const unexplored: any[] = [];
  const seen = new Set<string>();
  
  for (const hex of claimedHexes) {
    const neighbors = getAdjacentHexIds(hex.row, hex.col);
    for (const neighborId of neighbors) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      
      const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
      if (neighborHex && !neighborHex.claimedBy && !exploredHexIds.has(neighborId)) {
        unexplored.push(neighborHex);
      }
    }
  }
  
  return unexplored;
}

