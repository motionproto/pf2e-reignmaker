/**
 * Shared Hex Validation Utilities
 * 
 * Common hex validation logic used across multiple action validators
 * (claim hexes, build roads, etc.)
 */

import { kingmakerIdToOffset, hexToKingmakerId } from '../../services/hex-selector/coordinates';
import { PLAYER_KINGDOM } from '../../types/ownership';
import type { KingdomData } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';
import { getAdjacentHexes } from '../../utils/hexUtils';

/**
 * Get adjacent hex IDs for a given hex using Foundry's grid API
 * Uses canvas.grid.getNeighbors() directly (Foundry v13+)
 * 
 * SHARED utility - used by all validators that need adjacency checks
 */
export function getAdjacentHexIds(hexId: string): string[] {
  const canvas = (globalThis as any).canvas;
  
  if (!canvas?.grid) {
    logger.warn(`[HexValidation] Canvas grid not available`);
    return [];
  }
  
  try {
    const offset = kingmakerIdToOffset(hexId);
    const neighbors = getAdjacentHexes(offset.i, offset.j);
    
    // Convert to hex ID format
    return neighbors.map((neighbor) => `${neighbor.i}.${neighbor.j}`);
  } catch (error) {
    logger.warn(`[HexValidation] Error getting neighbors for ${hexId}:`, error);
    return [];
  }
}

/**
 * Check if a hex is adjacent to ANY hex in the target list
 * 
 * GENERIC helper for all adjacency checks
 * 
 * @param hexId - The hex to check
 * @param targetHexIds - List of hex IDs to check adjacency against
 * @returns true if hexId is adjacent to at least one hex in targetHexIds
 */
export function isAdjacentToAny(hexId: string, targetHexIds: string[]): boolean {
  if (targetHexIds.length === 0) {
    return false;
  }
  
  const adjacentHexIds = getAdjacentHexIds(hexId);
  return adjacentHexIds.some(id => targetHexIds.includes(id));
}

/**
 * Get hex by ID from kingdom data
 * 
 * @param hexId - The hex ID to find
 * @param kingdom - Kingdom data to search in
 * @returns The hex object or undefined if not found
 */
export function getHex(hexId: string, kingdom: KingdomData): any | undefined {
  return kingdom.hexes.find((h: any) => h.id === hexId);
}

/**
 * Check if hex is claimed by player kingdom
 * 
 * @param hexId - The hex ID to check
 * @param kingdom - Kingdom data to check against
 * @returns true if hex is claimed by PLAYER_KINGDOM
 */
export function isHexClaimedByPlayer(hexId: string, kingdom: KingdomData): boolean {
  const hex = getHex(hexId, kingdom);
  return hex?.claimedBy === PLAYER_KINGDOM;
}

/**
 * Check if hex is already in pending selections
 * 
 * @param hexId - The hex ID to check
 * @param pendingSelections - Array of pending hex IDs
 * @returns true if hex is in pending selections
 */
export function isHexPending(hexId: string, pendingSelections: string[]): boolean {
  return pendingSelections.includes(hexId);
}

/**
 * Check if a hex has a settlement
 * Settlements count as roads - you don't need to build roads in settlement hexes
 * 
 * @param hexId - The hex ID to check
 * @param kingdom - Kingdom data
 * @returns true if hex has a settlement
 */
export function hexHasSettlement(hexId: string, kingdom: KingdomData): boolean {
  return (kingdom.settlements || []).some(s => {
    if (!s.location || (s.location.x === 0 && s.location.y === 0)) return false;
    const settlementHexId = `${s.location.x}.${s.location.y}`;
    return settlementHexId === hexId;
  });
}

/**
 * Check if a hex effectively has roads (either hasRoad flag OR has a settlement)
 * Settlements count as roads for all purposes
 * 
 * @param hexId - The hex ID to check
 * @param kingdom - Kingdom data
 * @returns true if hex has roads or a settlement
 */
export function hexHasRoads(hexId: string, kingdom: KingdomData): boolean {
  // Check hex hasRoad flag
  const hex = getHex(hexId, kingdom);
  if (hex?.hasRoad) return true;
  
  // Check if hex has a settlement (settlements = roads)
  return hexHasSettlement(hexId, kingdom);
}

