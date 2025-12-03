/**
 * Settlement Ownership Utilities
 * 
 * Settlement ownership is derived from the hex the settlement occupies.
 * Single source of truth: hex.claimedBy
 * 
 * This eliminates the need for settlement.ownedBy synchronization.
 */

import type { Settlement } from '../models/Settlement';
import type { OwnershipValue } from '../types/ownership';

/**
 * Get settlement owner from the hex it occupies
 * Single source of truth: hex.claimedBy
 * 
 * @param settlement - The settlement to check ownership for
 * @param hexes - Array of hexes to search
 * @returns The faction/player that owns the hex, or null if unclaimed
 */
export function getSettlementOwner(
  settlement: Settlement, 
  hexes: any[]
): OwnershipValue {
  const hex = hexes.find(h => 
    h.row === settlement.location.x && h.col === settlement.location.y
  );
  return hex?.claimedBy ?? null;
}

/**
 * Check if settlement is owned by a specific faction
 * 
 * @param settlement - The settlement to check
 * @param hexes - Array of hexes to search
 * @param faction - The faction to check ownership against
 * @returns true if the settlement's hex is owned by the faction
 */
export function isSettlementOwnedBy(
  settlement: Settlement,
  hexes: any[],
  faction: string
): boolean {
  return getSettlementOwner(settlement, hexes) === faction;
}

/**
 * Get the hex that a settlement occupies
 * 
 * @param settlement - The settlement to find the hex for
 * @param hexes - Array of hexes to search
 * @returns The hex containing the settlement, or undefined
 */
export function getSettlementHex(
  settlement: Settlement,
  hexes: any[]
): any | undefined {
  return hexes.find(h => 
    h.row === settlement.location.x && h.col === settlement.location.y
  );
}

