/**
 * Type definitions for Hex Selector Service
 */

/**
 * Type of hex selection action
 */
export type HexSelectionType = 'claim' | 'road' | 'settlement' | 'scout';

/**
 * Color configuration for hex highlighting
 */
export interface ColorConfig {
  color: number;  // Hex color value (e.g., 0xCCCCCC)
  alpha: number;  // Opacity (0-1)
}

/**
 * Configuration for hex selection
 */
export interface HexSelectionConfig {
  title: string;              // Panel title (e.g., "Select Hexes to Claim")
  count: number;              // Number of hexes to select
  colorType: HexSelectionType;  // Action type for color coding
  existingHexes?: string[];   // Already selected hexes (for highlighting)
  allowToggle?: boolean;      // Allow clicking to deselect (default: true)
  validationFn?: (hexId: string, pendingRoads?: string[]) => boolean;  // Optional validation function (supports pending selections for chaining)
}

/**
 * Color schemes for different action types
 */
export const HEX_HIGHLIGHT_COLORS: Record<string, ColorConfig> = {
  // Base kingdom territory (testing with higher alpha)
  kingdom: { color: 0xFFFFFF, alpha: 0.5 },  // White, testing visibility
  
  // Claim Hexes action
  claimedHex: { color: 0x8B4513, alpha: 0.3 },  // Brown (existing)
  newClaim: { color: 0xD2691E, alpha: 0.5 },    // Light brown (new selection)
  hoverClaim: { color: 0xFFD700, alpha: 0.4 },  // Gold (hover)
  
  // Build Roads action
  existingRoad: { color: 0x4B0082, alpha: 0.3 },  // Dark purple
  newRoad: { color: 0x9370DB, alpha: 0.5 },       // Light purple
  hoverRoad: { color: 0xDA70D6, alpha: 0.4 },     // Orchid (hover)
  
  // Settlements
  existingSettlement: { color: 0xD2691E, alpha: 0.3 },  // Dark orange
  newSettlement: { color: 0xFFA500, alpha: 0.5 },       // Light orange
  hoverSettlement: { color: 0xFFB347, alpha: 0.4 },     // Light orange (hover)
  
  // Scout Terrain
  existingScouted: { color: 0x3CB371, alpha: 0.3 },  // Dark green
  newScout: { color: 0x90EE90, alpha: 0.5 },          // Light green
  hoverScout: { color: 0x98FB98, alpha: 0.4 }         // Pale green (hover)
};
