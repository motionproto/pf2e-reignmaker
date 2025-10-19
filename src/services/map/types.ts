/**
 * Type definitions for ReignMaker Map Layer Service
 */

/**
 * Predefined and custom layer identifiers
 */
export type LayerId = 
  | 'kingdom-territory'  // Scene control toggle for kingdom hexes
  | 'hex-selection'      // Temporary selections during actions
  | 'settlements'        // Settlement markers/sprites
  | 'routes'             // Roads and routes
  | string;              // Custom layer IDs

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
    borderColor: 0x4169E1,
    borderWidth: 2,
    borderAlpha: 0.8
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
