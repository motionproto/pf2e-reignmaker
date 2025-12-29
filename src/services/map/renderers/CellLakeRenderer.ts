/**
 * CellLakeRenderer - Renders cell-based lake areas
 *
 * Draws lakes as filled cells on the NavigationGrid (8x8 pixel cells).
 * Used by the cell-based lake editor for visualization.
 */

import type { RasterizedCell } from '../../../actors/KingdomActor';

/**
 * Colors for cell lake visualization
 */
const CELL_LAKE_COLORS = {
  // Lake cells (editor mode)
  lake: 0x20B2AA,        // Light sea green (slightly different from river blue)
  lakeAlpha: 0.6,

  // Lake cell border
  lakeBorder: 0x008B8B,  // Dark cyan
  lakeBorderAlpha: 0.4,

  // Preview cells (brush preview)
  preview: 0x00CED1,     // Dark turquoise
  previewAlpha: 0.4,

  // Erase preview
  erasePreview: 0xFF6666,
  erasePreviewAlpha: 0.3
};

/**
 * Convert pixel coordinates to cell coordinates
 */
export function pixelToCell(pixelX: number, pixelY: number, cellSize: number): { x: number; y: number } {
  return {
    x: Math.floor(pixelX / cellSize),
    y: Math.floor(pixelY / cellSize)
  };
}

/**
 * Render lake cells
 */
export function renderLakeCells(
  layer: PIXI.Container,
  cells: RasterizedCell[] | Array<{ x: number; y: number }>,
  cellSize: number
): void {
  if (!cells || cells.length === 0) {
    return;
  }

  const graphics = new PIXI.Graphics();
  graphics.name = 'LakeCells';
  graphics.visible = true;

  // Draw filled cells
  graphics.beginFill(CELL_LAKE_COLORS.lake, CELL_LAKE_COLORS.lakeAlpha);
  for (const cell of cells) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize;
    graphics.drawRect(x, y, cellSize, cellSize);
  }
  graphics.endFill();

  // Add thin border
  graphics.lineStyle(1, CELL_LAKE_COLORS.lakeBorder, CELL_LAKE_COLORS.lakeBorderAlpha);
  for (const cell of cells) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize;
    graphics.drawRect(x, y, cellSize, cellSize);
  }
  graphics.lineStyle(0);

  layer.addChild(graphics);
}

/**
 * Render brush preview (cells that would be painted/erased)
 */
export function renderBrushPreview(
  layer: PIXI.Container,
  cells: Array<{ x: number; y: number }>,
  cellSize: number,
  isErasing: boolean = false
): void {
  if (!cells || cells.length === 0) {
    return;
  }

  const graphics = new PIXI.Graphics();
  graphics.name = 'BrushPreview';
  graphics.visible = true;

  const color = isErasing ? CELL_LAKE_COLORS.erasePreview : CELL_LAKE_COLORS.preview;
  const alpha = isErasing ? CELL_LAKE_COLORS.erasePreviewAlpha : CELL_LAKE_COLORS.previewAlpha;

  // Draw preview cells
  graphics.beginFill(color, alpha);
  for (const cell of cells) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize;
    graphics.drawRect(x, y, cellSize, cellSize);
  }
  graphics.endFill();

  // Add border to show brush outline
  graphics.lineStyle(2, isErasing ? 0xFF0000 : 0x00FFFF, 0.8);

  // Draw outer boundary of the brush area (simplified: just draw all cell borders)
  for (const cell of cells) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize;
    graphics.drawRect(x, y, cellSize, cellSize);
  }
  graphics.lineStyle(0);

  layer.addChild(graphics);
}

/**
 * Render a circular brush preview outline
 */
export function renderBrushCircle(
  layer: PIXI.Container,
  centerX: number,
  centerY: number,
  radius: number,
  isErasing: boolean = false
): void {
  const graphics = new PIXI.Graphics();
  graphics.name = 'BrushCircle';
  graphics.visible = true;

  const color = isErasing ? 0xFF0000 : 0x00FFFF;

  // Draw circle outline
  graphics.lineStyle(2, color, 0.8);
  graphics.drawCircle(centerX, centerY, radius);
  graphics.lineStyle(0);

  // Draw filled circle with low alpha
  const fillColor = isErasing ? CELL_LAKE_COLORS.erasePreview : CELL_LAKE_COLORS.preview;
  const fillAlpha = isErasing ? 0.15 : 0.2;
  graphics.beginFill(fillColor, fillAlpha);
  graphics.drawCircle(centerX, centerY, radius);
  graphics.endFill();

  layer.addChild(graphics);
}

/**
 * Get all cells within a circular brush radius
 */
export function getCellsInRadius(
  centerPixelX: number,
  centerPixelY: number,
  radius: number,
  cellSize: number
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  const radiusSq = radius * radius;

  // Calculate bounding box in cell coordinates
  const minCellX = Math.floor((centerPixelX - radius) / cellSize);
  const maxCellX = Math.ceil((centerPixelX + radius) / cellSize);
  const minCellY = Math.floor((centerPixelY - radius) / cellSize);
  const maxCellY = Math.ceil((centerPixelY + radius) / cellSize);

  // Check each cell in the bounding box
  for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
      // Check if cell center is within radius
      const cellCenterX = cellX * cellSize + cellSize / 2;
      const cellCenterY = cellY * cellSize + cellSize / 2;
      const distSq = (centerPixelX - cellCenterX) ** 2 + (centerPixelY - cellCenterY) ** 2;

      if (distSq <= radiusSq) {
        cells.push({ x: cellX, y: cellY });
      }
    }
  }

  return cells;
}

/**
 * Render a point grid for visual reference (optional)
 */
export function renderLakePointGrid(
  layer: PIXI.Container,
  cellSize: number,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  const graphics = new PIXI.Graphics();
  graphics.name = 'LakePointGrid';
  graphics.visible = true;

  // Draw dots at cell intersections
  const dotRadius = 1;
  const dotColor = 0x20B2AA;
  const dotAlpha = 0.2;

  graphics.beginFill(dotColor, dotAlpha);

  const startX = Math.floor(bounds.x / cellSize) * cellSize;
  const startY = Math.floor(bounds.y / cellSize) * cellSize;
  const endX = bounds.x + bounds.width;
  const endY = bounds.y + bounds.height;

  for (let x = startX; x <= endX; x += cellSize) {
    for (let y = startY; y <= endY; y += cellSize) {
      graphics.drawCircle(x, y, dotRadius);
    }
  }

  graphics.endFill();
  layer.addChild(graphics);
}
