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
import { CrossingEditorHandlers } from './CrossingEditorHandlers';
import { RoadEditorHandlers } from './RoadEditorHandlers';
import { TerrainEditorHandlers } from './TerrainEditorHandlers';
import type { TerrainType } from '../../types/terrain';
import { WorksiteEditorHandlers } from './WorksiteEditorHandlers';
import type { WorksiteType } from './WorksiteEditorHandlers';
import { FeatureEditorHandlers } from './FeatureEditorHandlers';
import { ClaimedByEditorHandlers } from './ClaimedByEditorHandlers';

export type EditorTool = 
  | 'river-edit' | 'river-scissors' | 'river-reverse' 
  | 'lake-toggle' | 'swamp-toggle' | 'waterfall-toggle' 
  | 'bridge-toggle' | 'ford-toggle' 
  | 'road-edit' | 'road-scissors'
  | 'terrain-plains' | 'terrain-forest' | 'terrain-hills' | 'terrain-mountains' | 'terrain-swamp' | 'terrain-desert' | 'terrain-water'
  | 'bounty-food' | 'bounty-lumber' | 'bounty-stone' | 'bounty-ore' | 'bounty-gold' | 'bounty-minus'
  | 'worksite-farm' | 'worksite-lumber-mill' | 'worksite-mine' | 'worksite-quarry'
  | 'settlement-place'
  | 'fortification-tier1' | 'fortification-tier2' | 'fortification-tier3' | 'fortification-tier4'
  | 'claimed-by'
  | 'inactive';

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
  
  // Store layer interactivity state for restoration
  private savedLayerInteractivity: Map<string, boolean> = new Map();
  
  // River editing state
  private connectorLayer: PIXI.Container | null = null;
  
  // Road painting state (drag-to-paint)
  private isRoadPainting = false;
  private paintedHexesThisDrag = new Set<string>();
  private isErasing = false;
  
  // Terrain painting state (drag-to-paint)
  private isTerrainPainting = false;
  private paintedTerrainHexes = new Set<string>();
  private currentTerrainType: TerrainType | null = null;
  
  // Claimed-by painting state (drag-to-paint)
  private isClaimPainting = false;
  private paintedClaimHexes = new Set<string>();
  private currentClaimOwner: string | null = null;  // 'player' or faction ID
  private paintingClaimOwner: string | null = null;  // Owner being painted during current drag
  
  // Handler modules
  private debugHandlers = new EditorDebugHandlers();
  private riverHandlers = new RiverEditorHandlers();
  private crossingHandlers = new CrossingEditorHandlers();
  private roadHandlers = new RoadEditorHandlers();
  private terrainHandlers = new TerrainEditorHandlers();
  private bountyHandlers: any = null; // Lazy loaded
  private worksiteHandlers = new WorksiteEditorHandlers();
  private featureHandlers = new FeatureEditorHandlers();
  private claimedByHandlers = new ClaimedByEditorHandlers();
  
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
    
    // CRITICAL FIX: Clear ALL map layers before starting editor
    // This ensures no stale graphics from any source (overlays, scene control, etc.)
    const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
    const mapLayer = ReignMakerMapLayer.getInstance();
    mapLayer.clearAllLayers();
    logger.info('[EditorModeService] Cleared all map layer graphics before editor start');
    
    // Also clear overlay manager state
    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();
    overlayManager.clearAll(false); // Don't preserve state, we'll set fresh overlays
    
    // Attach direct event listeners to canvas stage
    this.attachDirectEventListeners();
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
    
    // Auto-toggle relevant overlay layer for the tool
    await this.autoToggleOverlayForTool(tool);
    
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
    
    // Force Svelte reactivity by creating new array reference
    // This ensures the Territory tab and other components refresh on save
    await updateKingdom(kingdom => {
      kingdom.hexes = [...kingdom.hexes];
    });
    
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
   * Handle pointer down event (left or right click)
   */
  private async handlePointerDown(event: PointerEvent): Promise<void> {
    // Only handle when editor is active
    if (!this.active) return;
    
    // Allow right-click to pass through for panning
    if (event.button === 2) return;
    
    // CRITICAL: Allow clicks on editor panel UI to pass through
    // Check if the click is on the editor panel (or its children)
    const target = event.target as HTMLElement;
    if (target?.closest?.('.editor-mode-panel')) {
      // Click is on editor panel UI - let it through
      return;
    }
    
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
        // Lake tool → Toggle lake feature on hex (Ctrl+Click to force remove)
        this.handleLakeToggle(hexId, event.ctrlKey);
      } else if (this.currentTool === 'swamp-toggle') {
        // Swamp tool → Toggle swamp feature on hex (Ctrl+Click to force remove)
        this.handleSwampToggle(hexId, event.ctrlKey);
      } else if (this.currentTool === 'waterfall-toggle') {
        // Waterfall tool → Toggle waterfall on edge
        this.handleWaterfallToggle(hexId, canvasPos);
      } else if (this.currentTool === 'bridge-toggle') {
        // Bridge tool → Toggle bridge crossing on edge
        this.handleBridgeToggle(hexId, canvasPos);
      } else if (this.currentTool === 'ford-toggle') {
        // Ford tool → Toggle ford crossing on edge
        this.handleFordToggle(hexId, canvasPos);
      } else if (this.currentTool === 'road-edit') {
        // Road tool → Start painting roads (drag-to-paint mode)
        this.isRoadPainting = true;
        this.isErasing = event.ctrlKey;
        this.paintedHexesThisDrag.clear();
        
        // Paint the first hex
        this.handleRoadToggle(hexId, event.ctrlKey);
        this.paintedHexesThisDrag.add(hexId);
      } else if (this.currentTool === 'road-scissors') {
        // Road scissors → Cut road segment at click position
        this.handleRoadScissorClick(canvasPos);
      } else if (this.currentTool.startsWith('terrain-')) {
        // Terrain tool → Start painting terrain (drag-to-paint mode)
        const terrainType = this.currentTool.replace('terrain-', '') as TerrainType;
        this.currentTerrainType = terrainType;
        this.isTerrainPainting = true;
        this.paintedTerrainHexes.clear();
        
        // Paint the first hex
        this.terrainHandlers.paintTerrain(hexId, terrainType);
        this.paintedTerrainHexes.add(hexId);
        await this.refreshTerrainOverlay();
      } else if (this.currentTool.startsWith('bounty-')) {
        // Bounty tool → Add/subtract commodity on hex
        await this.handleBountyEdit(hexId, event.ctrlKey);
      } else if (this.currentTool.startsWith('worksite-')) {
        // Worksite tool → Place/remove worksite on hex
        await this.handleWorksiteEdit(hexId, event.ctrlKey);
      } else if (this.currentTool === 'settlement-place') {
        // Settlement tool → Place/remove settlement
        await this.handleSettlementEdit(hexId, event.ctrlKey);
      } else if (this.currentTool.startsWith('fortification-')) {
        // Fortification tool → Place/remove fortification
        await this.handleFortificationEdit(hexId, event.ctrlKey);
      } else if (this.currentTool === 'claimed-by') {
        // Claimed-by tool → Start painting territory claims (drag-to-paint mode)
        this.isClaimPainting = true;
        this.paintedClaimHexes.clear();
        
        // Determine claim owner (null if Ctrl for removal, otherwise use stored owner)
        this.paintingClaimOwner = event.ctrlKey ? null : this.currentClaimOwner;
        
        // Paint the first hex
        await this.handleClaimEdit(hexId, this.paintingClaimOwner);
        this.paintedClaimHexes.add(hexId);
      }
    }
  }
  
  /**
   * Handle pointer move event
   */
  private async handlePointerMove(event: PointerEvent): Promise<void> {
    // Allow right-click panning (check buttons bitmask during move)
    if (event.buttons & 2) return;  // Right button is pressed
    
    // Always handle when editor is active (for hover detection)
    if (!this.active) return;
    
    // CRITICAL: Stop event propagation (blocks marquee even with no tool)
    event.stopImmediatePropagation();
    event.stopPropagation();
    
    // Handle road painting (drag-to-paint)
    if (this.isRoadPainting && this.currentTool === 'road-edit') {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;
      
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const offset = canvas.grid.getOffset(canvasPos);
      const hexId = `${offset.i}.${offset.j}`;
      
      // Only paint if we haven't already painted this hex during this drag
      if (!this.paintedHexesThisDrag.has(hexId)) {
        this.handleRoadToggle(hexId, this.isErasing);
        this.paintedHexesThisDrag.add(hexId);
      }
    }
    
    // Handle terrain painting (drag-to-paint)
    if (this.isTerrainPainting && this.currentTerrainType) {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;
      
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const offset = canvas.grid.getOffset(canvasPos);
      const hexId = `${offset.i}.${offset.j}`;
      
      // Only paint if we haven't already painted this hex during this drag
      if (!this.paintedTerrainHexes.has(hexId)) {
        this.terrainHandlers.paintTerrain(hexId, this.currentTerrainType);
        this.paintedTerrainHexes.add(hexId);
        await this.refreshTerrainOverlay();
      }
    }
    
    // Handle claim painting (drag-to-paint)
    if (this.isClaimPainting) {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;
      
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const offset = canvas.grid.getOffset(canvasPos);
      const hexId = `${offset.i}.${offset.j}`;
      
      // Only paint if we haven't already painted this hex during this drag
      if (!this.paintedClaimHexes.has(hexId)) {
        await this.handleClaimEdit(hexId, this.paintingClaimOwner);
        this.paintedClaimHexes.add(hexId);
      }
    }
  }
  
  /**
   * Handle pointer up event
   */
  private handlePointerUp(event: PointerEvent): void {
    // Only handle our events
    if (!this.active) return;
    
    // Handle road painting stop
    if (this.isRoadPainting) {
      this.isRoadPainting = false;
      this.paintedHexesThisDrag.clear();
      this.isErasing = false;
      
      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();
      
      logger.info('[EditorModeService] 🖱️ Road painting ended');
      return;
    }
    
    // Handle terrain painting stop
    if (this.isTerrainPainting) {
      this.isTerrainPainting = false;
      this.paintedTerrainHexes.clear();
      this.currentTerrainType = null;
      
      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();
      
      logger.info('[EditorModeService] 🖱️ Terrain painting ended');
      return;
    }
    
    // Handle claim painting stop
    if (this.isClaimPainting) {
      this.isClaimPainting = false;
      this.paintedClaimHexes.clear();
      this.paintingClaimOwner = null;
      
      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();
      
      logger.info('[EditorModeService] 🖱️ Claim painting ended');
      return;
    }
    
    // Handle generic drag end
    if (this.isDragging) {
      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();
      
      logger.info('[EditorModeService] 🖱️ Pointer up - drag ended');
      
      this.isDragging = false;
    }
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
   * Ctrl+Click forces removal regardless of tool
   */
  private async handleLakeToggle(hexId: string, isCtrlPressed: boolean): Promise<void> {
    const parts = hexId.split('.');
    if (parts.length !== 2) return;
    
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;
    
    const { waterFeatureService } = await import('./WaterFeatureService');
    await waterFeatureService.toggleLake(hexI, hexJ, isCtrlPressed);
    
    await this.refreshWaterLayer();
  }

  /**
   * Handle swamp toggle - add/remove swamp feature on hex
   * Ctrl+Click forces removal regardless of tool
   */
  private async handleSwampToggle(hexId: string, isCtrlPressed: boolean): Promise<void> {
    const parts = hexId.split('.');
    if (parts.length !== 2) return;
    
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;
    
    const { waterFeatureService } = await import('./WaterFeatureService');
    await waterFeatureService.toggleSwamp(hexI, hexJ, isCtrlPressed);
    
    await this.refreshWaterLayer();
  }

  /**
   * Handle waterfall toggle - add/remove waterfall on hex edge
   */
  private async handleWaterfallToggle(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.crossingHandlers.handleWaterfallClick(hexId, position);
    await this.refreshWaterLayer();
  }

  /**
   * Handle bridge toggle - add/remove bridge crossing on hex edge
   */
  private async handleBridgeToggle(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.crossingHandlers.handleBridgeClick(hexId, position);
    await this.refreshWaterLayer();
  }

  /**
   * Handle ford toggle - add/remove ford crossing on hex edge
   */
  private async handleFordToggle(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.crossingHandlers.handleFordClick(hexId, position);
    await this.refreshWaterLayer();
  }

  /**
   * Handle road toggle - add/remove road on hex center
   */
  private async handleRoadToggle(hexId: string, isCtrlPressed: boolean): Promise<void> {
    await this.roadHandlers.handleRoadToggle(hexId, isCtrlPressed);
    await this.refreshRoadLayer();
  }

  /**
   * Handle road scissor click - cuts a road segment at click position
   */
  private async handleRoadScissorClick(position: { x: number; y: number }): Promise<void> {
    const result = await this.roadHandlers.handleScissorClick(position);
    
    if (result.success) {
      await this.refreshRoadLayer();
    } else {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('No road segment found at click position');
    }
  }

  /**
   * Handle bounty edit - add/subtract commodity on hex
   * - Normal click: Add commodity
   * - Ctrl+Click: Subtract commodity
   * - Minus tool: Always subtract (regardless of Ctrl)
   * Overlay automatically updates via reactive subscription
   */
  private async handleBountyEdit(hexId: string, isCtrlPressed: boolean): Promise<void> {
    // Lazy load bounty handlers
    if (!this.bountyHandlers) {
      const { BountyEditorHandlers } = await import('./BountyEditorHandlers');
      this.bountyHandlers = new BountyEditorHandlers();
    }
    
    // Determine if we're subtracting
    const isSubtracting = this.currentTool === 'bounty-minus' || isCtrlPressed;
    
    if (isSubtracting) {
      // Subtract mode - clear all commodities on this hex
      await this.bountyHandlers.clearCommodities(hexId);
    } else {
      // Add mode - extract commodity type from tool name ('bounty-food' -> 'food')
      const commodityType = this.currentTool.replace('bounty-', '') as any;
      await this.bountyHandlers.addCommodity(hexId, commodityType);
    }
  }

  /**
   * Handle worksite edit - place/remove worksite on hex
   * - Normal click: Place worksite (validates terrain)
   * - Ctrl+Click: Remove worksite
   * Overlay automatically updates via reactive subscription
   */
  private async handleWorksiteEdit(hexId: string, isCtrlPressed: boolean): Promise<void> {
    if (isCtrlPressed) {
      // Remove mode - remove any worksite
      await this.worksiteHandlers.removeWorksite(hexId);
    } else {
      // Place mode - extract worksite type from tool name and validate
      const worksiteTypeMap: Record<string, WorksiteType> = {
        'worksite-farm': 'Farmstead',
        'worksite-lumber-mill': 'Logging Camp',
        'worksite-mine': 'Mine',
        'worksite-quarry': 'Quarry'
      };
      
      const worksiteType = worksiteTypeMap[this.currentTool];
      if (worksiteType) {
        await this.worksiteHandlers.placeWorksite(hexId, worksiteType);
      }
    }
  }

  /**
   * Handle settlement edit - place/remove settlement
   * - Normal click: Place settlement (prompts for name)
   * - Ctrl+Click: Remove settlement
   */
  private async handleSettlementEdit(hexId: string, isCtrlPressed: boolean): Promise<void> {
    if (isCtrlPressed) {
      // Remove mode - remove settlement
      await this.featureHandlers.removeSettlement(hexId);
    } else {
      // Place mode - prompt for name and place settlement
      await this.featureHandlers.placeSettlement(hexId);
    }
  }

  /**
   * Handle fortification edit - place/remove fortification
   * - Normal click: Place fortification at selected tier
   * - Ctrl+Click: Remove fortification
   */
  private async handleFortificationEdit(hexId: string, isCtrlPressed: boolean): Promise<void> {
    if (isCtrlPressed) {
      // Remove mode - remove fortification
      await this.featureHandlers.removeFortification(hexId);
    } else {
      // Place mode - extract tier from tool name
      const tierMap: Record<string, 1 | 2 | 3 | 4> = {
        'fortification-tier1': 1,
        'fortification-tier2': 2,
        'fortification-tier3': 3,
        'fortification-tier4': 4
      };
      
      const tier = tierMap[this.currentTool];
      if (tier) {
        await this.featureHandlers.placeFortification(hexId, tier);
      }
    }
  }

  /**
   * Handle claim edit - claim/unclaim hex for player or faction
   * - Normal click/drag: Claim for selected owner (player or faction)
   * - Ctrl+Click/drag: Remove claim (set to null)
   * Overlay automatically updates via reactive subscription
   */
  private async handleClaimEdit(hexId: string, claimOwner: string | null): Promise<void> {
    await this.claimedByHandlers.claimHex(hexId, claimOwner);
  }

  /**
   * Set the current claim owner for the claimed-by tool
   * @param owner - 'player' for player kingdom, faction ID, or null for unclaimed
   */
  setClaimOwner(owner: string | null): void {
    this.currentClaimOwner = owner;
    logger.info(`[EditorModeService] Set claim owner: ${owner || 'unclaimed'}`);
  }

  /**
   * Get the current claim owner
   */
  getClaimOwner(): string | null {
    return this.currentClaimOwner;
  }

  /**
   * Refresh the water layer to show updated river segments
   * CRITICAL: Always clears before drawing to prevent graphics stacking
   */
  private async refreshWaterLayer(): Promise<void> {
    try {
      const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
      const mapLayer = ReignMakerMapLayer.getInstance();
      
      // ✅ CRITICAL: Clear layer first to prevent stacking graphics
      // Each call to drawWaterConnections adds new graphics, so we must clear old ones
      mapLayer.clearLayer('water');
      
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

  /**
   * Refresh the road layer to show updated road segments
   */
  private async refreshRoadLayer(): Promise<void> {
    try {
      const { getKingdomActor } = await import('../../main.kingdom');
      const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
      
      const mapLayer = ReignMakerMapLayer.getInstance();
      const kingdomActor = await getKingdomActor();
      
      if (!kingdomActor) {
        logger.warn('[EditorModeService] No kingdom actor found');
        return;
      }
      
      const kingdom = kingdomActor.getKingdomData();
      if (!kingdom) {
        logger.warn('[EditorModeService] No kingdom data found');
        return;
      }
      
      // Get all hexes with roads
      const roadHexIds = kingdom.hexes?.filter(h => h.hasRoad).map(h => h.id) || [];
      
      // Clear and redraw roads
      mapLayer.clearLayer('routes');
      await mapLayer.drawRoadConnections(roadHexIds, 'routes');
      logger.info('[EditorModeService] ✅ Refreshed road layer');
    } catch (error) {
      logger.error('[EditorModeService] ❌ Failed to refresh road layer:', error);
    }
  }
  
  /**
   * Auto-toggle overlay layer for the current tool
   * Shows the relevant overlay and hides others using centralized OverlayManager
   */
  private async autoToggleOverlayForTool(tool: EditorTool): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();
      
      // Map tools to their corresponding overlay IDs (can be single or multiple)
      const toolOverlayMap: Record<string, string[] | null> = {
        'road-edit': ['roads'],
        'road-scissors': ['roads'],
        'river-edit': ['water'],
        'river-scissors': ['water'],
        'river-reverse': ['water'],
        'lake-toggle': ['water'],
        'swamp-toggle': ['water'],
        'waterfall-toggle': ['water'],
        'bridge-toggle': ['water'],
        'ford-toggle': ['water'],
        'terrain-plains': ['terrain'],
        'terrain-forest': ['terrain'],
        'terrain-hills': ['terrain'],
        'terrain-mountains': ['terrain'],
        'terrain-swamp': ['terrain'],
        'terrain-desert': ['terrain'],
        'terrain-water': ['terrain'],
        'bounty-food': ['resources'],
        'bounty-lumber': ['resources'],
        'bounty-stone': ['resources'],
        'bounty-ore': ['resources'],
        'bounty-gold': ['resources'],
        'bounty-minus': ['resources'],
        'worksite-farm': ['worksites'],
        'worksite-lumber-mill': ['worksites'],
        'worksite-mine': ['worksites'],
        'worksite-quarry': ['worksites'],
        'settlement-place': ['settlements', 'settlement-labels'],  // Show both hex highlights and labels
        'fortification-tier1': ['fortifications'],
        'fortification-tier2': ['fortifications'],
        'fortification-tier3': ['fortifications'],
        'fortification-tier4': ['fortifications'],
        'claimed-by': ['territories'],
        'inactive': null
      };
      
      const requiredOverlays = toolOverlayMap[tool];
      
      if (requiredOverlays) {
        // Use centralized setActiveOverlays to manage overlay state
        await overlayManager.setActiveOverlays(requiredOverlays);
      }
    } catch (error) {
      logger.error('[EditorModeService] ❌ Failed to auto-toggle overlay:', error);
    }
  }
  
  /**
   * Refresh the terrain overlay to show updated terrain types
   */
  private async refreshTerrainOverlay(): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();
      
      // Check if terrain overlay is active
      const isTerrainActive = overlayManager.isOverlayActive('terrain');
      
      if (isTerrainActive) {
        // Get kingdom data for hex terrain info
        const kingdom = getKingdomData();
        const hexData = kingdom.hexes?.map(h => ({
          id: h.id,
          terrain: h.terrain || 'plains'
        })) || [];
        
        // Refresh terrain overlay using the map layer
        const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
        const mapLayer = ReignMakerMapLayer.getInstance();
        
        // Clear and redraw terrain overlay
        mapLayer.clearLayer('terrain-overlay');
        mapLayer.drawTerrainOverlay(hexData);
        logger.info('[EditorModeService] ✅ Refreshed terrain overlay');
      }
    } catch (error) {
      logger.error('[EditorModeService] ❌ Failed to refresh terrain overlay:', error);
    }
  }
}

/**
 * Convenience function to get editor mode service instance
 */
export function getEditorModeService(): EditorModeService {
  return EditorModeService.getInstance();
}
