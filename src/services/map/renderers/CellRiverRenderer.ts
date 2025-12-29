/**
 * CellRiverRenderer - Renders cell-based river paths
 *
 * Draws rivers as filled cells on the NavigationGrid (8x8 pixel cells).
 * Used by the cell-based river editor for visualization.
 */

import type { CellRiverPath } from '../../../actors/KingdomActor';
import { logger } from '../../../utils/Logger';

/**
 * Colors for cell river visualization
 */
/** River path width in cells (2 cells = 16 pixels) */
const RIVER_WIDTH_CELLS = 2;

const CELL_RIVER_COLORS = {
  // Existing river cells (editor mode)
  river: 0x4A90E2,        // Medium blue
  riverAlpha: 0.7,

  // Active/editing path (clearly distinguishable)
  activeRiver: 0xFF69B4,  // Hot pink
  activeRiverAlpha: 0.8,

  // River path stroke (shows actual raster width)
  pathStroke: 0x4A90E2,   // Medium blue (same as river fill)
  pathStrokeAlpha: 0.5,
  activePathStroke: 0xFF69B4,  // Hot pink
  activePathStrokeAlpha: 0.6,

  // Flow line (connects cells to show path direction)
  flowLine: 0x00BFFF,     // Deep sky blue
  flowLineAlpha: 0.9,
  flowLineWidth: 2,
  activeFlowLine: 0xFF1493,  // Deep pink
  activeFlowLineAlpha: 1.0,

  // Flow arrow
  arrow: 0x00FFFF,        // Cyan
  arrowAlpha: 1.0,
  activeArrow: 0xFFFFFF,  // White (stands out on pink)
  activeArrowAlpha: 1.0,

  // Preview cells (during editing)
  preview: 0x00FFFF,      // Cyan
  previewAlpha: 0.5,

  // Hover preview
  hover: 0x00FFFF,        // Cyan
  hoverAlpha: 0.3
};

/**
 * Render all cell river paths
 * Draws cells as filled squares plus connected polylines showing flow direction
 * @param activePathId - Optional ID of the currently active/editing path (will be rendered in pink)
 */
