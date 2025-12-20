/**
 * EditorModeService - Map editor for GM to modify kingdom data
 * 
 * Provides pencil/eraser tools for editing rivers, roads, territories, etc.
 * Uses save/cancel pattern: backup data on enter, restore on cancel, commit on save.
 * 
 * Mouse handling: Uses Foundry's MouseInteractionManager to intercept all canvas events
 * during editor mode, preventing marquee selection and other unwanted interactions.
 */

import { getKingdomData, updateKingdom } from '../../../stores/KingdomStore';
import type { KingdomData } from '../../../actors/KingdomActor';
import { logger } from '../../../utils/Logger';
import { 
  disableCanvasLayerInteractivity, 
  restoreCanvasLayerInteractivity 
} from '../../../utils/canvasLayerInteractivity';
import { renderRiverConnectors } from '../renderers/RiverConnectorRenderer';
import { EditorDebugHandlers } from '../editors/EditorDebugHandlers';
import { RiverEditorHandlers } from '../editors/RiverEditorHandlers';
import { CrossingEditorHandlers } from '../editors/CrossingEditorHandlers';
import { RoadEditorHandlers } from '../editors/RoadEditorHandlers';
import { TerrainEditorHandlers } from '../editors/TerrainEditorHandlers';
import type { TerrainType } from '../../../types/terrain';
import { WorksiteEditorHandlers } from '../editors/WorksiteEditorHandlers';
import type { WorksiteType } from '../editors/WorksiteEditorHandlers';
import { FeatureEditorHandlers } from '../editors/FeatureEditorHandlers';
import { ClaimedByEditorHandlers } from '../editors/ClaimedByEditorHandlers';

export type EditorTool = 
  | 'river-edit' | 'river-scissors' | 'river-reverse' 
  | 'lake-toggle' | 'swamp-toggle' | 'waterfall-toggle' 
  | 'bridge-toggle' | 'ford-toggle' 
  | 'road-edit' | 'road-scissors'
  | 'terrain-plains' | 'terrain-forest' | 'terrain-hills' | 'terrain-mountains' | 'terrain-swamp' | 'terrain-desert' | 'terrain-water'
  | 'bounty-food' | 'bounty-lumber' | 'bounty-stone' | 'bounty-ore' | 'bounty-gold' | 'bounty-minus'
  | 'worksite-farm' | 'worksite-lumber-mill' | 'worksite-mine' | 'worksite-quarry' | 'worksite-minus'
  | 'settlement-place' | 'settlement-minus'
  | 'fortification-tier1' | 'fortification-tier2' | 'fortification-tier3' | 'fortification-tier4'
  | 'claimed-by'
  | 'inactive';

/**
 * High-level editor modes that group related tools and define default overlay configurations
 */
export type EditorMode = 
  | 'waterways'      // Rivers, lakes, swamps
  | 'crossings'      // Waterfalls, bridges, fords
  | 'roads'          // Road network
  | 'terrain'        // Terrain types
  | 'bounty'         // Resource bounties
  | 'worksites'      // Worksites
  | 'settlements'    // Settlements
  | 'fortifications' // Fortifications
  | 'territory';     // Territory claims

/**
 * Default overlay configurations for each editor mode
 * These overlays are shown when entering a mode, but users can toggle them freely
 */
const EDITOR_MODE_OVERLAYS: Record<EditorMode, string[]> = {
  'waterways': ['water'],
  'crossings': ['water'],
  'roads': ['roads', 'territory-border', 'settlement-icons', 'settlement-labels'],
  'terrain': ['terrain'],
  'bounty': ['resources'],
  'worksites': ['worksites', 'terrain','territory-border'],
  'settlements': ['settlements', 'settlement-labels'],
  'fortifications': ['fortifications','territory-border'],
  'territory': ['territories','territory-border']
};

/**
 * Singleton service for map editing
 */
export class EditorModeService {
  private static instance: EditorModeService | null = null;
  
  private active = false;
  private currentTool: EditorTool = 'inactive';
  private currentMode: EditorMode | null = null;
  private backupKingdomData: KingdomData | null = null;
  private isDragging = false;
  
  // Direct PIXI event handlers for canvas events during editor mode
  private pointerDownHandler: ((event: PointerEvent) => void) | null = null;
  private pointerMoveHandler: ((event: PointerEvent) => void) | null = null;
  private pointerUpHandler: ((event: PointerEvent) => void) | null = null;
  
