/**
 * ArmyMovementMode - Interactive army movement handler
 * 
 * Activates when clicking an army token, showing:
 * - Origin hex highlight (green)
 * - Movement range overlay (light green)
 * - Path preview on hover (green lines + circle)
 * - Red X for unreachable hexes
 */

import type { Army } from '../../models/Army';
import type { PathResult, ReachabilityMap } from '../pathfinding/types';
import { pathfindingService } from '../pathfinding';
import { ReignMakerMapLayer } from '../map/ReignMakerMapLayer';
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
 * Layer IDs for army movement visualization
 */
const LAYER_IDS = {
  origin: 'army-movement-origin' as const,
  range: 'army-movement-range' as const,
  waypoints: 'army-movement-waypoints' as const,
  path: 'army-movement-path' as const,
  hover: 'army-movement-hover' as const
};

/**
 * Waypoint data structure
 */
interface Waypoint {
  hexId: string;
  cumulativeCost: number;
  pathFromPrevious: string[]; // Path from previous waypoint (or origin)
}

/**
 * ArmyMovementMode - Interactive movement handler
 */
export class ArmyMovementMode {
  private active = false;
  private selectedArmy: Army | null = null;
  private startHexId: string | null = null;
  private waypoints: Waypoint[] = [];
  private totalCostSpent: number = 0;
  private maxMovement: number = 20;
  private traits: ArmyMovementTraits = { canFly: false, canSwim: false, hasBoats: false };
  private reachableHexes: ReachabilityMap = new Map();
  private mapLayer: ReignMakerMapLayer | null = null;
  private canvasClickHandler: ((event: any) => void) | null = null;
  private canvasMoveHandler: ((event: any) => void) | null = null;
  private currentHoveredHex: string | null = null;
  private pathChangedCallback: ((path: string[]) => void) | null = null;
  private pathCompleteCallback: (() => void) | null = null;