export function renderCellRiverPaths(
  layer: PIXI.Container,
  cellPaths: CellRiverPath[],
  cellSize: number,  // 8 pixels (NavigationGrid.CELL_SIZE)
  activePathId?: string | null
): void {
  if (!cellPaths || cellPaths.length === 0) {
    return;
  }

  const graphics = new PIXI.Graphics();
  graphics.name = 'CellRiverPaths';
  graphics.visible = true;

  let cellCount = 0;
  const halfCell = cellSize / 2;
  const riverWidth = RIVER_WIDTH_CELLS * cellSize; // 16 pixels for 2 cells

  // Separate paths into inactive and active for layered rendering
  const inactivePaths = cellPaths.filter(p => p.id !== activePathId);
  const activePath = cellPaths.find(p => p.id === activePathId);

  // === INACTIVE PATHS (blue) ===
  // Draw cells
  graphics.beginFill(CELL_RIVER_COLORS.river, CELL_RIVER_COLORS.riverAlpha);
  for (const path of inactivePaths) {
    for (const cell of path.cells) {
      const x = cell.x * cellSize;
      const y = cell.y * cellSize;
      graphics.drawRect(x, y, cellSize, cellSize);
      cellCount++;
    }
  }
  graphics.endFill();

  // Add thin border for inactive cells
  graphics.lineStyle(1, 0x00008B, 0.5); // Dark blue border
  for (const path of inactivePaths) {
    for (const cell of path.cells) {
      const x = cell.x * cellSize;
      const y = cell.y * cellSize;
      graphics.drawRect(x, y, cellSize, cellSize);
    }
  }

  // Draw thick path stroke for inactive paths
  for (const path of inactivePaths) {
    if (path.cells.length < 2) continue;
    const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);
    graphics.lineStyle(riverWidth, CELL_RIVER_COLORS.pathStroke, CELL_RIVER_COLORS.pathStrokeAlpha);
    graphics.moveTo(sortedCells[0].x * cellSize + halfCell, sortedCells[0].y * cellSize + halfCell);
    for (let i = 1; i < sortedCells.length; i++) {
      graphics.lineTo(sortedCells[i].x * cellSize + halfCell, sortedCells[i].y * cellSize + halfCell);
    }
  }

  // Draw flow lines for inactive paths
  for (const path of inactivePaths) {
    if (path.cells.length < 2) continue;
    const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);
    graphics.lineStyle(CELL_RIVER_COLORS.flowLineWidth, CELL_RIVER_COLORS.flowLine, CELL_RIVER_COLORS.flowLineAlpha);
    graphics.moveTo(sortedCells[0].x * cellSize + halfCell, sortedCells[0].y * cellSize + halfCell);
    for (let i = 1; i < sortedCells.length; i++) {
      graphics.lineTo(sortedCells[i].x * cellSize + halfCell, sortedCells[i].y * cellSize + halfCell);
    }
    drawFlowArrows(graphics, sortedCells, cellSize, false);
  }

  // === ACTIVE PATH (pink) ===
  if (activePath) {
    // Draw cells
    graphics.beginFill(CELL_RIVER_COLORS.activeRiver, CELL_RIVER_COLORS.activeRiverAlpha);
    for (const cell of activePath.cells) {
      const x = cell.x * cellSize;
      const y = cell.y * cellSize;
      graphics.drawRect(x, y, cellSize, cellSize);
      cellCount++;
    }
    graphics.endFill();

    // Add thin border for active cells (darker pink)
    graphics.lineStyle(1, 0xC71585, 0.7); // Medium violet red border
    for (const cell of activePath.cells) {
      const x = cell.x * cellSize;
      const y = cell.y * cellSize;
      graphics.drawRect(x, y, cellSize, cellSize);
    }

    // Draw thick path stroke
    if (activePath.cells.length >= 2) {
      const sortedCells = [...activePath.cells].sort((a, b) => a.order - b.order);
      graphics.lineStyle(riverWidth, CELL_RIVER_COLORS.activePathStroke, CELL_RIVER_COLORS.activePathStrokeAlpha);
      graphics.moveTo(sortedCells[0].x * cellSize + halfCell, sortedCells[0].y * cellSize + halfCell);
      for (let i = 1; i < sortedCells.length; i++) {
        graphics.lineTo(sortedCells[i].x * cellSize + halfCell, sortedCells[i].y * cellSize + halfCell);
      }

      // Draw flow line
      graphics.lineStyle(CELL_RIVER_COLORS.flowLineWidth, CELL_RIVER_COLORS.activeFlowLine, CELL_RIVER_COLORS.activeFlowLineAlpha);
      graphics.moveTo(sortedCells[0].x * cellSize + halfCell, sortedCells[0].y * cellSize + halfCell);
      for (let i = 1; i < sortedCells.length; i++) {
        graphics.lineTo(sortedCells[i].x * cellSize + halfCell, sortedCells[i].y * cellSize + halfCell);
      }

      // Draw flow arrows
      drawFlowArrows(graphics, sortedCells, cellSize, true);
    }
  }

  layer.addChild(graphics);
  logger.debug(`[CellRiverRenderer] Rendered ${cellCount} cells from ${cellPaths.length} paths (active: ${activePathId || 'none'})`);
}

/**
 * Draw flow direction arrows along a path
 * Places arrows every N cells to show direction of flow
 * @param isActive - Whether this is the active/editing path (uses different colors)
 */
function drawFlowArrows(
  graphics: PIXI.Graphics,
  sortedCells: Array<{ x: number; y: number; order: number }>,
  cellSize: number,
  isActive: boolean = false
): void {
  if (sortedCells.length < 2) return;

  const halfCell = cellSize / 2;
  const arrowSize = cellSize * 0.6;

  // Place arrows every 5 cells (or at least one at the end)
  const arrowInterval = 5;

  for (let i = 1; i < sortedCells.length; i++) {
    // Draw arrow at intervals and always at the last cell
    if (i % arrowInterval !== 0 && i !== sortedCells.length - 1) continue;

    const prevCell = sortedCells[i - 1];
    const currCell = sortedCells[i];

    // Calculate center positions
    const prevX = prevCell.x * cellSize + halfCell;
    const prevY = prevCell.y * cellSize + halfCell;
    const currX = currCell.x * cellSize + halfCell;
    const currY = currCell.y * cellSize + halfCell;

    // Calculate direction vector
    const dx = currX - prevX;
    const dy = currY - prevY;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) continue;

    // Normalize direction
    const nx = dx / length;
    const ny = dy / length;

    // Arrow tip position (at current cell center)
    const tipX = currX;
    const tipY = currY;

    // Arrow wings (perpendicular to direction)
    const wingX = -ny * arrowSize * 0.5;
    const wingY = nx * arrowSize * 0.5;

    // Arrow base (behind tip)
    const baseX = tipX - nx * arrowSize;
    const baseY = tipY - ny * arrowSize;

    // Draw filled arrow
    graphics.lineStyle(0);
    const arrowColor = isActive ? CELL_RIVER_COLORS.activeArrow : CELL_RIVER_COLORS.arrow;
    const arrowAlpha = isActive ? CELL_RIVER_COLORS.activeArrowAlpha : CELL_RIVER_COLORS.arrowAlpha;
    graphics.beginFill(arrowColor, arrowAlpha);

    graphics.moveTo(tipX, tipY);
    graphics.lineTo(baseX + wingX, baseY + wingY);
    graphics.lineTo(baseX - wingX, baseY - wingY);
    graphics.lineTo(tipX, tipY);

    graphics.endFill();
  }
}

