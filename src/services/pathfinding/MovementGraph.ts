/**
 * MovementGraph - Precomputed movement graph for pathfinding
 *
 * Builds a graph of hex nodes and edges with precomputed movement costs.
 * Uses NavigationGrid for river blocking detection and hex neighbors.
 *
 * Based on Red Blob Games: https://www.redblobgames.com/pathfinding/a-star/
 */

import type { KingdomData, WaterFeature } from '../../actors/KingdomActor';
import type { HexNode, EdgeData, TravelDifficulty, HexWaterType } from './types';
import type { ArmyMovementTraits } from '../../utils/armyMovementTraits';
import { navigationGrid } from './NavigationGrid';
import { normalizeHexId } from './coordinates';
import { waterwayLookup } from './WaterwayLookup';
import { kingdomData } from '../../stores/KingdomStore';
import { get } from 'svelte/store';
import { logger } from '../../utils/Logger';

/**
 * Edge key format: "from->to"
 */
type EdgeKey = string;

/**
 * MovementGraph - Precomputed movement costs for pathfinding
 */
export class MovementGraph {
  /** Hex nodes keyed by hex ID */
  private nodes: Map<string, HexNode> = new Map();

  /** Directional edges keyed by "from->to" */
  private edges: Map<EdgeKey, EdgeData> = new Map();

  /** Store subscription cleanup */
  private unsubscribe: (() => void) | null = null;

  /** Flag to track if graph is ready */
  private isBuilt = false;

  /** Canvas reference */
  private canvas: any = null;

  /** Hash of pathfinding-relevant data to detect changes */
  private lastDataHash: string = '';

  constructor() {}

  /**
   * Initialize the graph with reactive store subscription
   * Call this after canvas is ready
   */
  initialize(canvas: any): void {
    this.canvas = canvas;

    // Subscribe to kingdom data changes - but only rebuild if relevant data changed
    this.unsubscribe = kingdomData.subscribe(kingdom => {
      this.rebuildIfChanged(kingdom, canvas);
    });

    logger.info('[MovementGraph] Initialized with reactive store subscription');
  }

  /**
   * Compute hash of pathfinding-relevant data
   * Only includes: hex terrain/roads/travel, rivers, water features
   */
  private computeDataHash(kingdom: KingdomData): string {
    // Hash hex data (terrain, travel, roads, settlements)
    const hexHash = kingdom.hexes?.map(h => {
      const hasSettlement = h.features?.some((f: any) => f.type === 'settlement') ? 1 : 0;
      return `${h.id}:${h.terrain}:${h.travel || ''}:${h.hasRoad ? 1 : 0}:${hasSettlement}`;
    }).join('|') || '';

    // Hash river data (legacy)
    const riverPathCount = kingdom.rivers?.paths?.length || 0;
    const riverPointCount = kingdom.rivers?.paths?.reduce((sum, p) => sum + p.points.length, 0) || 0;
    const crossingCount = kingdom.rivers?.crossings?.length || 0;
    const waterfallCount = kingdom.rivers?.waterfalls?.length || 0;

    // Hash cell-based river data (new system)
    const cellPathCount = kingdom.rivers?.cellPaths?.length || 0;
    const cellPathPointCount = kingdom.rivers?.cellPaths?.reduce((sum, p) => sum + p.cells.length, 0) || 0;
    const rasterizedCellCount = kingdom.rivers?.rasterizedCells?.length || 0;

    // Hash water features (hex-level lakes/swamps)
    const lakeCount = kingdom.waterFeatures?.lakes?.length || 0;
    const swampCount = kingdom.waterFeatures?.swamps?.length || 0;

    // Hash cell-based lake data (new system)
    const lakeCellCount = kingdom.waterFeatures?.lakeCells?.length || 0;

    // Hash cell-based passage data (crossings)
    const passageCellCount = kingdom.waterFeatures?.passageCells?.length || 0;

    // Combine into a single hash string
    // Using counts for rivers/water since full serialization would be expensive
    return `h${hexHash.length}:r${riverPathCount}.${riverPointCount}:cp${cellPathCount}.${cellPathPointCount}:rc${rasterizedCellCount}:c${crossingCount}:w${waterfallCount}:l${lakeCount}:s${swampCount}:lc${lakeCellCount}:pc${passageCellCount}`;
  }

