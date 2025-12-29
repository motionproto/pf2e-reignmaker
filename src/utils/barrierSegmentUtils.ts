/**
 * Barrier segment utilities - computes river barrier segments for pathfinding
 *
 * These segments are pre-computed when rivers are edited and stored in kingdom data.
 * Pathfinding uses stored segments for intersection checks without runtime computation.
 */

import type { RiverPath, RiverCrossing, BarrierSegment } from '../actors/KingdomActor';
import { getEdgeMidpoint, getHexCenter } from './riverUtils';
import { getKingdomData, updateKingdom } from '../stores/KingdomStore';
import type { EdgeDirection } from '../models/Hex';

/**
 * Compute barrier segments from river paths and crossings
 * Call this whenever rivers, crossings, or waterfalls are modified
 *
 * @param paths - River paths
 * @param crossings - River crossings (bridges/fords)
 * @param canvas - Foundry canvas (for coordinate conversion)
 * @returns Array of barrier segments with pixel coordinates
 */
export function computeBarrierSegments(
  paths: RiverPath[],
  crossings: RiverCrossing[] | undefined,
  canvas: any
): BarrierSegment[] {
  if (!canvas?.grid) {
    console.warn('[BarrierSegments] Canvas not ready, cannot compute segments');
    return [];
  }

  const segments: BarrierSegment[] = [];

  // Build crossing lookup set (connection-point-based keys)
  const crossingPointSet = new Set<string>();
  if (crossings) {
    for (const crossing of crossings) {
      const key = getConnectionPointKey(crossing);
      crossingPointSet.add(key);
    }
  }

  // Process each path
  for (const path of paths) {
    const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);

    // Create segments from consecutive point pairs
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];

      // Get pixel positions
      const pos1 = getConnectorPosition(p1, canvas);
      const pos2 = getConnectorPosition(p2, canvas);

      if (!pos1 || !pos2) continue;

      // Check if either endpoint has a crossing
      const hasCrossing = crossingPointSet.has(getConnectionPointKey(p1)) ||
                          crossingPointSet.has(getConnectionPointKey(p2));

      segments.push({
        start: { x: pos1.x, y: pos1.y },
        end: { x: pos2.x, y: pos2.y },
        hasCrossing
      });
    }
  }

  console.log(`[BarrierSegments] Computed ${segments.length} barrier segments`);
  return segments;
}

/**
 * Get connection point key for lookup
 */
function getConnectionPointKey(point: {
  hexI: number;
  hexJ: number;
  edge?: string;
  isCenter?: boolean;
  cornerIndex?: number;
}): string {
  return `${point.hexI},${point.hexJ},${point.edge || ''},${point.isCenter || false},${point.cornerIndex ?? ''}`;
}

/**
 * Convert a river path point to pixel position
 */
function getConnectorPosition(
  point: { hexI: number; hexJ: number; isCenter?: boolean; edge?: string; cornerIndex?: number },
  canvas: any
): { x: number; y: number } | null {
  if (point.isCenter) {
    return getHexCenter(point.hexI, point.hexJ, canvas);
  }

  if (point.edge) {
    return getEdgeMidpoint(point.hexI, point.hexJ, point.edge as EdgeDirection, canvas);
  }

  if (point.cornerIndex !== undefined) {
    const vertices = canvas.grid.getVertices({ i: point.hexI, j: point.hexJ });
    if (!vertices || vertices.length <= point.cornerIndex) {
      return null;
    }
    const v = vertices[point.cornerIndex];
    return { x: v.x, y: v.y };
  }

  return null;
}

/**
 * Ensure barrier segments exist for rivers.
 * Call this on module initialization to handle kingdoms created before barrier segments existed.
 *
 * @returns Number of segments computed, or 0 if no computation needed
 */
export async function ensureBarrierSegments(): Promise<number> {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    console.warn('[BarrierSegments] Canvas not ready, cannot ensure segments');
    return 0;
  }

  const kingdom = getKingdomData();
  const hasRivers = (kingdom.rivers?.paths?.length ?? 0) > 0;
  const hasSegments = (kingdom.rivers?.barrierSegments?.length ?? 0) > 0;

  // Only compute if rivers exist but segments don't
  if (!hasRivers) {
    return 0;
  }

  if (hasSegments) {
    console.log(`[BarrierSegments] ${kingdom.rivers!.barrierSegments!.length} barrier segments already exist`);
    return kingdom.rivers!.barrierSegments!.length;
  }

  // Compute and save barrier segments
  console.log('[BarrierSegments] Computing missing barrier segments for existing rivers...');
  const segments = computeBarrierSegments(
    kingdom.rivers!.paths,
    kingdom.rivers!.crossings,
    canvas
  );

  await updateKingdom(k => {
    if (!k.rivers) k.rivers = { paths: [] };
    k.rivers.barrierSegments = segments;
  });

  console.log(`[BarrierSegments] Computed and saved ${segments.length} barrier segments`);
  return segments.length;
}

/**
 * Force recalculation of all barrier segments.
 * Use this to fix issues or after manual river data changes.
 *
 * @returns Number of segments computed
 */
export async function recalculateBarrierSegments(): Promise<number> {
  const canvas = (globalThis as any).canvas;
  if (!canvas?.grid) {
    console.error('[BarrierSegments] Canvas not ready, cannot recalculate');
    return 0;
  }

  const kingdom = getKingdomData();
  const paths = kingdom.rivers?.paths || [];
  const crossings = kingdom.rivers?.crossings;

  if (paths.length === 0) {
    console.log('[BarrierSegments] No rivers to compute barriers for');
    return 0;
  }

  const segments = computeBarrierSegments(paths, crossings, canvas);

  await updateKingdom(k => {
    if (!k.rivers) k.rivers = { paths: [] };
    k.rivers.barrierSegments = segments;
  });

  console.log(`[BarrierSegments] Recalculated ${segments.length} barrier segments from ${paths.length} river paths`);
  return segments.length;
}
