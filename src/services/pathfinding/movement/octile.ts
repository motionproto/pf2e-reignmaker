/**
 * Octile Movement Strategy
 *
 * 8-directional movement allowing both cardinal and diagonal directions.
 * Produces smoother, more natural-looking paths.
 *
 * Pros:
 * - Natural diagonal movement
 * - Shorter total path distance
 *
 * Cons:
 * - More neighbors to evaluate (8 vs 4)
 * - May need corner-cutting prevention near obstacles
 */

import type { MovementStrategy } from './types';

const SQRT2 = Math.SQRT2; // ~1.414

export const octileStrategy: MovementStrategy = {
  name: 'octile',

  getNeighbors(x: number, y: number): Array<{ x: number; y: number }> {
    return [
      { x, y: y - 1 },           // Up
      { x: x + 1, y: y - 1 },    // Up-Right
      { x: x + 1, y },           // Right
      { x: x + 1, y: y + 1 },    // Down-Right
      { x, y: y + 1 },           // Down
      { x: x - 1, y: y + 1 },    // Down-Left
      { x: x - 1, y },           // Left
      { x: x - 1, y: y - 1 }     // Up-Left
    ];
  },

  heuristic(fromX: number, fromY: number, toX: number, toY: number): number {
    // Octile distance: max(dx,dy) + (sqrt(2)-1) * min(dx,dy)
    // This is the exact distance when moving with 8-directional movement
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
  },

  getStepCost(fromX: number, fromY: number, toX: number, toY: number): number {
    // Cardinal moves cost 1, diagonal moves cost sqrt(2)
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    // If both dx and dy are 1, it's diagonal
    return (dx === 1 && dy === 1) ? SQRT2 : 1;
  }
};
