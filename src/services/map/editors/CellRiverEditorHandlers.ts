/**
 * CellRiverEditorHandlers - Cell-based river editing functionality
 *
 * Draws river polylines on the NavigationGrid.
 * - Click to add points to the current path
 * - Double-click to finish the path
 * - Paths are polylines; nav cells are derived by rasterizing
 */

import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import { CELL_RIVER_LAYERS, CELL_RIVER_Z_INDICES, CELL_SIZE } from '../overlays/CellRiverEditorOverlay';
import {
  renderCellRiverPaths,
  renderCellPreview,
  renderCellPointGrid,
  pixelToCell
} from '../renderers/CellRiverRenderer';
import { logger } from '../../../utils/Logger';
import type { CellRiverPath, CellRiverPoint, RasterizedCell } from '../../../actors/KingdomActor';

export class CellRiverEditorHandlers {
  // Current path being drawn
  private currentPathId: string | null = null;
  private currentPathOrder: number = 0;

  // Reshape mode state
  private reshapingPathId: string | null = null;
  private reshapeInsertAfterOrder: number = 0;
  private reshapeInsertBeforeOrder: number = 0;
  private reshapePointCount: number = 0;

  // Vertex move state
  private movingVertexPathId: string | null = null;
  private movingVertexOrder: number = 0;
  private movingVertexOriginalX: number = 0;
  private movingVertexOriginalY: number = 0;

  // Map layer reference
  private mapLayer: ReignMakerMapLayer | null = null;

  /**
   * Get map layer instance (lazy loaded)
   */
  private getMapLayer(): ReignMakerMapLayer {
    if (!this.mapLayer) {
      this.mapLayer = ReignMakerMapLayer.getInstance();
    }
    return this.mapLayer;
  }

