/**
 * ActionHelpers - Shared utilities for action implementations
 * 
 * Common validation, resource checks, and helper functions used across
 * multiple action implementations to maintain DRY principles.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { Settlement } from '../../models/Settlement';
import { SettlementTier } from '../../models/Settlement';
import type { Army } from '../../services/buildQueue/BuildProject';
import { structuresService } from '../../services/structures';
import { logger } from '../../utils/Logger';

/**
 * Result of resource validation
 */
export interface ResourceCheckResult {
  valid: boolean;
  missing?: Map<string, number>;
}

/**
 * Result of capacity check
 */
export interface CapacityCheckResult {
  hasCapacity: boolean;
  current: number;
  max: number;
}

/**
 * Result of imprisonment capacity calculation
 */
export interface ImprisonmentCapacity {
  total: number;
  used: number;
  available: number;
}

/**
 * Generic resolve result for action execution
 */
export interface ResolveResult {
  success: boolean;
  error?: string;
  data?: any;
}

// ============================================================================
// RESOURCE VALIDATION
// ============================================================================

/**
 * Check if kingdom has required resources
 */
export function hasRequiredResources(
  kingdom: KingdomData,
  required: Map<string, number>
): ResourceCheckResult {
  const missing = new Map<string, number>();
  
  for (const [resource, amount] of required.entries()) {
    const current = kingdom.resources?.[resource] || 0;
    if (current < amount) {
      missing.set(resource, amount - current);
    }
  }
  
  return missing.size > 0 
    ? { valid: false, missing } 
    : { valid: true };
}

/**
 * Format missing resources for display
 */
export function formatMissingResources(missing: Map<string, number>): string {
  const parts: string[] = [];
  for (const [resource, amount] of missing.entries()) {
    parts.push(`${amount} ${resource}`);
  }
  return parts.join(', ');
}

// ============================================================================
// SETTLEMENT VALIDATION
// ============================================================================

/**
 * Check if settlement has capacity for more structures
 */
export function hasSettlementCapacity(settlement: Settlement): CapacityCheckResult {
  const maxStructures = getMaxStructuresForTier(settlement.tier);
  const current = settlement.structureIds.length;
  
  return {
    hasCapacity: maxStructures === Infinity || current < maxStructures,
    current,
    max: maxStructures
  };
}

/**
 * Find first settlement with available capacity
 */
export function findSettlementWithCapacity(
  kingdom: KingdomData
): Settlement | null {
  for (const settlement of kingdom.settlements) {
    const check = hasSettlementCapacity(settlement);
    if (check.hasCapacity) {
      return settlement;
    }
  }
  return null;
}

/**
 * Find settlement by ID
 */
export function findSettlementById(
  kingdom: KingdomData,
  settlementId: string
): Settlement | null {
  return kingdom.settlements.find(s => s.id === settlementId) || null;
}

/**
 * Find settlement by name
 */
export function findSettlementByName(
  kingdom: KingdomData,
  settlementName: string
): Settlement | null {
  return kingdom.settlements.find(s => s.name === settlementName) || null;
}

/**
 * Get max structures for settlement tier (internal helper)
 */
function getMaxStructuresForTier(tier: SettlementTier): number {
  switch (tier) {
    case SettlementTier.VILLAGE: return 2;
    case SettlementTier.TOWN: return 4;
    case SettlementTier.CITY: return 8;
    case SettlementTier.METROPOLIS: return Infinity;
    default: return 0;
  }
}

// ============================================================================
// ARMY VALIDATION
// ============================================================================

/**
 * Check if kingdom has any armies
 */
export function hasAvailableArmies(kingdom: KingdomData): boolean {
  return kingdom.armies && kingdom.armies.length > 0;
}

/**
 * Find army by ID
 */
export function findArmyById(
  kingdom: KingdomData,
  armyId: string
): Army | null {
  return kingdom.armies?.find(a => a.id === armyId) || null;
}

/**
 * Find army by name
 */
export function findArmyByName(
  kingdom: KingdomData,
  armyName: string
): Army | null {
  return kingdom.armies?.find(a => a.name === armyName) || null;
}

/**
 * Count armies at or above a certain level
 */
export function countArmiesByLevel(
  kingdom: KingdomData,
  minLevel: number
): number {
  return kingdom.armies?.filter(a => a.level >= minLevel).length || 0;
}

