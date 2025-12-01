/**
 * Type definitions for Hex Selector Service
 */

/**
 * Type of hex selection action
 */
export type HexSelectionType = 'claim' | 'road' | 'settlement' | 'scout' | 'fortify' | 'unclaim' | 'worksite' | 'destroyed';

/**
 * Color configuration for hex highlighting
 */
export interface ColorConfig {
  color: number;  // Hex color value (e.g., 0xCCCCCC)
  alpha: number;  // Opacity (0-1)
}

/**
 * Custom selector component configuration
 */
export interface CustomSelectorConfig {
  component: any;  // Svelte component constructor
  props?: Record<string, any>;  // Additional props to pass to component
}

/**
 * Validation result with optional custom error message
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;  // Custom error message to show user
}

/**
 * Configuration for hex selection
 */
export interface HexSelectionConfig {
  title: string;              // Panel title (e.g., "Select Hexes to Claim")
  count: number;              // Number of hexes to select
  colorType: HexSelectionType;  // Action type for color coding
  mode?: 'select' | 'display';  // Selection mode: 'select' = interactive (default), 'display' = show only
  existingHexes?: string[];   // Already selected hexes (for highlighting)
  allowToggle?: boolean;      // Allow clicking to deselect (default: true)
  validateHex?: (hexId: string, pendingSelections?: string[]) => boolean | ValidationResult;  // Optional validation function (supports pending selections for chaining)
  customSelector?: CustomSelectorConfig;  // Optional custom component for additional selection (e.g., worksite type)
  getHexInfo?: (hexId: string) => string | null;  // Optional callback to provide hex-specific information (e.g., costs, requirements)
}

/**
 * Color schemes for different action types
 */
export const HEX_HIGHLIGHT_COLORS: Record<string, ColorConfig> = {
  // Base kingdom territory (testing with higher alpha)
  kingdom: { color: 0xFFFFFF, alpha: 0.5 },  // White, testing visibility
  
  // Claim Hexes action
  claimedHex: { color: 0x8B4513, alpha: 0.3 },  // Brown (existing)
  newClaim: { color: 0x90EE90, alpha: 0.7 },    // Light green (selected) - more opaque
  hoverClaim: { color: 0x90EE90, alpha: 0.4 },  // Light green (hover) - less opaque
  
  // Build Roads action
  existingRoad: { color: 0x4B0082, alpha: 0.3 },  // Dark purple
  newRoad: { color: 0x9370DB, alpha: 0.5 },       // Light purple
  hoverRoad: { color: 0xDA70D6, alpha: 0.4 },     // Orchid (hover)
  
  // Settlements (using green like worksite for consistency)
  existingSettlement: { color: 0x8B4513, alpha: 0.3 },  // Brown
  newSettlement: { color: 0x90EE90, alpha: 0.7 },       // Light green (selected) - matches worksite
  hoverSettlement: { color: 0x90EE90, alpha: 0.4 },     // Light green (hover) - matches worksite
  
  // Scout Terrain
  existingScouted: { color: 0x3CB371, alpha: 0.3 },  // Dark green
  newScout: { color: 0x90EE90, alpha: 0.5 },          // Light green
  hoverScout: { color: 0x98FB98, alpha: 0.4 },        // Pale green (hover)
  
  // Fortify Hex
  existingFortification: { color: 0x696969, alpha: 0.3 },  // Dark gray
  newFortify: { color: 0x90EE90, alpha: 0.7 },              // Light green (same as claim)
  hoverFortify: { color: 0x90EE90, alpha: 0.4 },            // Light green (hover)
  
  // Unclaim/Remove Territory (uses same colors as settlement for consistency)
  existingUnclaim: { color: 0xD2691E, alpha: 0.3 },  // Dark orange (same as settlement)
  newUnclaim: { color: 0xFFA500, alpha: 0.5 },        // Light orange (same as settlement)
  hoverUnclaim: { color: 0xFFB347, alpha: 0.4 },      // Light orange hover (same as settlement)
  
  // Worksite Creation
  existingWorksite: { color: 0x8B4513, alpha: 0.3 },  // Brown
  newWorksite: { color: 0x90EE90, alpha: 0.7 },        // Light green (selected) - matches fortify
  hoverWorksite: { color: 0x90EE90, alpha: 0.4 },       // Light green (hover) - matches fortify
  
  // Destroyed/Negative Outcomes (for showing destroyed worksites, damaged structures, etc.)
  existingDestroyed: { color: 0x8B0000, alpha: 0.3 },  // Dark red
  newDestroyed: { color: 0xFF4444, alpha: 0.7 },        // Bright red (selected)
  hoverDestroyed: { color: 0xFF6666, alpha: 0.4 }       // Light red (hover)
};