/**
 * Check if a hex is explored (revealed in World Explorer)
 * 
 * @param hexId - The hex ID to check
 * @returns true if hex is explored, false if not explored or World Explorer unavailable
 */
export function isHexExplored(hexId: string): boolean {
  // Import dynamically to avoid circular dependencies
  const canvas = (globalThis as any).canvas;
  
  // World Explorer not available or not enabled
  if (!canvas?.worldExplorer?.enabled) {
    return true; // Default to true if World Explorer not available (permissive)
  }
  
  try {
    const [i, j] = hexId.split('.').map(Number);
    if (isNaN(i) || isNaN(j)) {
      logger.warn(`[HexValidation] Invalid hex ID format: ${hexId}`);
      return false;
    }
    
    return canvas.worldExplorer.isRevealed({ offset: { i, j } });
  } catch (error) {
    logger.warn(`[HexValidation] Error checking exploration status for ${hexId}:`, error);
    return true; // Default to true on error (permissive)
  }
}

/**
 * Get all hexes within N steps of any starting hex
 * Uses breadth-first search to find hexes within distance
 * 
 * @param startHexIds - Array of hex IDs to start from
 * @param distance - Maximum distance in hex steps
 * @param kingdom - Kingdom data to search in
 * @param filter - Optional filter function to include only certain hexes
 * @returns Array of hex objects within the specified distance
 */
export function getHexesWithinDistance(
  startHexIds: string[],
  distance: number,
  kingdom: KingdomData,
  filter?: (hex: any) => boolean
): any[] {
  const visited = new Set<string>(startHexIds);
  const result: any[] = [];
  let currentLevel = [...startHexIds];
  
  for (let d = 0; d < distance; d++) {
    const nextLevel: string[] = [];
    
    for (const hexId of currentLevel) {
      const neighbors = getAdjacentHexIds(hexId);
      
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        
        const hex = getHex(neighborId, kingdom);
        if (!hex) continue;
        
        if (!filter || filter(hex)) {
          result.push(hex);
        }
        
        // Continue exploring from this hex even if it doesn't pass filter
        nextLevel.push(neighborId);
      }
    }
    
    currentLevel = nextLevel;
  }
  
  return result;
}

/**
 * Get hexes at EXACTLY N steps from any starting hex (not closer)
 * Uses breadth-first search to find hexes at the exact distance
 * 
 * @param startHexIds - Array of hex IDs to start from
 * @param distance - Exact distance in hex steps (e.g., 2 = exactly 2 steps away)
 * @param kingdom - Kingdom data to search in
 * @param filter - Optional filter function to include only certain hexes
 * @returns Array of hex objects at exactly the specified distance
 */
export function getHexesAtExactDistance(
  startHexIds: string[],
  distance: number,
  kingdom: KingdomData,
  filter?: (hex: any) => boolean
): any[] {
  if (distance < 1) {
    logger.warn('[HexValidation] getHexesAtExactDistance called with distance < 1');
    return [];
  }
  
  const visited = new Set<string>(startHexIds);
  let currentLevel = [...startHexIds];
  
  // BFS to reach the exact distance level
  for (let d = 0; d < distance; d++) {
    const nextLevel: string[] = [];
    
    for (const hexId of currentLevel) {
      const neighbors = getAdjacentHexIds(hexId);
      
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        nextLevel.push(neighborId);
      }
    }
    
    currentLevel = nextLevel;
    
    // If we run out of hexes before reaching target distance, return empty
    if (currentLevel.length === 0 && d < distance - 1) {
      logger.info(`[HexValidation] No hexes found at distance ${distance} - ran out at distance ${d + 1}`);
      return [];
    }
  }
  
  // currentLevel now contains hexes at exactly 'distance' steps
  // Apply filter and return matching hexes
  const result: any[] = [];
  for (const hexId of currentLevel) {
    const hex = getHex(hexId, kingdom);
    if (!hex) continue;
    
    if (!filter || filter(hex)) {
      result.push(hex);
    }
  }
  
  return result;
}