  // Store layer interactivity state for restoration
  private savedLayerInteractivity: Map<string, boolean> = new Map();
  
  // Store previous active scene control for restoration
  private previousActiveControl: string | null = null;
  private previousTokenActiveTool: string | null = null;
  
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
  
  // Bounty painting state (drag-to-paint)
  private isBountyPainting = false;
  private paintedBountyHexes = new Set<string>();
  
  // Worksite painting state (drag-to-paint)
  private isWorksitePainting = false;
  private paintedWorksiteHexes = new Set<string>();
  
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
   *
   * OVERLAY MANAGEMENT:
   * - Preserves user's current overlay state via overlay stack
   * - Clears all graphics layers for clean slate
   * - Does NOT set default overlays yet - wait for setEditorMode() call
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

    // CRITICAL: Push overlay state FIRST before any operations
    // This must happen before setting this.active = true so we can clean up on error
    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();
    overlayManager.pushOverlayState();
    logger.info('[EditorModeService] Saved user overlay state to stack');

    try {
      this.active = true;
      this.currentTool = 'inactive';
      this.currentMode = null;

      // Disable canvas layer interactivity (prevents token/tile selection)
      this.savedLayerInteractivity = disableCanvasLayerInteractivity();

      // Clear ALL map layers for clean slate (but don't touch overlay manager state yet)
      const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
      const mapLayer = ReignMakerMapLayer.getInstance();
      mapLayer.clearAllLayers();
      logger.info('[EditorModeService] Cleared all map layer graphics before editor start');

      // Disable Foundry token scene control by activating our custom control
      this.disableTokenSceneControl();

      // Attach direct event listeners to canvas stage
      this.attachDirectEventListeners();

      // Note: Default overlays will be set when setEditorMode() is called
    } catch (error) {
      // If anything fails during setup, restore overlay state and rethrow
      logger.error('[EditorModeService] ❌ Failed to enter editor mode, restoring state:', error);
      this.active = false;
      await overlayManager.popOverlayState();
      throw error;
    }
  }
  
  /**
   * Exit editor mode - restore original mouse manager and user's overlay state
   *
   * OVERLAY MANAGEMENT:
   * - Restores user's pre-editor overlay configuration via overlay stack
   * - Cleans up editor-only graphics layers
   * - Refreshes active overlays to ensure proper rendering
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

    // Restore previous active scene control
    this.restoreTokenSceneControl();

    // CRITICAL: Restore user's pre-editor overlay state from stack
    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();
    const restored = await overlayManager.popOverlayState();
    if (restored) {
      logger.info('[EditorModeService] Restored user overlay state from stack');
      // Refresh all active overlays to ensure they render with current data
      // This catches any cases where layers might have been affected by editor operations
      await overlayManager.refreshActiveOverlays();
    } else {
      logger.warn('[EditorModeService] No overlay state to restore (stack was empty)');
    }

    this.active = false;
    this.currentTool = 'inactive';
    this.currentMode = null;
    this.backupKingdomData = null;
    this.isDragging = false;
  }
  
  /**
   * Set editor mode - applies default overlay configuration for the mode
   * This is the high-level mode change (e.g., switching from waterways to roads)
   * 
   * @param mode - The editor mode to activate
   */
  async setEditorMode(mode: EditorMode): Promise<void> {
    logger.info(`[EditorModeService] Setting editor mode: ${mode}`);
    this.currentMode = mode;
    
    // Apply default overlay configuration for this mode using OverlayManager
    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();
    const defaultOverlays = EDITOR_MODE_OVERLAYS[mode];
    
    if (defaultOverlays && defaultOverlays.length > 0) {
      // Use setActiveOverlays to establish the mode's default overlay set
      // This is the ONLY place we use setActiveOverlays - not in per-tool changes
      await overlayManager.setActiveOverlays(defaultOverlays);
      logger.info(`[EditorModeService] Applied default overlays for ${mode}:`, defaultOverlays);
    }
  }
  
  /**
   * Set current editing tool
   * This is a fine-grained tool change within a mode (e.g., river-edit to river-scissors)
   * 
   * OVERLAY BEHAVIOR:
   * - Ensures required overlays for the tool are ON (additive)
   * - Does NOT hide other overlays (respects user toggles)
   */
  async setTool(tool: EditorTool): Promise<void> {
    logger.info(`[EditorModeService] Setting tool: ${tool}`);
    this.currentTool = tool;
    
    // Ensure required overlays for this tool are visible (additive, not exclusive)
    await this.ensureToolOverlaysVisible(tool);
    
    // Render connectors when river-edit or crossing tools are activated
    const needsConnectors = tool === 'river-edit' || 
                           tool === 'bridge-toggle' || 
                           tool === 'ford-toggle' || 
                           tool === 'waterfall-toggle';
    
    logger.info(`[EditorModeService] Tool=${tool}, needsConnectors=${needsConnectors}`);
    
    if (needsConnectors) {
      logger.info('[EditorModeService] Initializing connector layer...');
      await this.initializeConnectorLayer();
    } else {
      // Completely destroy connector layer when switching away from connector-based tools
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
   * Disable Foundry token scene control by activating a different control group
   * Based on Foundry v13 API: SceneControl interface with activeTool property
   * Reference: https://foundryvtt.com/api/interfaces/foundry.SceneControl.html
   */
  private disableTokenSceneControl(): void {
    try {
      const game = (globalThis as any).game;
      const ui = (globalThis as any).ui;
      
      if (!game || !ui?.controls?.control) {
        logger.warn('[EditorModeService] SceneControls not available');
        return;
      }
      
      const controls = ui.controls.control;
      
      // Save current active control group
      this.previousActiveControl = controls.activeControl || null;
      
      // Save the token control's active tool if token control is currently active
      const tokenControl = controls.controls?.['token'];
      if (tokenControl && this.previousActiveControl === 'token') {
        this.previousTokenActiveTool = tokenControl.activeTool || null;
      } else {
        this.previousTokenActiveTool = null;
      }
      
      // Activate a neutral control group to deactivate token control
      // In Foundry v13, only one control group can be active at a time
      // Activating 'tiles' will automatically deactivate 'token'
      const fallbackControls = ['tiles', 'walls', 'lighting', 'sounds'];
      let activated = false;
      
      for (const controlName of fallbackControls) {
        if (controls.controls?.[controlName]) {
          controls.activeControl = controlName;
          controls.render();
          activated = true;
          logger.info(`[EditorModeService] ✅ Disabled token scene control (switched to: ${controlName}, previous: ${this.previousActiveControl || 'none'})`);
          break;
        }
      }
      
      if (!activated) {
        // Last resort: try to clear activeControl (may not work in all Foundry versions)
        controls.activeControl = null;
        controls.render();
        logger.info(`[EditorModeService] ✅ Disabled token scene control (cleared activeControl, previous: ${this.previousActiveControl || 'none'})`);
      }
    } catch (error) {
      logger.warn('[EditorModeService] Failed to disable token scene control:', error);
    }
  }
  
  /**
   * Restore previous active scene control and tool
   * Based on Foundry v13 API: SceneControl interface with activeTool property
   * Reference: https://foundryvtt.com/api/interfaces/foundry.SceneControl.html
   */
  private restoreTokenSceneControl(): void {
    try {
      const game = (globalThis as any).game;
      const ui = (globalThis as any).ui;
      
      if (!game || !ui?.controls?.control) {
        logger.warn('[EditorModeService] SceneControls not available for restore');
        return;
      }
      
      const controls = ui.controls.control;
      
      // Restore previous active control group if we saved one
      if (this.previousActiveControl !== null) {
        controls.activeControl = this.previousActiveControl;
        
        // If we're restoring the token control, also restore its active tool
        if (this.previousActiveControl === 'token' && this.previousTokenActiveTool !== null) {
          const tokenControl = controls.controls?.['token'];
          if (tokenControl) {
            tokenControl.activeTool = this.previousTokenActiveTool;
          }
        }
        
        controls.render();
        logger.info(`[EditorModeService] ✅ Restored previous active control: ${this.previousActiveControl}${this.previousTokenActiveTool ? ` (tool: ${this.previousTokenActiveTool})` : ''}`);
      } else {
        // If no previous control, clear active control
        controls.activeControl = null;
        controls.render();
        logger.info('[EditorModeService] ✅ Cleared active control (no previous state)');
      }
      
      // Reset saved state
      this.previousActiveControl = null;
      this.previousTokenActiveTool = null;
    } catch (error) {
      logger.warn('[EditorModeService] Failed to restore token scene control:', error);
    }
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
        // Bounty tool → Start painting bounty (drag-to-paint mode)
        this.isBountyPainting = true;
        this.paintedBountyHexes.clear();
        
        // Paint the first hex
        await this.handleBountyEdit(hexId, event.ctrlKey);
        this.paintedBountyHexes.add(hexId);
      } else if (this.currentTool.startsWith('worksite-')) {
        // Worksite tool → Start painting worksite (drag-to-paint mode)
        this.isWorksitePainting = true;
        this.paintedWorksiteHexes.clear();
        
        // Paint the first hex
        await this.handleWorksiteEdit(hexId, event.ctrlKey);
        this.paintedWorksiteHexes.add(hexId);
      } else if (this.currentTool === 'settlement-place') {
        // Settlement tool → Place/edit settlement
        await this.handleSettlementEdit(hexId, false);
      } else if (this.currentTool === 'settlement-minus') {
        // Settlement minus tool → Remove settlement
        await this.handleSettlementEdit(hexId, true);
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
    
    // Handle bounty painting (drag-to-paint)
    if (this.isBountyPainting && this.currentTool.startsWith('bounty-')) {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;
      
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const offset = canvas.grid.getOffset(canvasPos);
      const hexId = `${offset.i}.${offset.j}`;
      
      // Only paint if we haven't already painted this hex during this drag
      if (!this.paintedBountyHexes.has(hexId)) {
        await this.handleBountyEdit(hexId, false); // Don't pass ctrlKey, tool determines behavior
        this.paintedBountyHexes.add(hexId);
      }
    }
    
    // Handle worksite painting (drag-to-paint)
    if (this.isWorksitePainting && this.currentTool.startsWith('worksite-')) {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;
      
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const offset = canvas.grid.getOffset(canvasPos);
      const hexId = `${offset.i}.${offset.j}`;
      
      // Only paint if we haven't already painted this hex during this drag
      if (!this.paintedWorksiteHexes.has(hexId)) {
        await this.handleWorksiteEdit(hexId, false); // Don't pass ctrlKey, tool determines behavior
        this.paintedWorksiteHexes.add(hexId);
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
    
    // Handle bounty painting stop
    if (this.isBountyPainting) {
      this.isBountyPainting = false;
      this.paintedBountyHexes.clear();
      
      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();
      
      logger.info('[EditorModeService] 🖱️ Bounty painting ended');
      return;
    }
    
    // Handle worksite painting stop
    if (this.isWorksitePainting) {
      this.isWorksitePainting = false;
      this.paintedWorksiteHexes.clear();
      
      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();
      
      logger.info('[EditorModeService] 🖱️ Worksite painting ended');
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
   * 
   * EDITOR-ONLY GRAPHICS:
   * - Creates a separate PIXI.Container for connector dots (not part of overlay system)
   * - These graphics are editor-specific and don't interfere with overlay rendering
   */
  private async initializeConnectorLayer(): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[EditorModeService] ❌ Canvas grid not available, cannot initialize connectors');
      return;
    }

    // Destroy existing layer if it exists (ensures fresh render)
    this.destroyConnectorLayer();

    const kingdom = getKingdomData();
    
    logger.info('[EditorModeService] 📊 Initializing connector layer', {
      pathCount: kingdom.rivers?.paths?.length || 0,
      totalHexes: kingdom.hexes?.length || 0
    });

    // Create fresh connector layer
    this.connectorLayer = new PIXI.Container();
    this.connectorLayer.name = 'RiverConnectorLayer';
    this.connectorLayer.sortableChildren = true;
    this.connectorLayer.zIndex = 1000;
    this.connectorLayer.visible = true;
    
    const primaryGroup = canvas.primary;
    if (primaryGroup) {
      primaryGroup.addChild(this.connectorLayer);
      logger.info('[EditorModeService] ✅ Added connector layer to canvas.primary');
    } else {
      logger.error('[EditorModeService] ❌ canvas.primary not found!');
      canvas.stage.addChild(this.connectorLayer);
    }

    // Render all connector dots
    logger.info('[EditorModeService] 🎨 Rendering river connectors...');
    await renderRiverConnectors(this.connectorLayer, canvas, null);
    
    logger.info('[EditorModeService] ✅ Connector layer initialized with', this.connectorLayer.children.length, 'children');
  }

  /**
   * Completely destroy connector layer and all its graphics
   * 
   * EDITOR-ONLY GRAPHICS CLEANUP:
   * - Removes connector dots container from PIXI stage
   * - Destroys preview graphics (orange path line)
   * - These are separate from overlay-managed layers and must be cleaned up manually
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
      const { BountyEditorHandlers } = await import('../editors/BountyEditorHandlers');
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
   * - Minus tool: Always remove (regardless of Ctrl)
   * Overlay automatically updates via reactive subscription
   */
  private async handleWorksiteEdit(hexId: string, isCtrlPressed: boolean): Promise<void> {
    // Determine if we're removing
    const isRemoving = this.currentTool === 'worksite-minus' || isCtrlPressed;
    
    if (isRemoving) {
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
   * Handle settlement edit - place/edit/remove settlement
   * - Place tool: Create new settlement or edit existing
   * - Minus tool: Remove settlement feature (preserves settlement data by unlinking)
   */
  private async handleSettlementEdit(hexId: string, isRemoving: boolean): Promise<void> {
    if (isRemoving) {
      // Remove mode - remove settlement feature (preserves settlement data)
      await this.featureHandlers.removeSettlementFeature(hexId);
    } else {
      // Place/edit mode - prompt for name and place settlement or edit existing
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
   * OVERLAY-AWARE: Only draws if water overlay is active
   */
  private async refreshWaterLayer(): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const { ReignMakerMapLayer } = await import('./ReignMakerMapLayer');
      const overlayManager = getOverlayManager();
      const mapLayer = ReignMakerMapLayer.getInstance();
      
      // Check if water overlay is active before drawing
      if (!overlayManager.isOverlayActive('water')) {
        logger.info('[EditorModeService] Skipping water layer refresh (overlay inactive)');
        return;
      }
      
      // ✅ CRITICAL: Clear layer first to prevent stacking graphics
      // Each call to drawWaterConnections adds new graphics, so we must clear old ones
      mapLayer.clearLayer('water');
      
      // Highlight the currently edited river path (if any) by passing activePathId
      const activePathId = this.currentTool === 'river-edit'
        ? this.riverHandlers.getCurrentPathId()
        : null;
      
      await mapLayer.drawWaterConnections('water', activePathId);
      logger.info('[EditorModeService] ✅ Refreshed water layer');
    } catch (error) {
      logger.error('[EditorModeService] ❌ Failed to refresh water layer:', error);
    }
  }
  

  /**
   * Refresh the road layer to show updated road segments
   * OVERLAY-AWARE: Only draws if roads overlay is active
   */
  private async refreshRoadLayer(): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();
      
      // Check if roads overlay is active before drawing
      if (!overlayManager.isOverlayActive('roads')) {
        logger.info('[EditorModeService] Skipping road layer refresh (overlay inactive)');
        return;
      }
      
      const { getKingdomActor } = await import('../../../main.kingdom');
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
   * Ensure required overlays for a tool are visible (additive, not exclusive)
   * This does NOT hide other overlays - it only ensures the tool's overlays are ON
   * Users can still toggle overlays freely via the toolbar
   */
  private async ensureToolOverlaysVisible(tool: EditorTool): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();
      
      // Map tools to their REQUIRED overlay IDs (minimal set needed for tool to function)
      const toolRequiredOverlays: Record<string, string[]> = {
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
        'worksite-minus': ['worksites'],
        'settlement-place': ['settlements', 'settlement-labels'],
        'settlement-minus': ['settlements', 'settlement-labels'],
        'fortification-tier1': ['fortifications'],
        'fortification-tier2': ['fortifications'],
        'fortification-tier3': ['fortifications'],
        'fortification-tier4': ['fortifications'],
        'claimed-by': ['territories']
      };
      
      const requiredOverlays = toolRequiredOverlays[tool];
      
      if (requiredOverlays) {
        // Show each required overlay (additive - doesn't hide others)
        for (const overlayId of requiredOverlays) {
          if (!overlayManager.isOverlayActive(overlayId)) {
            await overlayManager.showOverlay(overlayId);
            logger.info(`[EditorModeService] Ensured overlay visible for tool: ${overlayId}`);
          }
        }
      }
    } catch (error) {
      logger.error('[EditorModeService] ❌ Failed to ensure tool overlays visible:', error);
    }
  }
  
  /**
   * Refresh the terrain overlay to show updated terrain types
   * OVERLAY-AWARE: Only draws if terrain overlay is active
   */
  private async refreshTerrainOverlay(): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();
      
      // Check if terrain overlay is active before drawing
      if (!overlayManager.isOverlayActive('terrain')) {
        logger.info('[EditorModeService] Skipping terrain overlay refresh (overlay inactive)');
        return;
      }
      
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
