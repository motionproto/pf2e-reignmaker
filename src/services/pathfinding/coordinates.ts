/**
 * Coordinate conversion utilities for hex pathfinding
 * Based on Red Blob Games: https://www.redblobgames.com/grids/hexagons/
 */

import type { CubeCoord, OffsetCoord } from './types';
import { logger } from '../../utils/Logger';

/**
 * Convert hex ID (dot notation) to offset coordinates
 * "50.18" -> {i: 50, j: 18}
 */
export function hexIdToOffset(hexId: string): OffsetCoord {
  const parts = hexId.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid hex ID format: ${hexId}`);
  }
  
  const i = parseInt(parts[0], 10);
  const j = parseInt(parts[1], 10);
  
  if (isNaN(i) || isNaN(j)) {
    throw new Error(`Invalid hex coordinates: ${hexId}`);
  }
  
  return { i, j };
}

/**
 * Convert offset coordinates to hex ID (dot notation)
 * {i: 50, j: 18} -> "50.18"
 */
export function offsetToHexId(offset: OffsetCoord): string {
  return `${offset.i}.${offset.j}`;
}

/**
 * Convert offset coordinates to cube coordinates
 * Assumes odd-q vertical layout (Foundry default)
 * 
 * For odd-q vertical layout:
 * - Odd columns are offset down by half a hex
 * - x = col
 * - z = row - (col - (col & 1)) / 2
 * - y = -x - z
 */
export function offsetToCube(offset: OffsetCoord): CubeCoord {
  const col = offset.j;
  const row = offset.i;
  
  const x = col;
  const z = row - (col - (col & 1)) / 2;
  const y = -x - z;
  
  return { x, y, z };
}

/**
 * Convert cube coordinates to offset coordinates
 * Assumes odd-q vertical layout (Foundry default)
 */
export function cubeToOffset(cube: CubeCoord): OffsetCoord {
  const col = cube.x;
  const row = cube.z + (cube.x - (cube.x & 1)) / 2;
  
  return { i: row, j: col };
}

/**
 * Convert hex ID to cube coordinates (convenience function)
 */
export function hexIdToCube(hexId: string): CubeCoord {
  const offset = hexIdToOffset(hexId);
  return offsetToCube(offset);
}

/**
 * Convert cube coordinates to hex ID (convenience function)
 */
export function cubeToHexId(cube: CubeCoord): string {
  const offset = cubeToOffset(cube);
  return offsetToHexId(offset);
}

/**
 * Calculate distance between two hexes (in hex steps)
 * Uses Foundry's GridHex for accurate distance calculation
 */
export function hexDistance(hexIdA: string, hexIdB: string): number {
  try {
    // Parse hex IDs to offset coords
    const offsetA = hexIdToOffset(hexIdA);
    const offsetB = hexIdToOffset(hexIdB);
    
    // Get Foundry's GridHex class
    const GridHex = (globalThis as any).foundry?.grid?.GridHex;
    if (!GridHex) {
      logger.error('[Coordinates] Foundry GridHex not available');
      return Infinity;
    }
    
    // Get canvas grid
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.error('[Coordinates] Canvas grid not available');
      return Infinity;
    }
    
    // Create GridHex instances
    const hexA = new GridHex({ i: offsetA.i, j: offsetA.j }, canvas.grid);
    const hexB = new GridHex({ i: offsetB.i, j: offsetB.j }, canvas.grid);
    
    // Use Foundry's built-in distance calculation
    // GridHex stores cube coordinates internally - use those
    const cubeA = hexA.cube;
    const cubeB = hexB.cube;
    
    // Calculate cube distance (standard formula)
    // For cube coordinates: distance = (|q1-q2| + |r1-r2| + |s1-s2|) / 2
    const distance = (Math.abs(cubeA.q - cubeB.q) + 
                     Math.abs(cubeA.r - cubeB.r) + 
                     Math.abs(cubeA.s - cubeB.s)) / 2;
    
    return distance;
  } catch (error) {
    logger.error(`[Coordinates] Failed to calculate distance between ${hexIdA} and ${hexIdB}:`, error);
    return Infinity;
  }
}

/**
 * Calculate distance between two cube coordinates
 * @deprecated Use hexDistance() instead for Foundry grid accuracy
 */
export function cubeDistance(a: CubeCoord, b: CubeCoord): number {
  return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;
}

/**
 * Get all 6 neighbor hex IDs for a given hex
 * Uses Foundry's built-in canvas.grid.getNeighbors() API
 */
export function getNeighborHexIds(hexId: string): string[] {
  try {
    // Parse hex ID to offset coords
    const offset = hexIdToOffset(hexId);
    
    // Get canvas grid
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.error('[Coordinates] Canvas grid not available');
      return [];
    }
    
    // Get all 6 neighbors directly from grid API (Foundry v13+)
    const hexNeighbors = canvas.grid.getNeighbors(offset.i, offset.j);
    
    // Convert to hex ID format
    const neighbors: string[] = [];
    hexNeighbors.forEach((neighbor: any) => {
      const neighborId = `${neighbor.i}.${neighbor.j}`;
      neighbors.push(neighborId);
    });
    
    return neighbors;
  } catch (error) {
    logger.error(`[Coordinates] Failed to get neighbors for ${hexId}:`, error);
    return [];
  }
}

/**
 * Validate that a cube coordinate satisfies x + y + z = 0
 */
export function isValidCube(cube: CubeCoord): boolean {
  return Math.abs(cube.x + cube.y + cube.z) < 0.0001; // Floating point tolerance
}

/**
 * Normalize hex ID format (remove leading zeros)
 * "5.08" -> "5.8", "50.18" -> "50.18"
 */
export function normalizeHexId(hexId: string): string {
  try {
    const offset = hexIdToOffset(hexId);
    return offsetToHexId(offset);
  } catch {
    return hexId;
  }
}
