/**
 * Color definitions for map overlays and visual presentation
 * All PIXI hex color constants and style configurations
 */

/**
 * Terrain overlay colors (PIXI format with alpha)
 * Used for coloring terrain hexes on the map
 */
export const TERRAIN_OVERLAY_COLORS: Record<string, { color: number; alpha: number }> = {
  // Natural terrain
  'plains': { color: 0xFFCC00, alpha: 0.35 },        // Golden yellow/orange (food icon)
  'forest': { color: 0x228B22, alpha: 0.4 },         // Forest green
  'hills': { color: 0xA0826D, alpha: 0.35 },         // Tan brown
  'mountains': { color: 0x9BA5B5, alpha: 0.45 },     // Slate grey (mountain stone)
  'swamp': { color: 0x4A5D23, alpha: 0.45 },         // Dark olive
  'marsh': { color: 0x6B8E23, alpha: 0.4 },          // Olive drab
  'water': { color: 0x1E90FF, alpha: 0.5 },          // Dodger blue (unified for all water bodies)
  'desert': { color: 0xEDC9AF, alpha: 0.35 },        // Desert sand
  'tundra': { color: 0xE0E8F0, alpha: 0.35 },        // Pale blue-grey
  
  // Special terrain
  'ruins': { color: 0x8B8B83, alpha: 0.35 },         // Grey stone
  'cave': { color: 0x2F4F4F, alpha: 0.5 },           // Dark slate grey
  'wasteland': { color: 0x696969, alpha: 0.4 },      // Dim grey
  
  // Default fallback
  'default': { color: 0xCCCCCC, alpha: 0.25 }        // Light grey
};

/**
 * Default hex overlay styles for common use cases
 */
export const MAP_HEX_STYLES = {
  // Kingdom territory fill
  kingdomTerritory: {
    fillColor: 0x4169E1,    // Royal blue
    fillAlpha: 0.3,
    borderWidth: 0          // No border on territory fill
  },
  // Party-claimed territory (used in overlays)
  partyTerritory: {
    fillColor: 0x1E90FF,    // Dodger blue
    fillAlpha: 0.4,
    borderWidth: 0
  },
  // Hex selection during actions
  selection: {
    fillColor: 0xD2691E,    // Chocolate
    fillAlpha: 0.5,
    borderColor: 0xD2691E,
    borderWidth: 2,
    borderAlpha: 0.9
  },
  // General highlight
  highlight: {
    fillColor: 0xFFD700,    // Gold
    fillAlpha: 0.4,
    borderColor: 0xFFD700,
    borderWidth: 3,
    borderAlpha: 1.0
  },
  // Settlement hex highlights
  settlement: {
    fillColor: 0x00FFFF,    // Cyan
    fillAlpha: 0.5,
    borderColor: 0x00FFFF,
    borderWidth: 3,
    borderAlpha: 1.0
  }
} as const;

/**
 * Territory border/outline colors
 */
export const TERRITORY_BORDER_COLORS = {
  // Bright electric blue for territory outlines
  outline: 0x00D4FF,
  outlineAlpha: 1.0
} as const;

/**
 * Road rendering colors
 */
export const ROAD_COLORS = {
  // Road borders and shadows
  roadBorder: 0x000000,      // Black shadow/border
  roadBorderAlpha: 0.6,
  
  // Main road colors
  landRoad: 0x8B4513,        // Brown (dirt/stone roads)
  landRoadAlpha: 0.8,
  
  waterRoad: 0x4FC3F7,       // Light blue (bridges/ferries)
  waterRoadAlpha: 0.8,
  
  // Water crossing borders
  waterBorder: 0x1976D2,     // Darker blue
  waterBorderAlpha: 0.6
} as const;

/**
 * Icon shadow color (used for all map icons)
 */
export const ICON_SHADOW_COLOR = {
  color: 0x000000,           // Black
  alpha: 0.5                 // Semi-transparent
} as const;

/**
 * Terrain difficulty overlay colors (PIXI format with alpha)
 * Used for coloring hexes based on travel difficulty
 */
export const TERRAIN_DIFFICULTY_COLORS: Record<string, { color: number; alpha: number }> = {
  'open': { color: 0x00FF00, alpha: 0.15 },                    // Green - easy travel
  'difficult': { color: 0xFFFF00, alpha: 0.15 },                // Yellow - difficult terrain
  'greater-difficult': { color: 0xDC143C, alpha: 0.15 },       // Crimson - very difficult terrain
  'water': { color: 0x1E90FF, alpha: 0.15 },                    // Blue - water travel
  'default': { color: 0xCCCCCC, alpha: 0.15 }                  // Light grey fallback
};
