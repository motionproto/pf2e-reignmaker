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
    const neighbors = canvas.grid.getNeighbors(offset.i, offset.j);
    
    // Use Foundry's native format (no zero-padding)
    return neighbors.map((neighbor: any) => `${neighbor.i}.${neighbor.j}`);
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
  // Check roadsBuilt array first (most common case)
  const roadsBuilt = kingdom.roadsBuilt || [];
  if (roadsBuilt.includes(hexId)) return true;
  
  // Check if hex has a settlement (settlements = roads)
  return hexHasSettlement(hexId, kingdom);
}
