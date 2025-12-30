/**
 * ArmyMovementMode - Interactive army movement handler
 *
 * Activates when clicking an army token, showing:
 * - Origin hex highlight (green)
 * - Movement range overlay (light green)
 * - Path preview on hover (green lines + circle)
 * - Red X for unreachable hexes
 *
 * Uses the OverlayManager and standard layer system for consistent
 * PIXI rendering alongside other map overlays.
 */

import type { Army } from '../../models/Army';
import type { PathResult, ReachabilityMap } from '../pathfinding/types';
import { pathfindingService } from '../pathfinding';
import { navigationGrid } from '../pathfinding/NavigationGrid';
import { ReignMakerMapLayer } from '../map/core/ReignMakerMapLayer';
import { getOverlayManager, type OverlayManager } from '../map/core/OverlayManager';
import { ARMY_MOVEMENT_LAYERS, ARMY_MOVEMENT_Z_INDICES } from '../map/overlays/ArmyMovementOverlay';
import {
  renderOriginHex,
  renderReachableHexes,
  renderPath,
  renderEndpoint
} from '../map/renderers/ArmyMovementRenderer';
import { getKingdomActor } from '../../main.kingdom';
import { positionToOffset, hexToKingmakerId } from '../hex-selector/coordinates';
import { logger } from '../../utils/Logger';
import { getArmyMovementTraits, type ArmyMovementTraits } from '../../utils/armyMovementTraits';

/**
 * Waypoint data structure
 */
interface Waypoint {
  hexId: string;
  cumulativeCost: number;
  pathFromPrevious: string[]; // Path from previous waypoint (or origin)
  navCell: { x: number; y: number }; // Final nav-grid position at this waypoint
}

/**
 * ArmyMovementMode - Interactive movement handler
 */
export class ArmyMovementMode {
  private active = false;
  private selectedArmy: Army | null = null;
  private startHexId: string | null = null;
  private startNavCell: { x: number; y: number } | null = null; // Nav-grid position for pathfinding
  private currentNavCell: { x: number; y: number } | null = null; // Current position (updated after waypoints)
  private waypoints: Waypoint[] = [];
  private totalCostSpent: number = 0;
  private maxMovement: number = 20;
  private traits: ArmyMovementTraits = { canFly: false, canSwim: false, hasBoats: false, amphibious: false };
  private reachableHexes: ReachabilityMap = new Map(); // Reachable from START (for range overlay)
  private currentReachableHexes: ReachabilityMap = new Map(); // Reachable from CURRENT position (for hover)
  private currentOriginHexId: string | null = null; // Current origin for pathfinding (last waypoint or start)
  private currentOriginNavCell: { x: number; y: number } | null = null; // Current nav cell for pathfinding
  private mapLayer: ReignMakerMapLayer | null = null;
  private overlayManager: OverlayManager | null = null;
  private canvasClickHandler: ((event: any) => void) | null = null;
  private canvasMoveHandler: ((event: any) => void) | null = null;
  private currentHoveredHex: string | null = null;
  private currentHoveredNavCell: { x: number; y: number } | null = null;
  private pathChangedCallback: ((path: string[]) => void) | null = null;
  private pathCompleteCallback: (() => void) | null = null;

  constructor() {
    // Lazy load map layer and overlay manager to avoid circular dependency
  }

  /**
   * Get overlay manager instance (lazy loaded)
   */
  private getOverlayManager(): OverlayManager {
    if (!this.overlayManager) {
      this.overlayManager = getOverlayManager();
    }
    return this.overlayManager;
  }

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
   * Check if movement mode is currently active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get the currently selected army (if any)
   */
  getSelectedArmy(): Army | null {
    return this.selectedArmy;
  }
  
  /**
   * Get the currently plotted path
   */
  getPlottedPath(): string[] {
    if (!this.startHexId) return [];
    
    const fullPath: string[] = [this.startHexId];
    for (const waypoint of this.waypoints) {
      fullPath.push(...waypoint.pathFromPrevious.slice(1));
    }
    return fullPath;
  }
  
