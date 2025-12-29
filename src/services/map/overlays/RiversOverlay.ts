/**
 * Rivers Overlay - Shows cell-based water (rivers + lakes) from rasterized data
 *
 * Displays water as filled cells on the NavigationGrid (8x8 pixel cells).
 * Reads pre-computed rasterizedCells (rivers) and lakeCells from kingdom data.
 */

import { derived } from 'svelte/store';
import { kingdomData } from '../../../stores/KingdomStore';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { RasterizedCell } from '../../../actors/KingdomActor';
import { logger } from '../../../utils/Logger';

/** Cell size matches NavigationGrid (8 pixels) */
const CELL_SIZE = 8;

/** River display colors */
const RIVER_COLORS = {
  fill: 0x4A90E2,      // Medium blue
  fillAlpha: 0.6,
  border: 0x2E5A8C,    // Darker blue border
  borderAlpha: 0.8
};

/** Lake display colors (slightly different to distinguish from rivers) */
const LAKE_COLORS = {
  fill: 0x20B2AA,      // Light sea green
  fillAlpha: 0.5,
  border: 0x008B8B,    // Dark cyan border
  borderAlpha: 0.6
};

/** Combined water data for the store */
interface WaterCellData {
  riverCells: RasterizedCell[];
  lakeCells: RasterizedCell[];
}

/**
 * Render rasterized river cells
 */
function renderRiverCells(
  layer: PIXI.Container,
  cells: RasterizedCell[]
): void {
  if (cells.length === 0) return;

  const graphics = new PIXI.Graphics();
  graphics.name = 'RiverCells';

  // Draw filled cells
  graphics.beginFill(RIVER_COLORS.fill, RIVER_COLORS.fillAlpha);

  for (const cell of cells) {
    const x = cell.x * CELL_SIZE;
    const y = cell.y * CELL_SIZE;
    graphics.drawRect(x, y, CELL_SIZE, CELL_SIZE);
  }

  graphics.endFill();

  layer.addChild(graphics);
  logger.debug(`[RiversOverlay] Rendered ${cells.length} river cells`);
}

/**
 * Render rasterized lake cells
 */
function renderLakeCells(
  layer: PIXI.Container,
  cells: RasterizedCell[]
): void {
  if (cells.length === 0) return;

  const graphics = new PIXI.Graphics();
  graphics.name = 'LakeCells';

  // Draw filled cells
  graphics.beginFill(LAKE_COLORS.fill, LAKE_COLORS.fillAlpha);

  for (const cell of cells) {
    const x = cell.x * CELL_SIZE;
    const y = cell.y * CELL_SIZE;
    graphics.drawRect(x, y, CELL_SIZE, CELL_SIZE);
  }

  graphics.endFill();

  layer.addChild(graphics);
  logger.debug(`[RiversOverlay] Rendered ${cells.length} lake cells`);
}

export function createRiversOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'rivers',
    name: 'Water (Rivers + Lakes)',
    icon: 'fa-water',
    layerIds: ['rivers'],
    store: derived(kingdomData, $data => ({
      riverCells: $data.rivers?.rasterizedCells || [],
      lakeCells: $data.waterFeatures?.lakeCells || []
    } as WaterCellData)),
    render: async (data: WaterCellData) => {
      // Clear previous content
      mapLayer.clearLayerContent('rivers');

      const { riverCells, lakeCells } = data;
      const totalCells = riverCells.length + lakeCells.length;

      if (totalCells === 0) {
        return;
      }

      // Create layer if needed
      const layer = mapLayer.createLayer('rivers', 25); // Z-index between terrain and roads

      // Render lakes first (below rivers visually, though both are water)
      renderLakeCells(layer, lakeCells);

      // Render rivers on top
      renderRiverCells(layer, riverCells);

      // NOTE: Visibility is controlled by OverlayManager
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('rivers')
  };
}
