/**
 * Type definitions for ReignMaker Map Layer Service
 */

// Import settlement icons
import villageIcon from '../../../img/map_icons/settlement_village.webp';
import townIcon from '../../../img/map_icons/settlement_town.webp';
import cityIcon from '../../../img/map_icons/settlement_city.webp';
import metropolisIcon from '../../../img/map_icons/settlement_metropolis.webp';

// Import worksite icons
import farmIcon from '../../../img/map_icons/worksite_farm.webp';
import lumberIcon from '../../../img/map_icons/worksite_lumber_mill.webp';
import mineIcon from '../../../img/map_icons/worksite_mine.webp';
import quarryIcon from '../../../img/map_icons/worksite_quarry.webp';

// Import resource/commodity icons
import foodIcon from '../../../img/map_icons/commodity_food.webp';
import lumberCommodityIcon from '../../../img/map_icons/commodity_lumber.webp';
import oreIcon from '../../../img/map_icons/commodity_ore.webp';
import stoneIcon from '../../../img/map_icons/commodity_stone.webp';

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
 * Using ES module imports for HMR compatibility
 */
export const WORKSITE_ICONS: Record<string, string> = {
  'Farmstead': farmIcon,
  'Logging Camp': lumberIcon,
  'Mine': mineIcon,
  'Bog Mine': mineIcon, // Reuse mine icon
  'Quarry': quarryIcon,
  'Hunting/Fishing Camp': farmIcon, // Reuse farm icon
  'Oasis Farm': farmIcon // Reuse farm icon
};

/**
 * Resource/Commodity icon mappings
 * Maps worksite types to their corresponding resource production icons
 * Represents what resources the worksites produce
 * Using ES module imports for HMR compatibility
 */
export const RESOURCE_ICONS: Record<string, string> = {
  'Farmstead': foodIcon,
  'Logging Camp': lumberCommodityIcon,
  'Mine': oreIcon,
  'Bog Mine': oreIcon,
  'Quarry': stoneIcon,
  'Hunting/Fishing Camp': foodIcon,
  'Oasis Farm': foodIcon
};

/**
 * Settlement icon mappings
 * Maps settlement tier NAME to appropriate icon
 * Settlement data uses tier names ('Village', 'Town', 'City', 'Metropolis')
 * Using ES module imports for HMR compatibility
 */
export const SETTLEMENT_ICONS: Record<string, string> = {
  'Village': villageIcon,
  'Town': townIcon,
  'City': cityIcon,
  'Metropolis': metropolisIcon
};

/**
 * Terrain type color mappings (visible overlays)
 * Re-exported from presentation.ts for backwards compatibility
 */
export { TERRAIN_OVERLAY_COLORS as TERRAIN_COLORS } from '../../view/kingdom/utils/presentation';
