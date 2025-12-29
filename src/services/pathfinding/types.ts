/**
 * Pathfinding types for army movement
 */

/**
 * Result of a pathfinding operation
 */
export interface PathResult {
  /** Hex IDs from start to target (inclusive) */
  path: string[];
  /** Total movement cost spent */
  totalCost: number;
  /** Whether the target is reachable within movement range */
  isReachable: boolean;
  /** Final nav-grid cell position (for cell-based pathfinding) */
  finalNavCell?: { x: number; y: number };
  /** Actual cell path traversed by A* (for debug visualization) */
  cellPath?: Array<{ x: number; y: number }>;
}

/**
 * Cube coordinates for hex grid
 * Constraint: x + y + z = 0
 */
export interface CubeCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * Offset coordinates (axial/doubled)
 * Used by Foundry's hex grid system
 */
export interface OffsetCoord {
  i: number; // row
  j: number; // column
}

/**
 * Node in the A* pathfinding algorithm
 */
export interface PathNode {
  hexId: string;
  gCost: number; // Actual cost from start
  hCost: number; // Heuristic cost to target
  fCost: number; // Total cost (g + h)
  parent: string | null;
}

/**
 * Reachability map: hex ID -> movement cost to reach
 */
export type ReachabilityMap = Map<string, number>;

// ============================================================================
// Movement Graph Types (Precomputed pathfinding graph)
// ============================================================================

/**
 * Travel difficulty for terrain
 */
export type TravelDifficulty = 'open' | 'difficult' | 'greater-difficult' | 'water';

/**
 * Water type for a hex
 */
export type HexWaterType = 'none' | 'lake' | 'swamp';

/**
 * Node in the movement graph representing a single hex
 */
export interface HexNode {
  /** Hex ID in format "i.j" */
  id: string;
  /** Row coordinate */
  hexI: number;
  /** Column coordinate */
  hexJ: number;
  /** Terrain type (plains, forest, hills, etc.) */
  terrain: string;
  /** Travel difficulty (affects movement cost) */
  travel: TravelDifficulty;
  /** Whether hex has a road */
  hasRoad: boolean;
  /** Whether hex has a settlement (counts as road) */
  hasSettlement: boolean;
  /** Water feature on this hex */
  waterType: HexWaterType;
}

/**
 * Edge in the movement graph representing movement between two adjacent hexes
 * Edges are directional: from -> to
 */
export interface EdgeData {
  /** Source hex ID */
  from: string;
  /** Target hex ID */
  to: string;

  // Pre-computed costs for each movement category
  /** Cost for grounded units (1/2/3 based on terrain, or Infinity if blocked) */
  landCost: number;
  /** Cost for swimming/naval units (1/2, or Infinity if blocked) */
  waterCost: number;
  /** Cost for flying units (always 1) */
  flyCost: number;

  // Blocking conditions (determined at graph-build time)
  /** True if river crosses between these hexes */
  crossesRiver: boolean;
  /** True if a bridge/ford exists on this edge */
  hasCrossing: boolean;
  /** True if a waterfall blocks naval travel on this edge */
  hasWaterfall: boolean;
  /** True if movement is upstream (for naval penalty) */
  isUpstream: boolean;
}
