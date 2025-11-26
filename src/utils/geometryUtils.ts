/**
 * Geometry utilities for line intersection and spatial calculations
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Check if two line segments intersect
 * Uses cross-product method for robust detection
 * 
 * @param p1 - Start of first segment
 * @param p2 - End of first segment
 * @param p3 - Start of second segment
 * @param p4 - End of second segment
 * @returns true if the segments intersect
 */
export function lineSegmentsIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  // Calculate direction vectors
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  // Calculate cross product of direction vectors
  const cross = d1x * d2y - d1y * d2x;

  // If cross product is ~0, lines are parallel
  if (Math.abs(cross) < 1e-10) {
    return false;
  }

  // Calculate parameters for intersection point
  const dx = p3.x - p1.x;
  const dy = p3.y - p1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  // Check if intersection is within both segments (0 <= t,u <= 1)
  // Use small epsilon to avoid edge cases at exact endpoints
  const epsilon = 1e-10;
  return t > epsilon && t < 1 - epsilon && u > epsilon && u < 1 - epsilon;
}

/**
 * Get the intersection point of two line segments (if they intersect)
 * 
 * @param p1 - Start of first segment
 * @param p2 - End of first segment
 * @param p3 - Start of second segment
 * @param p4 - End of second segment
 * @returns Intersection point or null if no intersection
 */
export function getLineSegmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const cross = d1x * d2y - d1y * d2x;

  if (Math.abs(cross) < 1e-10) {
    return null;
  }

  const dx = p3.x - p1.x;
  const dy = p3.y - p1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  const epsilon = 1e-10;
  if (t > epsilon && t < 1 - epsilon && u > epsilon && u < 1 - epsilon) {
    return {
      x: p1.x + t * d1x,
      y: p1.y + t * d1y
    };
  }

  return null;
}


