/**
 * EditorModeService - Map editor for GM to modify kingdom data
 * 
 * Provides pencil/eraser tools for editing rivers, roads, territories, etc.
 * Uses save/cancel pattern: backup data on enter, restore on cancel, commit on save.
 * 
 * Mouse handling: Uses Foundry's MouseInteractionManager to intercept all canvas events
 * during editor mode, preventing marquee selection and other unwanted interactions.
 */

import { getKingdomData, updateKingdom } from '../../stores/KingdomStore';
import type { KingdomData } from '../../actors/KingdomActor';
import { logger } from '../../utils/Logger';
import { 
  disableCanvasLayerInteractivity, 
  restoreCanvasLayerInteractivity 
} from '../../utils/canvasLayerInteractivity';
import { renderRiverConnectors } from './renderers/RiverConnectorRenderer';
import { EditorDebugHandlers } from './EditorDebugHandlers';
import { RiverEditorHandlers } from './RiverEditorHandlers';

export type EditorTool = 'river-edit' | 'river-scissors' | 'river-reverse' | 'lake-toggle' | 'swamp-toggle' | 'inactive';

/**
 * Singleton service for map editing
 */
export class EditorModeService {
  private static instance: EditorModeService | null = null;
  
  private active = false;
  private currentTool: EditorTool = 'inactive';
  private backupKingdomData: KingdomData | null = null;
  private isDragging = false;
  
  // Direct PIXI event handlers for canvas events during editor mode
  private pointerDownHandler: ((event: PointerEvent) => void) | null = null;
  private pointerMoveHandler: ((event: PointerEvent) => void) | null = null;
  private pointerUpHandler: ((event: PointerEvent) => void) | null = null;
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  
  // Store layer interactivity state for restoration
  private savedLayerInteractivity: Map<string, boolean> = new Map();
  
  // River editing state
  private connectorLayer: PIXI.Container | null = null;
  
