/**
 * Grid traversal utilities for robust line-barrier intersection detection.
 *
 * Instead of a single line-line intersection check (which can fail for collinear
 * lines or endpoint edge cases), we step along the movement vector and check
 * for barrier crossings at each step.
 */

import { lineSegmentsIntersect, type Point } from './geometryUtils';

/** Default step size in pixels for traversal */
export const RIVER_CROSSING_STEP_SIZE = 5;

export interface TraversalStep {
  point: Point;
  t: number; // 0-1 progress along line
}

export interface BarrierSegment {
  start: Point;
  end: Point;
  hasCrossing: boolean;
}

/**
 * Generate points along a line using uniform stepping.
 *
 * @param start - Start point of the line
 * @param end - End point of the line
 * @param stepSize - Distance between steps in pixels (default: 5)
 * @returns Array of traversal steps including start and end points
 */
export function traverseLine(
  start: Point,
  end: Point,
  stepSize: number = RIVER_CROSSING_STEP_SIZE
): TraversalStep[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const numSteps = Math.max(1, Math.ceil(distance / stepSize));

  const steps: TraversalStep[] = [{ point: { x: start.x, y: start.y }, t: 0 }];

  for (let i = 1; i <= numSteps; i++) {
    const t = i / numSteps;
    steps.push({
      point: {
        x: start.x + dx * t,
        y: start.y + dy * t
      },
      t
    });
  }

  return steps;
}

/**
 * Check if any step along a line crosses a barrier segment.
 *
 * This is more robust than a single line-line intersection check because:
 * 1. Small steps are less likely to be perfectly collinear with barriers
 * 2. Multiple intersection checks increase chance of detection
 * 3. More robust to floating point edge cases
 *
 * @param start - Start point of the movement line
 * @param end - End point of the movement line
 * @param barriers - Array of barrier segments to check against
 * @param stepSize - Distance between steps in pixels (default: 5)
 * @returns true if movement crosses any barrier (without a crossing)
 */
export function checkLineBarrierCrossing(
  start: Point,
  end: Point,
  barriers: BarrierSegment[],
  stepSize: number = RIVER_CROSSING_STEP_SIZE
): boolean {
  const steps = traverseLine(start, end, stepSize);

  for (let i = 1; i < steps.length; i++) {
    const prevPoint = steps[i - 1].point;
    const currentPoint = steps[i].point;

    for (const barrier of barriers) {
      // Skip barriers with crossings (bridges/fords allow passage)
      if (barrier.hasCrossing) continue;

      if (lineSegmentsIntersect(prevPoint, currentPoint, barrier.start, barrier.end)) {
        return true;
      }
    }
  }

  return false;
}
