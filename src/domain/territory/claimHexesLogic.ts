/**
 * Claim Hexes Logic - Pure Functions
 * 
 * Handles the data mutations for claiming hexes.
 * Production code wraps this with Foundry store updates.
 * Simulation uses this directly.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { getAdjacentHexIds } from './adjacencyLogic';

export interface ClaimHexesResult {
  claimedHexIds: string[];
  newSize: number;
  newlyExploredHexIds: string[];
}

/**
 * Apply hex claiming to kingdom data (mutates kingdom)
 * 
 * @param kingdom - Kingdom data to mutate
 * @param hexIds - Array of hex IDs to claim
 * @param faction - Faction claiming the hexes (default: player)
 * @returns Result with claimed hexes and new kingdom size
 */
export function applyClaimHexes(
  kingdom: KingdomData,
  hexIds: string[],
  faction: string = PLAYER_KINGDOM
): ClaimHexesResult {
  const claimedHexIds: string[] = [];
  const newlyExploredHexIds: string[] = [];
  
  if (!hexIds || hexIds.length === 0) {
    return { 
      claimedHexIds: [], 
      newSize: kingdom.size || 0,
      newlyExploredHexIds: []
    };
  }
  
  for (const hexId of hexIds) {
    const hex = kingdom.hexes?.find(h => h.id === hexId);
    if (hex && hex.claimedBy !== faction) {
      hex.claimedBy = faction;
      claimedHexIds.push(hexId);
      
      // Reveal adjacent hexes (they become explorable)
      const neighbors = getAdjacentHexIds(hex.row, hex.col);
      for (const neighborId of neighbors) {
        const neighborHex = kingdom.hexes?.find(h => h.id === neighborId);
        if (neighborHex && !neighborHex.claimedBy) {
          newlyExploredHexIds.push(neighborId);
        }
      }
    }
  }
  
  // Update kingdom size
  const newSize = kingdom.hexes?.filter(h => h.claimedBy === faction).length || 0;
  kingdom.size = newSize;
  
  return { claimedHexIds, newSize, newlyExploredHexIds };
}

/**
 * Validate that hexes can be claimed
 * 
 * @param kingdom - Kingdom data
 * @param hexIds - Hex IDs to validate
 * @param exploredHexIds - Set of explored hex IDs
 * @param faction - Faction attempting to claim
 * @returns Validation result with valid/invalid hexes
 */
export function validateClaimHexes(
  kingdom: KingdomData,
  hexIds: string[],
  exploredHexIds: Set<string>,
  faction: string = PLAYER_KINGDOM
): { valid: string[]; invalid: Array<{ hexId: string; reason: string }> } {
  const valid: string[] = [];
  const invalid: Array<{ hexId: string; reason: string }> = [];
  
  for (const hexId of hexIds) {
    const hex = kingdom.hexes?.find(h => h.id === hexId);
    
    if (!hex) {
      invalid.push({ hexId, reason: 'Hex not found' });
      continue;
    }
    
    if (hex.claimedBy === faction) {
      invalid.push({ hexId, reason: 'Already claimed by your faction' });
      continue;
    }
    
    if (!exploredHexIds.has(hexId)) {
      invalid.push({ hexId, reason: 'Hex not explored' });
      continue;
    }
    
    // Check adjacency to claimed territory
    const neighbors = getAdjacentHexIds(hex.row, hex.col);
    const isAdjacent = neighbors.some(nId => {
      const nHex = kingdom.hexes?.find(h => h.id === nId);
      return nHex?.claimedBy === faction;
    });
    
    if (!isAdjacent) {
      invalid.push({ hexId, reason: 'Not adjacent to claimed territory' });
      continue;
    }
    
    valid.push(hexId);
  }
  
  return { valid, invalid };
}