/**
 * Render cell preview during editing
 * Shows cells that will be added on click
 */
export function renderCellPreview(
  layer: PIXI.Container,
  cells: Array<{ x: number; y: number }>,
  cellSize: number,
  color: number = CELL_RIVER_COLORS.preview,
  alpha: number = CELL_RIVER_COLORS.previewAlpha
): void {
  if (!cells || cells.length === 0) {
    return;
  }

  const graphics = new PIXI.Graphics();
  graphics.name = 'CellPreview';
  graphics.visible = true;

  // Draw preview cells
  graphics.beginFill(color, alpha);

  for (const cell of cells) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize;
    graphics.drawRect(x, y, cellSize, cellSize);
  }

  graphics.endFill();

  // Add bright border for visibility
  graphics.lineStyle(2, color, 1.0);
  for (const cell of cells) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize;
    graphics.drawRect(x, y, cellSize, cellSize);
  }

  layer.addChild(graphics);
}

/**
 * Render hover preview (3-cell cross pattern)
 * Shows the pattern that will be placed on click
 */
export function renderCellHoverPreview(
  layer: PIXI.Container,
  centerCell: { x: number; y: number },
  cellSize: number
): void {
  // Get the 3-cell cross pattern (center + 4 cardinals)
  const pattern = getCrossPattern(centerCell.x, centerCell.y);

  renderCellPreview(
    layer,
    pattern,
    cellSize,
    CELL_RIVER_COLORS.hover,
    CELL_RIVER_COLORS.hoverAlpha
  );
}

/**
 * Get 3-cell cross pattern (center + 4 cardinal neighbors)
 * This is the pattern placed on each click
 */
export function getCrossPattern(cellX: number, cellY: number): Array<{ x: number; y: number }> {
  return [
    { x: cellX, y: cellY },         // Center
    { x: cellX, y: cellY - 1 },     // North
    { x: cellX + 1, y: cellY },     // East
    { x: cellX, y: cellY + 1 },     // South
    { x: cellX - 1, y: cellY },     // West
  ];
}

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
 * Render a point grid showing clickable cell positions
 * Shows small dots at each cell center within the visible viewport
 */
export function renderCellPointGrid(
  layer: PIXI.Container,
  cellSize: number,
  viewportBounds: { x: number; y: number; width: number; height: number }
): void {
  const graphics = new PIXI.Graphics();
  graphics.name = 'CellPointGrid';
  graphics.visible = true;

  // Grid point style
  const dotRadius = 1.5;
  const dotColor = 0x4A90E2;  // Blue
  const dotAlpha = 0.4;

  // Calculate cell range to render based on viewport
  const startCellX = Math.floor(viewportBounds.x / cellSize);
  const startCellY = Math.floor(viewportBounds.y / cellSize);
  const endCellX = Math.ceil((viewportBounds.x + viewportBounds.width) / cellSize);
  const endCellY = Math.ceil((viewportBounds.y + viewportBounds.height) / cellSize);

  const halfCell = cellSize / 2;

  graphics.beginFill(dotColor, dotAlpha);

  for (let cellX = startCellX; cellX <= endCellX; cellX++) {
    for (let cellY = startCellY; cellY <= endCellY; cellY++) {
      const x = cellX * cellSize + halfCell;
      const y = cellY * cellSize + halfCell;
      graphics.drawCircle(x, y, dotRadius);
    }
  }

  graphics.endFill();

  layer.addChild(graphics);
  logger.debug(`[CellRiverRenderer] Rendered point grid: ${(endCellX - startCellX) * (endCellY - startCellY)} points`);
}
