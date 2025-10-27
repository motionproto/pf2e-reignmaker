/**
 * Territory Outline Service
 * 
 * Creates a polygonal outline around claimed territory hexes.
 * Traces the outer boundary of the kingdom by finding edges that border
 * unclaimed hexes or empty space.
 * 
 * Based on Red Blob Games hex grid fundamentals:
 * https://www.redblobgames.com/grids/hexagons/
 */

import { hexToKingmakerId } from '../hex-selector/coordinates';
import { logger } from '../../utils/Logger';

export interface OutlineSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface TerritoryOutlineResult {
  outlines: OutlineSegment[][];  // Array of connected outline paths
  debugInfo?: {
    totalHexes: number;
    boundaryEdges: number;
    connectedPaths: number;
  };
}

/**
 * Enable debug mode to visualize vertex ordering
 * Set to true to log vertex positions for inspection
 */
const DEBUG_VERTICES = false;

/**
 * Cube direction offsets for the 6 neighbors of a hex
 * Order: NE, E, SE, SW, W, NW (for pointy-top)
 */
const CUBE_DIRECTIONS = [
  { dq: +1, dr: -1, ds:  0, name: 'NE' },  // Northeast
  { dq: +1, dr:  0, ds: -1, name: 'E'  },  // East
  { dq:  0, dr: +1, ds: -1, name: 'SE' },  // Southeast
  { dq: -1, dr: +1, ds:  0, name: 'SW' },  // Southwest
  { dq: -1, dr:  0, ds: +1, name: 'W'  },  // West
  { dq:  0, dr: -1, ds: +1, name: 'NW' },  // Northwest
];

/**
 * Map each cube direction to the edge vertices for pointy-top hexagons
 * Each entry maps to [v1, v2] where edge goes from vertex v1 to vertex v2
 * 
 * Vertex layout (pointy-top):
 *       0
 *      / \
 *     5   1
 *     |   |
 *     4   2
 *      \ /
 *       3
 */
const CUBE_DIR_TO_EDGE = [
  [0, 1],  // NE edge: top-right (vertices 0-1)
  [1, 2],  // E edge: right-upper (vertices 1-2)
  [2, 3],  // SE edge: right-lower (vertices 2-3)
  [3, 4],  // SW edge: bottom-left (vertices 3-4)
  [4, 5],  // W edge: left-lower (vertices 4-5)
  [5, 0],  // NW edge: left-upper (vertices 5-0)
];

/**
 * Generate outline paths for a set of claimed hexes
 * Uses Foundry's shiftCube to test neighbors in cube coordinate space
 */
export function generateTerritoryOutline(hexIds: string[]): TerritoryOutlineResult {

  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    logger.warn('[TerritoryOutline] Canvas grid not available');
    return { outlines: [] };
  }

  // Create a set for fast lookup
  const claimedHexSet = new Set(hexIds);
  
  // Store boundary edges
  const boundaryEdges: OutlineSegment[] = [];
  
  const GridHex = (globalThis as any).foundry.grid.GridHex;
  
  // For each claimed hex, test its 6 neighbors using shiftCube
  for (const hexId of hexIds) {
    try {
      const parts = hexId.split('.');
      if (parts.length !== 2) continue;
      
      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      if (isNaN(i) || isNaN(j)) continue;
      
      const hex = new GridHex({i, j}, canvas.grid);
      
      // Get hex vertices
      const center = hex.center;
      const relativeVertices = canvas.grid.getShape(hex.offset);
      
      if (!relativeVertices || relativeVertices.length !== 6) continue;
      
      // Apply same scaling as ReignMakerMapLayer
      const scale = (canvas.grid.sizeY + 2) / canvas.grid.sizeY;
      const worldVertices = relativeVertices.map((v: any) => ({
        x: center.x + (v.x * scale),
        y: center.y + (v.y * scale)
      }));
      
      // Debug: Log first hex's vertices
      if (DEBUG_VERTICES && hexId === hexIds[0]) {

      }
      
      // Test each of the 6 directions
      for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
        const dir = CUBE_DIRECTIONS[dirIdx];
        
        // Get neighbor in this direction using shiftCube
        const neighborHex = hex.shiftCube(dir.dq, dir.dr, dir.ds);
        const neighborId = `${neighborHex.offset.i}.${neighborHex.offset.j}`;
        
        // If neighbor is NOT claimed, this edge is a boundary
        if (!claimedHexSet.has(neighborId)) {
          const [v1Idx, v2Idx] = CUBE_DIR_TO_EDGE[dirIdx];
          const v1 = worldVertices[v1Idx];
          const v2 = worldVertices[v2Idx];
          
          boundaryEdges.push({ start: v1, end: v2 });
        }
      }
      
    } catch (error) {
      logger.error(`[TerritoryOutline] Failed to process hex ${hexId}:`, error);
    }
  }

  // Connect boundary edges into continuous paths
  const outlinePaths = connectEdges(boundaryEdges);

  return {
    outlines: outlinePaths,
    debugInfo: {
      totalHexes: hexIds.length,
      boundaryEdges: boundaryEdges.length,
      connectedPaths: outlinePaths.length
    }
  };
}

