/**
 * Comprehensive Hex Validation Utilities
 * 
 * Centralized validation functions for all hex-selection actions with:
 * - Consistent return format (ValidationResult)
 * - Error handling and logging
 * - Reusable validation patterns
 */

import type { KingdomData } from '../../actors/KingdomActor';
import { getKingdomData } from '../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { worldExplorerService } from '../../services/WorldExplorerService';
import { getAdjacentHexes } from '../../utils/hexUtils';
import { logger } from '../../utils/Logger';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validation function type (matches HexSelectorService expectations)
 */
export type HexValidationFn = (hexId: string, pendingSelections?: string[]) => ValidationResult | boolean;

/**
 * Safe wrapper for validation functions
 * Catches errors and returns user-friendly messages
 */
export function safeValidation(
  validationFn: () => ValidationResult,
  hexId: string,
  context: string
): ValidationResult {
  try {
    return validationFn();
  } catch (error) {
    logger.error(`[HexValidators] Error in ${context} for hex ${hexId}:`, error);
    return {
      valid: false,
      message: 'Validation error occurred. Please try again or report this issue.'
    };
  }
}

/**
 * Get fresh kingdom data (prevents stale data issues)
 */
export function getFreshKingdomData(): KingdomData {
  try {
    return getKingdomData();
  } catch (error) {
    logger.error('[HexValidators] Failed to get kingdom data:', error);
    throw new Error('Kingdom data not available');
  }
}

/**
 * Check if hex is claimed by player kingdom
 */
export function validateClaimed(hexId: string, kingdom?: KingdomData): ValidationResult {
  const k = kingdom || getFreshKingdomData();
  const hex = k.hexes?.find((h: any) => h.id === hexId);
  
  if (!hex) {
    return { valid: false, message: 'Hex not found in kingdom data' };
  }
  
  if (hex.claimedBy !== PLAYER_KINGDOM) {
    return { valid: false, message: 'This hex must be in your claimed territory' };
  }
  
  return { valid: true };
}

/**
 * Check if hex is NOT already claimed by player (for claiming new hexes)
 */
export function validateUnclaimed(hexId: string, kingdom?: KingdomData): ValidationResult {
  const k = kingdom || getFreshKingdomData();
  const hex = k.hexes?.find((h: any) => h.id === hexId);
  
  if (!hex) {
    return { valid: false, message: 'Hex not found in kingdom data' };
  }
  
  if (hex.claimedBy === PLAYER_KINGDOM) {
    return { valid: false, message: 'This hex is already claimed by your kingdom' };
  }
  
  return { valid: true };
}

/**
 * Check if hex is not in pending selections
 */
export function validateNotPending(hexId: string, pendingSelections: string[] = []): ValidationResult {
  if (pendingSelections.includes(hexId)) {
    return { valid: false, message: 'This hex is already selected' };
  }
  return { valid: true };
}

/**
 * Check if hex has been explored (World Explorer integration)
 */
export function validateExplored(hexId: string): ValidationResult {
  if (!worldExplorerService.isAvailable()) {
    // World Explorer not active - allow all hexes (permissive fallback)
    return { valid: true };
  }
  
  try {
    const revealed = worldExplorerService.isRevealed(hexId);
    if (revealed === false) {
      return {
        valid: false,
        message: 'This hex has not been explored yet. Use "Send Scouts" to explore it first.'
      };
    }
    return { valid: true };
  } catch (error) {
    logger.error(`[HexValidators] Error checking exploration status for ${hexId}:`, error);
    return { valid: true }; // Permissive fallback on error
  }
}

/**
 * Check if hex is NOT explored (for scouting)
 */
export function validateUnexplored(hexId: string): ValidationResult {
  if (!worldExplorerService.isAvailable()) {
    return {
      valid: false,
      message: 'World Explorer module is not active on this scene'
    };
  }
  
  try {
    const revealed = worldExplorerService.isRevealed(hexId);
    if (revealed === true) {
      return {
        valid: false,
        message: 'This hex has already been explored'
      };
    }
    return { valid: true };
  } catch (error) {
    logger.error(`[HexValidators] Error checking exploration status for ${hexId}:`, error);
    return { valid: false, message: 'Unable to check exploration status' };
  }
}

