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
