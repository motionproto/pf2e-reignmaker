/**
 * River utility functions for edge-to-edge river system
 * Handles edge position calculations and neighbor mapping for pointy-top hexes
 */

import type { EdgeDirection } from '../models/Hex';
import { getAdjacentHexes } from './hexUtils';

/**
 * Get edge midpoint position for a pointy-top hex
 * Uses Foundry's grid.getVertices() to calculate precise positions
 * 
 * Edge mapping for pointy-top hexes:
 * - NW edge = midpoint between vertices[5] and vertices[0]
 * - NE edge = midpoint between vertices[0] and vertices[1]
 * - E edge = midpoint between vertices[1] and vertices[2]
 * - SE edge = midpoint between vertices[2] and vertices[3]
 * - SW edge = midpoint between vertices[3] and vertices[4]
 * - W edge = midpoint between vertices[4] and vertices[5]
 * - C (center) = hex center point (special case for center connectors)
 * 
 * @param hexI - Hex row coordinate
 * @param hexJ - Hex column coordinate
 * @param edge - Edge direction (nw, ne, e, se, sw, w, or 'c' for center)
 * @param canvas - Foundry canvas object
 * @returns {x, y} position of edge midpoint or hex center
 */
export function getEdgeMidpoint(
  hexI: number,
  hexJ: number,
  edge: EdgeDirection | 'c',
  canvas: any
): { x: number; y: number } | null {
  if (!canvas?.grid) {
    // Silent return - canvas not ready is expected during startup
    return null;
  }

  // Special case: 'c' means hex center (for edge-to-center connections)
  if (edge === 'c') {
    return getHexCenter(hexI, hexJ, canvas);
  }

  const vertices = canvas.grid.getVertices({ i: hexI, j: hexJ });
  if (!vertices || vertices.length !== 6) {
    // Silent return - invalid hex coordinates are common for out-of-bounds points
    // Caller should handle null gracefully
    return null;
  }

  // Map edge to vertex pair
  const edgeVertexMap: Record<EdgeDirection, [number, number]> = {
    nw: [5, 0],
    ne: [0, 1],
    e: [1, 2],
    se: [2, 3],
    sw: [3, 4],
    w: [4, 5]
  };

  const [v1Index, v2Index] = edgeVertexMap[edge];
  const v1 = vertices[v1Index];
  const v2 = vertices[v2Index];

  // Calculate midpoint
  return {
    x: (v1.x + v2.x) / 2,
    y: (v1.y + v2.y) / 2
  };
}

/**
 * Get hex center position
 * 
 * @param hexI - Hex row coordinate
 * @param hexJ - Hex column coordinate
 * @param canvas - Foundry canvas object
 * @returns {x, y} position of hex center
 */
export function getHexCenter(
  hexI: number,
  hexJ: number,
  canvas: any
): { x: number; y: number } | null {
  if (!canvas?.grid) {
    // Silent return - canvas not ready is expected during startup
    return null;
  }

  return canvas.grid.getCenterPoint({ i: hexI, j: hexJ });
}

/**
 * Get opposite edge for neighbor auto-sync
 * When an edge is activated, the corresponding edge on the neighbor hex
 * should also be activated (with opposite direction)
 * 
 * @param edge - Edge direction
 * @returns Opposite edge direction
 */
export function getOppositeEdge(edge: EdgeDirection): EdgeDirection {
  const oppositeMap: Record<EdgeDirection, EdgeDirection> = {
    nw: 'se',
    ne: 'sw',
    e: 'w',
    se: 'nw',
    sw: 'ne',
    w: 'e'
  };
  return oppositeMap[edge];
}

/**
 * Get neighbor hex coordinates from edge direction
 * Uses Foundry's grid.getNeighbors() and edge mapping
 * 
 * For pointy-top hexes with odd-q vertical layout:
 * - Odd columns have different neighbor offsets than even columns
 * 
 * @param hexI - Hex row coordinate
 * @param hexJ - Hex column coordinate
 * @param edge - Edge direction
 * @param canvas - Foundry canvas object
 * @returns Neighbor hex coordinates or null if edge of map
 */
export function getNeighborFromEdge(
  hexI: number,
  hexJ: number,
  edge: EdgeDirection,
  canvas: any
): { i: number; j: number } | null {
  if (!canvas?.grid) {
    // Silent return - canvas not ready is expected during startup
    return null;
  }

  // Get all neighbors using shared utility
  const neighbors = getAdjacentHexes(hexI, hexJ);
  if (!neighbors || neighbors.length === 0) {
    return null;
  }

  // For pointy-top hexes, neighbors are in specific order
  // The order depends on whether column is odd or even (odd-q layout)
  const isOddColumn = hexI % 2 === 1;

  // Map edge to neighbor index in Foundry's neighbor array
  // Foundry returns neighbors in clockwise order starting from top
  const edgeNeighborMap: Record<EdgeDirection, number> = isOddColumn
    ? {
        ne: 0,  // Top-right
        e: 1,   // Right
        se: 2,  // Bottom-right
        sw: 3,  // Bottom-left
        w: 4,   // Left
        nw: 5   // Top-left
      }
    : {
        ne: 0,  // Top-right
        e: 1,   // Right
        se: 2,  // Bottom-right
        sw: 3,  // Bottom-left
        w: 4,   // Left
        nw: 5   // Top-left
      };

  const neighborIndex = edgeNeighborMap[edge];
  const neighbor = neighbors[neighborIndex];

  if (!neighbor) {
    return null;
  }

  // Return neighbor coordinates
  return {
    i: neighbor.i,
    j: neighbor.j
  };
}

/**
 * Get all edge directions
 * @returns Array of all edge directions
 */
export function getAllEdges(): EdgeDirection[] {
  return ['nw', 'ne', 'e', 'se', 'sw', 'w'];
}

/**
 * Normalize hex ID format (remove leading zeros)
 * "5.08" -> "5.8", "50.18" -> "50.18"
 * 
 * @param hexId - Hex ID in format "i.j"
 * @returns Normalized hex ID
 */
export function normalizeHexId(hexId: string): string {
  const parts = hexId.split('.');
  if (parts.length !== 2) return hexId;

  const i = parseInt(parts[0], 10);
  const j = parseInt(parts[1], 10);

  if (isNaN(i) || isNaN(j)) return hexId;

  return `${i}.${j}`;
}

/**
 * Parse hex ID into coordinates
 * @param hexId - Hex ID in format "i.j"
 * @returns {i, j} coordinates or null if invalid
 */
export function parseHexId(hexId: string): { i: number; j: number } | null {
  const parts = hexId.split('.');
  if (parts.length !== 2) return null;

  const i = parseInt(parts[0], 10);
  const j = parseInt(parts[1], 10);

  if (isNaN(i) || isNaN(j)) return null;

  return { i, j };
}

/**
 * Format hex coordinates as ID
 * @param i - Row coordinate
 * @param j - Column coordinate
 * @returns Hex ID in format "i.j"
 */
export function formatHexId(i: number, j: number): string {
  return `${i}.${j}`;
}
