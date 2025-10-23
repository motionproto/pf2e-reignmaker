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
  | 'settlement-icons'            // Settlement tier icons (village, town, city, metropolis)
  | 'worksites'                   // Worksite icons (farm, mine, quarry, etc.)
  | 'resources'                   // Resource/commodity icons (food, lumber, ore, stone)
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
 * Worksite icon mappings
 * Maps worksite types to their icon image paths
 */
export const WORKSITE_ICONS: Record<string, string> = {
  'Farmstead': 'modules/pf2e-reignmaker/img/map_icons/worksite_farm.webp',
  'Logging Camp': 'modules/pf2e-reignmaker/img/map_icons/worksite_lumber_mill.webp',
  'Mine': 'modules/pf2e-reignmaker/img/map_icons/worksite_mine.webp',
  'Bog Mine': 'modules/pf2e-reignmaker/img/map_icons/worksite_mine.webp', // Reuse mine icon
  'Quarry': 'modules/pf2e-reignmaker/img/map_icons/worksite_quarry.webp',
  'Hunting/Fishing Camp': 'modules/pf2e-reignmaker/img/map_icons/worksite_farm.webp', // Reuse farm icon
  'Oasis Farm': 'modules/pf2e-reignmaker/img/map_icons/worksite_farm.webp' // Reuse farm icon
};

/**
 * Resource/Commodity icon mappings
 * Maps worksite types to their corresponding resource production icons
 * Represents what resources the worksites produce
 */
export const RESOURCE_ICONS: Record<string, string> = {
  'Farmstead': 'modules/pf2e-reignmaker/img/map_icons/commodity_food.webp',
  'Logging Camp': 'modules/pf2e-reignmaker/img/map_icons/commodity_lumber.webp',
  'Mine': 'modules/pf2e-reignmaker/img/map_icons/commodity_ore.webp',
  'Bog Mine': 'modules/pf2e-reignmaker/img/map_icons/commodity_ore.webp',
  'Quarry': 'modules/pf2e-reignmaker/img/map_icons/commodity_stone.webp',
  'Hunting/Fishing Camp': 'modules/pf2e-reignmaker/img/map_icons/commodity_food.webp',
  'Oasis Farm': 'modules/pf2e-reignmaker/img/map_icons/commodity_food.webp'
};

/**
 * Settlement icon mappings
 * Maps settlement tier NAME to appropriate icon
 * Settlement data uses tier names ('Village', 'Town', 'City', 'Metropolis')
 */
export const SETTLEMENT_ICONS: Record<string, string> = {
  'Village': 'modules/pf2e-reignmaker/img/map_icons/settlement_village.webp',
  'Town': 'modules/pf2e-reignmaker/img/map_icons/settlement_town.webp',
  'City': 'modules/pf2e-reignmaker/img/map_icons/settlement_city.webp',
  'Metropolis': 'modules/pf2e-reignmaker/img/map_icons/settlement_metropolis.webp'
};

/**
 * Terrain type color mappings (visible overlays)
 * Colors are balanced to be clearly visible while allowing map details to show through
 */
export const TERRAIN_COLORS: Record<string, { color: number; alpha: number }> = {
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
