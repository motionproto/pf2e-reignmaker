/**
 * Resource Decay Logic - Pure Functions
 * 
 * Handles non-storable resource decay at turn boundaries.
 * Per rules: Lumber, Stone, Ore decay (reset to 0) at start of turn.
 * Gold and Food persist between turns.
 */

import type { KingdomData } from '../../actors/KingdomActor';

export interface DecayResult {
  decayed: {
    lumber: number;
    stone: number;
    ore: number;
  };
  preserved: {
    gold: number;
    food: number;
  };
}

/**
 * Resources that decay (are lost) at the start of each turn
 */
export const DECAYING_RESOURCES = ['lumber', 'stone', 'ore'] as const;

/**
 * Resources that persist between turns
 */
export const PERSISTENT_RESOURCES = ['gold', 'food'] as const;

/**
 * Apply resource decay to kingdom (mutates kingdom)
 * Lumber, Stone, and Ore are reset to 0 at start of turn
 * 
 * @param kingdom - Kingdom data to mutate
 * @returns Decay result showing what was lost and preserved
 */
export function applyResourceDecay(kingdom: KingdomData): DecayResult {
  const result: DecayResult = {
    decayed: { lumber: 0, stone: 0, ore: 0 },
    preserved: { gold: 0, food: 0 }
  };
  
  // Record what we're losing
  result.decayed.lumber = kingdom.resources.lumber || 0;
  result.decayed.stone = kingdom.resources.stone || 0;
  result.decayed.ore = kingdom.resources.ore || 0;
  
  // Record what persists
  result.preserved.gold = kingdom.resources.gold || 0;
  result.preserved.food = kingdom.resources.food || 0;
  
  // Apply decay - reset commodities to 0
  kingdom.resources.lumber = 0;
  kingdom.resources.stone = 0;
  kingdom.resources.ore = 0;
  
  return result;
}

/**
 * Check if a resource decays between turns
 * 
 * @param resource - Resource name
 * @returns True if resource decays
 */
export function doesResourceDecay(resource: string): boolean {
  return DECAYING_RESOURCES.includes(resource as any);
}

/**
 * Check if a resource persists between turns
 * 
 * @param resource - Resource name
 * @returns True if resource persists
 */
export function doesResourcePersist(resource: string): boolean {
  return PERSISTENT_RESOURCES.includes(resource as any);
}

