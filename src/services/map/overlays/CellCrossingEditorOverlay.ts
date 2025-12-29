/**
 * Cell Crossing Editor Overlay - Shows cell-based crossing/passage visualization during editing
 *
 * This overlay is used during cell-based crossing painting mode.
 * It renders the current passage cells and shows brush preview during hover.
 *
 * Layers managed:
 * - cell-crossing-editor: Current passage cells (green)
 * - cell-crossing-preview: Brush preview
 */

import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { LayerId } from '../types';

/**
 * Layer IDs for cell crossing editor visualization
 * Exported for use by CellCrossingEditorHandlers
 */
export const CELL_CROSSING_LAYERS: Record<string, LayerId> = {
  grid: 'cell-crossing-grid',       // Background point grid (optional)
  editor: 'cell-crossing-editor',   // Current passage cells
  preview: 'cell-crossing-preview'  // Brush preview
} as const;

/**
 * Z-indices for cell crossing layers
 * These ensure proper stacking order during editing
 */
export const CELL_CROSSING_Z_INDICES: Record<string, number> = {
  grid: 48,      // Above lake/river editing
  editor: 49,    // Above lake/river
  preview: 50    // Above editor layers for visibility
};

/**
 * Cell size constant (matches NavigationGrid.CELL_SIZE)
 */
export const CELL_SIZE = 8;

export function createCellCrossingEditorOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'cell-crossing-editor',
    name: 'Cell Crossing Editor (Internal)',
    icon: 'fa-bridge',
    layerIds: Object.values(CELL_CROSSING_LAYERS) as LayerId[],

    // No store/render - layers are controlled by CellCrossingEditorHandlers
    // We just need to ensure the layers exist and are visible
    show: async () => {
      // Create all layers with appropriate z-indices
      for (const [key, layerId] of Object.entries(CELL_CROSSING_LAYERS)) {
        const zIndex = CELL_CROSSING_Z_INDICES[key] ?? 10;
        mapLayer.createLayer(layerId, zIndex);
        mapLayer.showLayer(layerId);
      }
    },

    hide: () => {
      // Clear and hide all layers
      for (const layerId of Object.values(CELL_CROSSING_LAYERS)) {
        mapLayer.clearLayer(layerId);
        mapLayer.hideLayer(layerId);
      }
    },

    isActive: () => isOverlayActive('cell-crossing-editor')
  };
}
