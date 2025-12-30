/**
 * Manhattan Movement Strategy
 *
 * 4-directional movement using only cardinal directions (up, down, left, right).
 * Produces staircase-like paths for diagonal destinations.
 *
 * Pros:
 * - Simpler, fewer neighbors to evaluate
 * - No corner-cutting edge cases
 *
 * Cons:
 * - Paths look less natural for diagonal travel
 * - Longer total path distance
 */

import type { MovementStrategy } from './types';

export const manhattanStrategy: MovementStrategy = {
  name: 'manhattan',

  getNeighbors(x: number, y: number): Array<{ x: number; y: number }> {
    return [
      { x, y: y - 1 },     // Up
      { x: x + 1, y },     // Right
      { x, y: y + 1 },     // Down
      { x: x - 1, y }      // Left
    ];
  },

  heuristic(fromX: number, fromY: number, toX: number, toY: number): number {
    // Manhattan distance: sum of absolute differences
    return Math.abs(toX - fromX) + Math.abs(toY - fromY);
  },

  getStepCost(_fromX: number, _fromY: number, _toX: number, _toY: number): number {
    // All cardinal moves have equal cost
    return 1;
  }
};