  // Handler modules
  private debugHandlers = new EditorDebugHandlers();
  private riverHandlers = new RiverEditorHandlers();
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): EditorModeService {
    if (!EditorModeService.instance) {
      EditorModeService.instance = new EditorModeService();
    }
    return EditorModeService.instance;
  }
  
  /**
   * Toggle hex debug mode (logs hex IDs on click anywhere on canvas)
   */
  toggleDebugHex(): boolean {
    return this.debugHandlers.toggleDebugHex();
  }
  
  /**
   * Toggle edge debug mode (logs edge IDs on click anywhere on canvas)
   */
  toggleDebugEdge(): boolean {
    return this.debugHandlers.toggleDebugEdge();
  }
  
  /**
   * Check if hex debug mode is active
   */
  isDebugHexMode(): boolean {
    return this.debugHandlers.isDebugHexMode();
  }
  
  /**
   * Check if edge debug mode is active
   */
  isDebugEdgeMode(): boolean {
    return this.debugHandlers.isDebugEdgeMode();
  }
  
  /**
   * Toggle neighbors debug mode (logs neighbor hex IDs on click)
   */
  toggleDebugNeighbors(): boolean {
    return this.debugHandlers.toggleDebugNeighbors();
  }
  
  /**
   * Check if neighbors debug mode is active
   */
  isDebugNeighborsMode(): boolean {
    return this.debugHandlers.isDebugNeighborsMode();
  }
  
  /**
   * Enter editor mode - backup kingdom data and take control of mouse interactions
   */
  async enterEditorMode(): Promise<void> {
    if (this.active) {
      logger.warn('[EditorModeService] Already in editor mode');
      return;
    }
    
    logger.info('[EditorModeService] Entering editor mode');
    
    // Backup kingdom data (deep copy for restore on cancel)
    const kingdom = getKingdomData();
    this.backupKingdomData = structuredClone(kingdom);
    
    this.active = true;
    this.currentTool = 'inactive';
    
    // Disable canvas layer interactivity (prevents token/tile selection)
    this.savedLayerInteractivity = disableCanvasLayerInteractivity();
    
    // Attach direct event listeners to canvas stage
    this.attachDirectEventListeners();
    
    // Attach keyboard listener for Escape key
    this.attachKeyboardListener();
  }
  
  /**
   * Exit editor mode - restore original mouse manager
   */
  async exitEditorMode(): Promise<void> {
    if (!this.active) return;
    
    logger.info('[EditorModeService] Exiting editor mode');
    
    // Destroy connector layer (clears all control point graphics)
    this.destroyConnectorLayer();
    
    // Remove direct event listeners
    this.removeDirectEventListeners();
    
    // Remove keyboard listener
    this.removeKeyboardListener();
    
    // Restore canvas layer interactivity
    restoreCanvasLayerInteractivity(this.savedLayerInteractivity);
    this.savedLayerInteractivity.clear();
    
    // Clean up water layer - refresh or clear based on overlay state
    await this.cleanupWaterLayer();
    
    this.active = false;
    this.currentTool = 'inactive';
    this.backupKingdomData = null;
    this.isDragging = false;
  }
  
  /**
   * Set current editing tool
   */
  async setTool(tool: EditorTool): Promise<void> {
    logger.info(`[EditorModeService] Setting tool: ${tool}`);
    this.currentTool = tool;
    
    // Render connectors when river-edit tool is activated
    if (tool === 'river-edit') {
      await this.initializeConnectorLayer();
    } else {
      // Completely destroy connector layer when switching away from river-edit
      this.destroyConnectorLayer();
    }
  }
  
  /**
   * Get current tool
   */
  getCurrentTool(): EditorTool {
    return this.currentTool;
  }
  
  /**
   * Check if editor mode is active
   */
  isActive(): boolean {
    return this.active;
  }
  
  /**
   * Save changes - commit to kingdom actor
   */
  async save(): Promise<void> {
    if (!this.active) {
      logger.warn('[EditorModeService] Cannot save - not in editor mode');
      return;
    }
    
    logger.info('[EditorModeService] Saving changes');
    
    // Kingdom data already updated reactively via updateKingdom calls
    // Just clear backup and notify user
    this.backupKingdomData = null;
    
    // Exit editor mode after saving
    this.exitEditorMode();
    
    const ui = (globalThis as any).ui;
    ui?.notifications?.info('Map changes saved');
  }
  
  /**
   * Cancel changes - restore from backup
   */
  async cancel(): Promise<void> {
    if (!this.active) {
      logger.warn('[EditorModeService] Cannot cancel - not in editor mode');
      return;
    }
    
    logger.info('[EditorModeService] Canceling changes');
    
    if (this.backupKingdomData) {
      // Restore kingdom data from backup by replacing entire dataset
      const backup = this.backupKingdomData;
      await updateKingdom(kingdom => {
        // Replace all properties from backup
        Object.assign(kingdom, backup);
      });
      this.backupKingdomData = null;
      
      const ui = (globalThis as any).ui;
      ui?.notifications?.info('Map changes discarded');
    }
    
    // Exit editor mode after canceling
    this.exitEditorMode();
  }
  
  /**
   * Attach direct PIXI event listeners to canvas stage
   * Uses capture phase to intercept events BEFORE Foundry's handlers
   */
  private attachDirectEventListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      logger.warn('[EditorModeService] Canvas not available');
      return;
    }
    
    // Create bound handlers
    this.pointerDownHandler = this.handlePointerDown.bind(this);
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.pointerUpHandler = this.handlePointerUp.bind(this);
    
    // Attach with capture:true to intercept BEFORE Foundry's handlers
    canvas.stage.addEventListener('pointerdown', this.pointerDownHandler, { capture: true });
    canvas.stage.addEventListener('pointermove', this.pointerMoveHandler, { capture: true });
    canvas.stage.addEventListener('pointerup', this.pointerUpHandler, { capture: true });
    
    logger.info('[EditorModeService] ✅ Attached direct event listeners (marquee selection blocked)');
  }
  
  /**
   * Remove direct PIXI event listeners
   */
  private removeDirectEventListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) return;
    
    if (this.pointerDownHandler) {
      canvas.stage.removeEventListener('pointerdown', this.pointerDownHandler, { capture: true });
      this.pointerDownHandler = null;
    }
    
    if (this.pointerMoveHandler) {
      canvas.stage.removeEventListener('pointermove', this.pointerMoveHandler, { capture: true });
      this.pointerMoveHandler = null;
    }
    
    if (this.pointerUpHandler) {
      canvas.stage.removeEventListener('pointerup', this.pointerUpHandler, { capture: true });
      this.pointerUpHandler = null;
    }
    
    logger.info('[EditorModeService] ✅ Removed direct event listeners');
  }
  
  /**
   * Attach keyboard listener for shortcuts (Escape to end path)
   */
  private attachKeyboardListener(): void {
    this.keyDownHandler = async (event: KeyboardEvent) => {
      // Only handle when editor is active
      if (!this.active) return;
      
      // Escape key - end current river path
      if (event.key === 'Escape' && this.currentTool === 'river-edit') {
        await this.riverHandlers.endCurrentPath();
        await this.renderPathPreview();
        
        // Show notification
        const ui = (globalThis as any).ui;
        ui?.notifications?.info('River path ended (Escape pressed)');
        
        logger.info('[EditorModeService] ⌨️ Escape key - ended river path');
      }
    };
    
    document.addEventListener('keydown', this.keyDownHandler);
    logger.info('[EditorModeService] ✅ Attached keyboard listener (Escape to end path)');
  }
  
  /**
   * Remove keyboard listener
   */
  private removeKeyboardListener(): void {
    if (!this.keyDownHandler) return;
    
    document.removeEventListener('keydown', this.keyDownHandler);
    this.keyDownHandler = null;
    
    logger.info('[EditorModeService] ✅ Removed keyboard listener');
  }
  
  /**
   * Handle pointer down event (left or right click)
   */
  private handlePointerDown(event: PointerEvent): void {
    // Only handle when editor is active
    if (!this.active) return;
    
    // Allow right-click to pass through for panning
    if (event.button === 2) return;
    
    // CRITICAL: Stop left-click event propagation to block marquee selection
    event.stopImmediatePropagation();
    event.stopPropagation();
    
    // Get canvas position
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;
    
    const point = { x: event.clientX, y: event.clientY };
    const canvasPos = canvas.canvasCoordinatesFromClient(point);
    const offset = canvas.grid.getOffset(canvasPos);
    const hexId = `${offset.i}.${offset.j}`;
    
    // If no tool selected, don't apply any tool logic (but marquee is still blocked)
    if (this.currentTool === 'inactive') return;
    
    // Handle left-click (either draw or remove with Ctrl)
    if (event.button === 0) {
      logger.info(`[EditorModeService] 🖱️ Left-click on hex ${hexId} with tool ${this.currentTool}`);
      
      if (this.currentTool === 'river-edit') {
        if (event.ctrlKey) {
          // Ctrl+Click → Delete vertex
          this.handleRiverRemove(hexId, canvasPos);
        } else {
          // Normal click → Add point to path
          this.handleRiverClick(hexId, canvasPos);
        }
      } else if (this.currentTool === 'river-scissors') {
        // Scissors tool → Cut segment at click position
        this.handleRiverScissorClick(canvasPos);
      } else if (this.currentTool === 'river-reverse') {
        // Reverser tool → Reverse flow direction of path
        this.handleRiverReverseClick(canvasPos);
      } else if (this.currentTool === 'lake-toggle') {
        // Lake tool → Toggle lake feature on hex
        this.handleLakeToggle(hexId);
      } else if (this.currentTool === 'swamp-toggle') {
        // Swamp tool → Toggle swamp feature on hex
        this.handleSwampToggle(hexId);
      }
    }
  }
  
  /**
   * Handle pointer move event
   */
  private handlePointerMove(event: PointerEvent): void {
    // Allow right-click panning (check buttons bitmask during move)
    if (event.buttons & 2) return;  // Right button is pressed
    
    // Always handle when editor is active (for hover detection)
    if (!this.active) return;
    
    // CRITICAL: Stop event propagation (blocks marquee even with no tool)
    event.stopImmediatePropagation();
    event.stopPropagation();
  }
  
  /**
   * Handle pointer up event
   */
  private handlePointerUp(event: PointerEvent): void {
    // Only handle our events
    if (!this.active || !this.isDragging) return;
    
    // CRITICAL: Stop event propagation
    event.stopImmediatePropagation();
    event.stopPropagation();
    
    logger.info('[EditorModeService] 🖱️ Pointer up - drag ended');
    
    this.isDragging = false;
  }
  
  /**
   * Initialize connector layer and render all control points
   */
  private async initializeConnectorLayer(): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;

    // Destroy existing layer if it exists (ensures fresh render)
    this.destroyConnectorLayer();

    const kingdom = getKingdomData();
    
    logger.info('[EditorModeService] 📊 River editor initialized', {
      pathCount: kingdom.rivers?.paths?.length || 0,
      totalHexes: kingdom.hexes?.length || 0
    });

    // Create fresh connector layer
    this.connectorLayer = new PIXI.Container();
    this.connectorLayer.name = 'RiverConnectorLayer';
    this.connectorLayer.sortableChildren = true;
    this.connectorLayer.zIndex = 1000;
    
    const primaryGroup = canvas.primary;
    if (primaryGroup) {
      primaryGroup.addChild(this.connectorLayer);
      logger.info('[EditorModeService] ✅ Created fresh connector layer');
    } else {
      logger.error('[EditorModeService] ❌ canvas.primary not found!');
      canvas.stage.addChild(this.connectorLayer);
    }

    // Render all connector dots
    await renderRiverConnectors(this.connectorLayer, canvas, null);
  }

  /**
   * Completely destroy connector layer and all its graphics
   */
  private destroyConnectorLayer(): void {
    if (!this.connectorLayer) return;

    if (this.connectorLayer.parent) {
      this.connectorLayer.parent.removeChild(this.connectorLayer);
    }

    this.connectorLayer.destroy({ children: true });
    this.connectorLayer = null;
    
    // Also destroy river preview graphics
    this.riverHandlers.destroyPreviewGraphics();
    
    logger.info('[EditorModeService] ✅ Destroyed connector layer');
  }

  /**
   * Handle river click - delegates to RiverEditorHandlers
   */
  private async handleRiverClick(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.riverHandlers.handleRiverClick(hexId, position);
    await this.refreshWaterLayer();
    await this.renderPathPreview();
  }

  /**
   * Handle river remove - delegates to RiverEditorHandlers
   */
  private async handleRiverRemove(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.riverHandlers.handleRiverRemove(hexId, position);
    await this.refreshWaterLayer();
    await this.renderPathPreview();
  }

  /**
   * Render preview of current path - delegates to RiverEditorHandlers
   */
  private async renderPathPreview(): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.primary) return;
    
    await this.riverHandlers.renderPathPreview(canvas.primary);
  }

  /**
   * Handle river scissor click - cuts a segment at click position
   */
  private async handleRiverScissorClick(position: { x: number; y: number }): Promise<void> {
    const result = await this.riverHandlers.handleScissorClick(position);
    
    if (result.success) {
      await this.refreshWaterLayer();
      
      const ui = (globalThis as any).ui;
      if (result.pathsDeleted > 0) {
        ui?.notifications?.info(`Path cut - ${result.pathsDeleted} orphaned path(s) removed`);
      } else {
        ui?.notifications?.info('Path cut successfully');
      }
    } else {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('No river segment found at click position');
    }
  }

  /**
   * Handle river reverse click - reverses flow direction of path
   */
  private async handleRiverReverseClick(position: { x: number; y: number }): Promise<void> {
    const result = await this.riverHandlers.handleReverseClick(position);
    
    if (result.success) {
      await this.refreshWaterLayer();
      
      const ui = (globalThis as any).ui;
      ui?.notifications?.info('River flow direction reversed');
    } else {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('No river path found at click position');
    }
  }

  /**
   * Handle lake toggle - add/remove lake feature on hex
   */
  private async handleLakeToggle(hexId: string): Promise<void> {
    const parts = hexId.split('.');
    if (parts.length !== 2) return;
    
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;
    
    const { waterFeatureService } = await import('./WaterFeatureService');
    const wasAdded = await waterFeatureService.toggleLake(hexI, hexJ);
    
    await this.refreshWaterLayer();
    
    const ui = (globalThis as any).ui;
    if (wasAdded) {
      ui?.notifications?.info(`Lake added at hex (${hexI}, ${hexJ})`);
    } else {
      ui?.notifications?.info(`Lake removed from hex (${hexI}, ${hexJ})`);
    }
  }

  /**
   * Handle swamp toggle - add/remove swamp feature on hex
   */
  private async handleSwampToggle(hexId: string): Promise<void> {
    const parts = hexId.split('.');
    if (parts.length !== 2) return;
    
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;
    
    const { waterFeatureService } = await import('./WaterFeatureService');
    const wasAdded = await waterFeatureService.toggleSwamp(hexI, hexJ);
    
    await this.refreshWaterLayer();
    
    const ui = (globalThis as any).ui;
    if (wasAdded) {
      ui?.notifications?.info(`Swamp added at hex (${hexI}, ${hexJ})`);
    } else {
      ui?.notifications?.info(`Swamp removed from hex (${hexI}, ${hexJ})`);
    }
  }

  /**
   * Refresh the water layer to show updated river segments
   */
  private async refreshWaterLayer(): Promise<void> {
    try {
      const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
      const mapLayer = ReignMakerMapLayer.getInstance();
      await mapLayer.drawWaterConnections();
      logger.info('[EditorModeService] ✅ Refreshed water layer');
    } catch (error) {
      logger.error('[EditorModeService] ❌ Failed to refresh water layer:', error);
    }
  }
  
  /**
   * Cleanup water layer when exiting editor
   * Either refreshes or clears based on overlay state
   */
  private async cleanupWaterLayer(): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();
      
      // Check if water overlay is active
      const isWaterActive = overlayManager.isOverlayActive('water');
      
      if (isWaterActive) {
        // Refresh to show the saved state
        await this.refreshWaterLayer();
        logger.info('[EditorModeService] ✅ Refreshed water layer (overlay active)');
      } else {
        // Clear the water layer
        const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
        const mapLayer = ReignMakerMapLayer.getInstance();
        mapLayer.clearLayer('water');
        mapLayer.hideLayer('water');
        logger.info('[EditorModeService] ✅ Cleared water layer (overlay inactive)');
      }
    } catch (error) {
      logger.error('[EditorModeService] ❌ Failed to cleanup water layer:', error);
    }
  }
}

/**
 * Convenience function to get editor mode service instance
 */
export function getEditorModeService(): EditorModeService {
  return EditorModeService.getInstance();
}
