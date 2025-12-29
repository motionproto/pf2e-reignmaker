/**
 * Army Movement Overlay - Shows army movement range and path during deployment
 *
 * This is an interactive overlay used during army movement actions.
 * It doesn't render any data itself - the layers are controlled by ArmyMovementMode.
 * This overlay ensures the layers exist and are properly managed by OverlayManager.
 *
 * Layers managed:
 * - army-movement-origin: Origin hex highlight (green)
 * - army-movement-range: Reachable hexes overlay (light green)
 * - army-movement-path: Path preview lines
 * - army-movement-waypoints: Waypoint markers
 * - army-movement-hover: Hover endpoint indicator (circle/X)
 */

import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { LayerId } from '../types';

/**
 * Layer IDs for army movement visualization
 * Exported for use by ArmyMovementMode
 */
export const ARMY_MOVEMENT_LAYERS: Record<string, LayerId> = {
  origin: 'army-movement-origin',
  range: 'army-movement-range',
  path: 'army-movement-path',
  waypoints: 'army-movement-waypoints',
  hover: 'army-movement-hover',
  cellpath: 'army-movement-cellpath'  // Debug: actual A* cell path
} as const;

/**
 * Z-indices for army movement layers
 * These ensure proper stacking order during movement visualization
 */
export const ARMY_MOVEMENT_Z_INDICES: Record<string, number> = {
  range: 12,      // Below origin, above territory overlays
  origin: 49,     // High visibility for starting position
  path: 48,       // Path lines just below origin
  waypoints: 51,  // Waypoint markers above path
  hover: 50,      // Hover indicator between path and waypoints
  cellpath: 47    // Debug cell path, below regular path
};

export function createArmyMovementOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'army-movement',
    name: 'Army Movement (Internal)',
    icon: 'fa-chess-knight',
    layerIds: Object.values(ARMY_MOVEMENT_LAYERS) as LayerId[],

    // No store/render - these layers are controlled by ArmyMovementMode
    // We just need to ensure the layers exist and are visible
    show: async () => {
      // Create all layers with appropriate z-indices
      for (const [key, layerId] of Object.entries(ARMY_MOVEMENT_LAYERS)) {
        const zIndex = ARMY_MOVEMENT_Z_INDICES[key] ?? 10;
        mapLayer.createLayer(layerId, zIndex);
        mapLayer.showLayer(layerId);
      }
    },

    hide: () => {
      // Clear and hide all layers
      for (const layerId of Object.values(ARMY_MOVEMENT_LAYERS)) {
        mapLayer.clearLayer(layerId);
        mapLayer.hideLayer(layerId);
      }
    },

    isActive: () => isOverlayActive('army-movement')
  };
}
