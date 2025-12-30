/**
 * PathfindingService - Cell-based A* pathfinding for army movement
 * Based on Red Blob Games: https://www.redblobgames.com/pathfinding/a-star/
 *
 * Uses NavigationGrid for cell-based pathfinding with hex cost lookup.
 * A* runs on 8x8 pixel grid cells, with movement cost charged per hex entered.
 */

import type { Hex } from '../../models/Hex';
import type { PathResult, PathNode, ReachabilityMap } from './types';
import { hexDistance, normalizeHexId, getNeighborHexIds } from './coordinates';
import { kingdomData } from '../../stores/KingdomStore';
import { get } from 'svelte/store';
import { logger } from '../../utils/Logger';
import { movementGraph } from './MovementGraph';
import { navigationGrid } from './NavigationGrid';
import { getMovementStrategy } from './movement';
import type { ArmyMovementTraits } from '../../utils/armyMovementTraits';

/**
 * Default movement range for armies
 */
const DEFAULT_MOVEMENT_RANGE = 20;

/**
 * PathfindingService - Core pathfinding logic for army movement
 * Uses precomputed MovementGraph for efficient cost lookups
 */
export class PathfindingService {
  private hexMap: Map<string, Hex> = new Map();
  private unsubscribe: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    // Subscribe to kingdom data changes for hex map
    this.unsubscribe = kingdomData.subscribe(kingdom => {
      this.buildHexMap(kingdom.hexes || []);
    });
  }

  /**
   * Initialize the pathfinding service with canvas
   * Must be called when canvas is ready for graph to work
   */
  initialize(canvas: any): void {
    if (this.isInitialized) return;

    movementGraph.initialize(canvas);
    this.isInitialized = true;
    logger.info('[Pathfinding] Service initialized with MovementGraph');
  }

  /**
   * Check if pathfinding is ready
   */
  isReady(): boolean {
    return this.isInitialized && movementGraph.isReady();
  }

  /**
   * Build hex lookup map from kingdom hex data
   */
  private buildHexMap(hexes: any[]): void {
    this.hexMap.clear();

    hexes.forEach((hex: any) => {
      const normalized = normalizeHexId(hex.id);
      this.hexMap.set(normalized, hex as Hex);
    });
  }

  /**
   * Refresh kingdom data and rebuild graph
   */
  refresh(): void {
    const kingdom = get(kingdomData);
    this.buildHexMap(kingdom.hexes || []);
    movementGraph.rebuild();
  }

  /**
   * Clean up subscriptions
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    movementGraph.destroy();
    this.isInitialized = false;
  }

  /**
   * Get movement cost for entering a hex
   *
   * Uses the precomputed MovementGraph for efficient lookups.
   * Falls back to Infinity if graph is not ready.
   *
   * @param hexId - Target hex ID
   * @param traits - Army movement traits (canFly, canSwim, hasBoats)
   * @param fromHexId - Source hex (required for edge-based cost lookup)
   * @returns Movement cost (or Infinity if blocked)
   */
  getMovementCost(hexId: string, traits?: ArmyMovementTraits, fromHexId?: string): number {
    // If no source hex, we can't use edge-based costs
    // Return a basic cost based on the node
    if (!fromHexId) {
      const node = movementGraph.getNode(hexId);
      if (!node) return Infinity;

      // Return land cost as default (flying ignores this anyway)
      const { canFly = false } = traits || {};
      if (canFly) return 1;

      // Basic land cost without edge-based river checking
      let cost = 1;
      if (node.travel === 'difficult') cost = 2;
      else if (node.travel === 'greater-difficult') cost = 3;
      if (node.hasRoad || node.hasSettlement) cost = Math.max(1, cost - 1);
      return cost;
    }

    // Use MovementGraph for edge-based cost lookup
    return movementGraph.getEdgeCost(fromHexId, hexId, traits);
  }

  /**
   * Calculate all hexes reachable within movement range
   * Uses cell-based Dijkstra's algorithm on the navigation grid
   *
   * A* runs on 8x8 pixel grid cells. Movement cost is charged only when
   * entering a NEW hex (not per cell). This allows:
   * - Entering a hex with a river from the non-river side
   * - Moving parallel to a river through multiple hexes
   * - Proper terrain costs (charged once per hex entered)
   *
   * @param startHexId - Starting hex ID
   * @param maxMovement - Maximum movement points (default: 20)
   * @param traits - Army movement traits (canFly, canSwim, hasBoats)
   * @param startNavCell - Optional specific nav-grid cell to start from (for armies with saved position)
   * @returns Map of hex ID -> movement cost to reach
   */
  getReachableHexes(
    startHexId: string,
    maxMovement: number = DEFAULT_MOVEMENT_RANGE,
    traits?: ArmyMovementTraits,
    startNavCell?: { x: number; y: number }
  ): ReachabilityMap {
    const normalized = normalizeHexId(startHexId);
    const reachable: ReachabilityMap = new Map();

    // Check if navigation grid is ready
    if (!navigationGrid.isReady()) {
      logger.warn('[Pathfinding] NavigationGrid not ready, falling back to hex-based');
      return this.getReachableHexesFallback(normalized, maxMovement, traits);
    }

    // Use provided navCell if available, otherwise find a passable cell in the hex
    let startCell: { x: number; y: number } | null = null;

    if (startNavCell) {
      // Verify the provided cell is passable
      if (navigationGrid.isCellPassable(startNavCell.x, startNavCell.y)) {
        startCell = startNavCell;
        logger.debug(`[Pathfinding] Using provided navCell (${startNavCell.x}, ${startNavCell.y})`);
      } else {
        logger.warn(`[Pathfinding] Provided navCell (${startNavCell.x}, ${startNavCell.y}) is blocked, finding alternative`);
      }
    }

    if (!startCell) {
      startCell = navigationGrid.getPassableCellInHex(normalized);
      if (startCell) {
        logger.debug(`[Pathfinding] Found passable cell (${startCell.x}, ${startCell.y}) in hex ${normalized}`);
      }
    }

    if (!startCell) {
      logger.warn(`[Pathfinding] No passable cell in start hex ${normalized} - hex may be entirely blocked`);
      reachable.set(normalized, 0);
      return reachable;
    }

    // Flying units ignore terrain and rivers - use simpler hex-based pathfinding
    if (traits?.canFly) {
      return this.getReachableHexesFlying(normalized, maxMovement);
    }

    // Track: best cost to reach each hex
    const hexCosts: Map<string, number> = new Map();
    hexCosts.set(normalized, 0);

    // Track: best cost to reach each cell (for efficiency)
    const cellCosts: Map<string, number> = new Map();
    const startCellKey = `${startCell.x},${startCell.y}`;
    cellCosts.set(startCellKey, 0);

    // Priority queue: { cell: {x, y}, hexId: string, cost: number }
    // Using array with sort - for large maps, use proper priority queue
    const frontier: Array<{ cellX: number; cellY: number; hexId: string; cost: number }> = [];
    frontier.push({ cellX: startCell.x, cellY: startCell.y, hexId: normalized, cost: 0 });

    // Safety: max iterations to prevent infinite loops
    const maxIterations = 100000;
    let iterations = 0;

    while (frontier.length > 0 && iterations < maxIterations) {
      iterations++;

      // Get lowest cost cell
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift()!;
      const currentCellKey = `${current.cellX},${current.cellY}`;

      // Skip if we've found a better path to this cell
      const existingCellCost = cellCosts.get(currentCellKey);
      if (existingCellCost !== undefined && existingCellCost < current.cost) {
        continue;
      }

      // Explore 4-directional neighbors
      const neighbors = navigationGrid.getCellNeighbors(current.cellX, current.cellY);

      for (const neighbor of neighbors) {
        // Skip blocked cells (unless crossing)
        if (!navigationGrid.isCellPassable(neighbor.x, neighbor.y)) {
          continue;
        }

        // What hex is this cell in?
        const neighborHexId = navigationGrid.getHexForCell(neighbor.x, neighbor.y);
        if (!neighborHexId) {
          // Cell is outside kingdom bounds
          continue;
        }

        // Calculate cost: 0 if same hex, terrain cost if entering new hex
        let moveCost = 0;
        if (neighborHexId !== current.hexId) {
          // Entering a new hex - charge terrain cost
          moveCost = this.getHexMovementCost(neighborHexId, traits);
          if (moveCost === Infinity) {
            // Impassable hex (e.g., water for non-swimming unit)
            continue;
          }
        }

        const newCost = current.cost + moveCost;

        // Skip if over budget
        if (newCost > maxMovement) {
          continue;
        }

        const neighborCellKey = `${neighbor.x},${neighbor.y}`;

        // Check if this is a better path to this cell
        const existingNeighborCellCost = cellCosts.get(neighborCellKey);
        if (existingNeighborCellCost !== undefined && existingNeighborCellCost <= newCost) {
          continue;
        }

        // Found better path - update
        cellCosts.set(neighborCellKey, newCost);

        // Update hex cost if this is a better path to this hex
        const existingHexCost = hexCosts.get(neighborHexId);
        if (existingHexCost === undefined || newCost < existingHexCost) {
          hexCosts.set(neighborHexId, newCost);
        }

        // Add to frontier
        frontier.push({
          cellX: neighbor.x,
          cellY: neighbor.y,
          hexId: neighborHexId,
          cost: newCost
        });
      }
    }

    if (iterations >= maxIterations) {
      logger.warn(`[Pathfinding] Hit max iterations (${maxIterations})`);
    }

    // Convert hexCosts to reachable map
    for (const [hexId, cost] of hexCosts) {
      reachable.set(hexId, cost);
    }

    logger.debug(`[Pathfinding] Cell-based reachability: ${reachable.size} hexes reachable, ${iterations} iterations`);
    return reachable;
  }

  /**
   * Get hex movement cost (terrain-based)
   * Used by cell-based pathfinding when entering a new hex
   */
  private getHexMovementCost(hexId: string, traits?: ArmyMovementTraits): number {
    const node = movementGraph.getNode(hexId);
    if (!node) return Infinity;

    const { canSwim = false, hasBoats = false, amphibious = false } = traits || {};

    // Water hexes
    if (node.waterType === 'lake') {
      if (canSwim || hasBoats) return 1;
      return Infinity;
    }

    if (node.waterType === 'swamp') {
      if (canSwim || hasBoats) return 2;
      if (amphibious) return 2;
      // Land units can traverse swamps at +1 cost
    }

    // Land terrain
    let cost = 1;
    if (node.travel === 'difficult') cost = 2;
    else if (node.travel === 'greater-difficult') cost = 3;

    // Swamps add +1 for land units (up to max 3)
    if (node.waterType === 'swamp' && cost < 3) {
      cost += 1;
    }

    // Roads reduce cost
    if (node.hasRoad || node.hasSettlement) {
      cost = Math.max(1, cost - 1);
    }

    return cost;
  }

  /**
   * Fallback hex-based pathfinding when navigation grid not ready
   */
  private getReachableHexesFallback(startHexId: string, maxMovement: number, traits?: ArmyMovementTraits): ReachabilityMap {
    const reachable: ReachabilityMap = new Map();
    const frontier: Array<{ hexId: string; cost: number }> = [];

    frontier.push({ hexId: startHexId, cost: 0 });
    reachable.set(startHexId, 0);

    while (frontier.length > 0) {
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift()!;

      if (current.cost > (reachable.get(current.hexId) || Infinity)) {
        continue;
      }

      const neighbors = navigationGrid.getNeighborHexIds(current.hexId);

      for (const neighborId of neighbors) {
        const moveCost = this.getMovementCost(neighborId, traits, current.hexId);
        if (moveCost === Infinity) continue;

        const newCost = current.cost + moveCost;
        if (newCost > maxMovement) continue;

        const existingCost = reachable.get(neighborId);
        if (existingCost !== undefined && existingCost <= newCost) continue;

        reachable.set(neighborId, newCost);
        frontier.push({ hexId: neighborId, cost: newCost });
      }
    }

    return reachable;
  }

  /**
   * Optimized flying pathfinding (ignores terrain and rivers)
   */
  private getReachableHexesFlying(startHexId: string, maxMovement: number): ReachabilityMap {
    const reachable: ReachabilityMap = new Map();
    const frontier: Array<{ hexId: string; cost: number }> = [];

    frontier.push({ hexId: startHexId, cost: 0 });
    reachable.set(startHexId, 0);

    while (frontier.length > 0) {
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift()!;

      if (current.cost > (reachable.get(current.hexId) || Infinity)) {
        continue;
      }

      const neighbors = navigationGrid.getNeighborHexIds(current.hexId);

      for (const neighborId of neighbors) {
        const newCost = current.cost + 1; // Flying always costs 1
        if (newCost > maxMovement) continue;

        const existingCost = reachable.get(neighborId);
        if (existingCost !== undefined && existingCost <= newCost) continue;

        reachable.set(neighborId, newCost);
        frontier.push({ hexId: neighborId, cost: newCost });
      }
    }

    return reachable;
  }

  /**
   * Find optimal path from start to target using cell-based A* algorithm
   *
   * Runs A* on 8x8 pixel grid cells with hex-distance heuristic.
   * Movement cost is charged when entering a new hex.
   * Returns the path as a list of hex IDs.
   *
   * @param startHexId - Starting hex ID
   * @param targetHexId - Target hex ID
   * @param maxMovement - Maximum movement points (default: 20)
   * @param traits - Army movement traits (canFly, canSwim, hasBoats)
   * @param startNavCell - Optional specific nav-grid cell to start from (for armies with saved position)
   * @param targetNavCell - Optional specific nav-grid cell to target (for mouse-position-aware targeting)
   * @returns PathResult with path, cost, and reachability, plus the final nav cell
   */
  findPath(
    startHexId: string,
    targetHexId: string,
    maxMovement: number = DEFAULT_MOVEMENT_RANGE,
    traits?: ArmyMovementTraits,
    startNavCell?: { x: number; y: number },
    targetNavCell?: { x: number; y: number }
  ): PathResult | null {
    const startNormalized = normalizeHexId(startHexId);
    const targetNormalized = normalizeHexId(targetHexId);

    // Edge case: start = target
    if (startNormalized === targetNormalized) {
      return {
        path: [startNormalized],
        totalCost: 0,
        isReachable: true
      };
    }

    // Check if navigation grid is ready
    if (!navigationGrid.isReady()) {
      logger.warn('[Pathfinding] NavigationGrid not ready, falling back to hex-based');
      return this.findPathFallback(startNormalized, targetNormalized, maxMovement, traits);
    }

    // Use provided navCell if available, otherwise find a passable cell in the hex
    let startCell: { x: number; y: number } | null = null;

    if (startNavCell) {
      if (navigationGrid.isCellPassable(startNavCell.x, startNavCell.y)) {
        startCell = startNavCell;
      } else {
        logger.warn(`[Pathfinding] Provided navCell is blocked, finding alternative`);
      }
    }

    if (!startCell) {
      startCell = navigationGrid.getPassableCellInHex(startNormalized);
    }

    if (!startCell) {
      logger.warn(`[Pathfinding] No passable cell in start hex ${startNormalized}`);
      return { path: [], totalCost: Infinity, isReachable: false };
    }

    // Determine target cell - use provided targetNavCell if valid, otherwise hex center
    let targetCell: { x: number; y: number } | null = null;

    if (targetNavCell) {
      // Check if the provided target cell is in the target hex and passable
      const targetCellHex = navigationGrid.getHexForCell(targetNavCell.x, targetNavCell.y);
      if (targetCellHex === targetNormalized && navigationGrid.isCellPassable(targetNavCell.x, targetNavCell.y)) {
        targetCell = targetNavCell;
      } else if (targetCellHex === targetNormalized) {
        // Cell is in hex but blocked - find nearest passable cell in target hex
        targetCell = navigationGrid.getPassableCellInHex(targetNormalized);
      }
    }

    // Fallback to hex center if no valid target cell found
    if (!targetCell) {
      targetCell = navigationGrid.hexCenterToCell(targetNormalized);
    }

    if (!targetCell) {
      logger.warn(`[Pathfinding] Cannot find cell for target hex ${targetNormalized}`);
      return { path: [], totalCost: Infinity, isReachable: false };
    }

    // Flying units - use simple hex-based pathfinding
    if (traits?.canFly) {
      return this.findPathFlying(startNormalized, targetNormalized, maxMovement);
    }

    // Cell-based A* with hex tracking
    // Track: cell -> { cost, parentCell, hexId, parentHexId }
    interface CellNode {
      cellX: number;
      cellY: number;
      hexId: string;
      gCost: number;
      fCost: number;
      parentCellKey: string | null;
      parentHexId: string | null;
    }

    const cellNodes: Map<string, CellNode> = new Map();
    const openSet: Map<string, CellNode> = new Map();
    const closedSet: Set<string> = new Set();

    // Heuristic: Use current movement strategy's heuristic (admissible - never overestimates)
    const strategy = getMovementStrategy();
    const heuristic = (cellX: number, cellY: number): number => {
      return strategy.heuristic(cellX, cellY, targetCell.x, targetCell.y);
    };

    // Initialize start
    const startCellKey = `${startCell.x},${startCell.y}`;
    const startNode: CellNode = {
      cellX: startCell.x,
      cellY: startCell.y,
      hexId: startNormalized,
      gCost: 0,
      fCost: heuristic(startCell.x, startCell.y),
      parentCellKey: null,
      parentHexId: null
    };
    cellNodes.set(startCellKey, startNode);
    openSet.set(startCellKey, startNode);

    // Track best cost to reach each hex (for path reconstruction)
    const hexParents: Map<string, string | null> = new Map();
    const hexCosts: Map<string, number> = new Map();
    hexParents.set(startNormalized, null);
    hexCosts.set(startNormalized, 0);

    const maxIterations = 100000;
    let iterations = 0;

    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;

      // Get cell with lowest fCost
      let current: CellNode | null = null;
      let currentCellKey = '';

      for (const [key, node] of openSet) {
        if (!current || node.fCost < current.fCost) {
          current = node;
          currentCellKey = key;
        }
      }

      if (!current) break;

      // Found target cell?
      if (current.cellX === targetCell.x && current.cellY === targetCell.y) {
        // Reconstruct hex path with final nav cell and cell path
        return this.reconstructCellPath(
          hexParents,
          hexCosts,
          targetNormalized,
          { x: current.cellX, y: current.cellY },
          cellNodes,
          currentCellKey
        );
      }

      // Move from open to closed
      openSet.delete(currentCellKey);
      closedSet.add(currentCellKey);

      // Explore neighbors
      const neighbors = navigationGrid.getCellNeighbors(current.cellX, current.cellY);

      for (const neighbor of neighbors) {
        const neighborCellKey = `${neighbor.x},${neighbor.y}`;

        // Skip if already evaluated
        if (closedSet.has(neighborCellKey)) continue;

        // Skip blocked cells
        if (!navigationGrid.isCellPassable(neighbor.x, neighbor.y)) continue;

        // What hex is this cell in?
        const neighborHexId = navigationGrid.getHexForCell(neighbor.x, neighbor.y);
        if (!neighborHexId) continue;

        // Calculate cost
        let moveCost = 0;
        if (neighborHexId !== current.hexId) {
          moveCost = this.getHexMovementCost(neighborHexId, traits);
          if (moveCost === Infinity) continue;
        }

        const tentativeGCost = current.gCost + moveCost;

        // Skip if over budget
        if (tentativeGCost > maxMovement) continue;

        // Check if this is a better path
        const existingNode = cellNodes.get(neighborCellKey);
        if (existingNode && existingNode.gCost <= tentativeGCost) continue;

        // Better path found
        const newNode: CellNode = {
          cellX: neighbor.x,
          cellY: neighbor.y,
          hexId: neighborHexId,
          gCost: tentativeGCost,
          fCost: tentativeGCost + heuristic(neighbor.x, neighbor.y),
          parentCellKey: currentCellKey,
          parentHexId: current.hexId
        };

        cellNodes.set(neighborCellKey, newNode);
        openSet.set(neighborCellKey, newNode);

        // Update hex parent if this is a better path to this hex
        const existingHexCost = hexCosts.get(neighborHexId);
        if (existingHexCost === undefined || tentativeGCost < existingHexCost) {
          hexCosts.set(neighborHexId, tentativeGCost);
          // Record which hex we came from when entering this hex
          if (neighborHexId !== current.hexId) {
            hexParents.set(neighborHexId, current.hexId);
          }
        }
      }
    }

    // No path found
    return {
      path: [],
      totalCost: Infinity,
      isReachable: false
    };
  }

  /**
   * Reconstruct hex path and cell path from cell-based A* results
   */
  private reconstructCellPath(
    hexParents: Map<string, string | null>,
    hexCosts: Map<string, number>,
    targetHexId: string,
    finalNavCell: { x: number; y: number },
    cellNodes?: Map<string, { cellX: number; cellY: number; parentCellKey: string | null }>,
    targetCellKey?: string
  ): PathResult {
    // Reconstruct hex path
    const path: string[] = [];
    let current: string | null = targetHexId;

    while (current !== null) {
      path.unshift(current);
      current = hexParents.get(current) ?? null;
    }

    const totalCost = hexCosts.get(targetHexId) ?? Infinity;

    // Reconstruct cell path (for debug visualization)
    let cellPath: Array<{ x: number; y: number }> | undefined;
    if (cellNodes && targetCellKey) {
      cellPath = [];
      let cellKey: string | null = targetCellKey;

      while (cellKey !== null) {
        const node = cellNodes.get(cellKey);
        if (node) {
          cellPath.unshift({ x: node.cellX, y: node.cellY });
          cellKey = node.parentCellKey;
        } else {
          break;
        }
      }
    }

    return {
      path,
      totalCost,
      isReachable: true,
      finalNavCell,
      cellPath
    };
  }

  /**
   * Fallback hex-based pathfinding
   */
  private findPathFallback(
    startHexId: string,
    targetHexId: string,
    maxMovement: number,
    traits?: ArmyMovementTraits
  ): PathResult | null {
    const openSet = new Set<string>([startHexId]);
    const closedSet = new Set<string>();
    const nodes = new Map<string, PathNode>();

    nodes.set(startHexId, {
      hexId: startHexId,
      gCost: 0,
      hCost: hexDistance(startHexId, targetHexId),
      fCost: hexDistance(startHexId, targetHexId),
      parent: null
    });

    while (openSet.size > 0) {
      let current: PathNode | null = null;
      let currentHexId = '';

      for (const hexId of openSet) {
        const node = nodes.get(hexId)!;
        if (!current || node.fCost < current.fCost) {
          current = node;
          currentHexId = hexId;
        }
      }

      if (!current) break;

      if (currentHexId === targetHexId) {
        return this.reconstructPath(nodes, targetHexId);
      }

      openSet.delete(currentHexId);
      closedSet.add(currentHexId);

      const neighbors = navigationGrid.getNeighborHexIds(currentHexId);

      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue;

        const moveCost = this.getMovementCost(neighborId, traits, currentHexId);
        if (moveCost === Infinity) continue;

        const tentativeGCost = current.gCost + moveCost;
        if (tentativeGCost > maxMovement) continue;

        const existingNode = nodes.get(neighborId);
        if (!existingNode || tentativeGCost < existingNode.gCost) {
          const hCost = hexDistance(neighborId, targetHexId);
          nodes.set(neighborId, {
            hexId: neighborId,
            gCost: tentativeGCost,
            hCost,
            fCost: tentativeGCost + hCost,
            parent: currentHexId
          });
          openSet.add(neighborId);
        }
      }
    }

    return { path: [], totalCost: Infinity, isReachable: false };
  }

  /**
   * Optimized flying pathfinding
   */
  private findPathFlying(
    startHexId: string,
    targetHexId: string,
    maxMovement: number
  ): PathResult | null {
    const openSet = new Set<string>([startHexId]);
    const closedSet = new Set<string>();
    const nodes = new Map<string, PathNode>();

    nodes.set(startHexId, {
      hexId: startHexId,
      gCost: 0,
      hCost: hexDistance(startHexId, targetHexId),
      fCost: hexDistance(startHexId, targetHexId),
      parent: null
    });

    while (openSet.size > 0) {
      let current: PathNode | null = null;
      let currentHexId = '';

      for (const hexId of openSet) {
        const node = nodes.get(hexId)!;
        if (!current || node.fCost < current.fCost) {
          current = node;
          currentHexId = hexId;
        }
      }

      if (!current) break;

      if (currentHexId === targetHexId) {
        return this.reconstructPath(nodes, targetHexId);
      }

      openSet.delete(currentHexId);
      closedSet.add(currentHexId);

      const neighbors = navigationGrid.getNeighborHexIds(currentHexId);

      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue;

        const tentativeGCost = current.gCost + 1; // Flying always costs 1
        if (tentativeGCost > maxMovement) continue;

        const existingNode = nodes.get(neighborId);
        if (!existingNode || tentativeGCost < existingNode.gCost) {
          const hCost = hexDistance(neighborId, targetHexId);
          nodes.set(neighborId, {
            hexId: neighborId,
            gCost: tentativeGCost,
            hCost,
            fCost: tentativeGCost + hCost,
            parent: currentHexId
          });
          openSet.add(neighborId);
        }
      }
    }

    return { path: [], totalCost: Infinity, isReachable: false };
  }

  /**
   * Reconstruct path from A* node map
   */
  private reconstructPath(nodes: Map<string, PathNode>, targetHexId: string): PathResult {
    const path: string[] = [];
    let current: string | null = targetHexId;

    while (current !== null) {
      path.unshift(current);
      const node = nodes.get(current);
      current = node?.parent || null;
    }

    const targetNode = nodes.get(targetHexId)!;

    // Debug: Verify path goes through adjacent hexes only
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const distance = hexDistance(from, to);
      
      if (distance !== 1) {
        logger.error(`[Pathfinding] Path jumps from ${from} to ${to} (distance=${distance})!`);
        logger.error(`[Pathfinding] Full path:`, path);
        
        // Get neighbors to debug
        const neighbors = getNeighborHexIds(from);
        logger.error(`[Pathfinding] ${from} neighbors:`, neighbors);
        logger.error(`[Pathfinding] Is ${to} a neighbor? ${neighbors.includes(to)}`);
      }
    }

    return {
      path,
      totalCost: targetNode.gCost,
      isReachable: true
    };
  }

  /**
   * Check if a hex exists in kingdom data
   */
  hexExists(hexId: string): boolean {
    const normalized = normalizeHexId(hexId);
    return this.hexMap.has(normalized);
  }

  /**
   * Get hex data by ID
   */
  getHex(hexId: string): Hex | undefined {
    const normalized = normalizeHexId(hexId);
    return this.hexMap.get(normalized);
  }
}

// Export singleton instance
export const pathfindingService = new PathfindingService();
