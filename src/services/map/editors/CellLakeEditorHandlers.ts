/**
 * CellLakeEditorHandlers - Cell-based lake painting functionality
 *
 * Paints lake cells directly on the NavigationGrid using brush mode.
 * - Click/drag to paint lake cells
 * - Erase mode removes cells
 * - No polylines - just painted blobs of cells
 */

import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import { CELL_LAKE_LAYERS, CELL_LAKE_Z_INDICES, CELL_SIZE } from '../overlays/CellLakeEditorOverlay';
import {
  renderLakeCells,
  renderBrushCircle,
  getCellsInRadius,
  pixelToCell
} from '../renderers/CellLakeRenderer';
import { logger } from '../../../utils/Logger';
import type { RasterizedCell } from '../../../actors/KingdomActor';

export class CellLakeEditorHandlers {
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
    logger.info(`[CellLakeEditor] Brush radius set to ${this.brushRadius}px`);
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
        if (!kingdom.waterFeatures.lakeCells) {
          kingdom.waterFeatures.lakeCells = [];
        }

        const existingCells = new Set(
          kingdom.waterFeatures.lakeCells.map(c => `${c.x},${c.y}`)
        );

        for (const cell of cellsToAdd) {
          const key = `${cell.x},${cell.y}`;
          if (!existingCells.has(key)) {
            kingdom.waterFeatures.lakeCells.push({ x: cell.x, y: cell.y });
            existingCells.add(key);
          }
        }
      });

      logger.info(`[CellLakeEditor] Committed ${cellsToAdd.length} cells`);
    }

    // Commit pending remove cells
    if (this.pendingRemoveCells.size > 0) {
      await updateKingdom((kingdom) => {
        if (!kingdom.waterFeatures?.lakeCells) return;

        kingdom.waterFeatures.lakeCells = kingdom.waterFeatures.lakeCells.filter(
          c => !this.pendingRemoveCells.has(`${c.x},${c.y}`)
        );
      });

      logger.info(`[CellLakeEditor] Removed ${this.pendingRemoveCells.size} cells`);
    }

    this.currentDragCells.clear();
    this.pendingAddCells.clear();
    this.pendingRemoveCells.clear();

    // Final re-render
    this.renderEditorLayer();
  }

  /**
   * Handle lake paint - adds cells within brush radius
   * During drag, cells are batched for performance and rendered as preview
   */
  async handleLakePaint(pixelX: number, pixelY: number): Promise<void> {
    const cellsToAdd = getCellsInRadius(pixelX, pixelY, this.brushRadius, CELL_SIZE);

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
   * Handle lake erase - removes cells within brush radius
   * During drag, cells are batched for performance
   */
  async handleLakeErase(pixelX: number, pixelY: number): Promise<void> {
    const cellsToRemove = getCellsInRadius(pixelX, pixelY, this.brushRadius, CELL_SIZE);

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
    mapLayer.clearLayerContent(CELL_LAKE_LAYERS.preview);

    // Create preview layer
    const previewLayer = mapLayer.createLayer(
      CELL_LAKE_LAYERS.preview,
      CELL_LAKE_Z_INDICES.preview
    );

    // Draw brush circle preview
    renderBrushCircle(previewLayer, pixelX, pixelY, this.brushRadius, isErasing);

    // Add brush size text indicator
    const brushSizeText = new PIXI.Text(`${Math.round(this.brushRadius / CELL_SIZE)} cells`, {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: isErasing ? 0xFF6666 : 0x00FFFF,
      stroke: 0x000000,
      strokeThickness: 2
    });
    brushSizeText.anchor.set(0.5, 0);
    brushSizeText.position.set(pixelX, pixelY + this.brushRadius + 4);
    previewLayer.addChild(brushSizeText);

    mapLayer.showLayer(CELL_LAKE_LAYERS.preview);
  }

  /**
   * Clear hover preview
   */
  clearHoverPreview(): void {
    const mapLayer = this.getMapLayer();
    mapLayer.clearLayerContent(CELL_LAKE_LAYERS.preview);
  }

  /**
   * Render the editor layer with current lake cells
   */
  renderEditorLayer(): void {
    const mapLayer = this.getMapLayer();
    const kingdom = getKingdomData();

    // Clear previous
    mapLayer.clearLayerContent(CELL_LAKE_LAYERS.editor);

    // Get lake cells
    const lakeCells = kingdom.waterFeatures?.lakeCells || [];

    if (lakeCells.length === 0) {
      return;
    }

    // Render lake cells
    const editorLayer = mapLayer.createLayer(
      CELL_LAKE_LAYERS.editor,
      CELL_LAKE_Z_INDICES.editor
    );
    renderLakeCells(editorLayer, lakeCells, CELL_SIZE);
    mapLayer.showLayer(CELL_LAKE_LAYERS.editor);
  }

  /**
   * Render the editor layer with current lake cells AND pending cells from drag
   * This provides immediate visual feedback during drag painting without waiting for async updates
   */
  renderEditorLayerWithPending(): void {
    const mapLayer = this.getMapLayer();
    const kingdom = getKingdomData();

    // Clear previous
    mapLayer.clearLayerContent(CELL_LAKE_LAYERS.editor);

    // Get existing lake cells
    let lakeCells = kingdom.waterFeatures?.lakeCells || [];

    // Apply pending changes for preview
    // 1. Filter out cells that are pending removal
    if (this.pendingRemoveCells.size > 0) {
      lakeCells = lakeCells.filter(c => !this.pendingRemoveCells.has(`${c.x},${c.y}`));
    }

    // 2. Add pending add cells (convert from Set to array)
    const existingSet = new Set(lakeCells.map(c => `${c.x},${c.y}`));
    const pendingAddArray: Array<{ x: number; y: number }> = [];
    for (const key of this.pendingAddCells) {
      if (!existingSet.has(key)) {
        const [x, y] = key.split(',').map(Number);
        pendingAddArray.push({ x, y });
      }
    }

    // Combine existing + pending
    const allCells = [...lakeCells, ...pendingAddArray];

    if (allCells.length === 0) {
      return;
    }

    // Render combined lake cells
    const editorLayer = mapLayer.createLayer(
      CELL_LAKE_LAYERS.editor,
      CELL_LAKE_Z_INDICES.editor
    );
    renderLakeCells(editorLayer, allCells, CELL_SIZE);
    mapLayer.showLayer(CELL_LAKE_LAYERS.editor);
  }

  /**
   * Initialize editor - show existing lake cells
   */
  initialize(): void {
    logger.info('[CellLakeEditor] Initializing');

    // Render existing lake cells
    this.renderEditorLayer();
  }

  /**
   * Cleanup - clear and hide editor layers
   */
  cleanup(): void {
    const mapLayer = this.getMapLayer();

    // Clear content
    mapLayer.clearLayerContent(CELL_LAKE_LAYERS.grid);
    mapLayer.clearLayerContent(CELL_LAKE_LAYERS.editor);
    mapLayer.clearLayerContent(CELL_LAKE_LAYERS.preview);

    // Hide layers
    mapLayer.hideLayer(CELL_LAKE_LAYERS.grid);
    mapLayer.hideLayer(CELL_LAKE_LAYERS.editor);
    mapLayer.hideLayer(CELL_LAKE_LAYERS.preview);

    this.isDragging = false;
    this.currentDragCells.clear();
    this.pendingAddCells.clear();
    this.pendingRemoveCells.clear();
    this.lastCursorX = 0;
    this.lastCursorY = 0;

    logger.info('[CellLakeEditor] Cleaned up');
  }

  /**
   * Clear all lake cells
   */
  async clearAll(): Promise<void> {
    logger.info('[CellLakeEditor] Clearing all lake cells');

    // Also clear any pending cells
    this.pendingAddCells.clear();
    this.pendingRemoveCells.clear();
    this.currentDragCells.clear();

    await updateKingdom((kingdom) => {
      if (!kingdom.waterFeatures) return;
      kingdom.waterFeatures.lakeCells = [];
    });

    // Re-render (will show empty)
    this.renderEditorLayer();

    const ui = (globalThis as any).ui;
    ui?.notifications?.info('All lake cells cleared');
  }

  /**
   * Get the count of lake cells
   */
  getLakeCellCount(): number {
    const kingdom = getKingdomData();
    return kingdom.waterFeatures?.lakeCells?.length || 0;
  }

  /**
   * Check if currently dragging/painting
   */
  isPainting(): boolean {
    return this.isDragging;
  }
}

// Export singleton instance
export const cellLakeEditorHandlers = new CellLakeEditorHandlers();
