/**
 * Cell River Editor Overlay - Shows cell-based river visualization during editing
 *
 * This overlay is used during cell-based river editing mode.
 * It renders the current cell river paths and shows preview during hover.
 *
 * Layers managed:
 * - cell-river-editor: Current cell river paths (blue cells)
 * - cell-river-preview: Hover preview (cyan cells)
 */

import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { LayerId } from '../types';

/**
 * Layer IDs for cell river editor visualization
 * Exported for use by CellRiverEditorHandlers
 */
export const CELL_RIVER_LAYERS: Record<string, LayerId> = {
  grid: 'cell-river-grid',       // Background point grid
  editor: 'cell-river-editor',   // Current river paths
  preview: 'cell-river-preview'  // Hover preview
} as const;

/**
 * Z-indices for cell river layers
 * These ensure proper stacking order during editing
 */
export const CELL_RIVER_Z_INDICES: Record<string, number> = {
  grid: 40,      // Background grid (lowest)
  editor: 45,    // Below movement paths
  preview: 46    // Above editor layer for visibility
};

/**
 * Cell size constant (matches NavigationGrid.CELL_SIZE)
 */
export const CELL_SIZE = 8;

export function createCellRiverEditorOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'cell-river-editor',
    name: 'Cell River Editor (Internal)',
    icon: 'fa-water',
    layerIds: Object.values(CELL_RIVER_LAYERS) as LayerId[],

    // No store/render - layers are controlled by CellRiverEditorHandlers
    // We just need to ensure the layers exist and are visible
    show: async () => {
      // Create all layers with appropriate z-indices
      for (const [key, layerId] of Object.entries(CELL_RIVER_LAYERS)) {
        const zIndex = CELL_RIVER_Z_INDICES[key] ?? 10;
        mapLayer.createLayer(layerId, zIndex);
        mapLayer.showLayer(layerId);
      }
    },

    hide: () => {
      // Clear and hide all layers
      for (const layerId of Object.values(CELL_RIVER_LAYERS)) {
        mapLayer.clearLayer(layerId);
        mapLayer.hideLayer(layerId);
      }
    },

    isActive: () => isOverlayActive('cell-river-editor')
  };
}
