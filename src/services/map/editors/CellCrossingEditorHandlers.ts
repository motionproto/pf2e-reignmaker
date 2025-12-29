/**
 * CellCrossingEditorHandlers - Cell-based crossing (passage) painting functionality
 *
 * Paints crossing/passage cells that override water blocking.
 * - Click/drag to paint passage cells (creates bridges/fords)
 * - Erase mode removes passage cells
 * - Uses brush mode like lake painting
 */

import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import { logger } from '../../../utils/Logger';
import type { RasterizedCell } from '../../../actors/KingdomActor';

// Layer IDs for the crossing editor
export const CELL_CROSSING_LAYERS = {
  editor: 'cell-crossing-editor',
  preview: 'cell-crossing-preview',
  grid: 'cell-crossing-grid'
} as const;

// Z-indices for crossing editor layers
export const CELL_CROSSING_Z_INDICES = {
  grid: 9990,
  editor: 9991,
  preview: 9995
} as const;

// Cell size matches NavigationGrid
export const CELL_SIZE = 8;

export class CellCrossingEditorHandlers {
  /** Current brush radius in pixels */
  private brushRadius: number = 24; // Default 24 pixels (3 cells)

  /** Track cells painted in current drag to avoid redundant updates */
  private currentDragCells: Set<string> = new Set();

  /** Pending cells to add during drag (batched for performance) */
  private pendingAddCells: Set<string> = new Set();

  /** Pending cells to remove during drag (batched for performance) */
  private pendingRemoveCells: Set<string> = new Set();

  /** Is currently dragging (painting) */
  private isDragging: boolean = false;

  /** Last cursor position for hover preview */
  private lastCursorX: number = 0;
  private lastCursorY: number = 0;

  /** Map layer reference */
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
   * Set the brush radius
   */
  setBrushRadius(radius: number): void {
    this.brushRadius = Math.max(8, Math.min(64, radius)); // Clamp between 8-64 pixels
    logger.info(`[CellCrossingEditor] Brush radius set to ${this.brushRadius}px`);
    // Update preview if we have a cursor position
    if (this.lastCursorX || this.lastCursorY) {
      this.handleMouseMove(this.lastCursorX, this.lastCursorY, false);
    }
  }

  /**
   * Adjust the brush radius by a delta amount
   * Returns the new radius
   */
  adjustBrushRadius(delta: number): number {
    this.setBrushRadius(this.brushRadius + delta);
    return this.brushRadius;
  }

  /**
   * Get the current brush radius
   */
  getBrushRadius(): number {
    return this.brushRadius;
  }

  /**
   * Start painting - called on mousedown
   */
  startPainting(): void {
    this.isDragging = true;
    this.currentDragCells.clear();
    this.pendingAddCells.clear();
    this.pendingRemoveCells.clear();
  }

  /**
   * Stop painting - called on mouseup
   * Commits all pending cells to the kingdom data
   */
  async stopPainting(): Promise<void> {
    this.isDragging = false;

    // Commit pending add cells
    if (this.pendingAddCells.size > 0) {
      const cellsToAdd = Array.from(this.pendingAddCells).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });

      await updateKingdom((kingdom) => {
        if (!kingdom.waterFeatures) {
          kingdom.waterFeatures = { lakes: [], swamps: [] };
        }
        if (!kingdom.waterFeatures.passageCells) {
          kingdom.waterFeatures.passageCells = [];
        }

        const existingCells = new Set(
          kingdom.waterFeatures.passageCells.map(c => `${c.x},${c.y}`)
        );

        for (const cell of cellsToAdd) {
          const key = `${cell.x},${cell.y}`;
          if (!existingCells.has(key)) {
            kingdom.waterFeatures.passageCells.push({ x: cell.x, y: cell.y });
            existingCells.add(key);
          }
        }
      });