/**
 * Check if hex is adjacent to any hex in target list
 */
export function isAdjacentToAny(hexId: string, targetHexIds: string[]): boolean {
  if (targetHexIds.length === 0) return false;
  
  try {
    const [i, j] = hexId.split('.').map(Number);
    const neighbors = getAdjacentHexes(i, j);
    const adjacentIds = neighbors.map((n) => `${n.i}.${n.j}`);
    return adjacentIds.some(id => targetHexIds.includes(id));
  } catch (error) {
    logger.error(`[HexValidators] Error checking adjacency for ${hexId}:`, error);
    return false;
  }
}

/**
 * Validate hex is adjacent to claimed territory (for claiming new hexes)
 */
export function validateAdjacentToClaimed(
  hexId: string,
  pendingClaims: string[] = [],
  kingdom?: KingdomData
): ValidationResult {
  const k = kingdom || getFreshKingdomData();
  
  // Get all currently claimed hexes
  const claimedHexIds = k.hexes
    ?.filter((h: any) => h.claimedBy === PLAYER_KINGDOM)
    .map((h: any) => h.id) || [];
  
  // First claim (bootstrap rule) - any unclaimed, explored hex is valid
  if (claimedHexIds.length === 0 && pendingClaims.length === 0) {
    return { valid: true };
  }
  
  // Must be adjacent to existing claimed OR pending claims
  const allClaimedIds = [...claimedHexIds, ...pendingClaims];
  const isAdjacent = isAdjacentToAny(hexId, allClaimedIds);
  
  if (!isAdjacent) {
    return {
      valid: false,
      message: 'This hex must be adjacent to your existing territory'
    };
  }
  
  return { valid: true };
}

/**
 * Validate hex is adjacent to explored territory (for scouting)
 */
export function validateAdjacentToExplored(
  hexId: string,
  pendingScouts: string[] = []
): ValidationResult {
  if (!worldExplorerService.isAvailable()) {
    return { valid: true }; // Permissive if World Explorer not available
  }
  
  try {
    const [i, j] = hexId.split('.').map(Number);
    const neighbors = getAdjacentHexes(i, j);
    
    const isAdjacentToValid = neighbors.some(neighbor => {
      const neighborId = `${neighbor.i}.${neighbor.j}`;
      
      // Valid if neighbor is already explored
      if (worldExplorerService.isRevealed(neighborId)) return true;
      
      // Valid if neighbor is being explored in this action
      if (pendingScouts.includes(neighborId)) return true;
      
      return false;
    });
    
    if (!isAdjacentToValid) {
      return {
        valid: false,
        message: 'Must be adjacent to explored territory or other scouts'
      };
    }
    
    return { valid: true };
  } catch (error) {
    logger.error(`[HexValidators] Error checking adjacency to explored for ${hexId}:`, error);
    return { valid: false, message: 'Unable to check adjacency' };
  }
}

/**
 * Check if hex has a settlement
 */
export function validateNoSettlement(hexId: string, kingdom?: KingdomData): ValidationResult {
  const k = kingdom || getFreshKingdomData();
  
  const hasSettlement = (k.settlements || []).some((s: any) => {
    if (!s.location || (s.location.x === 0 && s.location.y === 0)) return false;
    const settlementHexId = `${s.location.x}.${s.location.y}`;
    return settlementHexId === hexId;
  });
  
  if (hasSettlement) {
    return { valid: false, message: 'Cannot perform this action in hexes with settlements' };
  }
  
  return { valid: true };
}

/**
 * Composite validator - runs multiple validators in sequence
 * Returns first validation failure, or success if all pass
 */
export function validateAll(
  hexId: string,
  validators: Array<() => ValidationResult>
): ValidationResult {
  for (const validator of validators) {
    const result = validator();
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