  /**
   * Rebuild graph only if pathfinding-relevant data has changed
   */
  private rebuildIfChanged(kingdom: KingdomData, canvas: any): void {
    const newHash = this.computeDataHash(kingdom);

    if (newHash === this.lastDataHash && this.isBuilt) {
      // Data hasn't changed, skip rebuild
      return;
    }

    this.lastDataHash = newHash;
    this.buildGraph(kingdom, canvas);
  }

  /**
   * Check if graph is ready for queries
   */
  isReady(): boolean {
    return this.isBuilt && this.nodes.size > 0 && navigationGrid.isReady();
  }

  /**
   * Force rebuild the graph
   */
  rebuild(): void {
    if (!this.canvas) {
      logger.warn('[MovementGraph] Cannot rebuild - canvas not set. Call initialize() first on a hex scene.');
      // Try to get canvas from globalThis
      const canvas = (globalThis as any).canvas;
      if (canvas?.grid) {
        logger.info('[MovementGraph] Found canvas, attempting initialization...');
        const kingdom = get(kingdomData);
        this.buildGraph(kingdom, canvas);
        return;
      }
      return;
    }
    const kingdom = get(kingdomData);
    this.buildGraph(kingdom, this.canvas);
  }

  /**
   * Build the complete movement graph from kingdom data
   */
  buildGraph(kingdom: KingdomData, canvas: any): void {
    this.canvas = canvas;
    this.nodes.clear();
    this.edges.clear();
    this.isBuilt = false;

    logger.info(`[MovementGraph] buildGraph called. hexes: ${kingdom.hexes?.length || 0}, canvas.grid: ${!!canvas?.grid}`);

    if (!kingdom.hexes || kingdom.hexes.length === 0) {
      logger.warn('[MovementGraph] No hexes in kingdom data');
      return;
    }

    // Step 1: Initialize NavigationGrid (caches hex layouts and builds river blocking)
    // This must be called on a hex scene to cache layout data
    logger.info(`[MovementGraph] NavigationGrid ready: ${navigationGrid.isReady()}`);

    if (!navigationGrid.isReady()) {
      if (!canvas?.grid) {
        logger.warn('[MovementGraph] Canvas not ready, skipping graph build');
        return;
      }

      logger.info(`[MovementGraph] Initializing NavigationGrid on ${canvas.grid.constructor.name}...`);
      const initialized = navigationGrid.initialize(canvas, kingdom);
      if (!initialized) {
        logger.warn('[MovementGraph] NavigationGrid initialization failed. Must be on hex scene.');
        return;
      }
    } else {
      // NavigationGrid already initialized, just rebuild water blocking (rivers + lakes)
      navigationGrid.rebuildWaterBlocking(kingdom);
    }

    // Step 2: Build nodes from hexes
    this.buildNodes(kingdom);

    // Step 3: Build edges between adjacent hexes (using NavigationGrid for neighbors)
    this.buildEdges(kingdom);

    this.isBuilt = true;

    // Log summary
    const blockedEdges = Array.from(this.edges.values()).filter(e => e.crossesRiver && !e.hasCrossing).length;
    const navStats = navigationGrid.getStats();
    logger.info(`[MovementGraph] Built graph: ${this.nodes.size} nodes, ${this.edges.size} edges, ${blockedEdges} river-blocked, ${navStats.blockedCells} nav cells blocked`);
  }

