/**
 * Shared Hex Validation Utilities
 * 
 * Common hex validation logic used across multiple action validators
 * (claim hexes, build roads, etc.)
 */

import { kingmakerIdToOffset, hexToKingmakerId } from '../../services/hex-selector/coordinates';

/**
 * Get adjacent hex IDs for a given hex using Foundry's GridHex API
 * Uses official grid neighbor detection instead of manual offset calculations
 * 
 * SHARED utility - used by all validators that need adjacency checks
 */
export function getAdjacentHexIds(hexId: string): string[] {
  const canvas = (globalThis as any).canvas;
  const GridHex = (globalThis as any).foundry?.grid?.GridHex;
  
  if (!canvas?.grid || !GridHex) {
    console.warn(`[HexValidation] Canvas grid or GridHex not available`);
    return [];
  }
  
  try {
    const offset = kingmakerIdToOffset(hexId);
    const hex = new GridHex(offset, canvas.grid);
    
    return hex.getNeighbors().map((neighbor: any) => hexToKingmakerId(neighbor.offset));
  } catch (error) {
    console.warn(`[HexValidation] Error getting neighbors for ${hexId}:`, error);
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