  /**
   * Handle cell river click - adds a single point to the current polyline path
   * Note: Endpoint detection is now handled in EditorModeService before this is called
   */
  async handleCellRiverClick(pixelX: number, pixelY: number): Promise<void> {
    // Convert pixel to cell coordinates
    const cell = pixelToCell(pixelX, pixelY, CELL_SIZE);

    logger.info(`[CellRiverEditor] Click at pixel (${pixelX}, ${pixelY}) -> cell (${cell.x}, ${cell.y})`);

    // Start a new path if we don't have one
    if (!this.currentPathId) {
      this.startNewPath();
    }

    // Add point to current path
    await updateKingdom((kingdom) => {
      // Ensure rivers.cellPaths exists
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [] };
      }
      if (!kingdom.rivers.cellPaths) {
        kingdom.rivers.cellPaths = [];
      }

      // Find or create current path
      let path = kingdom.rivers.cellPaths.find(p => p.id === this.currentPathId);
      if (!path) {
        path = {
          id: this.currentPathId!,
          cells: [],
          navigable: true
        };
        kingdom.rivers.cellPaths.push(path);
      }

      // Check if this exact cell already exists in this path (avoid duplicates)
      const exists = path.cells.some(c => c.x === cell.x && c.y === cell.y);
      if (!exists) {
        this.currentPathOrder += 10;
        path.cells.push({
          x: cell.x,
          y: cell.y,
          order: this.currentPathOrder
        });
        logger.info(`[CellRiverEditor] Added point to path ${this.currentPathId}, total points: ${path.cells.length}`);
      }
    });

    // Re-render the editor layer
    this.renderEditorLayer();
  }

  /**
   * Handle mouse move - show hover preview (single cell + line from last point)
   */
  handleCellRiverMove(pixelX: number, pixelY: number): void {
    const mapLayer = this.getMapLayer();

    // Clear previous preview
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.preview);

    // Get cell at cursor
    const hoverCell = pixelToCell(pixelX, pixelY, CELL_SIZE);

    // Create preview layer
    const previewLayer = mapLayer.createLayer(
      CELL_RIVER_LAYERS.preview,
      CELL_RIVER_Z_INDICES.preview
    );

    // Draw single cell preview
    renderCellPreview(previewLayer, [hoverCell], CELL_SIZE, 0x00FFFF, 0.4);

    // If we have a current path with points, draw line from last point to cursor
    if (this.currentPathId) {
      const kingdom = getKingdomData();
      const path = kingdom.rivers?.cellPaths?.find(p => p.id === this.currentPathId);
      if (path && path.cells.length > 0) {
        const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);
        const lastCell = sortedCells[sortedCells.length - 1];

        const graphics = new PIXI.Graphics();
        graphics.name = 'PreviewLine';

        const halfCell = CELL_SIZE / 2;
        const lastX = lastCell.x * CELL_SIZE + halfCell;
        const lastY = lastCell.y * CELL_SIZE + halfCell;
        const hoverX = hoverCell.x * CELL_SIZE + halfCell;
        const hoverY = hoverCell.y * CELL_SIZE + halfCell;

        // Draw dashed line from last point to hover
        graphics.lineStyle(2, 0x00FFFF, 0.6);
        graphics.moveTo(lastX, lastY);
        graphics.lineTo(hoverX, hoverY);

        previewLayer.addChild(graphics);
      }
    }

    mapLayer.showLayer(CELL_RIVER_LAYERS.preview);
  }

  /**
   * Clear hover preview
   */
  clearHoverPreview(): void {
    const mapLayer = this.getMapLayer();
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.preview);
  }

  /**
   * Find a nearby endpoint of an existing path
   * Returns path info if cursor is within threshold of a path's start or end point
   */
  findNearbyEndpoint(pixelX: number, pixelY: number, threshold: number = 12): {
    pathId: string;
    endpoint: 'start' | 'end';
    minOrder: number;
    maxOrder: number;
  } | null {
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    let closest: { pathId: string; endpoint: 'start' | 'end'; minOrder: number; maxOrder: number } | null = null;
    let minDistance = Infinity;

    for (const path of cellPaths) {
      if (path.cells.length === 0) continue;

      const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);
      const pathMinOrder = sortedCells[0].order;
      const pathMaxOrder = sortedCells[sortedCells.length - 1].order;

      // Check start endpoint (lowest order)
      const startCell = sortedCells[0];
      const startPixelX = startCell.x * CELL_SIZE + CELL_SIZE / 2;
      const startPixelY = startCell.y * CELL_SIZE + CELL_SIZE / 2;
      const startDist = Math.sqrt((pixelX - startPixelX) ** 2 + (pixelY - startPixelY) ** 2);

      if (startDist < threshold && startDist < minDistance) {
        minDistance = startDist;
        closest = {
          pathId: path.id,
          endpoint: 'start',
          minOrder: pathMinOrder,
          maxOrder: pathMaxOrder
        };
      }

      // Check end endpoint (highest order)
      const endCell = sortedCells[sortedCells.length - 1];
      const endPixelX = endCell.x * CELL_SIZE + CELL_SIZE / 2;
      const endPixelY = endCell.y * CELL_SIZE + CELL_SIZE / 2;
      const endDist = Math.sqrt((pixelX - endPixelX) ** 2 + (pixelY - endPixelY) ** 2);

      if (endDist < threshold && endDist < minDistance) {
        minDistance = endDist;
        closest = {
          pathId: path.id,
          endpoint: 'end',
          minOrder: pathMinOrder,
          maxOrder: pathMaxOrder
        };
      }
    }

    return closest;
  }

  /**
   * Continue drawing from an existing endpoint
   * If extending from the END, new points get higher order values
   * If extending from the START, we reverse the path first so new points append correctly
   */
  async continueFromEndpoint(endpoint: {
    pathId: string;
    endpoint: 'start' | 'end';
    minOrder: number;
    maxOrder: number;
  }): Promise<void> {
    this.currentPathId = endpoint.pathId;

    if (endpoint.endpoint === 'end') {
      // Extending from the end - new points will have higher order values
      this.currentPathOrder = endpoint.maxOrder;
      logger.info(`[CellRiverEditor] Continuing from END of path ${endpoint.pathId}, order starts at ${this.currentPathOrder}`);
    } else {
      // Extending from the start - reverse the path so the "start" becomes the "end"
      // This way new points will be added with increasing order values at the correct end
      await this.reversePathOrder(endpoint.pathId);
      // After reversing, the old start (low order) is now the end (high order)
      this.currentPathOrder = endpoint.maxOrder; // This is now the highest after reversal
      logger.info(`[CellRiverEditor] Continuing from START of path ${endpoint.pathId} (reversed), order starts at ${this.currentPathOrder}`);
    }
  }

  /**
   * Reverse the order of all points in a path
   * Used when extending from the start endpoint
   */
  private async reversePathOrder(pathId: string): Promise<void> {
    await updateKingdom((kingdom) => {
      if (!kingdom.rivers?.cellPaths) return;

      const path = kingdom.rivers.cellPaths.find(p => p.id === pathId);
      if (!path || path.cells.length === 0) return;

      // Get current order values sorted
      const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);
      const orders = sortedCells.map(c => c.order);

      // Reverse assign orders - first cell gets last order, etc.
      for (let i = 0; i < sortedCells.length; i++) {
        const cell = path.cells.find(c => c.x === sortedCells[i].x && c.y === sortedCells[i].y);
        if (cell) {
          cell.order = orders[sortedCells.length - 1 - i];
        }
      }
    });

    this.renderEditorLayer();
  }

  /**
   * Find a nearby segment of an existing path
   * Returns segment info if cursor is within threshold of a path segment
   */
  findNearbySegment(pixelX: number, pixelY: number, threshold: number = 12): {
    pathId: string;
    insertAfterOrder: number;
    insertBeforeOrder: number;
  } | null {
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    let closest: { pathId: string; insertAfterOrder: number; insertBeforeOrder: number } | null = null;
    let minDistance = Infinity;

    for (const path of cellPaths) {
      if (path.cells.length < 2) continue;

      const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);

      // Check distance to each segment
      for (let i = 0; i < sortedCells.length - 1; i++) {
        const p1 = sortedCells[i];
        const p2 = sortedCells[i + 1];

        const dist = this.pointToSegmentDistance(
          pixelX,
          pixelY,
          p1.x * CELL_SIZE + CELL_SIZE / 2,
          p1.y * CELL_SIZE + CELL_SIZE / 2,
          p2.x * CELL_SIZE + CELL_SIZE / 2,
          p2.y * CELL_SIZE + CELL_SIZE / 2
        );

        if (dist < threshold && dist < minDistance) {
          minDistance = dist;
          closest = {
            pathId: path.id,
            insertAfterOrder: p1.order,
            insertBeforeOrder: p2.order
          };
        }
      }
    }

    return closest;
  }

  /**
   * Calculate distance from a point to a line segment
   */
  private pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

    // Project point onto line
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    // Find closest point on segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  }

  /**
   * Find any path near the given position (for click-to-select)
   * Returns the path ID if cursor is within threshold of any path
   */
  findNearbyPath(pixelX: number, pixelY: number, threshold: number = 16): string | null {
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    let closestPathId: string | null = null;
    let minDistance = Infinity;

    for (const path of cellPaths) {
      // Check distance to each cell in the path
      for (const cell of path.cells) {
        const cellCenterX = cell.x * CELL_SIZE + CELL_SIZE / 2;
        const cellCenterY = cell.y * CELL_SIZE + CELL_SIZE / 2;
        const dist = Math.sqrt((pixelX - cellCenterX) ** 2 + (pixelY - cellCenterY) ** 2);

        if (dist < threshold && dist < minDistance) {
          minDistance = dist;
          closestPathId = path.id;
        }
      }
    }

    return closestPathId;
  }

  /**
   * Select a path without starting to draw
   * Used for click-to-select functionality
   */
  selectPath(pathId: string): void {
    this.currentPathId = pathId;

    // Find the max order in this path so new points continue correctly
    const kingdom = getKingdomData();
    const path = kingdom.rivers?.cellPaths?.find(p => p.id === pathId);
    if (path && path.cells.length > 0) {
      const maxOrder = Math.max(...path.cells.map(c => c.order));
      this.currentPathOrder = maxOrder;
    } else {
      this.currentPathOrder = 0;
    }

    logger.info(`[CellRiverEditor] Selected path ${pathId}`);
    this.renderEditorLayer();
  }

  /**
   * Deselect the current path (click on empty space)
   */
  deselectPath(): void {
    if (this.currentPathId) {
      logger.info(`[CellRiverEditor] Deselected path ${this.currentPathId}`);
      this.currentPathId = null;
      this.currentPathOrder = 0;
      this.renderEditorLayer();
    }
  }

  /**
   * Find a vertex near the given position on the active path
   * Returns vertex info if cursor is within threshold of a vertex
   */
  findNearbyVertex(pixelX: number, pixelY: number, threshold: number = 12): {
    pathId: string;
    cellX: number;
    cellY: number;
    order: number;
  } | null {
    if (!this.currentPathId) return null;

    const kingdom = getKingdomData();
    const path = kingdom.rivers?.cellPaths?.find(p => p.id === this.currentPathId);
    if (!path) return null;

    let closest: { pathId: string; cellX: number; cellY: number; order: number } | null = null;
    let minDistance = Infinity;

    for (const cell of path.cells) {
      const cellCenterX = cell.x * CELL_SIZE + CELL_SIZE / 2;
      const cellCenterY = cell.y * CELL_SIZE + CELL_SIZE / 2;
      const dist = Math.sqrt((pixelX - cellCenterX) ** 2 + (pixelY - cellCenterY) ** 2);

      if (dist < threshold && dist < minDistance) {
        minDistance = dist;
        closest = {
          pathId: this.currentPathId,
          cellX: cell.x,
          cellY: cell.y,
          order: cell.order
        };
      }
    }

    return closest;
  }

  /**
   * Start moving a vertex
   */
  startVertexMove(vertex: { pathId: string; cellX: number; cellY: number; order: number }): void {
    this.movingVertexPathId = vertex.pathId;
    this.movingVertexOrder = vertex.order;
    this.movingVertexOriginalX = vertex.cellX;
    this.movingVertexOriginalY = vertex.cellY;
    logger.info(`[CellRiverEditor] Started moving vertex at (${vertex.cellX}, ${vertex.cellY})`);
  }

  /**
   * Check if currently moving a vertex
   */
  isMovingVertex(): boolean {
    return this.movingVertexPathId !== null;
  }

  /**
   * Update vertex position during drag
   */
  async updateVertexPosition(pixelX: number, pixelY: number): Promise<void> {
    if (!this.movingVertexPathId) return;

    const newCell = pixelToCell(pixelX, pixelY, CELL_SIZE);

    await updateKingdom((kingdom) => {
      if (!kingdom.rivers?.cellPaths) return;

      const path = kingdom.rivers.cellPaths.find(p => p.id === this.movingVertexPathId);
      if (!path) return;

      // Find the vertex being moved by order
      const vertex = path.cells.find(c => c.order === this.movingVertexOrder);
      if (vertex) {
        vertex.x = newCell.x;
        vertex.y = newCell.y;
      }
    });

    this.renderEditorLayer();
  }

  /**
   * Finish moving a vertex
   */
  finishVertexMove(): void {
    if (this.movingVertexPathId) {
      logger.info(`[CellRiverEditor] Finished moving vertex`);
    }
    this.movingVertexPathId = null;
    this.movingVertexOrder = 0;
    this.movingVertexOriginalX = 0;
    this.movingVertexOriginalY = 0;
  }

  /**
   * Start reshaping a segment - removes cells between two points
   * and prepares to insert new cells
   */
  async startReshapeSegment(pathId: string, afterOrder: number, beforeOrder: number): Promise<void> {
    this.reshapingPathId = pathId;
    this.reshapeInsertAfterOrder = afterOrder;
    this.reshapeInsertBeforeOrder = beforeOrder;
    this.reshapePointCount = 0;

    // Remove cells between the two orders (the segment being replaced)
    await updateKingdom((kingdom) => {
      const path = kingdom.rivers?.cellPaths?.find(p => p.id === pathId);
      if (path) {
        // Keep only cells outside the segment being replaced
        path.cells = path.cells.filter(c =>
          c.order <= afterOrder || c.order >= beforeOrder
        );
      }
    });

    logger.info(`[CellRiverEditor] Started reshape on path ${pathId}, segment ${afterOrder}-${beforeOrder}`);
    this.renderEditorLayer();
  }

  /**
   * Add a point during reshape mode
   * Calculates order value between the segment endpoints
   */
  async addReshapePoint(pixelX: number, pixelY: number): Promise<void> {
    if (!this.reshapingPathId) return;

    const cell = pixelToCell(pixelX, pixelY, CELL_SIZE);

    // Calculate interpolated order between afterOrder and beforeOrder
    this.reshapePointCount++;
    const totalRange = this.reshapeInsertBeforeOrder - this.reshapeInsertAfterOrder;
    const fraction = this.reshapePointCount / (this.reshapePointCount + 1);
    const newOrder = this.reshapeInsertAfterOrder + (totalRange * fraction);

    await updateKingdom((kingdom) => {
      const path = kingdom.rivers?.cellPaths?.find(p => p.id === this.reshapingPathId);
      if (!path) return;

      // Check if cell already exists in this path
      const exists = path.cells.some(c => c.x === cell.x && c.y === cell.y);
      if (!exists) {
        path.cells.push({
          x: cell.x,
          y: cell.y,
          order: newOrder
        });
      }
    });

    this.renderEditorLayer();
  }

  /**
   * Check if currently in reshape mode
   */
  isReshaping(): boolean {
    return this.reshapingPathId !== null;
  }

  /**
   * Finish reshaping and clean up state
   */
  finishReshape(): void {
    if (this.reshapingPathId) {
      logger.info(`[CellRiverEditor] Finished reshape on path ${this.reshapingPathId}`);
    }
    this.reshapingPathId = null;
    this.reshapeInsertAfterOrder = 0;
    this.reshapeInsertBeforeOrder = 0;
    this.reshapePointCount = 0;
  }

  /**
   * Remove the last point from a path near the given position
   * Used with Alt/Cmd+Click to undo points
   */
  async removeLastPointNear(pixelX: number, pixelY: number): Promise<boolean> {
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    // Find the path closest to the click
    let closestPath: CellRiverPath | null = null;
    let minDistance = Infinity;
    const threshold = CELL_SIZE * 2;

    for (const path of cellPaths) {
      for (const cell of path.cells) {
        const cellX = cell.x * CELL_SIZE + CELL_SIZE / 2;
        const cellY = cell.y * CELL_SIZE + CELL_SIZE / 2;
        const dist = Math.sqrt((pixelX - cellX) ** 2 + (pixelY - cellY) ** 2);
        if (dist < threshold && dist < minDistance) {
          minDistance = dist;
          closestPath = path;
        }
      }
    }

    if (!closestPath || closestPath.cells.length === 0) {
      return false;
    }

    const pathId = closestPath.id;

    // Sort by order and find the last point (highest order)
    const sortedCells = [...closestPath.cells].sort((a, b) => a.order - b.order);
    const lastCell = sortedCells[sortedCells.length - 1];
    const cellX = lastCell.x;
    const cellY = lastCell.y;
    const cellOrder = lastCell.order;

    await updateKingdom((kingdom) => {
      if (!kingdom.rivers?.cellPaths) return;

      // Create new cellPaths array with updated path
      kingdom.rivers.cellPaths = kingdom.rivers.cellPaths.map(p => {
        if (p.id !== pathId) return p;

        // Filter out the last cell
        const newCells = p.cells.filter(c =>
          !(c.x === cellX && c.y === cellY && c.order === cellOrder)
        );

        return { ...p, cells: newCells };
      }).filter(p => p.cells.length > 0); // Remove empty paths
    });

    this.renderEditorLayer();
    logger.info(`[CellRiverEditor] Removed last point from path ${pathId}`);
    return true;
  }

  /**
   * Remove the specific point that was clicked
   * Used with Ctrl+Click to remove a specific point from the path
   * Returns true if a point was removed
   */
  async removePointAt(pixelX: number, pixelY: number): Promise<boolean> {
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    // Find the specific point closest to the click
    let closestPathId: string | null = null;
    let closestCell: CellRiverPoint | null = null;
    let minDistance = Infinity;
    const threshold = CELL_SIZE * 1.5; // Tighter threshold for specific point

    for (const path of cellPaths) {
      for (const cell of path.cells) {
        const cellX = cell.x * CELL_SIZE + CELL_SIZE / 2;
        const cellY = cell.y * CELL_SIZE + CELL_SIZE / 2;
        const dist = Math.sqrt((pixelX - cellX) ** 2 + (pixelY - cellY) ** 2);
        if (dist < threshold && dist < minDistance) {
          minDistance = dist;
          closestPathId = path.id;
          closestCell = cell;
        }
      }
    }

    if (!closestPathId || !closestCell) {
      return false;
    }

    const pathId = closestPathId;
    const cellX = closestCell.x;
    const cellY = closestCell.y;
    const cellOrder = closestCell.order;

    await updateKingdom((kingdom) => {
      if (!kingdom.rivers?.cellPaths) return;

      // Create new cellPaths array with updated path
      kingdom.rivers.cellPaths = kingdom.rivers.cellPaths.map(p => {
        if (p.id !== pathId) return p;

        // Filter out the clicked cell
        const newCells = p.cells.filter(c =>
          !(c.x === cellX && c.y === cellY && c.order === cellOrder)
        );

        return { ...p, cells: newCells };
      }).filter(p => p.cells.length > 0); // Remove empty paths
    });

    this.renderEditorLayer();
    logger.info(`[CellRiverEditor] Removed point (${cellX}, ${cellY}) from path ${pathId}`);
    return true;
  }

  /**
   * Undo the last point added to the current path
   * Used with Ctrl+Z during drawing
   */
  async undoLastPoint(): Promise<boolean> {
    if (!this.currentPathId) {
      return false;
    }

    const pathId = this.currentPathId;
    let removed = false;

    await updateKingdom((kingdom) => {
      if (!kingdom.rivers?.cellPaths) return;

      kingdom.rivers.cellPaths = kingdom.rivers.cellPaths.map(p => {
        if (p.id !== pathId) return p;
        if (p.cells.length === 0) return p;

        // Sort by order and remove the last point (highest order)
        const sortedCells = [...p.cells].sort((a, b) => a.order - b.order);
        const lastCell = sortedCells[sortedCells.length - 1];

        // Update currentPathOrder to the previous point's order
        if (sortedCells.length > 1) {
          this.currentPathOrder = sortedCells[sortedCells.length - 2].order;
        } else {
          this.currentPathOrder = 0;
        }

        const newCells = p.cells.filter(c =>
          !(c.x === lastCell.x && c.y === lastCell.y && c.order === lastCell.order)
        );

        removed = true;
        return { ...p, cells: newCells };
      }).filter(p => p.cells.length > 0);

      // If path was removed entirely, clear currentPathId
      const pathStillExists = kingdom.rivers.cellPaths.some(p => p.id === pathId);
      if (!pathStillExists) {
        this.currentPathId = null;
        this.currentPathOrder = 0;
      }
    });

    if (removed) {
      this.renderEditorLayer();
      logger.info(`[CellRiverEditor] Undo: removed last point from path ${pathId}`);
    }

    return removed;
  }

  /**
   * Get the currently active path ID (for highlighting in the renderer)
   */
  getCurrentPathId(): string | null {
    return this.currentPathId;
  }

  /**
   * Start a new river path
   */
  startNewPath(): void {
    this.currentPathId = crypto.randomUUID();
    this.currentPathOrder = 0;
    logger.info(`[CellRiverEditor] Started new path: ${this.currentPathId}`);
  }

  /**
   * Finish current path and start fresh
   */
  finishPath(): void {
    if (this.currentPathId) {
      logger.info(`[CellRiverEditor] Finished path: ${this.currentPathId}`);
    }
    this.currentPathId = null;
    this.currentPathOrder = 0;
  }

  /**
   * Render the editor layer with current cell paths
   * Passes the active path ID to highlight it in pink
   */
  renderEditorLayer(): void {
    const mapLayer = this.getMapLayer();
    const kingdom = getKingdomData();

    // Clear previous
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.editor);

    // Get cell paths
    const cellPaths = kingdom.rivers?.cellPaths || [];

    if (cellPaths.length === 0) {
      return;
    }

    // Render with active path highlighted
    const editorLayer = mapLayer.createLayer(
      CELL_RIVER_LAYERS.editor,
      CELL_RIVER_Z_INDICES.editor
    );
    renderCellRiverPaths(editorLayer, cellPaths, CELL_SIZE, this.currentPathId);
    mapLayer.showLayer(CELL_RIVER_LAYERS.editor);
  }

  /**
   * Initialize editor - show existing cell paths and point grid
   * Note: Overlay configuration is handled by EditorModeService.setEditorMode()
   */
  initialize(): void {
    logger.info('[CellRiverEditor] Initializing');

    // Render the point grid
    this.renderPointGrid();

    // Render existing river paths
    this.renderEditorLayer();
  }

  /**
   * Render the point grid showing clickable positions
   */
  private renderPointGrid(): void {
    const mapLayer = this.getMapLayer();
    const canvas = (globalThis as any).canvas;

    // Clear previous grid
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.grid);

    // Get viewport bounds from canvas
    const viewportBounds = {
      x: 0,
      y: 0,
      width: canvas?.dimensions?.sceneWidth || 4000,
      height: canvas?.dimensions?.sceneHeight || 4000
    };

    // Create and render grid
    const gridLayer = mapLayer.createLayer(
      CELL_RIVER_LAYERS.grid,
      CELL_RIVER_Z_INDICES.grid
    );
    renderCellPointGrid(gridLayer, CELL_SIZE, viewportBounds);
    mapLayer.showLayer(CELL_RIVER_LAYERS.grid);
  }

  /**
   * Cleanup - clear and hide editor layers
   * Note: Overlay restoration is handled by EditorModeService.exitEditorMode()
   */
  cleanup(): void {
    const mapLayer = this.getMapLayer();

    // Clear content
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.grid);
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.editor);
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.preview);

    // Hide layers
    mapLayer.hideLayer(CELL_RIVER_LAYERS.grid);
    mapLayer.hideLayer(CELL_RIVER_LAYERS.editor);
    mapLayer.hideLayer(CELL_RIVER_LAYERS.preview);

    this.currentPathId = null;
    this.currentPathOrder = 0;

    logger.info('[CellRiverEditor] Cleaned up');
  }

  /** Current eraser radius in pixels */
  private eraserRadius: number = 16; // Default 16 pixels (2 cells)

  /**
   * Set the eraser radius
   */
  setEraserRadius(radius: number): void {
    this.eraserRadius = radius;
    logger.info(`[CellRiverEditor] Eraser radius set to ${radius}px`);
  }

  /**
   * Get the current eraser radius
   */
  getEraserRadius(): number {
    return this.eraserRadius;
  }

  /**
   * Erase river path at position - removes the entire path that contains the clicked cell
   */
  async handleCellRiverErase(pixelX: number, pixelY: number): Promise<void> {
    const clickedCell = pixelToCell(pixelX, pixelY, CELL_SIZE);

    logger.info(`[CellRiverEditor] Erase at cell (${clickedCell.x}, ${clickedCell.y})`);

    // Find path that contains this cell (check if click is near any path segment)
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    // Find the path that this click is closest to
    let pathToRemove: string | null = null;
    const clickX = clickedCell.x * CELL_SIZE + CELL_SIZE / 2;
    const clickY = clickedCell.y * CELL_SIZE + CELL_SIZE / 2;
    let minDistance = Infinity;
    const threshold = CELL_SIZE * 2; // Within 2 cells

    for (const path of cellPaths) {
      for (const cell of path.cells) {
        const cellX = cell.x * CELL_SIZE + CELL_SIZE / 2;
        const cellY = cell.y * CELL_SIZE + CELL_SIZE / 2;
        const dist = Math.sqrt((clickX - cellX) ** 2 + (clickY - cellY) ** 2);
        if (dist < threshold && dist < minDistance) {
          minDistance = dist;
          pathToRemove = path.id;
        }
      }
    }

    if (pathToRemove) {
      await updateKingdom((kingdom) => {
        if (!kingdom.rivers?.cellPaths) return;
        kingdom.rivers.cellPaths = kingdom.rivers.cellPaths.filter(p => p.id !== pathToRemove);
      });

      const ui = (globalThis as any).ui;
      ui?.notifications?.info('River path removed');
      logger.info(`[CellRiverEditor] Removed path ${pathToRemove}`);
    } else {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('No river path found at that location');
    }

    // Re-render
    this.renderEditorLayer();
  }

  /**
   * Area erase - removes all river points within a circular radius
   * Unlike handleCellRiverErase which removes entire paths, this removes individual points
   */
  async handleAreaErase(pixelX: number, pixelY: number): Promise<void> {
    const radius = this.eraserRadius;
    const radiusSq = radius * radius;

    logger.info(`[CellRiverEditor] Area erase at (${pixelX}, ${pixelY}) with radius ${radius}px`);

    let totalRemoved = 0;

    await updateKingdom((kingdom) => {
      if (!kingdom.rivers?.cellPaths) return;

      // For each path, remove cells within the radius
      kingdom.rivers.cellPaths = kingdom.rivers.cellPaths.map(path => {
        const originalCount = path.cells.length;

        const newCells = path.cells.filter(cell => {
          const cellCenterX = cell.x * CELL_SIZE + CELL_SIZE / 2;
          const cellCenterY = cell.y * CELL_SIZE + CELL_SIZE / 2;
          const distSq = (pixelX - cellCenterX) ** 2 + (pixelY - cellCenterY) ** 2;
          return distSq > radiusSq; // Keep cells outside the radius
        });

        totalRemoved += originalCount - newCells.length;
        return { ...path, cells: newCells };
      }).filter(path => path.cells.length > 0); // Remove empty paths
    });

    if (totalRemoved > 0) {
      logger.info(`[CellRiverEditor] Area erase removed ${totalRemoved} points`);
    }

    // Re-render
    this.renderEditorLayer();
  }

  /**
   * Show eraser preview circle at the given position
   */
  showEraserPreview(pixelX: number, pixelY: number): void {
    const mapLayer = this.getMapLayer();

    // Clear previous preview
    mapLayer.clearLayerContent(CELL_RIVER_LAYERS.preview);

    // Create preview layer
    const previewLayer = mapLayer.createLayer(
      CELL_RIVER_LAYERS.preview,
      CELL_RIVER_Z_INDICES.preview
    );

    const graphics = new PIXI.Graphics();
    graphics.name = 'EraserPreview';

    // Draw eraser circle
    graphics.lineStyle(2, 0xFF6666, 0.8);
    graphics.beginFill(0xFF0000, 0.15);
    graphics.drawCircle(pixelX, pixelY, this.eraserRadius);
    graphics.endFill();

    previewLayer.addChild(graphics);
    mapLayer.showLayer(CELL_RIVER_LAYERS.preview);
  }

  /**
   * Flip river direction at position - reverses the order of cells in the path
   */
  async handleCellRiverFlip(pixelX: number, pixelY: number): Promise<void> {
    const clickedCell = pixelToCell(pixelX, pixelY, CELL_SIZE);

    logger.info(`[CellRiverEditor] Flip at cell (${clickedCell.x}, ${clickedCell.y})`);

    // Find path that contains this cell
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    let pathToFlip: string | null = null;
    const clickX = clickedCell.x * CELL_SIZE + CELL_SIZE / 2;
    const clickY = clickedCell.y * CELL_SIZE + CELL_SIZE / 2;
    let minDistance = Infinity;
    const threshold = CELL_SIZE * 2;

    for (const path of cellPaths) {
      for (const cell of path.cells) {
        const cellX = cell.x * CELL_SIZE + CELL_SIZE / 2;
        const cellY = cell.y * CELL_SIZE + CELL_SIZE / 2;
        const dist = Math.sqrt((clickX - cellX) ** 2 + (clickY - cellY) ** 2);
        if (dist < threshold && dist < minDistance) {
          minDistance = dist;
          pathToFlip = path.id;
        }
      }
    }

    if (pathToFlip) {
      await updateKingdom((kingdom) => {
        if (!kingdom.rivers?.cellPaths) return;

        const path = kingdom.rivers.cellPaths.find(p => p.id === pathToFlip);
        if (!path) return;

        // Reverse the order values
        const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);
        const maxOrder = sortedCells.length * 10;

        for (let i = 0; i < sortedCells.length; i++) {
          // Find cell in original array and update order
          const cell = path.cells.find(c => c.x === sortedCells[i].x && c.y === sortedCells[i].y);
          if (cell) {
            cell.order = maxOrder - (i * 10);
          }
        }
      });

      const ui = (globalThis as any).ui;
      ui?.notifications?.info('River direction reversed');
      logger.info(`[CellRiverEditor] Flipped path ${pathToFlip}`);
    } else {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('No river path found at that location');
    }

    // Re-render
    this.renderEditorLayer();
  }

  /**
   * Clear all river paths - wipe everything clean
   */
  async clearAll(): Promise<void> {
    logger.info('[CellRiverEditor] Clearing all river paths');

    await updateKingdom((kingdom) => {
      if (!kingdom.rivers) return;
      kingdom.rivers.cellPaths = [];
      kingdom.rivers.rasterizedCells = [];
    });

    // Reset current path state
    this.currentPathId = null;
    this.currentPathOrder = 0;

    // Re-render (will show empty)
    this.renderEditorLayer();

    const ui = (globalThis as any).ui;
    ui?.notifications?.info('All river paths cleared');
  }

  /** River width in cells (should match RIVER_WIDTH_CELLS in CellRiverRenderer) */
  private static readonly RIVER_WIDTH_CELLS = 2;

  /**
   * Compute rasterized cells from all polyline paths
   * Uses Bresenham's algorithm to rasterize lines between consecutive vertices
   * Adds thickness by including perpendicular neighbor cells
   */
  computeRasterizedCells(cellPaths: CellRiverPath[]): RasterizedCell[] {
    const cellSet = new Set<string>();

    for (const path of cellPaths) {
      if (path.cells.length === 0) continue;

      // Sort cells by order to get the polyline sequence
      const sortedCells = [...path.cells].sort((a, b) => a.order - b.order);

      if (sortedCells.length === 1) {
        // Single point - add with thickness
        this.addCellWithThickness(cellSet, sortedCells[0].x, sortedCells[0].y, 0, 0);
        continue;
      }

      // Rasterize lines between consecutive vertices
      for (let i = 0; i < sortedCells.length - 1; i++) {
        const p1 = sortedCells[i];
        const p2 = sortedCells[i + 1];
        const lineCells = this.rasterizeLine(p1.x, p1.y, p2.x, p2.y);

        // Calculate perpendicular direction for thickness
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        for (const cell of lineCells) {
          this.addCellWithThickness(cellSet, cell.x, cell.y, dx, dy);
        }
      }
    }

    // Convert set to array
    const result: RasterizedCell[] = [];
    for (const key of cellSet) {
      const [x, y] = key.split(',').map(Number);
      result.push({ x, y });
    }

    logger.info(`[CellRiverEditor] Computed ${result.length} rasterized cells from ${cellPaths.length} paths`);
    return result;
  }

  /**
   * Add a cell and its perpendicular neighbors for river thickness
   */
  private addCellWithThickness(cellSet: Set<string>, x: number, y: number, dx: number, dy: number): void {
    // Always add the center cell
    cellSet.add(`${x},${y}`);

    // For width of 2, add 1 cell on each side perpendicular to the line direction
    const halfWidth = Math.floor(CellRiverEditorHandlers.RIVER_WIDTH_CELLS / 2);
    if (halfWidth === 0) return;

    // Calculate perpendicular direction (rotate 90 degrees)
    // If line is horizontal (dy=0), perpendicular is vertical
    // If line is vertical (dx=0), perpendicular is horizontal
    // For diagonal, we add both cardinal neighbors
    if (dx === 0 && dy === 0) {
      // Single point - add all 4 cardinal neighbors
      for (let d = 1; d <= halfWidth; d++) {
        cellSet.add(`${x + d},${y}`);
        cellSet.add(`${x - d},${y}`);
        cellSet.add(`${x},${y + d}`);
        cellSet.add(`${x},${y - d}`);
      }
    } else if (Math.abs(dx) > Math.abs(dy)) {
      // More horizontal - add cells above/below
      for (let d = 1; d <= halfWidth; d++) {
        cellSet.add(`${x},${y + d}`);
        cellSet.add(`${x},${y - d}`);
      }
    } else {
      // More vertical - add cells left/right
      for (let d = 1; d <= halfWidth; d++) {
        cellSet.add(`${x + d},${y}`);
        cellSet.add(`${x - d},${y}`);
      }
    }
  }

  /**
   * Rasterize a line between two cell coordinates using Bresenham's algorithm
   */
  private rasterizeLine(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      cells.push({ x, y });

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return cells;
  }

  /**
   * Rasterize all polylines and store the result
   * Call this when saving the editor
   */
  async rasterizeOnSave(): Promise<void> {
    const kingdom = getKingdomData();
    const cellPaths = kingdom.rivers?.cellPaths || [];

    const rasterizedCells = this.computeRasterizedCells(cellPaths);

    await updateKingdom((kingdom) => {
      if (!kingdom.rivers) {
        kingdom.rivers = { paths: [] };
      }
      kingdom.rivers.rasterizedCells = rasterizedCells;
    });

    logger.info(`[CellRiverEditor] Saved ${rasterizedCells.length} rasterized cells`);
  }
}

// Export singleton instance
export const cellRiverEditorHandlers = new CellRiverEditorHandlers();
