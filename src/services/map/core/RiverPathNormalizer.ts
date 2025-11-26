/**
 * RiverPathNormalizer - Ensures river paths include all hex connection points
 * that river segments visually pass over.
 *
 * Hex connection points:
 * - Centers (hex centers)
 * - Edge midpoints (existing river connectors)
 *
 * Corners are currently only used for debug visualization. This normalizer
 * focuses on centers and edges, which are what the river editor uses today.
 */

import type { KingdomData, RiverPath } from '../../../actors/KingdomActor';
import { getAdjacentHexes } from '../../../utils/hexUtils';
import { getHexCenter, getEdgeMidpoint } from '../../../utils/riverUtils';
import type { EdgeDirection } from '../../../models/Hex';

interface WorldPoint {
  x: number;
  y: number;
}

interface ConnectionCandidate {
  kind: 'center' | 'edge';
  hexI: number;
  hexJ: number;
  edge?: EdgeDirection;
  pos: WorldPoint;
}

// Maximum distance (in pixels) to treat a connection point as being "on" a river segment
const CONNECTION_EPSILON = 6;

/**
 * Normalize all river paths in the kingdom.
 * Adds missing center/edge connectors for any hex connection point that a
 * segment visually passes over.
 */
export function normalizeAllRiverPaths(kingdom: KingdomData, canvas: any): void {
  if (!canvas?.grid || !kingdom.rivers?.paths) return;

  for (const path of kingdom.rivers.paths) {
    normalizeRiverPath(path, canvas);
  }
}

/**
 * Normalize a single river path.
 */
function normalizeRiverPath(path: RiverPath, canvas: any): void {
  if (!path.points || path.points.length < 2) return;

  const sorted = [...path.points].sort((a, b) => a.order - b.order);
  const newPoints: typeof path.points = [];
  const ORDER_STEP = 10;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i];
    const p1 = sorted[i + 1];

    newPoints.push(p0);

    const P0 = toWorld(p0, canvas);
    const P1 = toWorld(p1, canvas);
    if (!P0 || !P1) continue;

    const candidates = collectConnectionCandidates(p0, p1, canvas);
    const inserts: Array<{ t: number; point: typeof p0 }> = [];

    for (const c of candidates) {
      const proj = projectPointOntoSegment(c.pos, P0, P1);
      if (proj.t <= 0 || proj.t >= 1) continue;
      if (proj.distance > CONNECTION_EPSILON) continue;

      // Skip if this connector already exists as either endpoint
      if (isSameConnector(p0, c) || isSameConnector(p1, c)) continue;

      inserts.push({
        t: proj.t,
        point: {
          hexI: c.hexI,
          hexJ: c.hexJ,
          edge: c.kind === 'edge' ? c.edge : undefined,
          isCenter: c.kind === 'center',
          order: 0 // placeholder; set below
        } as any
      });
    }

    if (inserts.length > 0) {
      inserts.sort((a, b) => a.t - b.t);
      const base = p0.order;
      const step = ORDER_STEP / (inserts.length + 1);

      for (let k = 0; k < inserts.length; k++) {
        inserts[k].point.order = base + step * (k + 1);
        newPoints.push(inserts[k].point);
      }
    }
  }

  // Push last original point
  newPoints.push(sorted[sorted.length - 1]);

  path.points = newPoints;
}

/**
 * Convert a river path point to world coordinates using the existing helpers.
 */
function toWorld(
  p: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean },
  canvas: any
): WorldPoint | null {
  if (p.isCenter) {
    return getHexCenter(p.hexI, p.hexJ, canvas);
  }
  if (p.edge) {
    return getEdgeMidpoint(p.hexI, p.hexJ, p.edge as EdgeDirection, canvas);
  }
  return null;
}

/**
 * Collect candidate hex connection points near a segment between p0 and p1.
 * We use:
 * - Centers and edges of the two endpoint hexes
 * - Centers and edges of their neighbors
 */
function collectConnectionCandidates(
  p0: { hexI: number; hexJ: number },
  p1: { hexI: number; hexJ: number },
  canvas: any
): ConnectionCandidate[] {
  const seen = new Set<string>();
  const result: ConnectionCandidate[] = [];

  const hexesToCheck: Array<{ hexI: number; hexJ: number }> = [];

  // Endpoint hexes
  hexesToCheck.push({ hexI: p0.hexI, hexJ: p0.hexJ });
  hexesToCheck.push({ hexI: p1.hexI, hexJ: p1.hexJ });

  // Neighbors of endpoints
  for (const base of [p0, p1]) {
    const neighbors = getAdjacentHexes(base.hexI, base.hexJ);
    for (const n of neighbors) {
      hexesToCheck.push({ hexI: n.i, hexJ: n.j });
    }
  }

  const allEdges: EdgeDirection[] = ['nw', 'ne', 'e', 'se', 'sw', 'w'];

  for (const h of hexesToCheck) {
    const keyBase = `${h.hexI}.${h.hexJ}`;

    // Center
    const centerPos = getHexCenter(h.hexI, h.hexJ, canvas);
    if (centerPos) {
      const key = `${keyBase}:center`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          kind: 'center',
          hexI: h.hexI,
          hexJ: h.hexJ,
          pos: centerPos
        });
      }
    }

    // Edges
    for (const edge of allEdges) {
      const edgePos = getEdgeMidpoint(h.hexI, h.hexJ, edge, canvas);
      if (!edgePos) continue;
      const key = `${keyBase}:${edge}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        kind: 'edge',
        hexI: h.hexI,
        hexJ: h.hexJ,
        edge,
        pos: edgePos
      });
    }
  }

  return result;
}

/**
 * Project a point onto a segment and return both t and distance.
 */
function projectPointOntoSegment(
  p: WorldPoint,
  a: WorldPoint,
  b: WorldPoint
): { t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const pdx = p.x - a.x;
    const pdy = p.y - a.y;
    return { t: 0.5, distance: Math.sqrt(pdx * pdx + pdy * pdy) };
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;
  const distX = p.x - closestX;
  const distY = p.y - closestY;

  return { t, distance: Math.sqrt(distX * distX + distY * distY) };
}

/**
 * Check if a path point and a connection candidate refer to the same connector.
 */
function isSameConnector(
  p: { hexI: number; hexJ: number; edge?: string; isCenter?: boolean },
  c: ConnectionCandidate
): boolean {
  if (p.hexI !== c.hexI || p.hexJ !== c.hexJ) return false;
  if (c.kind === 'center') {
    return !!p.isCenter && !p.edge;
  }
  // edge
  return !p.isCenter && !!p.edge && p.edge === c.edge;
}


