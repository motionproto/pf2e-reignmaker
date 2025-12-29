/**
 * Cell Lake Editor Overlay - Shows cell-based lake visualization during editing
 *
 * This overlay is used during cell-based lake painting mode.
 * It renders the current lake cells and shows brush preview during hover.
 *
 * Layers managed:
 * - cell-lake-editor: Current lake cells (blue/teal)
 * - cell-lake-preview: Brush preview
 */

import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { LayerId } from '../types';

/**
 * Layer IDs for cell lake editor visualization
 * Exported for use by CellLakeEditorHandlers
 */
export const CELL_LAKE_LAYERS: Record<string, LayerId> = {
  grid: 'cell-lake-grid',       // Background point grid (optional)
  editor: 'cell-lake-editor',   // Current lake cells
  preview: 'cell-lake-preview'  // Brush preview
} as const;

/**
 * Z-indices for cell lake layers
 * These ensure proper stacking order during editing
 */
export const CELL_LAKE_Z_INDICES: Record<string, number> = {
  grid: 39,      // Background grid (below river grid)
  editor: 44,    // Below river editor
  preview: 47    // Above editor layers for visibility
};

/**
 * Cell size constant (matches NavigationGrid.CELL_SIZE)
 */
export const CELL_SIZE = 8;

export function createCellLakeEditorOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'cell-lake-editor',
    name: 'Cell Lake Editor (Internal)',
    icon: 'fa-water',
    layerIds: Object.values(CELL_LAKE_LAYERS) as LayerId[],

    // No store/render - layers are controlled by CellLakeEditorHandlers
    // We just need to ensure the layers exist and are visible
    show: async () => {
      // Create all layers with appropriate z-indices
      for (const [key, layerId] of Object.entries(CELL_LAKE_LAYERS)) {
        const zIndex = CELL_LAKE_Z_INDICES[key] ?? 10;
        mapLayer.createLayer(layerId, zIndex);
        mapLayer.showLayer(layerId);
      }
    },

    hide: () => {
      // Clear and hide all layers
      for (const layerId of Object.values(CELL_LAKE_LAYERS)) {
        mapLayer.clearLayer(layerId);
        mapLayer.hideLayer(layerId);
      }
    },

    isActive: () => isOverlayActive('cell-lake-editor')
  };
}
