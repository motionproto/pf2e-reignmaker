/**
 * PathfindingService - A* pathfinding for army movement
 * Based on Red Blob Games: https://www.redblobgames.com/pathfinding/a-star/
 */

import type { Hex } from '../../models/Hex';
import type { PathResult, PathNode, ReachabilityMap } from './types';
import { hexDistance, getNeighborHexIds, normalizeHexId } from './coordinates';
import { kingdomData } from '../../stores/KingdomStore';
import { get } from 'svelte/store';
import { logger } from '../../utils/Logger';

/**
 * Default movement range for armies
 */
const DEFAULT_MOVEMENT_RANGE = 20;

/**
 * PathfindingService - Core pathfinding logic for army movement
 * Uses reactive KingdomStore subscription for automatic cache updates
 */
export class PathfindingService {
  private hexMap: Map<string, Hex> = new Map();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    // Subscribe to kingdom data changes for automatic reactivity
    this.unsubscribe = kingdomData.subscribe(kingdom => {
      this.buildHexMap(kingdom.hexes || []);
    });
    
    // logger.debug('[Pathfinding] Service initialized with reactive store subscription');
  }

  /**
   * Build hex lookup map from kingdom hex data
   * Called automatically when kingdom data changes
   */
  private buildHexMap(hexes: any[]): void {
    this.hexMap.clear();
    
    hexes.forEach((hex: any) => {
      const normalized = normalizeHexId(hex.id);
      this.hexMap.set(normalized, hex as Hex);
    });
    
    // logger.debug(`[Pathfinding] Hex map rebuilt with ${this.hexMap.size} hexes`);
  }

  /**
   * Refresh kingdom data (for backwards compatibility)
   * Note: Usually not needed due to reactive store subscription
   */
  refresh(): void {
    const kingdom = get(kingdomData);
    this.buildHexMap(kingdom.hexes || []);
    // logger.debug('[Pathfinding] Manual refresh triggered');
  }
  
  /**
   * Clean up store subscription
   * Call when service is no longer needed
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      // logger.debug('[Pathfinding] Store subscription cleaned up');
    }
  }

  /**
   * Get movement cost for entering a hex
   * 
   * Movement costs:
   * - Flying armies: Always 1 (ignores terrain)
   * - Swimming armies: Cost 1 on water/river hexes
   * - Swim-only armies: Can ONLY move on water/river hexes (others are impassable)
   * - Grounded armies:
   *   - Open terrain: 1
   *   - Difficult terrain: 2
   *   - Greater difficult terrain: 3
   *   - Roads reduce cost by 1 step (min 1)
   * 
   * @param hexId - Target hex ID
   * @param canFly - Whether the army can fly (ignores terrain costs)
   * @param canSwim - Whether the army can swim (water/river hexes cost 1)
   * @param hasOnlySwim - Whether the army can ONLY swim (restricted to water/river hexes)
   * @returns Movement cost (or Infinity if hex doesn't exist or impassable)
   */
  getMovementCost(hexId: string, canFly: boolean = false, canSwim: boolean = false, hasOnlySwim: boolean = false): number {
    const normalized = normalizeHexId(hexId);
    const hex = this.hexMap.get(normalized);

    if (!hex) {
      // Hex doesn't exist in our data - treat as impassable
      return Infinity;
    }

    // Check if hex is water or has river feature
    const isWaterTerrain = hex.terrain === 'water';
    const hasRiver = hex.features?.some((f: any) => 
      f.type === 'river' || 
      f.name?.toLowerCase().includes('river') || 
      f.name?.toLowerCase().includes('stream')
    ) ?? false;
    const isWaterHex = isWaterTerrain || hasRiver;

    // Flying armies always cost 1 per hex (ignore terrain)
    if (canFly) {
      return 1;
    }

    // Swim-only armies can ONLY move on water/river hexes
    if (hasOnlySwim) {
      return isWaterHex ? 1 : Infinity;
    }

    // Swimming armies get cost 1 on water/river hexes
    if (canSwim && isWaterHex) {
      return 1;
    }

    // Base cost from travel difficulty
    let cost = 1; // open (default)
    
    if (hex.travel === 'difficult') {
      cost = 2;
    } else if (hex.travel === 'greater-difficult') {
      cost = 3;
    }

    // Roads reduce cost by 1 step (min 1)
    // Check hasRoad flag OR settlement (settlements count as roads)
    const hasRoad = hex.hasRoad === true;
    const hasSettlement = hex.features?.some((f: any) => f.type === 'settlement') ?? false;
    
    if (hasRoad || hasSettlement) {
      cost = Math.max(1, cost - 1);
    }

    return cost;
  }

  /**
   * Calculate all hexes reachable within movement range
   * Uses Dijkstra's algorithm (A* without heuristic)
   * 
   * @param startHexId - Starting hex ID
   * @param maxMovement - Maximum movement points (default: 20)
   * @param canFly - Whether the army can fly (ignores terrain costs)
   * @param canSwim - Whether the army can swim (water/river hexes cost 1)
   * @param hasOnlySwim - Whether the army can ONLY swim (restricted to water/river hexes)
   * @returns Map of hex ID -> movement cost to reach
   */
  getReachableHexes(startHexId: string, maxMovement: number = DEFAULT_MOVEMENT_RANGE, canFly: boolean = false, canSwim: boolean = false, hasOnlySwim: boolean = false): ReachabilityMap {
    const normalized = normalizeHexId(startHexId);
    const reachable: ReachabilityMap = new Map();
    const frontier: Array<{ hexId: string; cost: number }> = [];
    
    // Start with origin (0 cost)
    frontier.push({ hexId: normalized, cost: 0 });
    reachable.set(normalized, 0);

    while (frontier.length > 0) {
      // Get lowest cost hex (simple sort - for large maps, use priority queue)
      frontier.sort((a, b) => a.cost - b.cost);
      const current = frontier.shift()!;

      // Skip if we've found a better path already
      if (current.cost > (reachable.get(current.hexId) || Infinity)) {
        continue;
      }

      // Check all neighbors
      const neighbors = getNeighborHexIds(current.hexId);
      
      for (const neighbor of neighbors) {
        const neighborNormalized = normalizeHexId(neighbor);
        const moveCost = this.getMovementCost(neighborNormalized, canFly, canSwim, hasOnlySwim);
        
        // Skip impassable hexes
        if (moveCost === Infinity) {
          continue;
        }

        const newCost = current.cost + moveCost;

        // Skip if over budget
        if (newCost > maxMovement) {
          continue;
        }

        // Skip if we have a better path already
        const existingCost = reachable.get(neighborNormalized);
        if (existingCost !== undefined && existingCost <= newCost) {
          continue;
        }

        // Found better path - update
        reachable.set(neighborNormalized, newCost);
        frontier.push({ hexId: neighborNormalized, cost: newCost });
      }
    }

    return reachable;
  }

  /**
   * Find optimal path from start to target using A* algorithm
   * 
   * @param startHexId - Starting hex ID
   * @param targetHexId - Target hex ID
   * @param maxMovement - Maximum movement points (default: 20)
   * @param canFly - Whether the army can fly (ignores terrain costs)
   * @param canSwim - Whether the army can swim (water/river hexes cost 1)
   * @param hasOnlySwim - Whether the army can ONLY swim (restricted to water/river hexes)
   * @returns PathResult with path, cost, and reachability
   */
  findPath(
    startHexId: string,
    targetHexId: string,
    maxMovement: number = DEFAULT_MOVEMENT_RANGE,
    canFly: boolean = false,
    canSwim: boolean = false,
    hasOnlySwim: boolean = false
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

    // A* data structures
    const openSet = new Set<string>([startNormalized]);
    const closedSet = new Set<string>();
    const nodes = new Map<string, PathNode>();

    // Initialize start node
    nodes.set(startNormalized, {
      hexId: startNormalized,
      gCost: 0,
      hCost: hexDistance(startNormalized, targetNormalized),
      fCost: hexDistance(startNormalized, targetNormalized),
      parent: null
    });

    while (openSet.size > 0) {
      // Get node with lowest fCost
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

      // Found target?
      if (currentHexId === targetNormalized) {
        return this.reconstructPath(nodes, targetNormalized);
      }

      // Move current from open to closed
      openSet.delete(currentHexId);
      closedSet.add(currentHexId);

      // Check neighbors
      const neighbors = getNeighborHexIds(currentHexId);

      for (const neighbor of neighbors) {
        const neighborNormalized = normalizeHexId(neighbor);

        // Skip if already evaluated
        if (closedSet.has(neighborNormalized)) {
          continue;
        }

        const moveCost = this.getMovementCost(neighborNormalized, canFly, canSwim, hasOnlySwim);

        // Skip impassable hexes
        if (moveCost === Infinity) {
          continue;
        }

        const tentativeGCost = current.gCost + moveCost;

        // Skip if over budget
        if (tentativeGCost > maxMovement) {
          continue;
        }

        // Check if this is a better path
        const existingNode = nodes.get(neighborNormalized);
        
        if (!existingNode || tentativeGCost < existingNode.gCost) {
          const hCost = hexDistance(neighborNormalized, targetNormalized);
          const newNode: PathNode = {
            hexId: neighborNormalized,
            gCost: tentativeGCost,
            hCost,
            fCost: tentativeGCost + hCost,
            parent: currentHexId
          };

          nodes.set(neighborNormalized, newNode);
          openSet.add(neighborNormalized);
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
