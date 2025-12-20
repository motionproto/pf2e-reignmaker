/**
 * Province Outline Service
 *
 * Creates polygonal outlines around province hexes.
 * Reuses the core logic from TerritoryOutline but generates
 * separate outlines for each province.
 */

import type { Province } from '../../../actors/KingdomActor';
import type { OutlineSegment } from './TerritoryOutline';
import { logger } from '../../../utils/Logger';

export interface ProvinceOutlineResult {
  provinceId: string;
  provinceName: string;
  outlines: OutlineSegment[][];
}

/**
 * Cube direction offsets for the 6 neighbors of a hex
 * Order: NE, E, SE, SW, W, NW (for pointy-top)
 */
const CUBE_DIRECTIONS = [
  { dq: +1, dr: -1, ds: 0, name: 'NE' },
  { dq: +1, dr: 0, ds: -1, name: 'E' },
  { dq: 0, dr: +1, ds: -1, name: 'SE' },
  { dq: -1, dr: +1, ds: 0, name: 'SW' },
  { dq: -1, dr: 0, ds: +1, name: 'W' },
  { dq: 0, dr: -1, ds: +1, name: 'NW' },
];

/**
 * Map each cube direction to the edge vertices for pointy-top hexagons
 */
const CUBE_DIR_TO_EDGE = [
  [0, 1], // NE edge
  [1, 2], // E edge
  [2, 3], // SE edge
  [3, 4], // SW edge
  [4, 5], // W edge
  [5, 0], // NW edge
];

/**
 * Generate outline paths for all provinces
 * Returns a map of province ID to outline segments
 */
export function generateProvinceOutlines(
  provinces: Province[]
): Map<string, ProvinceOutlineResult> {
  const results = new Map<string, ProvinceOutlineResult>();

  for (const province of provinces) {
    if (province.hexIds.length === 0) {
      continue;
    }

    const outlines = generateSingleProvinceOutline(province.hexIds);
    results.set(province.id, {
      provinceId: province.id,
      provinceName: province.name,
      outlines,
    });
  }

  return results;
}

/**
 * Generate outline for a single province's hexes
 */
function generateSingleProvinceOutline(hexIds: string[]): OutlineSegment[][] {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    logger.warn('[ProvinceOutline] Canvas grid not available');
    return [];
  }

  const provinceHexSet = new Set(hexIds);
  const boundaryEdges: OutlineSegment[] = [];
  const GridHex = (globalThis as any).foundry.grid.GridHex;

  for (const hexId of hexIds) {
    try {
      const parts = hexId.split('.');
      if (parts.length !== 2) continue;

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      if (isNaN(i) || isNaN(j)) continue;

      const hex = new GridHex({ i, j }, canvas.grid);
      const center = canvas.grid.getCenterPoint({ i, j });
      const relativeVertices = canvas.grid.getShape(hex.offset);

      if (!relativeVertices || relativeVertices.length !== 6) continue;

      // Apply same scaling as ReignMakerMapLayer
      const scale = (canvas.grid.sizeY + 2) / canvas.grid.sizeY;
      const worldVertices = relativeVertices.map((v: any) => ({
        x: center.x + v.x * scale,
        y: center.y + v.y * scale,
      }));

      // Test each of the 6 directions
      for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
        const dir = CUBE_DIRECTIONS[dirIdx];
        const neighborHex = hex.shiftCube(dir.dq, dir.dr, dir.ds);
        const neighborId = `${neighborHex.offset.i}.${neighborHex.offset.j}`;

        // If neighbor is NOT in this province, this edge is a boundary
        if (!provinceHexSet.has(neighborId)) {
          const [v1Idx, v2Idx] = CUBE_DIR_TO_EDGE[dirIdx];
          const v1 = worldVertices[v1Idx];
          const v2 = worldVertices[v2Idx];
          boundaryEdges.push({ start: v1, end: v2 });
        }
      }
    } catch (error) {
      logger.error(`[ProvinceOutline] Failed to process hex ${hexId}:`, error);
    }
  }

  return connectEdges(boundaryEdges);
}

/**
 * Connect individual edge segments into continuous paths
 */
function connectEdges(edges: OutlineSegment[]): OutlineSegment[][] {
  if (edges.length === 0) return [];

  const paths: OutlineSegment[][] = [];
  const unusedEdges = [...edges];

  while (unusedEdges.length > 0) {
    const path: OutlineSegment[] = [unusedEdges.shift()!];
    let pathChanged = true;

    while (pathChanged && unusedEdges.length > 0) {
      pathChanged = false;

      const pathEnd = path[path.length - 1].end;
      const pathStart = path[0].start;

      for (let i = 0; i < unusedEdges.length; i++) {
        const edge = unusedEdges[i];

        if (pointsMatch(edge.start, pathEnd)) {
          path.push(edge);
          unusedEdges.splice(i, 1);
          pathChanged = true;
          break;
        }

        if (pointsMatch(edge.end, pathEnd)) {
          path.push({ start: edge.end, end: edge.start });
          unusedEdges.splice(i, 1);
          pathChanged = true;
          break;
        }

        if (pointsMatch(edge.end, pathStart)) {
          path.unshift(edge);
          unusedEdges.splice(i, 1);
          pathChanged = true;
          break;
        }

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
 * Check if two points are approximately equal
 */
function pointsMatch(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): boolean {
  const x1 = Math.round(p1.x * 10) / 10;
  const y1 = Math.round(p1.y * 10) / 10;
  const x2 = Math.round(p2.x * 10) / 10;
  const y2 = Math.round(p2.y * 10) / 10;

  return x1 === x2 && y1 === y2;
}
