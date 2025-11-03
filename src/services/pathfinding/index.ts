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
import { waterwayLookup } from './WaterwayLookup';
import type { ArmyMovementTraits } from '../../utils/armyMovementTraits';

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
   * Get movement cost for entering a hex (NEW: Uses waterways and movement traits)
   * 
   * Movement costs:
   * - Flying armies: Always 1 (ignores all terrain)
   * - Naval/Swimming armies on water: 1 (rivers, lakes) or 2 (swamps - difficult)
   *   - +1 penalty for upstream river travel
   * - Grounded armies on water: Infinity (impassable unless crossing exists)
   * - Grounded armies on land:
   *   - Open terrain: 1
   *   - Difficult terrain: 2
   *   - Greater difficult terrain: 3
   *   - Roads reduce cost by 1 step (min 1)
   * 
   * @param hexId - Target hex ID
   * @param traits - Army movement traits (canFly, canSwim, hasBoats)
   * @param fromHexId - Optional source hex (for directional costs like upstream)
   * @returns Movement cost (or Infinity if hex doesn't exist or impassable)
   */
  getMovementCost(hexId: string, traits?: ArmyMovementTraits, fromHexId?: string): number {
    const normalized = normalizeHexId(hexId);
    const hex = this.hexMap.get(normalized);

    if (!hex) {
      // Hex doesn't exist in our data - treat as impassable
      return Infinity;
    }

    // Default traits (grounded, no special movement)
    const { canFly = false, canSwim = false, hasBoats = false } = traits || {};

    // Parse hex coordinates for waterway lookup
    const parts = normalized.split('.');
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);

    // Check waterways using new lookup service
    const hasRiver = waterwayLookup.hasRiver(hexI, hexJ);
    const hasLake = waterwayLookup.hasLake(hexI, hexJ);
    const hasSwamp = waterwayLookup.hasSwamp(hexI, hexJ);
    const hasCrossing = waterwayLookup.hasCrossing(hexI, hexJ);
    const hasWaterfall = waterwayLookup.hasWaterfall(hexI, hexJ);
    
    // Check water terrain
    const isWaterTerrain = hex.terrain === 'water';
    
    // Any waterway or water terrain = water hex
    const isWaterHex = hasRiver || hasLake || hasSwamp || isWaterTerrain;

    // Flying armies always cost 1 per hex (ignore all terrain)
    if (canFly) {
      return 1;
    }

    // Amphibious units: Choose best cost between water and land movement
    const { amphibious = false } = traits || {};
    if (amphibious) {
      // Calculate water movement cost
      let waterCost = Infinity;
      if (isWaterHex) {
        // Waterfalls block naval travel (but not swimmers)
        if (hasWaterfall && hasBoats && !canSwim) {
          waterCost = Infinity;
        } else if (canSwim || hasBoats) {
          waterCost = hasSwamp ? 2 : 1;
        } else if (hasCrossing) {
          waterCost = 1;
        }
      }
      
      // Calculate land movement cost
      let landCost = 1;
      if (hex.travel === 'difficult') {
        landCost = 2;
      } else if (hex.travel === 'greater-difficult') {
        landCost = 3;
      }
      
      // Roads reduce land cost by 1 step (min 1)
      const hasRoad = hex.hasRoad === true;
      const hasSettlement = hex.features?.some((f: any) => f.type === 'settlement') ?? false;
      if (hasRoad || hasSettlement) {
        landCost = Math.max(1, landCost - 1);
      }
      
      // Choose the better (lower) cost
      return Math.min(waterCost, landCost);
    }

    // Handle water hexes (non-amphibious units)
    if (isWaterHex) {
      // Waterfalls block naval travel (boats cannot pass)
      // But swimmers can navigate waterfalls
      if (hasWaterfall && hasBoats && !canSwim) {
        return Infinity;  // Pure naval units blocked by waterfalls
      }
      
      // Naval or swimming armies can traverse water
      if (canSwim || hasBoats) {
        // Base cost: Swamps are difficult (2), rivers/lakes are easy (1)
        let waterCost = hasSwamp ? 2 : 1;
        
        // Check for upstream travel penalty (only applies to rivers)
        if (hasRiver && fromHexId) {
          const parts = fromHexId.split('.');
          const fromHexI = parseInt(parts[0], 10);
          const fromHexJ = parseInt(parts[1], 10);
          
          if (!isNaN(fromHexI) && !isNaN(fromHexJ)) {
            const isUpstreamTravel = waterwayLookup.isUpstream(fromHexI, fromHexJ, hexI, hexJ);
            if (isUpstreamTravel) {
              waterCost += 1;  // +1 penalty for upstream travel
              logger.debug(`[Pathfinding] Upstream travel: ${fromHexId} -> ${hexId} (cost +1)`);
            }
          }
        }
        
        return waterCost;
      }
      
      // Grounded armies can cross if there's a bridge/ford
      if (hasCrossing) {
        return 1;  // Crossing allows passage at cost 1
      }
      
      // Grounded army, no crossing = impassable
      return Infinity;
    }

    // Land movement: Base cost from travel difficulty
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
   * Calculate all hexes reachable within movement range (NEW: Uses movement traits)
   * Uses Dijkstra's algorithm (A* without heuristic)
   * 
   * @param startHexId - Starting hex ID
   * @param maxMovement - Maximum movement points (default: 20)
   * @param traits - Army movement traits (canFly, canSwim, hasBoats)
   * @returns Map of hex ID -> movement cost to reach
   */
  getReachableHexes(startHexId: string, maxMovement: number = DEFAULT_MOVEMENT_RANGE, traits?: ArmyMovementTraits): ReachabilityMap {
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
        const moveCost = this.getMovementCost(neighborNormalized, traits, current.hexId);
        
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
   * Find optimal path from start to target using A* algorithm (NEW: Uses movement traits)
   * 
   * @param startHexId - Starting hex ID
   * @param targetHexId - Target hex ID
   * @param maxMovement - Maximum movement points (default: 20)
   * @param traits - Army movement traits (canFly, canSwim, hasBoats)
   * @returns PathResult with path, cost, and reachability
   */
  findPath(
    startHexId: string,
    targetHexId: string,
    maxMovement: number = DEFAULT_MOVEMENT_RANGE,
    traits?: ArmyMovementTraits
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

        const moveCost = this.getMovementCost(neighborNormalized, traits, currentHexId);

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
