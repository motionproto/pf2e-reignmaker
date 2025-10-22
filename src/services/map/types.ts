/**
 * Type definitions for ReignMaker Map Layer Service
 */

/**
 * Predefined and custom layer identifiers
 */
export type LayerId = 
  | 'terrain-overlay'             // Terrain type coloring (bottom layer)
  | 'kingdom-territory'           // Scene control toggle for kingdom hexes
  | 'kingdom-territory-outline'   // Territory outline border
  | 'hex-selection'               // Temporary selections during actions
  | 'settlements'                 // Settlement markers/sprites
  | 'settlements-overlay'         // Settlement hex highlights (toolbar)
  | 'routes'                      // Road connections (curved lines between road hexes)
  | string;                       // Custom layer IDs

/**
 * Hex rendering style configuration
 */
export interface HexStyle {
  fillColor: number;      // Hex color value (e.g., 0x4169E1)
  fillAlpha: number;      // Fill opacity (0-1)
  borderColor?: number;   // Border color (defaults to fillColor)
  borderWidth?: number;   // Border width in pixels
  borderAlpha?: number;   // Border opacity (defaults to 1.0)
}

/**
 * Internal layer metadata
 */
export interface MapLayer {
  id: LayerId;
  container: PIXI.Container;
  visible: boolean;
  zIndex: number;
}

/**
 * Default hex styles for common use cases
 */
export const DEFAULT_HEX_STYLES = {
  kingdomTerritory: {
    fillColor: 0x4169E1,    // Royal blue
    fillAlpha: 0.3,
    borderWidth: 0          // No border on territory fill
  },
  selection: {
    fillColor: 0xD2691E,    // Chocolate
    fillAlpha: 0.5,
    borderColor: 0xD2691E,
    borderWidth: 2,
    borderAlpha: 0.9
  },
  highlight: {
    fillColor: 0xFFD700,    // Gold
    fillAlpha: 0.4,
    borderColor: 0xFFD700,
    borderWidth: 3,
    borderAlpha: 1.0
  }
} as const;

/**
 * Terrain type color mappings (faint overlays)
 * Colors are subtle to not interfere with other overlays
 */
export const TERRAIN_COLORS: Record<string, { color: number; alpha: number }> = {
  // Natural terrain
  'plains': { color: 0xF4E4C1, alpha: 0.15 },        // Pale wheat
  'forest': { color: 0x228B22, alpha: 0.2 },         // Forest green
  'hills': { color: 0xA0826D, alpha: 0.2 },          // Tan brown
  'mountains': { color: 0x8B7355, alpha: 0.25 },     // Mountain brown
  'swamp': { color: 0x4A5D23, alpha: 0.25 },         // Dark olive
  'marsh': { color: 0x6B8E23, alpha: 0.2 },          // Olive drab
  'water': { color: 0x4682B4, alpha: 0.3 },          // Steel blue
  'lake': { color: 0x4682B4, alpha: 0.3 },           // Steel blue
  'river': { color: 0x4682B4, alpha: 0.25 },         // Steel blue (lighter)
  'desert': { color: 0xEDC9AF, alpha: 0.2 },         // Desert sand
  'tundra': { color: 0xE0E8F0, alpha: 0.2 },         // Pale blue-grey
  
  // Special terrain
  'ruins': { color: 0x8B8B83, alpha: 0.2 },          // Grey stone
  'cave': { color: 0x2F4F4F, alpha: 0.3 },           // Dark slate grey
  'wasteland': { color: 0x696969, alpha: 0.25 },     // Dim grey
  
  // Default fallback
  'default': { color: 0xCCCCCC, alpha: 0.1 }         // Light grey
};