/**
 * Connect individual edge segments into continuous paths
 * Uses a greedy algorithm to link edges that share vertices
 */
function connectEdges(edges: OutlineSegment[]): OutlineSegment[][] {
  if (edges.length === 0) return [];
  
  const paths: OutlineSegment[][] = [];
  const unusedEdges = [...edges];
  
  while (unusedEdges.length > 0) {
    // Start a new path
    const path: OutlineSegment[] = [unusedEdges.shift()!];
    let pathChanged = true;
    
    // Keep trying to extend the path until no more connections found
    while (pathChanged && unusedEdges.length > 0) {
      pathChanged = false;
      
      const pathEnd = path[path.length - 1].end;
      const pathStart = path[0].start;
      
      // Try to find an edge that connects to the end of our path
      for (let i = 0; i < unusedEdges.length; i++) {
        const edge = unusedEdges[i];
        
        // Check if edge connects to end of path
        if (pointsMatch(edge.start, pathEnd)) {
          path.push(edge);
          unusedEdges.splice(i, 1);
          pathChanged = true;
          break;
        }
        
        // Check if edge connects to end of path (reversed)
        if (pointsMatch(edge.end, pathEnd)) {
          path.push({ start: edge.end, end: edge.start });
          unusedEdges.splice(i, 1);
          pathChanged = true;
          break;
        }
        
        // Check if edge connects to start of path
        if (pointsMatch(edge.end, pathStart)) {
          path.unshift(edge);
          unusedEdges.splice(i, 1);
          pathChanged = true;
          break;
        }
        
        // Check if edge connects to start of path (reversed)
        if (pointsMatch(edge.start, pathStart)) {
          path.unshift({ start: edge.end, end: edge.start });
          unusedEdges.splice(i, 1);
          pathChanged = true;
          break;
        }
      }
    }
    
    paths.push(path);
  }
  
  return paths;
}

/**
 * Check if two points are approximately equal (within floating point tolerance)
 */
function pointsMatch(p1: { x: number; y: number }, p2: { x: number; y: number }): boolean {
  // Use same rounding as edge keys for consistency
  const x1 = Math.round(p1.x * 10) / 10;
  const y1 = Math.round(p1.y * 10) / 10;
  const x2 = Math.round(p2.x * 10) / 10;
  const y2 = Math.round(p2.y * 10) / 10;
  
  return x1 === x2 && y1 === y2;
}

/**
 * Smooth outline path using corner rounding
 * Optional enhancement for prettier outlines
 */
export function smoothOutlinePath(segments: OutlineSegment[], radius: number = 10): OutlineSegment[] {
  // TODO: Implement corner rounding if desired
  // For now, return segments as-is
  return segments;
}