// ============================================================================
// UNREST MANAGEMENT
// ============================================================================

/**
 * Calculate total imprisonment capacity across all settlements
 */
export function calculateImprisonmentCapacity(
  kingdom: KingdomData
): ImprisonmentCapacity {
  let total = 0;
  let used = 0;
  
  for (const settlement of kingdom.settlements) {
    const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
    total += capacity;
    used += settlement.imprisonedUnrest || 0;
  }
  
  return {
    total,
    used,
    available: Math.max(0, total - used)
  };
}

/**
 * Check if kingdom has unrest to arrest
 */
export function hasUnrestToArrest(kingdom: KingdomData): boolean {
  return (kingdom.unrest || 0) > 0;
}

/**
 * Check if kingdom has imprisoned unrest
 */
export function hasImprisonedUnrest(kingdom: KingdomData): boolean {
  return (kingdom.imprisonedUnrest || 0) > 0;
}

/**
 * Find settlements with imprisonment capacity
 */
export function findSettlementsWithImprisonmentCapacity(
  kingdom: KingdomData
): Settlement[] {
  return kingdom.settlements.filter(settlement => {
    const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
    const current = settlement.imprisonedUnrest || 0;
    return capacity > 0 && current < capacity;
  });
}

// ============================================================================
// LEVEL/DC UTILITIES
// ============================================================================

/**
 * Get DC based on kingdom/character level
 */
export function getLevelBasedDC(level: number): number {
  const dcByLevel: Record<number, number> = {
    1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
    6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
    11: 28, 12: 30, 13: 31, 14: 32, 15: 34,
    16: 35, 17: 36, 18: 38, 19: 39, 20: 40
  };
  return dcByLevel[level] || 15;
}

/**
 * Get party level from game actors, with optional fallback
 * @param fallbackLevel - Level to use if no party exists (e.g., acting character's level)
 */
export function getPartyLevel(fallbackLevel?: number): number {
  const game = (globalThis as any).game;
  if (!game?.actors) return fallbackLevel || 1;
  
  // Find party actors and get their level
  const partyActors = Array.from(game.actors).filter((a: any) => 
    a.type === 'character' && a.hasPlayerOwner
  );
  
  if (partyActors.length === 0) return fallbackLevel || 1;
  
  // Use the first party member's level as reference
  return (partyActors[0] as any).level || fallbackLevel || 1;
}

// ============================================================================
// RESULT BUILDERS
// ============================================================================

/**
 * Create a success result
 */
export function createSuccessResult(message: string, data?: any): ResolveResult {
  return {
    success: true,
    data: data ? { ...data, message } : { message }
  };
}

/**
 * Create an error result
 */
export function createErrorResult(error: string): ResolveResult {
  return {
    success: false,
    error
  };
}

// ============================================================================
// TEMPLATE REPLACEMENT
// ============================================================================

/**
 * Replace template placeholders in a string
 * Replaces {key} with corresponding value from replacements object
 * 
 * @param template - String containing {placeholder} tokens
 * @param replacements - Object mapping placeholder names to values
 * @returns String with all placeholders replaced
 * 
 * @example
 * replaceTemplatePlaceholders(
 *   'The {structure} is repaired!',
 *   { structure: 'Prison' }
 * ) // => 'The Prison is repaired!'
 */
export function replaceTemplatePlaceholders(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ============================================================================
// LOGGING HELPERS
// ============================================================================

/**
 * Log action start
 */
export function logActionStart(actionId: string, details?: string): void {
  const msg = details 
    ? `🎬 [Action:${actionId}] Starting: ${details}`
    : `🎬 [Action:${actionId}] Starting...`;

}

/**
 * Log action success
 */
export function logActionSuccess(actionId: string, details?: string): void {
  const msg = details
    ? `✅ [Action:${actionId}] Success: ${details}`
    : `✅ [Action:${actionId}] Completed successfully`;

}

/**
 * Log action error
 */
export function logActionError(actionId: string, error: string | Error): void {
  const errorMsg = error instanceof Error ? error.message : error;
  logger.error(`❌ [Action:${actionId}] Error: ${errorMsg}`);
  if (error instanceof Error && error.stack) {
    logger.error(error.stack);
  }
}

/**
 * Log action warning
 */
export function logActionWarning(actionId: string, warning: string): void {
  logger.warn(`⚠️ [Action:${actionId}] Warning: ${warning}`);
}
