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
  | 'interactive-hover'           // Interactive hex hover (hex + road preview)
  | 'interactive-selection'       // Interactive hex selection (hex + road connections)
  | 'hex-selection'               // Temporary selections during actions (legacy, use interactive-selection)
  | 'hex-hover'                   // Hover highlight during hex selection (legacy, use interactive-hover)
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
 * Re-exported from presentation.ts for backwards compatibility
 */
export { MAP_HEX_STYLES as DEFAULT_HEX_STYLES } from '../../view/kingdom/utils/presentation';

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
 * Re-exported from presentation.ts for backwards compatibility
 */
export { TERRAIN_OVERLAY_COLORS as TERRAIN_COLORS } from '../../view/kingdom/utils/presentation';
