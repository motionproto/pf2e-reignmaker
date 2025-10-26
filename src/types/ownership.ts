/**
 * Shared ownership constants for settlements and hexes
 * Use string-based ownership for clarity and extensibility
 */

/**
 * Player kingdom identifier
 * Use this constant instead of true/1 for player ownership
 */
export const PLAYER_KINGDOM = "player";

/**
 * Type definition for ownership
 * - "player" = Owned by player kingdom
 * - string = Owned by named faction (e.g., "Pitax", "Brevoy")
 * - null = Unowned/neutral
 */
export type OwnershipValue = string | null;