  /**
   * Set callback for path changes
   */
  setPathChangedCallback(callback: (path: string[]) => void): void {
    this.pathChangedCallback = callback;
  }
  
  /**
   * Set callback for path completion (double-click or max movement reached)
   */
  setPathCompleteCallback(callback: () => void): void {
    this.pathCompleteCallback = callback;
  }

  /**
   * Execute the planned movement (public wrapper for finalizePath)
   * Call this after waypoints have been added to animate the army and complete the move
   */
  async executeMovement(): Promise<void> {
    await this.finalizePath();
  }

  /**
   * Activate movement mode for an army
   *
   * @param armyId - ID of the army to move
   * @param startHexId - Hex ID where army is currently located
   */
  async activateForArmy(armyId: string, startHexId: string): Promise<void> {
    if (this.active) {
      logger.warn('[ArmyMovementMode] Already active, deactivating first');
      await this.deactivate();
    }

    logger.info(`[ArmyMovementMode] Activating for army ${armyId} at ${startHexId}`);

    // Find army in kingdom data
    const kingdomActor = await getKingdomActor();
    const kingdom = kingdomActor?.getKingdomData();
    const army = kingdom?.armies?.find(a => a.id === armyId);

    if (!army) {
      logger.error(`[ArmyMovementMode] Army ${armyId} not found`);
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Army not found');
      return;
    }

    this.selectedArmy = army;
    this.startHexId = startHexId;
    this.active = true;

    // Import navigation grid for validation
    const { navigationGrid } = await import('../pathfinding/NavigationGrid');

    // Get and VALIDATE army's nav-cell position
    let validNavCell: { x: number; y: number } | null = null;

    if (army.navCellX !== undefined && army.navCellY !== undefined) {
      // Validate: is the saved navCell actually in the current startHexId?
      const savedCellHex = navigationGrid.getHexForCell(army.navCellX, army.navCellY);

      if (savedCellHex === startHexId) {
        // Also check if it's passable (not in a river)
        if (navigationGrid.isCellPassable(army.navCellX, army.navCellY)) {
          validNavCell = { x: army.navCellX, y: army.navCellY };
          logger.info(`[ArmyMovementMode] Using army's saved navCell: (${army.navCellX}, ${army.navCellY}) - validated in hex ${startHexId}`);
        } else {
          logger.warn(`[ArmyMovementMode] Saved navCell (${army.navCellX}, ${army.navCellY}) is blocked - finding new position`);
        }
      } else {
        logger.warn(`[ArmyMovementMode] Saved navCell is in hex ${savedCellHex}, but army is at ${startHexId} - finding new position`);
      }
    }

    // If no valid navCell, find a passable cell in the current hex
    if (!validNavCell) {
      validNavCell = navigationGrid.getPassableCellInHex(startHexId);
      if (validNavCell) {
        logger.info(`[ArmyMovementMode] Found passable navCell: (${validNavCell.x}, ${validNavCell.y}) in hex ${startHexId}`);
      } else {
        logger.error(`[ArmyMovementMode] No passable cell found in hex ${startHexId} - army may be stuck!`);
      }
    }

    this.startNavCell = validNavCell;
    this.currentNavCell = validNavCell;

    // Save current overlay state and set temporary overlays for army movement
    // Show only army movement layers - hide other overlays that might clutter the view
    const overlayManager = this.getOverlayManager();
    await overlayManager.setTemporaryOverlays([
      'army-movement',     // Army movement visualization layers only
    ]);
    logger.info('[ArmyMovementMode] Saved overlay state and set movement overlays');

    // Get army movement traits from actor
    this.traits = getArmyMovementTraits(army);

    // Calculate movement range based on army's actor speed
    // (always half speed, special movement types have terrain advantages)
    const { getArmyMovementRange } = await import('../../utils/armyMovementRange');
    const movementData = await getArmyMovementRange(army.actorId);
    this.maxMovement = movementData.range;

    logger.info(`[ArmyMovementMode] Army ${army.name}: range=${this.maxMovement}, traits:`, this.traits);

    // Debug: Log navigation grid status
    const navStats = navigationGrid.getStats();
    logger.info(`[ArmyMovementMode] NavigationGrid status: ready=${navStats.isReady}, hexes=${navStats.hexCount}, blockedCells=${navStats.blockedCells}, crossingCells=${navStats.crossingCells}`);

    // Debug: Log start position details
    if (this.startNavCell) {
      const cellBlocking = navigationGrid.debugCheckPixel(
        this.startNavCell.x * 8 + 4,
        this.startNavCell.y * 8 + 4
      );
      logger.info(`[ArmyMovementMode] Start navCell (${this.startNavCell.x}, ${this.startNavCell.y}): hex=${cellBlocking.hexId}, blocked=${cellBlocking.isBlocked}, passable=${cellBlocking.isPassable}`);
    }

    // Calculate reachable hexes with army's movement range, traits, and nav-cell position
    this.reachableHexes = pathfindingService.getReachableHexes(
      startHexId,
      this.maxMovement,
      this.traits,
      this.startNavCell ?? undefined
    );

    // Initialize current reachability (same as start initially)
    this.currentReachableHexes = this.reachableHexes;
    this.currentOriginHexId = startHexId;
    this.currentOriginNavCell = this.startNavCell;

    logger.info(`[ArmyMovementMode] Calculated ${this.reachableHexes.size} reachable hexes`);

    // Show visualizations
    this.showOriginHighlight();
    this.showRangeOverlay();

    // Attach canvas listeners
    this.attachCanvasListeners();

    // Notify user
    const ui = (globalThis as any).ui;
    const { getMovementTraitDescription } = await import('../../utils/armyMovementTraits');
    const traitDesc = getMovementTraitDescription(this.traits);
    ui?.notifications?.info(`Click a hex to move ${army.name} (${this.maxMovement} movement range, ${traitDesc})`);
  }

