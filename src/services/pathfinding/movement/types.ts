/**
 * Movement Strategy Interface
 *
 * Defines how A* pathfinding navigates between cells.
 * Different strategies enable different movement patterns:
 * - Manhattan: 4-directional (cardinal only)
 * - Octile: 8-directional (cardinal + diagonal)
 */

export interface MovementStrategy {
  /** Strategy name for debugging/logging */
  name: string;

  /**
   * Get neighboring cells from a given cell position
   * @param x - Cell X coordinate
   * @param y - Cell Y coordinate
   * @returns Array of neighbor cell coordinates
   */
  getNeighbors(x: number, y: number): Array<{ x: number; y: number }>;

  /**
   * Calculate heuristic distance between two cells
   * Must be admissible (never overestimate actual cost)
   * @param fromX - Start cell X
   * @param fromY - Start cell Y
   * @param toX - Target cell X
   * @param toY - Target cell Y
   * @returns Estimated distance (used for A* priority)
   */
  heuristic(fromX: number, fromY: number, toX: number, toY: number): number;

  /**
   * Get movement cost for a single step between adjacent cells
   * @param fromX - Current cell X
   * @param fromY - Current cell Y
   * @param toX - Next cell X
   * @param toY - Next cell Y
   * @returns Step cost (1 for cardinal, √2 for diagonal)
   */
  getStepCost(fromX: number, fromY: number, toX: number, toY: number): number;
}