      logger.info(`[CellCrossingEditor] Committed ${cellsToAdd.length} passage cells`);
    }

    // Commit pending remove cells
    if (this.pendingRemoveCells.size > 0) {
      await updateKingdom((kingdom) => {
        if (!kingdom.waterFeatures?.passageCells) return;

        kingdom.waterFeatures.passageCells = kingdom.waterFeatures.passageCells.filter(
          c => !this.pendingRemoveCells.has(`${c.x},${c.y}`)
        );
      });

      logger.info(`[CellCrossingEditor] Removed ${this.pendingRemoveCells.size} passage cells`);
    }

    this.currentDragCells.clear();
    this.pendingAddCells.clear();
    this.pendingRemoveCells.clear();

    // Final re-render
    this.renderEditorLayer();
  }

  /**
   * Handle crossing paint - adds cells within brush radius
   * During drag, cells are batched for performance and rendered as preview
   */
  async handleCrossingPaint(pixelX: number, pixelY: number): Promise<void> {
    const cellsToAdd = this.getCellsInRadius(pixelX, pixelY, this.brushRadius);

    if (cellsToAdd.length === 0) return;

    // Filter out cells already painted in this drag
    const newCells = cellsToAdd.filter(c => {
      const key = `${c.x},${c.y}`;
      if (this.currentDragCells.has(key)) return false;
      this.currentDragCells.add(key);
      return true;
    });

    if (newCells.length === 0) return;

    // Add to pending cells (will be committed on stopPainting)
    for (const cell of newCells) {
      const key = `${cell.x},${cell.y}`;
      this.pendingAddCells.add(key);
      // If this cell was pending removal, remove it from that set
      this.pendingRemoveCells.delete(key);
    }

    // Render immediately with pending cells overlay
    this.renderEditorLayerWithPending();
  }

  /**
   * Handle crossing erase - removes cells within brush radius
   * During drag, cells are batched for performance
   */
  async handleCrossingErase(pixelX: number, pixelY: number): Promise<void> {
    const cellsToRemove = this.getCellsInRadius(pixelX, pixelY, this.brushRadius);

    if (cellsToRemove.length === 0) return;

    // Filter out cells already processed in this drag
    const newCells = cellsToRemove.filter(c => {
      const key = `${c.x},${c.y}`;
      if (this.currentDragCells.has(key)) return false;
      this.currentDragCells.add(key);
      return true;
    });

    if (newCells.length === 0) return;

    // Add to pending remove cells (will be committed on stopPainting)
    for (const cell of newCells) {
      const key = `${cell.x},${cell.y}`;
      this.pendingRemoveCells.add(key);
      // If this cell was pending addition, remove it from that set
      this.pendingAddCells.delete(key);
    }

    // Render immediately with pending cells overlay
    this.renderEditorLayerWithPending();
  }

  /**
   * Handle mouse move - show brush preview with size indicator
   */
  handleMouseMove(pixelX: number, pixelY: number, isErasing: boolean = false): void {
    // Store cursor position for brush size updates
    this.lastCursorX = pixelX;
    this.lastCursorY = pixelY;

    const mapLayer = this.getMapLayer();

    // Clear previous preview
    mapLayer.clearLayerContent(CELL_CROSSING_LAYERS.preview);

    // Create preview layer
    const previewLayer = mapLayer.createLayer(
      CELL_CROSSING_LAYERS.preview,
      CELL_CROSSING_Z_INDICES.preview
    );

    // Draw brush circle preview (green for passages)
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(2, isErasing ? 0xFF6666 : 0x00FF00, 0.8);
    graphics.drawCircle(pixelX, pixelY, this.brushRadius);
    graphics.endFill();
    previewLayer.addChild(graphics);

    // Add brush size text indicator
    const brushSizeText = new PIXI.Text(`${Math.round(this.brushRadius / CELL_SIZE)} cells`, {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: isErasing ? 0xFF6666 : 0x00FF00,
      stroke: 0x000000,
      strokeThickness: 2
    });
    brushSizeText.anchor.set(0.5, 0);
    brushSizeText.position.set(pixelX, pixelY + this.brushRadius + 4);
    previewLayer.addChild(brushSizeText);

    mapLayer.showLayer(CELL_CROSSING_LAYERS.preview);
  }

  /**
   * Clear hover preview
   */
  clearHoverPreview(): void {
    const mapLayer = this.getMapLayer();
    mapLayer.clearLayerContent(CELL_CROSSING_LAYERS.preview);
  }

  /**
   * Render the editor layer with current passage cells
   */
  renderEditorLayer(): void {
    const mapLayer = this.getMapLayer();
    const kingdom = getKingdomData();

    // Clear previous
    mapLayer.clearLayerContent(CELL_CROSSING_LAYERS.editor);

    // Get passage cells
    const passageCells = kingdom.waterFeatures?.passageCells || [];

    if (passageCells.length === 0) {
      return;
    }

    // Render passage cells
    const editorLayer = mapLayer.createLayer(
      CELL_CROSSING_LAYERS.editor,
      CELL_CROSSING_Z_INDICES.editor
    );
    this.renderCells(editorLayer, passageCells);
    mapLayer.showLayer(CELL_CROSSING_LAYERS.editor);
  }

  /**
   * Render the editor layer with current passage cells AND pending cells from drag
   * This provides immediate visual feedback during drag painting without waiting for async updates
   */
  renderEditorLayerWithPending(): void {
    const mapLayer = this.getMapLayer();
    const kingdom = getKingdomData();

    // Clear previous
    mapLayer.clearLayerContent(CELL_CROSSING_LAYERS.editor);

    // Get existing passage cells
    let passageCells = kingdom.waterFeatures?.passageCells || [];

    // Apply pending changes for preview
    // 1. Filter out cells that are pending removal
    if (this.pendingRemoveCells.size > 0) {
      passageCells = passageCells.filter(c => !this.pendingRemoveCells.has(`${c.x},${c.y}`));
    }

    // 2. Add pending add cells (convert from Set to array)
    const existingSet = new Set(passageCells.map(c => `${c.x},${c.y}`));
    const pendingAddArray: Array<{ x: number; y: number }> = [];
    for (const key of this.pendingAddCells) {
      if (!existingSet.has(key)) {
        const [x, y] = key.split(',').map(Number);
        pendingAddArray.push({ x, y });
      }
    }

    // Combine existing + pending
    const allCells = [...passageCells, ...pendingAddArray];

    if (allCells.length === 0) {
      return;
    }

    // Render combined passage cells
    const editorLayer = mapLayer.createLayer(
      CELL_CROSSING_LAYERS.editor,
      CELL_CROSSING_Z_INDICES.editor
    );
    this.renderCells(editorLayer, allCells);
    mapLayer.showLayer(CELL_CROSSING_LAYERS.editor);
  }

  /**
   * Render passage cells as green squares
   */
  private renderCells(layer: PIXI.Container, cells: Array<{ x: number; y: number }>): void {
    const graphics = new PIXI.Graphics();
    graphics.name = 'PassageCells';

    for (const cell of cells) {
      const pixelX = cell.x * CELL_SIZE;
      const pixelY = cell.y * CELL_SIZE;

      // Green for passage cells
      graphics.beginFill(0x00FF00, 0.5);
      graphics.drawRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
      graphics.endFill();
    }

    layer.addChild(graphics);
  }

  /**
   * Get cells within a radius of a point
   */
  private getCellsInRadius(pixelX: number, pixelY: number, radius: number): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    const centerCellX = Math.floor(pixelX / CELL_SIZE);
    const centerCellY = Math.floor(pixelY / CELL_SIZE);
    const cellRadius = Math.ceil(radius / CELL_SIZE);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const cellX = centerCellX + dx;
        const cellY = centerCellY + dy;

        // Check if cell center is within radius
        const cellCenterX = cellX * CELL_SIZE + CELL_SIZE / 2;
        const cellCenterY = cellY * CELL_SIZE + CELL_SIZE / 2;
        const distance = Math.sqrt(
          Math.pow(cellCenterX - pixelX, 2) +
          Math.pow(cellCenterY - pixelY, 2)
        );

        if (distance <= radius) {
          cells.push({ x: cellX, y: cellY });
        }
      }
    }

    return cells;
  }

  /**
   * Initialize editor - show existing passage cells
   */
  initialize(): void {
    logger.info('[CellCrossingEditor] Initializing');

    // Render existing passage cells
    this.renderEditorLayer();
  }

  /**
   * Cleanup - clear and hide editor layers
   */
  cleanup(): void {
    const mapLayer = this.getMapLayer();

    // Clear content
    mapLayer.clearLayerContent(CELL_CROSSING_LAYERS.grid);
    mapLayer.clearLayerContent(CELL_CROSSING_LAYERS.editor);
    mapLayer.clearLayerContent(CELL_CROSSING_LAYERS.preview);

    // Hide layers
    mapLayer.hideLayer(CELL_CROSSING_LAYERS.grid);
    mapLayer.hideLayer(CELL_CROSSING_LAYERS.editor);
    mapLayer.hideLayer(CELL_CROSSING_LAYERS.preview);

    this.isDragging = false;
    this.currentDragCells.clear();
    this.pendingAddCells.clear();
    this.pendingRemoveCells.clear();
    this.lastCursorX = 0;
    this.lastCursorY = 0;

    logger.info('[CellCrossingEditor] Cleaned up');
  }

  /**
   * Clear all passage cells
   */
  async clearAll(): Promise<void> {
    logger.info('[CellCrossingEditor] Clearing all passage cells');

    // Also clear any pending cells
    this.pendingAddCells.clear();
    this.pendingRemoveCells.clear();
    this.currentDragCells.clear();

    await updateKingdom((kingdom) => {
      if (!kingdom.waterFeatures) return;
      kingdom.waterFeatures.passageCells = [];
    });

    // Re-render (will show empty)
    this.renderEditorLayer();

    const ui = (globalThis as any).ui;
    ui?.notifications?.info('All passage cells cleared');
  }

  /**
   * Get the count of passage cells
   */
  getPassageCellCount(): number {
    const kingdom = getKingdomData();
    return kingdom.waterFeatures?.passageCells?.length || 0;
  }

  /**
   * Check if currently dragging/painting
   */
  isPainting(): boolean {
    return this.isDragging;
  }
}

// Export singleton instance
export const cellCrossingEditorHandlers = new CellCrossingEditorHandlers();