  /**
   * Show origin hex highlight (green hex)
   */
  private showOriginHighlight(): void {
    if (!this.startHexId) return;

    const canvas = (globalThis as any).canvas;
    const mapLayer = this.getMapLayer();
    const layer = mapLayer.createLayer(ARMY_MOVEMENT_LAYERS.origin, ARMY_MOVEMENT_Z_INDICES.origin);

    // Clear previous
    mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.origin);

    // Render origin
    renderOriginHex(
      layer,
      this.startHexId,
      canvas,
      mapLayer['drawSingleHex'].bind(mapLayer)
    );

    mapLayer.showLayer(ARMY_MOVEMENT_LAYERS.origin);
  }

  /**
   * Show movement range overlay (light green tint)
   */
  private showRangeOverlay(): void {
    const canvas = (globalThis as any).canvas;
    const mapLayer = this.getMapLayer();
    const layer = mapLayer.createLayer(ARMY_MOVEMENT_LAYERS.range, ARMY_MOVEMENT_Z_INDICES.range);

    // Clear previous
    mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.range);

    // Render reachable hexes
    renderReachableHexes(
      layer,
      this.reachableHexes,
      canvas,
      mapLayer['drawSingleHex'].bind(mapLayer)
    );

    mapLayer.showLayer(ARMY_MOVEMENT_LAYERS.range);
  }

  /**
   * Attach canvas event listeners (click and hover)
   */
  private attachCanvasListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      logger.error('[ArmyMovementMode] Canvas not available');
      return;
    }

    this.canvasClickHandler = this.handleCanvasClick.bind(this);
    this.canvasMoveHandler = this.handleCanvasMove.bind(this);

    canvas.stage.on('click', this.canvasClickHandler);
    canvas.stage.on('mousemove', this.canvasMoveHandler);

    logger.info('[ArmyMovementMode] Canvas listeners attached');
  }

  /**
   * Handle canvas mousemove (show path preview)
   */
  private handleCanvasMove(event: any): void {
    if (!this.active || !this.startHexId) return;

    try {
      // Get mouse position
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);

      // Convert to hex offset
      const offset = positionToOffset(position.x, position.y);

      // Convert to hex ID
      const hexId = hexToKingmakerId(offset);

      // Convert mouse position to nav cell for precise targeting within hex
      const targetNavCell = navigationGrid.pixelToCell(position.x, position.y);

      // Don't redraw if same hex AND same nav cell
      if (this.currentHoveredHex === hexId &&
          this.currentHoveredNavCell?.x === targetNavCell.x &&
          this.currentHoveredNavCell?.y === targetNavCell.y) {
        return;
      }

      this.currentHoveredHex = hexId;
      this.currentHoveredNavCell = targetNavCell;

      // Use cached reachability (updated when waypoints change)
      const isReachable = this.currentReachableHexes.has(hexId);
      const remainingMovement = this.maxMovement - this.totalCostSpent;

      const mapLayer = this.getMapLayer();

      // Clear previous hover graphics
      mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.path);
      mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.hover);
      mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.cellpath);

      if (isReachable) {

        // Find path from current origin to hover position (uses mouse position for river-aware targeting)
        const pathResult = pathfindingService.findPath(
          this.currentOriginHexId!,
          hexId,
          remainingMovement,
          this.traits,
          this.currentOriginNavCell ?? undefined,
          targetNavCell
        );

        const canvas = (globalThis as any).canvas;

        if (pathResult && pathResult.path.length >= 2) {
          // Calculate total cumulative cost
          const totalCost = this.totalCostSpent + pathResult.totalCost;

          // Draw hex path lines (connecting hex centers) with per-hex costs
          const pathLayer = mapLayer.createLayer(ARMY_MOVEMENT_LAYERS.path, ARMY_MOVEMENT_Z_INDICES.path);
          renderPath(pathLayer, pathResult.path, pathResult.isReachable, canvas, pathResult.hexCosts);
          mapLayer.showLayer(ARMY_MOVEMENT_LAYERS.path);

          // Draw endpoint indicator (green circle if reachable, red X if not)
          const hoverLayer = mapLayer.createLayer(ARMY_MOVEMENT_LAYERS.hover, ARMY_MOVEMENT_Z_INDICES.hover);
          renderEndpoint(hoverLayer, hexId, pathResult.isReachable, canvas, pathResult.isReachable ? totalCost : undefined);
          mapLayer.showLayer(ARMY_MOVEMENT_LAYERS.hover);
        } else {
          // Path calculation failed but hex was marked reachable - show warning indicator
          logger.warn(`[ArmyMovementMode] Hex ${hexId} marked reachable but pathfinding failed`);
          const hoverLayer = mapLayer.createLayer(ARMY_MOVEMENT_LAYERS.hover, ARMY_MOVEMENT_Z_INDICES.hover);
          renderEndpoint(hoverLayer, hexId, false, canvas);
          mapLayer.showLayer(ARMY_MOVEMENT_LAYERS.hover);
        }
      } else {
        // Draw red X for unreachable hex
        const canvas = (globalThis as any).canvas;
        const hoverLayer = mapLayer.createLayer(ARMY_MOVEMENT_LAYERS.hover, ARMY_MOVEMENT_Z_INDICES.hover);
        renderEndpoint(hoverLayer, hexId, false, canvas);
        mapLayer.showLayer(ARMY_MOVEMENT_LAYERS.hover);
      }
    } catch (error) {
      // Silently fail for hover (might be outside valid hex area)
      if (this.currentHoveredHex !== null) {
        this.clearHoverGraphics();
        this.currentHoveredHex = null;
      }
    }
  }

  /**
   * Handle canvas click (add waypoint or finalize)
   */
  private async handleCanvasClick(event: any): Promise<void> {
    if (!this.active || !this.startHexId || !this.selectedArmy) return;

    try {
      // Get click position
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);
      
      // Convert to hex offset
      const offset = positionToOffset(position.x, position.y);
      
      // Convert to hex ID
      const hexId = hexToKingmakerId(offset);

      logger.info(`[ArmyMovementMode] Click at ${hexId}`);

      // Check if clicking last waypoint (auto-complete)
      if (this.waypoints.length > 0) {
        const lastWaypoint = this.waypoints[this.waypoints.length - 1];
        if (lastWaypoint.hexId === hexId) {
          logger.info(`[ArmyMovementMode] Clicked last waypoint - path complete`);
          
          // Notify callback instead of finalizing directly
          if (this.pathCompleteCallback) {
            this.pathCompleteCallback();
          }
          return;
        }
      }

      // Use cached values for reachability check
      const remainingMovement = this.maxMovement - this.totalCostSpent;

      // Check if hex is reachable using cached reachability
      if (!this.currentReachableHexes.has(hexId)) {
        const ui = (globalThis as any).ui;
        ui?.notifications?.warn('Cannot move there - out of remaining movement range');
        return;
      }

      // Convert click position to nav cell for precise targeting within hex
      const targetNavCell = navigationGrid.pixelToCell(position.x, position.y);

      // Find path from current origin to clicked position (uses mouse position for river-aware targeting)
      const pathResult = pathfindingService.findPath(
        this.currentOriginHexId!,
        hexId,
        remainingMovement,
        this.traits,
        this.currentOriginNavCell ?? undefined,
        targetNavCell
      );

      if (!pathResult || !pathResult.isReachable) {
        const ui = (globalThis as any).ui;
        ui?.notifications?.warn('No valid path to that hex');
        logger.info(`[ArmyMovementMode] Pathfinding failed to ${hexId} from ${originHexId} (remaining: ${remainingMovement})`);
        return;
      }

      // Get the final nav cell from the path result (or find one if not provided)
      let finalNavCell = pathResult.finalNavCell;
      if (!finalNavCell) {
        // Fallback: get a passable cell in the target hex
        const { navigationGrid } = await import('../pathfinding/NavigationGrid');
        const passableCell = navigationGrid.getPassableCellInHex(hexId);
        if (passableCell) {
          finalNavCell = passableCell;
        } else {
          logger.warn(`[ArmyMovementMode] No passable cell found in target hex ${hexId}`);
          return;
        }
      }

      // Add waypoint with nav cell tracking
      const segmentCost = pathResult.totalCost;
      const newCumulativeCost = this.totalCostSpent + segmentCost;
      const waypoint: Waypoint = {
        hexId,
        cumulativeCost: newCumulativeCost,
        pathFromPrevious: pathResult.path,
        navCell: finalNavCell
      };

      this.waypoints.push(waypoint);
      this.totalCostSpent = newCumulativeCost;

      // Detailed click logging for debugging
      logger.info(`[ArmyMovementMode] ===== WAYPOINT ${this.waypoints.length} ADDED =====`);
      logger.info(`  Hex: ${hexId}`);
      logger.info(`  Segment Cost: ${segmentCost} (cost to reach this hex from previous position)`);
      logger.info(`  Previous Total: ${this.totalCostSpent - segmentCost}`);
      logger.info(`  New Cumulative Total: ${newCumulativeCost}`);
      logger.info(`  Path Length: ${pathResult.path.length} hexes`);
      logger.info(`  Path: ${pathResult.path.join(' → ')}`);
      
      // Show per-hex costs in the path
      logger.info(`  Per-Hex Costs:`);
      for (let i = 0; i < pathResult.path.length; i++) {
        const pathHexId = pathResult.path[i];
        const hexCost = pathfindingService.getMovementCost(pathHexId, this.traits);
        const isOrigin = i === 0;
        logger.info(`    [${i}] ${pathHexId}: ${hexCost} movement${isOrigin ? ' (origin - not counted)' : ''}`);
      }

      // Update cached origin and reachability for next hover/click
      this.currentOriginHexId = hexId;
      this.currentOriginNavCell = finalNavCell;
      const newRemainingMovement = this.maxMovement - this.totalCostSpent;

      if (newRemainingMovement > 0) {
        // Recalculate reachability from new position
        this.currentReachableHexes = pathfindingService.getReachableHexes(
          hexId,
          newRemainingMovement,
          this.traits,
          finalNavCell
        );
        logger.info(`[ArmyMovementMode] Updated reachability: ${this.currentReachableHexes.size} hexes from ${hexId}`);
      } else {
        this.currentReachableHexes = new Map();
      }

      // Render waypoints
      this.renderWaypoints();

      // Notify callback of path change
      if (this.pathChangedCallback) {
        this.pathChangedCallback(this.getPlottedPath());
      }

      // Check if at max movement (auto-complete)
      if (this.totalCostSpent >= this.maxMovement) {
        logger.info(`[ArmyMovementMode] Reached max movement - path complete`);
        
        // Notify callback instead of finalizing directly
        if (this.pathCompleteCallback) {
          this.pathCompleteCallback();
        }
        return;
      }

      // Clear hover graphics to force redraw from new waypoint
      this.clearHoverGraphics();
      this.currentHoveredHex = null;

    } catch (error) {
      logger.error('[ArmyMovementMode] Error handling click:', error);
    }
  }

  /**
   * Finalize the path and execute the move
   */
  private async finalizePath(): Promise<void> {
    if (this.waypoints.length === 0) {
      logger.warn('[ArmyMovementMode] No waypoints to finalize');
      return;
    }

    if (!this.startHexId || !this.selectedArmy) {
      logger.error('[ArmyMovementMode] Cannot finalize - missing start hex or army');
      return;
    }

    // Concatenate all path segments
    const fullPath: string[] = [this.startHexId];
    
    for (const waypoint of this.waypoints) {
      // Add path segment (skip first element to avoid duplicates)
      fullPath.push(...waypoint.pathFromPrevious.slice(1));
    }

    const finalHex = this.waypoints[this.waypoints.length - 1].hexId;
    const totalCost = this.waypoints[this.waypoints.length - 1].cumulativeCost;

    logger.info(`[ArmyMovementMode] Finalizing path to ${finalHex} (${this.waypoints.length} waypoints, cost: ${totalCost})`);
    logger.info(`[ArmyMovementMode] Full path:`, fullPath);

    // Animate the army token along the path
    try {
      const { getArmyToken, animateTokenAlongPath } = await import('./tokenAnimation');
      
      const tokenDoc = await getArmyToken(this.selectedArmy.id);
      
      if (tokenDoc) {
        logger.info(`[ArmyMovementMode] Starting token animation for ${this.selectedArmy.name}`);
        
        // Animate token along full path (100ms per hex with ease-in-out)
        await animateTokenAlongPath(tokenDoc, fullPath, 100);
        
        logger.info(`[ArmyMovementMode] Token animation complete`);
        
        const ui = (globalThis as any).ui;
        ui?.notifications?.info(`${this.selectedArmy.name} moved to ${finalHex} (${totalCost} movement)`);
      } else {
        logger.warn(`[ArmyMovementMode] No token found for ${this.selectedArmy.name} - skipping animation`);
        
        const ui = (globalThis as any).ui;
        ui?.notifications?.info(`${this.selectedArmy.name} would move to ${finalHex} (${totalCost} movement)`);
      }
    } catch (error) {
      logger.error('[ArmyMovementMode] Error animating token:', error);
      
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Failed to animate army movement');
    }

    // Deactivate mode
    await this.deactivate();
  }

  /**
   * Render waypoint markers and connecting paths on the map
   */
  private renderWaypoints(): void {
    const mapLayer = this.getMapLayer();
    const canvas = (globalThis as any).canvas;
    
    // Clear previous waypoint layer
    mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.waypoints);

    if (this.waypoints.length === 0) return;

    const waypointLayer = mapLayer.createLayer(ARMY_MOVEMENT_LAYERS.waypoints, ARMY_MOVEMENT_Z_INDICES.waypoints);
    
    // Build full path from origin through all waypoints
    if (this.startHexId) {
      const fullPath: string[] = [this.startHexId];
      
      for (const waypoint of this.waypoints) {
        // Add path segment (skip first element to avoid duplicates)
        fullPath.push(...waypoint.pathFromPrevious.slice(1));
      }

      // Render the full connected path
      renderPath(waypointLayer, fullPath, true, canvas);
    }
    
    // Render each waypoint as a green circle with number (smaller than endpoint)
    const waypointSize = 28; // Smaller than endpoint (40px)
    
    for (let i = 0; i < this.waypoints.length; i++) {
      const waypoint = this.waypoints[i];
      
      try {
        const parts = waypoint.hexId.split('.');
        const hexI = parseInt(parts[0], 10);
        const hexJ = parseInt(parts[1], 10);

        if (isNaN(hexI) || isNaN(hexJ)) continue;

        const GridHex = (globalThis as any).foundry.grid.GridHex;
        const hex = new GridHex({ i: hexI, j: hexJ }, canvas.grid);
        const center = hex.center;

        const graphics = new PIXI.Graphics();
        graphics.name = `Waypoint-${i + 1}`;

        // Draw green circle (smaller than endpoint)
        graphics.beginFill(0x4CAF50, 1.0);
        graphics.drawCircle(center.x, center.y, waypointSize);
        graphics.endFill();

        // Draw white border
        graphics.lineStyle(2, 0xFFFFFF, 1.0);
        graphics.drawCircle(center.x, center.y, waypointSize);

        // Draw waypoint number
        const text = new PIXI.Text((i + 1).toString(), {
          fontFamily: 'Arial',
          fontSize: 22,
          fontWeight: 'bold',
          fill: 0xFFFFFF,
          stroke: 0x000000,
          strokeThickness: 3,
          align: 'center'
        });
        
        text.anchor.set(0.5, 0.5);
        text.x = center.x;
        text.y = center.y;
        
        graphics.addChild(text);
        waypointLayer.addChild(graphics);

      } catch (error) {
        logger.error(`[ArmyMovementMode] Failed to render waypoint ${i + 1}:`, error);
      }
    }

    mapLayer.showLayer(ARMY_MOVEMENT_LAYERS.waypoints);
  }

  /**
   * Clear hover graphics (path, cellpath, and endpoint)
   */
  private clearHoverGraphics(): void {
    const mapLayer = this.getMapLayer();
    mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.path);
    mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.hover);
    mapLayer.clearLayerContent(ARMY_MOVEMENT_LAYERS.cellpath);
  }

  /**
   * Deactivate movement mode
   */
  async deactivate(): Promise<void> {
    if (!this.active) return;

    logger.info('[ArmyMovementMode] Deactivating');

    // Remove canvas listeners
    const canvas = (globalThis as any).canvas;
    if (this.canvasClickHandler) {
      canvas?.stage?.off('click', this.canvasClickHandler);
      this.canvasClickHandler = null;
    }
    if (this.canvasMoveHandler) {
      canvas?.stage?.off('mousemove', this.canvasMoveHandler);
      this.canvasMoveHandler = null;
    }

    // Clear all army movement layers
    if (this.mapLayer) {
      this.mapLayer.clearLayer(ARMY_MOVEMENT_LAYERS.origin);
      this.mapLayer.clearLayer(ARMY_MOVEMENT_LAYERS.range);
      this.mapLayer.clearLayer(ARMY_MOVEMENT_LAYERS.waypoints);
      this.mapLayer.clearLayer(ARMY_MOVEMENT_LAYERS.path);
      this.mapLayer.clearLayer(ARMY_MOVEMENT_LAYERS.hover);
      this.mapLayer.clearLayer(ARMY_MOVEMENT_LAYERS.cellpath);
    }

    // Restore player's overlay preferences from localStorage
    const overlayManager = this.getOverlayManager();
    await overlayManager.restoreUserPreferences();
    await overlayManager.refreshActiveOverlays();
    logger.info('[ArmyMovementMode] Restored player overlay preferences');

    // Reset state
    this.active = false;
    this.selectedArmy = null;
    this.startHexId = null;
    this.startNavCell = null;
    this.currentNavCell = null;
    this.waypoints = [];
    this.totalCostSpent = 0;
    this.reachableHexes.clear();
    this.currentReachableHexes.clear();
    this.currentOriginHexId = null;
    this.currentOriginNavCell = null;
    this.currentHoveredHex = null;

    logger.info('[ArmyMovementMode] Deactivated');
  }

  /**
   * Get the final nav cell position after all waypoints
   * Returns null if no waypoints or no nav cell tracked
   */
  getFinalNavCell(): { x: number; y: number } | null {
    if (this.waypoints.length === 0) {
      return this.startNavCell;
    }
    return this.waypoints[this.waypoints.length - 1].navCell;
  }
}

// Export singleton instance
export const armyMovementMode = new ArmyMovementMode();
