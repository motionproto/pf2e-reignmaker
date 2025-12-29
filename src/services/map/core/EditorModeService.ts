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
import { EditorDebugHandlers } from '../editors/EditorDebugHandlers';
import { CrossingEditorHandlers } from '../editors/CrossingEditorHandlers';
import { RoadEditorHandlers } from '../editors/RoadEditorHandlers';
import { TerrainEditorHandlers } from '../editors/TerrainEditorHandlers';
import type { TerrainType } from '../../../types/terrain';
import { WorksiteEditorHandlers } from '../editors/WorksiteEditorHandlers';
import type { WorksiteType } from '../editors/WorksiteEditorHandlers';
import { FeatureEditorHandlers } from '../editors/FeatureEditorHandlers';
import { ClaimedByEditorHandlers } from '../editors/ClaimedByEditorHandlers';
import { cellRiverEditorHandlers } from '../editors/CellRiverEditorHandlers';
import { cellLakeEditorHandlers } from '../editors/CellLakeEditorHandlers';
import { cellCrossingEditorHandlers } from '../editors/CellCrossingEditorHandlers';

export type EditorTool =
  | 'cell-river-edit'  // Cell-based river drawing
  | 'cell-river-erase' // Eraser for cell rivers (removes entire path)
  | 'cell-river-area-erase' // Area eraser (removes points within radius)
  | 'cell-river-flip'  // Flip river direction
  | 'cell-lake-paint'  // Cell-based lake painting (brush mode)
  | 'cell-lake-erase'  // Eraser for cell lakes (brush mode)
  | 'cell-crossing-paint'  // Cell-based crossing painting (brush mode)
  | 'cell-crossing-erase'  // Eraser for cell crossings (brush mode)
  | 'waterfall-toggle' | 'bridge-toggle' | 'ford-toggle' 
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
  | 'rivers'         // Cell-based river editing
  | 'lakes'          // Cell-based lake painting
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
  'rivers': ['rivers'],      // Cell-based river editing - show rivers overlay
  'lakes': ['rivers'],       // Cell-based lake editing - show rivers overlay (includes lakes)
  'crossings': ['rivers', 'navigation-grid-debug'],  // Show rivers and nav grid for crossing placement
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
  private dblClickHandler: ((event: MouseEvent) => void) | null = null;
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  
  // Store layer interactivity state for restoration
  private savedLayerInteractivity: Map<string, boolean> = new Map();
  
  // Store previous active scene control for restoration
  private previousActiveControl: string | null = null;
  private previousTokenActiveTool: string | null = null;

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

  // Cell river drawing state (drag-to-draw)
  private isRiverDrawing = false;
  private drawnRiverCells = new Set<string>();

  // Cell river reshape state (drag-to-reshape segment)
  private isRiverReshaping = false;
  private reshapedRiverCells = new Set<string>();

  // Cell river click position (for detecting drag after selection)
  private riverClickPos: { x: number; y: number } | null = null;

  // Cell river area erase state (drag-to-erase)
  private isAreaErasing = false;

  // Cell river vertex move state (shift+drag-to-move)
  private isVertexMoving = false;

  // Cell lake painting state (drag-to-paint brush mode)
  private isLakePainting = false;
  private isLakeErasing = false;

  // Cell crossing painting state (drag-to-paint brush mode)
  private isCrossingPainting = false;
  private isCrossingErasing = false;
  
  // Handler modules
  private debugHandlers = new EditorDebugHandlers();
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

    // CRITICAL: Check canvas availability BEFORE entering editor mode
    // If canvas isn't ready, event listeners won't attach and editor won't work
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      logger.error('[EditorModeService] Cannot enter editor mode - canvas not ready');
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Cannot open map editor - canvas not ready. Please wait for the scene to fully load.');
      throw new Error('Canvas not ready for editor mode');
    }

    logger.info('[EditorModeService] Entering editor mode');

    // Backup kingdom data (deep copy for restore on cancel)
    const kingdom = getKingdomData();
    this.backupKingdomData = structuredClone(kingdom);

    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();

    this.currentTool = 'inactive';
    this.currentMode = null;

    // Disable canvas layer interactivity (prevents token/tile selection)
    this.savedLayerInteractivity = disableCanvasLayerInteractivity();

    // Hide all overlays - editor modes will show what they need
    // Note: User's overlay preferences are already saved in localStorage by OverlayManager
    await overlayManager.setActiveOverlays([], false);
    logger.info('[EditorModeService] Hid all overlays for editor mode');

    // Disable Foundry token scene control by activating our custom control
    this.disableTokenSceneControl();

    // Attach direct event listeners to canvas stage
    this.attachDirectEventListeners();

    // Only set active AFTER all setup succeeds
    this.active = true;

    // Note: Default overlays will be set when setEditorMode() is called
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

    // Cleanup cell river editor if it was active
    cellRiverEditorHandlers.cleanup();

    // Remove direct event listeners
    this.removeDirectEventListeners();

    // Restore canvas layer interactivity
    restoreCanvasLayerInteractivity(this.savedLayerInteractivity);
    this.savedLayerInteractivity.clear();

    // Restore previous active scene control
    this.restoreTokenSceneControl();

    // Restore user's overlay preferences from localStorage
    const { getOverlayManager } = await import('./OverlayManager');
    const overlayManager = getOverlayManager();
    await overlayManager.restoreState();
    logger.info('[EditorModeService] Restored overlay state from localStorage');

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
    const defaultOverlays = EDITOR_MODE_OVERLAYS[mode] || [];

    // ALWAYS set active overlays to the mode's defaults (even if empty)
    // This ensures we hide overlays that aren't needed for this mode
    // Pass false for saveState to avoid corrupting user's localStorage preferences during editor mode
    await overlayManager.setActiveOverlays(defaultOverlays, false);
    logger.info(`[EditorModeService] Applied default overlays for ${mode}:`, defaultOverlays);
  }
  
  /**
   * Set current editing tool
   * This is a fine-grained tool change within a mode (e.g., cell-river-edit to cell-river-erase)
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
    
    // Initialize cell river editor when any cell-river tool is activated
    const isCellRiverTool = tool === 'cell-river-edit' ||
                            tool === 'cell-river-erase' ||
                            tool === 'cell-river-area-erase' ||
                            tool === 'cell-river-flip';
    if (isCellRiverTool) {
      cellRiverEditorHandlers.initialize();
    } else {
      cellRiverEditorHandlers.cleanup();
    }

    // Initialize cell lake editor when any cell-lake tool is activated
    const isCellLakeTool = tool === 'cell-lake-paint' || tool === 'cell-lake-erase';
    if (isCellLakeTool) {
      cellLakeEditorHandlers.initialize();
    } else {
      cellLakeEditorHandlers.cleanup();
    }

    // Initialize cell crossing editor when any cell-crossing tool is activated
    const isCellCrossingTool = tool === 'cell-crossing-paint' || tool === 'cell-crossing-erase';
    if (isCellCrossingTool) {
      cellCrossingEditorHandlers.initialize();
    } else {
      cellCrossingEditorHandlers.cleanup();
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

    // Rasterize river polylines to blocked cells before saving
    await cellRiverEditorHandlers.rasterizeOnSave();

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
   * @throws Error if canvas is not available
   */
  private attachDirectEventListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      // This should never happen if enterEditorMode() checks canvas first
      // But throw to prevent silent failure if called directly
      throw new Error('Cannot attach event listeners - canvas not available');
    }

    // Create bound handlers
    this.pointerDownHandler = this.handlePointerDown.bind(this);
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.pointerUpHandler = this.handlePointerUp.bind(this);
    this.dblClickHandler = this.handleDoubleClick.bind(this);
    this.keyDownHandler = this.handleKeyDown.bind(this);

    // Attach with capture:true to intercept BEFORE Foundry's handlers
    canvas.stage.addEventListener('pointerdown', this.pointerDownHandler, { capture: true });
    canvas.stage.addEventListener('pointermove', this.pointerMoveHandler, { capture: true });
    canvas.stage.addEventListener('pointerup', this.pointerUpHandler, { capture: true });
    canvas.stage.addEventListener('dblclick', this.dblClickHandler, { capture: true });

    // Keyboard handler on document (not canvas.stage which doesn't receive keyboard events)
    document.addEventListener('keydown', this.keyDownHandler, { capture: true });

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

    if (this.dblClickHandler) {
      canvas.stage.removeEventListener('dblclick', this.dblClickHandler, { capture: true });
      this.dblClickHandler = null;
    }

    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler, { capture: true });
      this.keyDownHandler = null;
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

      if (this.currentTool === 'cell-river-edit') {
        // Cell-based river editing (drag-to-draw mode)
        if (event.altKey || event.metaKey) {
          // Alt/Cmd+Click finishes current path
          cellRiverEditorHandlers.finishPath();
        } else if (event.ctrlKey) {
          // Ctrl+Click removes the specific point clicked (no notification)
          await cellRiverEditorHandlers.removePointAt(canvasPos.x, canvasPos.y);
        } else if (event.shiftKey) {
          // Shift+Click/drag moves a vertex on the active path
          const vertex = cellRiverEditorHandlers.findNearbyVertex(canvasPos.x, canvasPos.y);
          if (vertex) {
            this.isVertexMoving = true;
            cellRiverEditorHandlers.startVertexMove(vertex);
            logger.info(`[EditorModeService] Started moving vertex at (${vertex.cellX}, ${vertex.cellY})`);
          } else {
            // Shift+Click on empty space or non-active path - just deselect
            cellRiverEditorHandlers.deselectPath();
          }
        } else {
          // Check if clicking on any path (for selection) - includes all points, not just endpoints
          const nearbyPathId = cellRiverEditorHandlers.findNearbyPath(canvasPos.x, canvasPos.y);
          if (nearbyPathId) {
            // Select the clicked path (turns it pink)
            // Dragging will be handled in handlePointerMove to continue/reshape
            cellRiverEditorHandlers.selectPath(nearbyPathId);
            logger.info(`[EditorModeService] Selected path ${nearbyPathId}`);

            // Store click position for potential drag detection
            this.riverClickPos = { x: canvasPos.x, y: canvasPos.y };
          } else {
            // Clicking on empty space - deselect current path and start new
            cellRiverEditorHandlers.deselectPath();

            // Start drag-to-draw mode with new path
            this.isRiverDrawing = true;
            this.drawnRiverCells.clear();

            // Add first point
            await cellRiverEditorHandlers.handleCellRiverClick(canvasPos.x, canvasPos.y);

            // Track this cell so we don't add it again during drag
            const cellX = Math.floor(canvasPos.x / 8);
            const cellY = Math.floor(canvasPos.y / 8);
            this.drawnRiverCells.add(`${cellX},${cellY}`);
          }
        }
      } else if (this.currentTool === 'cell-river-erase') {
        // Eraser tool - remove entire river path at click position
        await cellRiverEditorHandlers.handleCellRiverErase(canvasPos.x, canvasPos.y);
      } else if (this.currentTool === 'cell-river-area-erase') {
        // Area eraser tool - start drag-to-erase mode
        this.isAreaErasing = true;
        await cellRiverEditorHandlers.handleAreaErase(canvasPos.x, canvasPos.y);
      } else if (this.currentTool === 'cell-river-flip') {
        // Flip tool - reverse direction of path at click position
        await cellRiverEditorHandlers.handleCellRiverFlip(canvasPos.x, canvasPos.y);
      } else if (this.currentTool === 'cell-lake-paint') {
        // Cell-based lake painting (drag-to-paint brush mode)
        this.isLakePainting = true;
        cellLakeEditorHandlers.startPainting();
        await cellLakeEditorHandlers.handleLakePaint(canvasPos.x, canvasPos.y);
      } else if (this.currentTool === 'cell-lake-erase') {
        // Cell-based lake erasing (drag-to-erase brush mode)
        this.isLakeErasing = true;
        cellLakeEditorHandlers.startPainting();
        await cellLakeEditorHandlers.handleLakeErase(canvasPos.x, canvasPos.y);
      } else if (this.currentTool === 'cell-crossing-paint') {
        // Cell-based crossing painting (drag-to-paint brush mode)
        this.isCrossingPainting = true;
        cellCrossingEditorHandlers.startPainting();
        await cellCrossingEditorHandlers.handleCrossingPaint(canvasPos.x, canvasPos.y);
      } else if (this.currentTool === 'cell-crossing-erase') {
        // Cell-based crossing erasing (drag-to-erase brush mode)
        this.isCrossingErasing = true;
        cellCrossingEditorHandlers.startPainting();
        await cellCrossingEditorHandlers.handleCrossingErase(canvasPos.x, canvasPos.y);
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
    
    // Handle cell-river hover preview and drag-to-draw/reshape/vertex-move
    if (this.currentTool === 'cell-river-edit') {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;

      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);

      // If moving a vertex, update its position
      if (this.isVertexMoving) {
        await cellRiverEditorHandlers.updateVertexPosition(canvasPos.x, canvasPos.y);
      }
      // If reshaping, add cells to reshaped segment
      else if (this.isRiverReshaping) {
        // Update hover preview
        cellRiverEditorHandlers.handleCellRiverMove(canvasPos.x, canvasPos.y);

        const cellX = Math.floor(canvasPos.x / 8);
        const cellY = Math.floor(canvasPos.y / 8);
        const cellKey = `${cellX},${cellY}`;

        // Only add if we haven't already added this cell during reshape
        if (!this.reshapedRiverCells.has(cellKey)) {
          this.reshapedRiverCells.add(cellKey);
          cellRiverEditorHandlers.addReshapePoint(canvasPos.x, canvasPos.y);
        }
      }
      // Detect drag start after path selection (to continue from endpoint or reshape segment)
      else if (this.riverClickPos && !this.isRiverDrawing) {
        // Check if mouse has moved enough to consider it a drag (5 pixel threshold)
        const dx = canvasPos.x - this.riverClickPos.x;
        const dy = canvasPos.y - this.riverClickPos.y;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);

        if (dragDistance > 5) {
          // Dragging from selected path - check if from endpoint or segment
          const endpoint = cellRiverEditorHandlers.findNearbyEndpoint(
            this.riverClickPos.x,
            this.riverClickPos.y
          );

          if (endpoint) {
            // Start drawing from endpoint
            this.isRiverDrawing = true;
            this.drawnRiverCells.clear();
            cellRiverEditorHandlers.continueFromEndpoint(endpoint);
            logger.info(`[EditorModeService] Drag-continue from ${endpoint.endpoint} of path ${endpoint.pathId}`);
          } else {
            // Check for segment reshape
            const segment = cellRiverEditorHandlers.findNearbySegment(
              this.riverClickPos.x,
              this.riverClickPos.y
            );

            if (segment) {
              // Start reshape mode
              this.isRiverReshaping = true;
              this.reshapedRiverCells.clear();
              await cellRiverEditorHandlers.startReshapeSegment(
                segment.pathId,
                segment.insertAfterOrder,
                segment.insertBeforeOrder
              );
              logger.info(`[EditorModeService] Drag-reshape segment ${segment.insertAfterOrder}-${segment.insertBeforeOrder}`);
            }
          }

          // Clear click position - we've processed the drag start
          this.riverClickPos = null;
        }
      }
      // If dragging (not reshaping or moving vertex), add cells to path
      else if (this.isRiverDrawing) {
        // Update hover preview
        cellRiverEditorHandlers.handleCellRiverMove(canvasPos.x, canvasPos.y);

        const cellX = Math.floor(canvasPos.x / 8);
        const cellY = Math.floor(canvasPos.y / 8);
        const cellKey = `${cellX},${cellY}`;

        // Only add if we haven't already drawn this cell
        if (!this.drawnRiverCells.has(cellKey)) {
          this.drawnRiverCells.add(cellKey);
          cellRiverEditorHandlers.handleCellRiverClick(canvasPos.x, canvasPos.y);
        }
      }
      // Not actively editing - just show hover preview
      else {
        cellRiverEditorHandlers.handleCellRiverMove(canvasPos.x, canvasPos.y);
      }
    }

    // Handle area eraser preview and drag-to-erase
    if (this.currentTool === 'cell-river-area-erase') {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;

      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);

      // Always show eraser preview circle
      cellRiverEditorHandlers.showEraserPreview(canvasPos.x, canvasPos.y);

      // If dragging, continuously erase
      if (this.isAreaErasing) {
        cellRiverEditorHandlers.handleAreaErase(canvasPos.x, canvasPos.y);
      }
    }

    // Handle cell lake painting preview and drag-to-paint
    if (this.currentTool === 'cell-lake-paint' || this.currentTool === 'cell-lake-erase') {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;

      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const isErasing = this.currentTool === 'cell-lake-erase';

      // Always show brush preview
      cellLakeEditorHandlers.handleMouseMove(canvasPos.x, canvasPos.y, isErasing);

      // If dragging, continuously paint/erase
      if (this.isLakePainting) {
        await cellLakeEditorHandlers.handleLakePaint(canvasPos.x, canvasPos.y);
      } else if (this.isLakeErasing) {
        await cellLakeEditorHandlers.handleLakeErase(canvasPos.x, canvasPos.y);
      }
    }

    // Handle cell crossing painting preview and drag-to-paint
    if (this.currentTool === 'cell-crossing-paint' || this.currentTool === 'cell-crossing-erase') {
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;

      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const isErasing = this.currentTool === 'cell-crossing-erase';

      // Always show brush preview
      cellCrossingEditorHandlers.handleMouseMove(canvasPos.x, canvasPos.y, isErasing);

      // If dragging, continuously paint/erase
      if (this.isCrossingPainting) {
        await cellCrossingEditorHandlers.handleCrossingPaint(canvasPos.x, canvasPos.y);
      } else if (this.isCrossingErasing) {
        await cellCrossingEditorHandlers.handleCrossingErase(canvasPos.x, canvasPos.y);
      }
    }

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

    // Clear river click position (used for drag detection after selection)
    this.riverClickPos = null;

    // Handle vertex move stop
    if (this.isVertexMoving) {
      this.isVertexMoving = false;
      cellRiverEditorHandlers.finishVertexMove();

      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();

      logger.info('[EditorModeService] 🖱️ Vertex move ended');
      return;
    }

    // Handle area eraser stop
    if (this.isAreaErasing) {
      this.isAreaErasing = false;

      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();

      logger.info('[EditorModeService] 🖱️ Area erase ended');
      return;
    }

    // Handle river reshape stop
    if (this.isRiverReshaping) {
      this.isRiverReshaping = false;
      this.reshapedRiverCells.clear();

      // Finish reshaping
      cellRiverEditorHandlers.finishReshape();

      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();

      logger.info('[EditorModeService] 🖱️ River reshape ended');
      return;
    }

    // Handle river drawing stop (drag-to-draw)
    if (this.isRiverDrawing) {
      this.isRiverDrawing = false;
      this.drawnRiverCells.clear();

      // Finish the path
      cellRiverEditorHandlers.finishPath();

      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();

      logger.info('[EditorModeService] 🖱️ River drawing ended');
      return;
    }

    // Handle lake painting stop (drag-to-paint brush mode)
    if (this.isLakePainting || this.isLakeErasing) {
      this.isLakePainting = false;
      this.isLakeErasing = false;
      // Commit all pending cells to kingdom data
      cellLakeEditorHandlers.stopPainting();

      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();

      logger.info('[EditorModeService] 🖱️ Lake painting ended');
      return;
    }

    // Handle crossing painting stop (drag-to-paint brush mode)
    if (this.isCrossingPainting || this.isCrossingErasing) {
      this.isCrossingPainting = false;
      this.isCrossingErasing = false;
      // Commit all pending cells to kingdom data
      cellCrossingEditorHandlers.stopPainting();

      // CRITICAL: Stop event propagation
      event.stopImmediatePropagation();
      event.stopPropagation();

      logger.info('[EditorModeService] 🖱️ Crossing painting ended');
      return;
    }

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
   * Handle double-click event - used to finish river paths
   */
  private handleDoubleClick(event: MouseEvent): void {
    if (!this.active) return;

    // Only handle cell-river-edit tool
    if (this.currentTool !== 'cell-river-edit') return;

    // Stop propagation
    event.stopImmediatePropagation();
    event.stopPropagation();

    // Finish current path
    cellRiverEditorHandlers.finishPath();

    logger.info('[EditorModeService] 🖱️ Double-click - finished river path');
  }

  /**
   * Handle keyboard events - used for Ctrl+Z undo in river editing and brush size in lake editing
   */
  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    if (!this.active) return;

    // Handle Ctrl+Z (or Cmd+Z on Mac) for undo in cell-river-edit mode
    if (this.currentTool === 'cell-river-edit' && (event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      event.stopPropagation();

      const removed = await cellRiverEditorHandlers.undoLastPoint();
      if (removed) {
        logger.info('[EditorModeService] ⌨️ Ctrl+Z - undid last river point');
      }
    }

    // Handle [ and ] for brush size adjustment in lake editing mode
    const isLakeTool = this.currentTool === 'cell-lake-paint' || this.currentTool === 'cell-lake-erase';
    if (isLakeTool) {
      if (event.key === '[') {
        event.preventDefault();
        event.stopPropagation();
        const newRadius = cellLakeEditorHandlers.adjustBrushRadius(-8); // Decrease by 1 cell
        logger.info(`[EditorModeService] ⌨️ [ - decreased brush radius to ${newRadius}px`);
      } else if (event.key === ']') {
        event.preventDefault();
        event.stopPropagation();
        const newRadius = cellLakeEditorHandlers.adjustBrushRadius(8); // Increase by 1 cell
        logger.info(`[EditorModeService] ⌨️ ] - increased brush radius to ${newRadius}px`);
      } else if (event.key === 'x' || event.key === 'X') {
        event.preventDefault();
        event.stopPropagation();
        // Toggle between paint and erase
        const newTool = this.currentTool === 'cell-lake-paint' ? 'cell-lake-erase' : 'cell-lake-paint';
        this.setTool(newTool);
        logger.info(`[EditorModeService] ⌨️ X - switched to ${newTool}`);
      }
    }

    // Handle [ and ] for brush size adjustment in crossing editing mode
    const isCrossingTool = this.currentTool === 'cell-crossing-paint' || this.currentTool === 'cell-crossing-erase';
    if (isCrossingTool) {
      if (event.key === '[') {
        event.preventDefault();
        event.stopPropagation();
        const newRadius = cellCrossingEditorHandlers.adjustBrushRadius(-8); // Decrease by 1 cell
        logger.info(`[EditorModeService] ⌨️ [ - decreased crossing brush radius to ${newRadius}px`);
      } else if (event.key === ']') {
        event.preventDefault();
        event.stopPropagation();
        const newRadius = cellCrossingEditorHandlers.adjustBrushRadius(8); // Increase by 1 cell
        logger.info(`[EditorModeService] ⌨️ ] - increased crossing brush radius to ${newRadius}px`);
      } else if (event.key === 'x' || event.key === 'X') {
        event.preventDefault();
        event.stopPropagation();
        // Toggle between paint and erase
        const newTool = this.currentTool === 'cell-crossing-paint' ? 'cell-crossing-erase' : 'cell-crossing-paint';
        this.setTool(newTool);
        logger.info(`[EditorModeService] ⌨️ X - switched to ${newTool}`);
      }
    }
  }

  /**
   * Handle waterfall toggle - add/remove waterfall on hex edge
   */
  private async handleWaterfallToggle(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.crossingHandlers.handleWaterfallClick(hexId, position);
    // NOTE: Overlay updates automatically via reactive store subscription
  }

  /**
   * Handle bridge toggle - add/remove bridge crossing on hex edge
   */
  private async handleBridgeToggle(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.crossingHandlers.handleBridgeClick(hexId, position);
    // NOTE: Overlay updates automatically via reactive store subscription
  }

  /**
   * Handle ford toggle - add/remove ford crossing on hex edge
   */
  private async handleFordToggle(hexId: string, position: { x: number; y: number }): Promise<void> {
    await this.crossingHandlers.handleFordClick(hexId, position);
    // NOTE: Overlay updates automatically via reactive store subscription
  }

  /**
   * Handle road toggle - add/remove road on hex center
   */
  private async handleRoadToggle(hexId: string, isCtrlPressed: boolean): Promise<void> {
    await this.roadHandlers.handleRoadToggle(hexId, isCtrlPressed);
    // NOTE: Overlay updates automatically via reactive store subscription
  }

  /**
   * Handle road scissor click - cuts a road segment at click position
   */
  private async handleRoadScissorClick(position: { x: number; y: number }): Promise<void> {
    const result = await this.roadHandlers.handleScissorClick(position);

    if (!result.success) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('No road segment found at click position');
    }
    // NOTE: Overlay updates automatically via reactive store subscription
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

  // NOTE: refreshWaterLayer and refreshRoadLayer removed
  // Overlays now update automatically via reactive store subscriptions
  // This ensures visibility is controlled solely by OverlayManager

  /**
   * Ensure required overlays for a tool are visible (additive, not exclusive)
   * This does NOT hide other overlays - it only ensures the tool's overlays are ON
   * Users can still toggle overlays freely via the toolbar
   *
   * Exception: Cell-river tools hide conflicting overlays (water, rivers) to prevent
   * visual clutter while editing.
   */
  private async ensureToolOverlaysVisible(tool: EditorTool): Promise<void> {
    try {
      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();

      // Map tools to their REQUIRED overlay IDs (minimal set needed for tool to function)
      const toolRequiredOverlays: Record<string, string[]> = {
        'road-edit': ['roads'],
        'road-scissors': ['roads'],
        'cell-river-edit': ['rivers'],  // Cell-based river editing - show rivers overlay
        'cell-river-erase': ['rivers'],
        'cell-river-area-erase': ['rivers'],
        'cell-river-flip': ['rivers'],
        'cell-lake-paint': ['rivers'],  // Cell-based lake painting - show rivers overlay (includes lakes)
        'cell-lake-erase': ['rivers'],
        'cell-crossing-paint': ['rivers', 'navigation-grid-debug'],  // Show rivers and nav grid for crossing placement
        'cell-crossing-erase': ['rivers', 'navigation-grid-debug'],
        'waterfall-toggle': ['rivers'],
        'bridge-toggle': ['rivers'],
        'ford-toggle': ['rivers'],
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
        // Pass true for skipStateSave to avoid corrupting user's localStorage preferences
        for (const overlayId of requiredOverlays) {
          if (!overlayManager.isOverlayActive(overlayId)) {
            await overlayManager.showOverlay(overlayId, true);
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
