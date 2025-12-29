/**
 * Water Blocking Overlay - Shows the water blocking grid (rivers + lakes - crossings)
 *
 * Visualizes the computed water blocking state for pathfinding.
 * - Red cells = blocked by river
 * - Blue cells = blocked by lake
 * - Green cells = passage (crossing allows movement)
 */

import { navigationGrid } from '../../pathfinding/NavigationGrid';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import { logger } from '../../../utils/Logger';

export function createNavigationGridDebugOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  console.log('[WaterBlocking] Overlay created');

  return {
    id: 'navigation-grid-debug',
    name: 'Water Blocking',
    icon: 'fa-water',
    layerIds: ['navigation-grid-debug'],

    show: async () => {
      console.log('[WaterBlocking] ========== SHOW CALLED ==========');

      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) {
        console.error('[WaterBlocking] Canvas not available');
        return;
      }

      if (!navigationGrid.isReady()) {
        console.error('[WaterBlocking] Navigation grid not ready');
        return;
      }

      // Clear existing graphics
      mapLayer.clearLayer('navigation-grid-debug');

      // Get all cell types
      const blockedCells = navigationGrid.getBlockedCells();  // Rivers
      const lakeCells = navigationGrid.getLakeCells();        // Lakes
      const passageCells = navigationGrid.getPassageCells();  // Painted crossings/passages
      const crossingCells = navigationGrid.getCrossingCells(); // Legacy crossings
      const stats = navigationGrid.getStats();
      const cellSize = navigationGrid.getCellSize();

      console.log('[WaterBlocking] Stats:', stats);
      console.log('[WaterBlocking] Cell size:', cellSize, 'px');
      console.log('[WaterBlocking] River cells:', blockedCells.size);
      console.log('[WaterBlocking] Lake cells:', lakeCells.size);
      console.log('[WaterBlocking] Passage cells:', passageCells.size);
      console.log('[WaterBlocking] Legacy crossing cells:', crossingCells.size);

      // Create layer
      const layer = mapLayer.createLayer('navigation-grid-debug', 9998);
      const graphics = new PIXI.Graphics();
      graphics.name = 'NavigationGridDebugGraphics';

      // Draw river blocked cells (red)
      for (const cellKey of blockedCells) {
        const pixel = navigationGrid.cellKeyToPixel(cellKey);
        if (!pixel) continue;

        const isAlsoCrossing = crossingCells.has(cellKey);

        if (isAlsoCrossing) {
          // Green for cells that are both blocked AND have a crossing
          graphics.beginFill(0x00FF00, 0.6);
        } else {
          // Red for river blocked cells without crossing
          graphics.beginFill(0xFF0000, 0.5);
        }

        // Draw cell centered on the pixel position
        graphics.drawRect(
          pixel.x - cellSize / 2,
          pixel.y - cellSize / 2,
          cellSize,
          cellSize
        );
        graphics.endFill();
      }

      // Draw lake cells (blue) - painted water blobs
      for (const cellKey of lakeCells) {
        // Skip if also a river cell (avoid double-drawing)
        if (blockedCells.has(cellKey)) continue;

        const pixel = navigationGrid.cellKeyToPixel(cellKey);
        if (!pixel) continue;

        const isAlsoCrossing = crossingCells.has(cellKey);

        if (isAlsoCrossing) {
          // Green for lake cells with crossing
          graphics.beginFill(0x00FF00, 0.6);
        } else {
          // Blue for lake cells
          graphics.beginFill(0x0066FF, 0.5);
        }

        graphics.drawRect(
          pixel.x - cellSize / 2,
          pixel.y - cellSize / 2,
          cellSize,
          cellSize
        );
        graphics.endFill();
      }

      // Draw passage cells (painted crossings) - bright green
      for (const cellKey of passageCells) {
        const pixel = navigationGrid.cellKeyToPixel(cellKey);
        if (!pixel) continue;

        graphics.beginFill(0x00FF00, 0.7); // Bright green for passages
        graphics.drawRect(
          pixel.x - cellSize / 2,
          pixel.y - cellSize / 2,
          cellSize,
          cellSize
        );
        graphics.endFill();
      }

      // Draw legacy crossing cells that aren't blocked (shouldn't normally happen, but for completeness)
      for (const cellKey of crossingCells) {
        if (blockedCells.has(cellKey) || lakeCells.has(cellKey) || passageCells.has(cellKey)) continue; // Already drawn above

        const pixel = navigationGrid.cellKeyToPixel(cellKey);
        if (!pixel) continue;

        graphics.beginFill(0x00FFFF, 0.4); // Cyan for legacy crossing-only cells
        graphics.drawRect(
          pixel.x - cellSize / 2,
          pixel.y - cellSize / 2,
          cellSize,
          cellSize
        );
        graphics.endFill();
      }

      layer.addChild(graphics);
      layer.visible = true;
      layer.alpha = 1.0;
      mapLayer.showLayer('navigation-grid-debug');

      console.log(`[WaterBlocking] Rendered ${blockedCells.size} river, ${lakeCells.size} lake, ${passageCells.size} passage cells (${cellSize}px grid)`);
      logger.info(`[WaterBlocking] ${blockedCells.size} river, ${lakeCells.size} lake, ${passageCells.size} passage (${cellSize}px)`);
    },

    hide: () => {
      console.log('[WaterBlocking] Hide called');
      mapLayer.clearLayer('navigation-grid-debug');
    },

    isActive: () => isOverlayActive('navigation-grid-debug')
  };
}
