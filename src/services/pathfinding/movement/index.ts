/**
 * Movement Strategy Module
 *
 * Provides pluggable movement strategies for A* pathfinding.
 * Strategies can be switched at runtime to change how paths are calculated.
 */

import { manhattanStrategy } from './manhattan';
import { octileStrategy } from './octile';
import type { MovementStrategy } from './types';

// Re-export everything
export type { MovementStrategy };
export { manhattanStrategy, octileStrategy };

// Current active strategy (default to octile for smoother paths)
let currentStrategy: MovementStrategy = octileStrategy;

/**
 * Set the active movement strategy
 * @param strategy - The strategy to use for pathfinding
 */
export function setMovementStrategy(strategy: MovementStrategy): void {
  currentStrategy = strategy;
}

/**
 * Get the current active movement strategy
 * @returns The currently active strategy
 */
export function getMovementStrategy(): MovementStrategy {
  return currentStrategy;
}