  /**
   * Get movement cost for traversing from one hex to another
   *
   * @param from - Source hex ID
   * @param to - Target hex ID
   * @param traits - Army movement traits
   * @returns Movement cost (or Infinity if blocked)
   */
  getEdgeCost(from: string, to: string, traits?: ArmyMovementTraits): number {
    const fromNormalized = normalizeHexId(from);
    const toNormalized = normalizeHexId(to);
    const edgeKey = this.getEdgeKey(fromNormalized, toNormalized);

    const edge = this.edges.get(edgeKey);
    if (!edge) {
      return Infinity; // No edge = impassable
    }

    const node = this.nodes.get(toNormalized);
    if (!node) {
      return Infinity; // No target node = impassable
    }

    // Default traits (grounded, no special movement)
    const { canFly = false, canSwim = false, hasBoats = false, amphibious = false } = traits || {};

    // Flying: always 1 (ignores all terrain and obstacles)
    if (canFly) {
      return edge.flyCost;
    }

    // Check river blocking (for grounded, non-swimming units)
    const blockedByRiver = edge.crossesRiver && !edge.hasCrossing && !canSwim && !hasBoats;
    if (blockedByRiver) {
      return Infinity;
    }

    // Waterfall blocking (for boats without swim ability)
    if (edge.hasWaterfall && hasBoats && !canSwim) {
      return Infinity;
    }

    // Water terrain handling
    if (node.waterType !== 'none') {
      if (canSwim || hasBoats) {
        let cost = node.waterType === 'swamp' ? 2 : 1;
        if (edge.isUpstream) {
          cost += 1;
        }
        return cost;
      }

      // Grounded on water without swimming = blocked (unless amphibious)
      if (!amphibious) {
        return Infinity;
      }
    }

    // Amphibious: choose best of water and land
    if (amphibious && (canSwim || hasBoats)) {
      const waterOption = node.waterType !== 'none'
        ? (node.waterType === 'swamp' ? 2 : 1) + (edge.isUpstream ? 1 : 0)
        : Infinity;
      return Math.min(edge.landCost, waterOption);
    }

    // Default: land cost
    return edge.landCost;
  }

  /**
   * Get a hex node by ID
   */
  getNode(hexId: string): HexNode | undefined {
    return this.nodes.get(normalizeHexId(hexId));
  }