  constructor() {
    // Lazy load map layer to avoid circular dependency
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
   * Activate movement mode for an army
   * 
   * @param armyId - ID of the army to move
   * @param startHexId - Hex ID where army is currently located
   */
  async activateForArmy(armyId: string, startHexId: string): Promise<void> {
    if (this.active) {
      logger.warn('[ArmyMovementMode] Already active, deactivating first');
      this.deactivate();
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

    // Get army movement traits from actor
    this.traits = getArmyMovementTraits(army);
    
    // Calculate movement range based on army's actor speed
    // (always half speed, special movement types have terrain advantages)
    const { getArmyMovementRange } = await import('../../utils/armyMovementRange');
    const movementData = await getArmyMovementRange(army.actorId);
    this.maxMovement = movementData.range;
    
    logger.info(`[ArmyMovementMode] Army ${army.name}: range=${this.maxMovement}, traits:`, this.traits);

    // Calculate reachable hexes with army's movement range and traits
    this.reachableHexes = pathfindingService.getReachableHexes(startHexId, this.maxMovement, this.traits);

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
    const layer = mapLayer.createLayer(LAYER_IDS.origin, 49);
    
    // Clear previous
    mapLayer.clearLayerContent(LAYER_IDS.origin);

    // Render origin
    renderOriginHex(
      layer, 
      this.startHexId, 
      canvas,
      mapLayer['drawSingleHex'].bind(mapLayer)
    );

    mapLayer.showLayer(LAYER_IDS.origin);
  }

  /**
   * Show movement range overlay (light green tint)
   */
  private showRangeOverlay(): void {
    const canvas = (globalThis as any).canvas;
    const mapLayer = this.getMapLayer();
    const layer = mapLayer.createLayer(LAYER_IDS.range, 12);
    
    // Clear previous
    mapLayer.clearLayerContent(LAYER_IDS.range);

    // Render reachable hexes
    renderReachableHexes(
      layer,
      this.reachableHexes,
      canvas,
      mapLayer['drawSingleHex'].bind(mapLayer)
    );

    mapLayer.showLayer(LAYER_IDS.range);
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

      // Don't redraw if same hex
      if (this.currentHoveredHex === hexId) {
        return;
      }

      this.currentHoveredHex = hexId;

      // Determine origin for pathfinding (last waypoint or start)
      const originHexId = this.waypoints.length > 0 
        ? this.waypoints[this.waypoints.length - 1].hexId 
        : this.startHexId;

      // Calculate remaining movement
      const remainingMovement = this.maxMovement - this.totalCostSpent;

      // Check if hex is reachable from current position
      const reachableFromOrigin = pathfindingService.getReachableHexes(originHexId, remainingMovement, this.traits);
      const isReachable = reachableFromOrigin.has(hexId);

      const mapLayer = this.getMapLayer();

      // Clear previous hover graphics
      mapLayer.clearLayerContent(LAYER_IDS.path);
      mapLayer.clearLayerContent(LAYER_IDS.hover);

      if (isReachable) {
        // Find path from current origin to hover hex
        const pathResult = pathfindingService.findPath(originHexId, hexId, remainingMovement, this.traits);

        if (pathResult && pathResult.isReachable) {
          const canvas = (globalThis as any).canvas;

          // Calculate total cumulative cost
          const totalCost = this.totalCostSpent + pathResult.totalCost;

          // Draw path lines (only the segment from current origin to hover)
          const pathLayer = mapLayer.createLayer(LAYER_IDS.path, 48);
          renderPath(pathLayer, pathResult.path, true, canvas);
          mapLayer.showLayer(LAYER_IDS.path);

          // Draw green circle endpoint with cumulative cost
          const hoverLayer = mapLayer.createLayer(LAYER_IDS.hover, 50);
          renderEndpoint(hoverLayer, hexId, true, canvas, totalCost);
          mapLayer.showLayer(LAYER_IDS.hover);
        }
      } else {
        // Draw red X for unreachable hex
        const canvas = (globalThis as any).canvas;
        const hoverLayer = mapLayer.createLayer(LAYER_IDS.hover, 50);
        renderEndpoint(hoverLayer, hexId, false, canvas);
        mapLayer.showLayer(LAYER_IDS.hover);
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

      // Determine origin for pathfinding
      const originHexId = this.waypoints.length > 0 
        ? this.waypoints[this.waypoints.length - 1].hexId 
        : this.startHexId;

      // Calculate remaining movement
      const remainingMovement = this.maxMovement - this.totalCostSpent;

      // Debug: Check neighbors and costs (ALWAYS, even for unreachable hexes)
      const { getNeighborHexIds } = await import('../pathfinding/coordinates');
      const neighbors = getNeighborHexIds(originHexId);
      logger.info(`[ArmyMovementMode] Origin ${originHexId} neighbors:`, neighbors);
      
      for (const n of neighbors) {
        const exists = pathfindingService.hexExists(n);
        const cost = pathfindingService.getMovementCost(n, this.traits);
        logger.info(`[ArmyMovementMode] Neighbor ${n}: exists=${exists}, cost=${cost}`);
      }

      // Check if hex is reachable from current position
      const reachableFromOrigin = pathfindingService.getReachableHexes(originHexId, remainingMovement, this.traits);
      logger.info(`[ArmyMovementMode] Reachable hexes from ${originHexId}: ${reachableFromOrigin.size}`);
      logger.info(`[ArmyMovementMode] Is ${hexId} reachable?`, reachableFromOrigin.has(hexId));
      
      if (!reachableFromOrigin.has(hexId)) {
        const ui = (globalThis as any).ui;
        ui?.notifications?.warn('Cannot move there - out of remaining movement range');
        return;
      }

      // Find path from current origin to clicked hex
      const pathResult = pathfindingService.findPath(originHexId, hexId, remainingMovement, this.traits);

      if (!pathResult || !pathResult.isReachable) {
        const ui = (globalThis as any).ui;
        ui?.notifications?.warn('No valid path to that hex');
        logger.info(`[ArmyMovementMode] Pathfinding failed to ${hexId} from ${originHexId} (remaining: ${remainingMovement})`);
        return;
      }

      // Add waypoint
      const segmentCost = pathResult.totalCost;
      const newCumulativeCost = this.totalCostSpent + segmentCost;
      const waypoint: Waypoint = {
        hexId,
        cumulativeCost: newCumulativeCost,
        pathFromPrevious: pathResult.path
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
    this.deactivate();
  }

  /**
   * Render waypoint markers and connecting paths on the map
   */
  private renderWaypoints(): void {
    const mapLayer = this.getMapLayer();
    const canvas = (globalThis as any).canvas;
    
    // Clear previous waypoint layer
    mapLayer.clearLayerContent(LAYER_IDS.waypoints);
    
    if (this.waypoints.length === 0) return;

    const waypointLayer = mapLayer.createLayer(LAYER_IDS.waypoints, 51);
    
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

    mapLayer.showLayer(LAYER_IDS.waypoints);
  }

  /**
   * Clear hover graphics (path and endpoint)
   */
  private clearHoverGraphics(): void {
    const mapLayer = this.getMapLayer();
    mapLayer.clearLayerContent(LAYER_IDS.path);
    mapLayer.clearLayerContent(LAYER_IDS.hover);
  }

  /**
   * Deactivate movement mode
   */
  deactivate(): void {
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

    // Clear all layers
    if (this.mapLayer) {
      this.mapLayer.clearLayer(LAYER_IDS.origin);
      this.mapLayer.clearLayer(LAYER_IDS.range);
      this.mapLayer.clearLayer(LAYER_IDS.waypoints);
      this.mapLayer.clearLayer(LAYER_IDS.path);
      this.mapLayer.clearLayer(LAYER_IDS.hover);
    }

    // Reset state
    this.active = false;
    this.selectedArmy = null;
    this.startHexId = null;
    this.waypoints = [];
    this.totalCostSpent = 0;
    this.reachableHexes.clear();
    this.currentHoveredHex = null;

    logger.info('[ArmyMovementMode] Deactivated');
  }
}

// Export singleton instance
export const armyMovementMode = new ArmyMovementMode();
