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
import type { HexFeature, EdgeDirection, ConnectorState, CenterConnectorState, RiverSegment, RiverConnector } from '../../models/Hex';
import { logger } from '../../utils/Logger';
import { 
  disableCanvasLayerInteractivity, 
  restoreCanvasLayerInteractivity 
} from '../../utils/canvasLayerInteractivity';
import { renderRiverConnectors, clearRiverConnectors, getConnectorAtPosition } from './renderers/RiverConnectorRenderer';
import { getEdgeIdForDirection, edgeNameToIndex } from '../../utils/edgeUtils';

export type EditorTool = 'river-edit' | 'inactive';

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
  private currentHoveredHex: { i: number; j: number } | null = null;
  private connectorLayer: PIXI.Container | null = null;
  
  // Debug modes - log hex IDs, edge IDs, and neighbors on click
  private debugHexMode = false;
  private debugEdgeMode = false;
  private debugNeighborsMode = false;
  private debugClickHandler: ((event: PointerEvent) => void) | null = null;
  
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
    this.debugHexMode = !this.debugHexMode;
    const status = this.debugHexMode ? 'enabled' : 'disabled';
    
    this.updateDebugListener();
    
    console.log(`%c🐛 Hex Debug: ${status.toUpperCase()}`, 'font-size: 14px; font-weight: bold; color: ' + (this.debugHexMode ? '#00FF00' : '#FF0000'));
    return this.debugHexMode;
  }
  
  /**
   * Toggle edge debug mode (logs edge IDs on click anywhere on canvas)
   */
  toggleDebugEdge(): boolean {
    this.debugEdgeMode = !this.debugEdgeMode;
    const status = this.debugEdgeMode ? 'enabled' : 'disabled';
    
    this.updateDebugListener();
    
    console.log(`%c🐛 Edge Debug: ${status.toUpperCase()}`, 'font-size: 14px; font-weight: bold; color: ' + (this.debugEdgeMode ? '#00FF00' : '#FF0000'));
    return this.debugEdgeMode;
  }
  
  /**
   * Check if hex debug mode is active
   */
  isDebugHexMode(): boolean {
    return this.debugHexMode;
  }
  
  /**
   * Check if edge debug mode is active
   */
  isDebugEdgeMode(): boolean {
    return this.debugEdgeMode;
  }
  
  /**
   * Toggle neighbors debug mode (logs neighbor hex IDs on click)
   */
  toggleDebugNeighbors(): boolean {
    this.debugNeighborsMode = !this.debugNeighborsMode;
    const status = this.debugNeighborsMode ? 'enabled' : 'disabled';
    
    this.updateDebugListener();
    
    console.log(`%c🐛 Neighbors Debug: ${status.toUpperCase()}`, 'font-size: 14px; font-weight: bold; color: ' + (this.debugNeighborsMode ? '#00FF00' : '#FF0000'));
    return this.debugNeighborsMode;
  }
  
  /**
   * Check if neighbors debug mode is active
   */
  isDebugNeighborsMode(): boolean {
    return this.debugNeighborsMode;
  }
  
  /**
   * Update debug listener based on active modes
   */
  private updateDebugListener(): void {
    // Remove existing listener
    this.removeDebugListener();
    
    // Re-attach if any debug mode is active
    if (this.debugHexMode || this.debugEdgeMode || this.debugNeighborsMode) {
      this.attachDebugListener();
    }
  }
  
  /**
   * Attach global debug click listener (works regardless of editor state)
   */
  private attachDebugListener(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      logger.warn('[EditorModeService] Cannot attach debug listener - canvas not available');
      return;
    }
    
    // Create debug handler that logs hex/edge info
    this.debugClickHandler = async (event: PointerEvent) => {
      // Only handle left-click
      if (event.button !== 0) return;
      
      const canvas = (globalThis as any).canvas;
      if (!canvas?.grid) return;
      
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient(point);
      const offset = canvas.grid.getOffset(canvasPos);
      const hexId = `${offset.i}.${offset.j}`;
      
      // Log hex if hex debug is active
      if (this.debugHexMode) {
        console.log(`%c🗺️ Clicked Hex: ${hexId} [${offset.i}:${offset.j}]`, 'font-size: 12px; color: #00BFFF; font-weight: bold;');
      }
      
      // Log edge if edge debug is active
      if (this.debugEdgeMode) {
        const edge = await this.findNearestEdge(offset.i, offset.j, canvasPos, canvas);
        if (edge) {
          console.log(`%c📐 Clicked Edge: ${edge.id} (${edge.direction})`, 'font-size: 12px; color: #FFD700; font-weight: bold;');
        }
      }
      
      // Log neighbors if neighbors debug is active
      if (this.debugNeighborsMode) {
        const neighbors = canvas.grid.getNeighbors(offset.i, offset.j);
        if (neighbors) {
          const neighborStrs = neighbors.map((n: [number, number]) => `${n[0]}:${n[1]}`);
          console.log(`%c🔗 Neighbors of ${hexId}: [${neighborStrs.join(', ')}]`, 'font-size: 12px; color: #FF69B4; font-weight: bold;');
        }
      }
    };
    
    // Attach to canvas stage (use capture to get all clicks)
    canvas.stage.addEventListener('pointerdown', this.debugClickHandler, { capture: true });
  }
  
  /**
   * Find nearest edge to click position
   */
  private async findNearestEdge(
    hexI: number, 
    hexJ: number, 
    clickPos: { x: number; y: number },
    canvas: any
  ): Promise<{ id: string; direction: string } | null> {
    const EDGE_THRESHOLD = 30; // pixels
    
    const { getEdgeMidpoint, getAllEdges } = await import('../../utils/riverUtils');
    const { getEdgeIdForDirection, edgeNameToIndex } = await import('../../utils/edgeUtils');
    
    const edges = getAllEdges();
    let nearestEdge: { id: string; direction: string; distance: number } | null = null;
    
    for (const edge of edges) {
      const position = getEdgeMidpoint(hexI, hexJ, edge, canvas);
      if (!position) continue;
      
      const dx = clickPos.x - position.x;
      const dy = clickPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= EDGE_THRESHOLD) {
        if (!nearestEdge || distance < nearestEdge.distance) {
          const edgeIndex = edgeNameToIndex(edge);
          const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);
          nearestEdge = { id: edgeId, direction: edge, distance };
        }
      }
    }
    
    return nearestEdge ? { id: nearestEdge.id, direction: nearestEdge.direction } : null;
  }
  
  /**
   * Remove global debug click listener
   */
  private removeDebugListener(): void {
    if (!this.debugClickHandler) return;
    
    const canvas = (globalThis as any).canvas;
    if (canvas?.stage) {
      canvas.stage.removeEventListener('pointerdown', this.debugClickHandler, { capture: true });
    }
    
    this.debugClickHandler = null;
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
  }
  
  /**
   * Exit editor mode - restore original mouse manager
   */
  exitEditorMode(): void {
    if (!this.active) return;
    
    logger.info('[EditorModeService] Exiting editor mode');
    
    // Destroy connector layer (clears all control point graphics)
    this.destroyConnectorLayer();
    
    // Remove direct event listeners
    this.removeDirectEventListeners();
    
    // Restore canvas layer interactivity
    restoreCanvasLayerInteractivity(this.savedLayerInteractivity);
    this.savedLayerInteractivity.clear();
    
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
   * Handle pointer down event (left or right click)
   */
  private handlePointerDown(event: PointerEvent): void {
    // Allow right-click for canvas panning
    if (event.button === 2) return;
    
    // Only handle when editor is active
    if (!this.active) return;
    
    // CRITICAL: Stop ALL event propagation to block marquee selection
    // This blocks marquee even when no tool is selected (inactive state)
    event.stopImmediatePropagation();
    event.stopPropagation();
    
    // Get canvas position (needed for debug logging even if no tool active)
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;
    
    const point = { x: event.clientX, y: event.clientY };
    const canvasPos = canvas.canvasCoordinatesFromClient(point);
    const offset = canvas.grid.getOffset(canvasPos);
    const hexId = `${offset.i}.${offset.j}`;
    
    // If no tool selected, don't apply any tool logic (but marquee is still blocked)
    if (this.currentTool === 'inactive') return;
    
    logger.info(`[EditorModeService] 🖱️ Pointer down on hex ${hexId} with tool ${this.currentTool}`);
    
    // Start dragging
    this.isDragging = true;
    
    // Apply tool immediately at starting position
    this.applyToolAtHex(hexId, canvasPos);
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
    
    // Get canvas position
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;
    
    const point = { x: event.clientX, y: event.clientY };
    const canvasPos = canvas.canvasCoordinatesFromClient(point);
    const offset = canvas.grid.getOffset(canvasPos);
    
    // Apply tool if dragging
    if (this.isDragging && this.currentTool !== 'inactive') {
      const hexId = `${offset.i}.${offset.j}`;
      this.applyToolAtHex(hexId, canvasPos);
    }
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
   * Called once when river-edit tool is activated
   * 
   * Forces a fresh read of kingdom data to ensure control points reflect current state
   */
  private async initializeConnectorLayer(): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;

    // Destroy existing layer if it exists (ensures fresh render)
    this.destroyConnectorLayer();

    // Force refresh kingdom data from actor (in case external scripts changed it)
    const game = (globalThis as any).game;
    const kingdomActor = game.actors.find((a: any) => a.getFlag('pf2e-reignmaker', 'kingdom-data'));
    if (kingdomActor) {
      const freshData = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data');
      if (freshData) {
        // Update the store with fresh data
        await updateKingdom(kingdom => Object.assign(kingdom, freshData));
        logger.info('[EditorModeService] ✅ Refreshed kingdom data from actor', {
          edgeCount: Object.keys(freshData.rivers?.edges || {}).length,
          hexesWithRivers: freshData.hexes?.filter((h: any) => h.features?.some((f: any) => f.type === 'river')).length
        });
      }
    }

    // Create fresh connector layer
    this.connectorLayer = new PIXI.Container();
    this.connectorLayer.name = 'RiverConnectorLayer';
    this.connectorLayer.sortableChildren = true;
    
    // CRITICAL: Add to canvas.primary (world-space group) to match ReignMakerMapLayer
    // Also set HIGH z-index so control points render above everything
    this.connectorLayer.zIndex = 1000;
    
    const primaryGroup = canvas.primary;
    if (primaryGroup) {
      primaryGroup.addChild(this.connectorLayer);
      logger.info('[EditorModeService] ✅ Created fresh connector layer (added to canvas.primary with z-index 1000)');
    } else {
      logger.error('[EditorModeService] ❌ canvas.primary not found! Falling back to canvas.stage');
      canvas.stage.addChild(this.connectorLayer);
    }

    // Render all connector dots with fresh data
    await renderRiverConnectors(this.connectorLayer, canvas);
  }

  /**
   * Completely destroy connector layer and all its graphics
   */
  private destroyConnectorLayer(): void {
    if (!this.connectorLayer) return;

    const canvas = (globalThis as any).canvas;
    // Remove from parent (either canvas.primary or canvas.stage)
    if (this.connectorLayer.parent) {
      this.connectorLayer.parent.removeChild(this.connectorLayer);
    }

    // Destroy all graphics
    this.connectorLayer.destroy({ children: true });
    this.connectorLayer = null;
    
    logger.info('[EditorModeService] ✅ Destroyed connector layer');
  }

  /**
   * Check if a hex is a neighbor of another hex
   */
  private isNeighborOf(
    hexI: number,
    hexJ: number,
    centerI: number,
    centerJ: number,
    canvas: any
  ): boolean {
    const neighbors = canvas.grid.getNeighbors(centerI, centerJ);
    if (!neighbors) return false;

    return neighbors.some((neighbor: any) => {
      const [neighborI, neighborJ] = neighbor;
      return neighborI === hexI && neighborJ === hexJ;
    });
  }

  /**
   * Apply current tool at hex position
   */
  private applyToolAtHex(hexId: string, position: { x: number; y: number }): void {
    try {
      switch (this.currentTool) {
        case 'river-edit':
          this.handleRiverEdit(hexId, position);
          break;
      }
    } catch (error) {
      logger.debug('[EditorModeService] Error applying tool:', error);
    }
  }

  /**
   * Handle river connector editing (click to cycle states)
   */
  private async handleRiverEdit(hexId: string, position: { x: number; y: number }): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;

    // Parse hex ID
    const parts = hexId.split('.');
    if (parts.length !== 2) return;

    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return;

    // Get connector at click position
    const connector = getConnectorAtPosition(hexI, hexJ, position, canvas);
    if (!connector) {
      logger.info('[EditorModeService] ❌ No connector at click position');
      return;
    }

    // Log click details
    if ('center' in connector) {
      logger.info(`[EditorModeService] 🎯 CLICKED CENTER of hex ${hexId}, current state: ${connector.state}`);
      await this.cycleCenterConnector(hexId, connector.state);
    } else {
      logger.info(`[EditorModeService] 🎯 CLICKED EDGE ${connector.edge} of hex ${hexId}, current state: ${connector.state}`);
      await this.cycleEdgeConnector(hexId, connector.edge, connector.state);
    }

    // Re-render connectors to show updated state (force refresh)
    logger.info('[EditorModeService] 🔄 Re-rendering connectors...');
    if (this.connectorLayer) {
      const canvas = (globalThis as any).canvas;
      await renderRiverConnectors(this.connectorLayer, canvas);
    }

    // Re-render water layer to show updated rivers
    await this.refreshWaterLayer();
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
   * Sync canonical edge map to hex features for WaterRenderer
   * This allows WaterRenderer to draw river lines from canonical edge data
   * Now includes flow direction information for visualization
   */
  private async syncCanonicalEdgesToHexFeatures(hexI: number, hexJ: number, canvas: any): Promise<void> {
    const kingdom = getKingdomData();
    const hexId = `${hexI}.${hexJ}`;
    
    // Import edge utilities
    const { parseCanonicalEdgeId } = await import('../../utils/edgeUtils');
    
    await updateKingdom(kingdom => {
      const hex = kingdom.hexes.find(h => h.id === hexId);
      if (!hex) return;
      
      // Ensure features array exists
      if (!hex.features) hex.features = [];
      
      // Find or create river feature
      let riverFeature = hex.features.find(f => f.type === 'river') as any;
      if (!riverFeature) {
        riverFeature = {
          type: 'river',
          segments: []
        };
        hex.features.push(riverFeature);
      }
      
      // Clear existing segments and rebuild from canonical map
      riverFeature.segments = [];
      
      // Get all edges for this hex and check canonical map
      const edges: EdgeDirection[] = ['e', 'se', 'sw', 'w', 'nw', 'ne'];
      const activeConnectors: RiverConnector[] = [];
      
      for (const edgeDir of edges) {
        const edgeIndex = edgeNameToIndex(edgeDir);
        const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);
        const edgeData = kingdom.rivers?.edges?.[edgeId];
        
        // If edge exists in canonical map, it's active
        if (edgeData) {
          // Determine flow direction from this hex's perspective
          let flowDirection: EdgeDirection | undefined;
          
          if (edgeData.state === 'flow' && edgeData.flowsToHex) {
            // Parse edge ID to get both hexes
            const { hex1, hex2 } = parseCanonicalEdgeId(edgeId);
            
            // Check if flow is toward or away from this hex
            const isThisHex1 = hex1.i === hexI && hex1.j === hexJ;
            const flowsToThisHex = edgeData.flowsToHex.i === hexI && edgeData.flowsToHex.j === hexJ;
            
            if (flowsToThisHex) {
              // Water flows INTO this hex through this edge
              flowDirection = edgeDir;  // Flow direction is the edge itself (inward)
            } else {
              // Water flows OUT of this hex through this edge
              flowDirection = edgeDir;  // Flow direction is the edge itself (outward)
            }
          }
          
          activeConnectors.push({
            edge: edgeDir,
            state: edgeData.state,
            flowDirection  // Include flow direction for rendering
          });
        }
      }
      
      // If we have active connectors, create a segment
      if (activeConnectors.length > 0) {
        riverFeature.segments.push({
          id: crypto.randomUUID(),
          connectors: activeConnectors,
          navigable: true
        });
      } else {
        // No active connectors - remove river feature entirely
        hex.features = hex.features.filter(f => f.type !== 'river');
      }
    });
  }

  /**
   * Cycle edge connector state using canonical edge IDs with direction cycling
   * 
   * Cycle: inactive → flow(→) → flow(←) → source → end → inactive
   */
  private async cycleEdgeConnector(
    hexId: string,
    edge: EdgeDirection,
    currentState: ConnectorState
  ): Promise<void> {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;

    // Parse hex coordinates
    const parts = hexId.split('.');
    if (parts.length !== 2) return;
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);

    // Get canonical edge ID
    const edgeIndex = edgeNameToIndex(edge);
    const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);

    // Get current edge data to check flow direction
    const kingdom = await import('../../stores/KingdomStore').then(m => m.getKingdomData());
    const currentEdge = kingdom.rivers?.edges?.[edgeId];
    
    // Parse canonical ID to get both hexes
    const { parseCanonicalEdgeId } = await import('../../utils/edgeUtils');
    const { hex1, hex2 } = parseCanonicalEdgeId(edgeId);

    // Determine next state based on current state and flow direction
    let nextState: ConnectorState;
    let flowsToHex: { i: number; j: number } | undefined;

    if (currentState === 'inactive') {
      // inactive → flow (toward second hex by default)
      nextState = 'flow';
      flowsToHex = { i: hex2.i, j: hex2.j };
    } else if (currentState === 'flow') {
      // Check current flow direction
      const flowsToSecond = currentEdge?.flowsToHex &&
        currentEdge.flowsToHex.i === hex2.i &&
        currentEdge.flowsToHex.j === hex2.j;

      if (flowsToSecond) {
        // flow(→) → flow(←) - reverse direction
        nextState = 'flow';
        flowsToHex = { i: hex1.i, j: hex1.j };
      } else {
        // flow(←) → source
        nextState = 'source';
        flowsToHex = undefined;  // Not needed for source
      }
    } else if (currentState === 'source') {
      // source → end
      nextState = 'end';
      flowsToHex = undefined;  // Not needed for end
    } else {
      // end → inactive
      nextState = 'inactive';
      flowsToHex = undefined;
    }

    const directionStr = flowsToHex ? 
      `(flows to ${flowsToHex.i}:${flowsToHex.j})` : 
      '';
    
    const { formatEdgeId } = await import('../../utils/edgeUtils');
    logger.info(`[EditorModeService] Cycling edge ${formatEdgeId(edgeId)}: ${currentState} → ${nextState} ${directionStr}`);

    // Update kingdom data - SINGLE write to canonical edge map
    await updateKingdom(kingdom => {
      // Ensure rivers.edges exists
      if (!kingdom.rivers) kingdom.rivers = { edges: {} };
      if (!kingdom.rivers.edges) kingdom.rivers.edges = {};

      if (nextState === 'inactive') {
        // Remove edge from map
        delete kingdom.rivers.edges[edgeId];
      } else {
        // Update/add edge with flow direction
        kingdom.rivers.edges[edgeId] = { 
          state: nextState, 
          flowsToHex,
          navigable: true 
        };
      }
    });

    // Sync canonical map to hex features so WaterRenderer can draw lines
    await this.syncCanonicalEdgesToHexFeatures(hexI, hexJ, canvas);
    
    // Also sync the neighbor hex that shares this edge
    const isHex1 = hex1.i === hexI && hex1.j === hexJ;
    const neighborCoord = isHex1 ? hex2 : hex1;
    
    // Sync the neighbor hex
    await this.syncCanonicalEdgesToHexFeatures(neighborCoord.i, neighborCoord.j, canvas);
  }

  /**
   * Cycle center connector state
   */
  private async cycleCenterConnector(
    hexId: string,
    currentState: CenterConnectorState
  ): Promise<void> {
    // Cycle: inactive → flow-through → source → end → inactive
    const stateOrder: CenterConnectorState[] = ['inactive', 'flow-through', 'source', 'end'];
    const currentIndex = stateOrder.indexOf(currentState);
    const nextState = stateOrder[(currentIndex + 1) % stateOrder.length];

    logger.info(`[EditorModeService] Cycling center on hex ${hexId}: ${currentState} → ${nextState}`);

    // Update kingdom data
    await updateKingdom(kingdom => {
      const hex = kingdom.hexes.find(h => h.id === hexId);
      if (!hex) return;

      // Ensure features array exists
      if (!hex.features) hex.features = [];

      // Find or create river feature
      let riverFeature = hex.features.find(f => f.type === 'river') as any;
      if (!riverFeature) {
        riverFeature = {
          type: 'river',
          segments: []
        };
        hex.features.push(riverFeature);
      }

      // Ensure segments array exists
      if (!riverFeature.segments) riverFeature.segments = [];

      // Update or create center connector in first segment (or create new segment)
      if (riverFeature.segments.length === 0) {
        riverFeature.segments.push({
          id: crypto.randomUUID(),
          connectors: [],
          navigable: true
        });
      }

      const segment = riverFeature.segments[0];
      
      if (nextState === 'inactive') {
        delete segment.centerConnector;
      } else {
        segment.centerConnector = { state: nextState };
      }
    });
  }

}

/**
 * Convenience function to get editor mode service instance
 */
export function getEditorModeService(): EditorModeService {
  return EditorModeService.getInstance();
}