  /**
   * Get all edges from a hex
   */
  getEdgesFrom(hexId: string): EdgeData[] {
    const normalized = normalizeHexId(hexId);
    const edges: EdgeData[] = [];

    for (const [key, edge] of this.edges) {
      if (edge.from === normalized) {
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Get edge data between two hexes (for debugging)
   */
  getEdge(from: string, to: string): EdgeData | undefined {
    const edgeKey = this.getEdgeKey(normalizeHexId(from), normalizeHexId(to));
    return this.edges.get(edgeKey);
  }

  /**
   * Get all nodes (for debugging)
   */
  getAllNodes(): Map<string, HexNode> {
    return new Map(this.nodes);
  }

  /**
   * Get all edges (for debugging)
   */
  getAllEdges(): Map<EdgeKey, EdgeData> {
    return new Map(this.edges);
  }

  /**
   * Get count of river-blocked edges (for debugging)
   */
  getBlockedEdgeCount(): number {
    return Array.from(this.edges.values()).filter(e => e.crossesRiver && !e.hasCrossing).length;
  }

  /**
   * Cleanup store subscription
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.nodes.clear();
    this.edges.clear();
    this.isBuilt = false;
    logger.debug('[MovementGraph] Destroyed');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build nodes from hex data
   */
  private buildNodes(kingdom: KingdomData): void {
    // Build lookup maps for water features
    const lakeHexes = new Set<string>();
    const swampHexes = new Set<string>();

    if (kingdom.waterFeatures?.lakes) {
      for (const lake of kingdom.waterFeatures.lakes) {
        lakeHexes.add(`${lake.hexI}.${lake.hexJ}`);
      }
    }

    if (kingdom.waterFeatures?.swamps) {
      for (const swamp of kingdom.waterFeatures.swamps) {
        swampHexes.add(`${swamp.hexI}.${swamp.hexJ}`);
      }
    }

    // Create nodes for each hex
    for (const hex of kingdom.hexes) {
      const hexId = normalizeHexId(hex.id);
      const parts = hexId.split('.');
      const hexI = parseInt(parts[0], 10);
      const hexJ = parseInt(parts[1], 10);

      // Determine water type
      let waterType: HexWaterType = 'none';
      if (lakeHexes.has(hexId) || hex.terrain === 'water') {
        waterType = 'lake';
      } else if (swampHexes.has(hexId)) {
        waterType = 'swamp';
      }

      // Determine travel difficulty
      let travel: TravelDifficulty = 'open';
      if (hex.travel === 'difficult') {
        travel = 'difficult';
      } else if (hex.travel === 'greater-difficult') {
        travel = 'greater-difficult';
      } else if (hex.terrain === 'water') {
        travel = 'water';
      }

      // Check for settlement
      const hasSettlement = hex.features?.some((f: any) => f.type === 'settlement') ?? false;

      const node: HexNode = {
        id: hexId,
        hexI,
        hexJ,
        terrain: hex.terrain || 'plains',
        travel,
        hasRoad: hex.hasRoad === true,
        hasSettlement,
        waterType
      };

      this.nodes.set(hexId, node);
    }
  }

  /**
   * Build edges between adjacent hexes
   */
  private buildEdges(kingdom: KingdomData): void {
    for (const [hexId, node] of this.nodes) {
      // Use NavigationGrid for scene-independent neighbor lookup
      const neighbors = navigationGrid.getNeighborHexIds(hexId);

      for (const neighborId of neighbors) {
        const neighborNormalized = normalizeHexId(neighborId);
        const neighborNode = this.nodes.get(neighborNormalized);

        // Only create edge if neighbor exists in our hex data
        if (!neighborNode) {
          continue;
        }

        const edgeKey = this.getEdgeKey(hexId, neighborNormalized);

        // Skip if edge already exists
        if (this.edges.has(edgeKey)) {
          continue;
        }

        // Create edge
        const edge = this.createEdge(hexId, neighborNormalized, node, neighborNode, kingdom);
        this.edges.set(edgeKey, edge);
      }
    }
  }

  /**
   * Create a single edge between two hexes
   */
  private createEdge(
    fromId: string,
    toId: string,
    fromNode: HexNode,
    toNode: HexNode,
    kingdom: KingdomData
  ): EdgeData {
    // Calculate land cost based on target hex
    const landCost = this.calculateLandCost(toNode);

    // Calculate water cost
    const waterCost = this.calculateWaterCost(toNode);

    // Check river crossing using navigation grid
    const crossesRiver = navigationGrid.doesMovementCrossRiver(fromId, toId);

    // Check for crossing (bridge/ford) - use WaterwayLookup for now
    // We check both hexes since crossings can be on either side
    const fromParts = fromId.split('.');
    const toParts = toId.split('.');
    const fromI = parseInt(fromParts[0], 10);
    const fromJ = parseInt(fromParts[1], 10);
    const toI = parseInt(toParts[0], 10);
    const toJ = parseInt(toParts[1], 10);

    const hasCrossing = waterwayLookup.hasCrossing(fromI, fromJ) || waterwayLookup.hasCrossing(toI, toJ);

    // Check for waterfall
    const hasWaterfall = waterwayLookup.hasWaterfall(fromI, fromJ) || waterwayLookup.hasWaterfall(toI, toJ);

    // Check for upstream travel
    const isUpstream = waterwayLookup.isUpstream(fromI, fromJ, toI, toJ);

    return {
      from: fromId,
      to: toId,
      landCost,
      waterCost,
      flyCost: 1, // Flying always costs 1
      crossesRiver,
      hasCrossing,
      hasWaterfall,
      isUpstream
    };
  }

  /**
   * Calculate land movement cost for entering a hex
   */
  private calculateLandCost(node: HexNode): number {
    // Water terrain is impassable for land units
    if (node.waterType === 'lake') {
      return Infinity;
    }

    // Base cost from travel difficulty
    let cost = 1;
    if (node.travel === 'difficult') {
      cost = 2;
    } else if (node.travel === 'greater-difficult') {
      cost = 3;
    }

    // Swamps add +1 difficulty (up to max of 3)
    if (node.waterType === 'swamp' && cost < 3) {
      cost += 1;
    }

    // Roads reduce cost by 1 (minimum 1)
    if (node.hasRoad || node.hasSettlement) {
      cost = Math.max(1, cost - 1);
    }

    return cost;
  }

  /**
   * Calculate water movement cost for entering a hex
   */
  private calculateWaterCost(node: HexNode): number {
    // Water terrain costs
    if (node.waterType === 'lake') {
      return 1;
    }
    if (node.waterType === 'swamp') {
      return 2; // Swamps are difficult water
    }

    // Land hexes are impassable for pure water units
    return Infinity;
  }

  /**
   * Get edge key from hex IDs
   */
  private getEdgeKey(from: string, to: string): EdgeKey {
    return `${from}->${to}`;
  }
}

// Export singleton instance
export const movementGraph = new MovementGraph();
