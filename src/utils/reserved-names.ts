/**
 * Reserved name validation utility
 * Prevents users from creating kingdoms or factions with system-reserved names
 */

import { PLAYER_KINGDOM } from '../types/ownership';

/**
 * List of reserved names that cannot be used for kingdoms or factions
 */
const RESERVED_NAMES = [PLAYER_KINGDOM]; // ["player"]

/**
 * Check if a name is reserved by the system
 * @param name - Name to check
 * @returns true if the name is reserved
 */
export function isReservedName(name: string): boolean {
  return RESERVED_NAMES.includes(name.toLowerCase().trim());
}

/**
 * Validate a kingdom or faction name
 * @param name - Name to validate
 * @returns Validation result with error message if invalid
 */
export function validateKingdomOrFactionName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  
  if (isReservedName(trimmed)) {
    return { 
      valid: false, 
      error: `"${trimmed}" is a reserved system name. Please choose a different name.` 
    };
  }
  
  return { valid: true };
}
