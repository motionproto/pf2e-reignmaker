/**
 * ProvinceRenderer - Renders province border outlines
 *
 * Provinces are shown with the same color and intensity as territory borders
 * but at half the width (8px vs 16px) to visually distinguish them.
 */

import type { Province } from '../../../actors/KingdomActor';
import { generateProvinceOutlines } from '../utils/ProvinceOutline';
import { TERRITORY_BORDER_COLORS } from '../../../styles/colors';
import { logger } from '../../../utils/Logger';

// Province border styling - same style as territory border but half width
const PROVINCE_BORDER_STYLE = {
  width: 8, // Half of territory's 16px
  color: TERRITORY_BORDER_COLORS.outline, // Same color as territory
  alpha: TERRITORY_BORDER_COLORS.outlineAlpha, // Same intensity as territory
} as const;

/**
 * Render province outlines for all provinces
 *
 * @param layer - PIXI container to add graphics to
 * @param provinces - Array of provinces with their hex assignments
 */
export function renderProvinceOutlines(
  layer: PIXI.Container,
  provinces: Province[]
): void {
  // Filter to provinces that have hexes
  const provincesWithHexes = provinces.filter((p) => p.hexIds.length > 0);

  if (provincesWithHexes.length === 0) {
    return;
  }

  // Generate outlines for all provinces
  const outlineResults = generateProvinceOutlines(provincesWithHexes);

  if (outlineResults.size === 0) {
    logger.warn('[ProvinceRenderer] No province outlines generated');
    return;
  }

  // Create graphics object for province outlines
  const graphics = new PIXI.Graphics();
  graphics.name = 'ProvinceOutlines';
  graphics.visible = true;

  // Set line style for faint borders
  graphics.lineStyle({
    width: PROVINCE_BORDER_STYLE.width,
    color: PROVINCE_BORDER_STYLE.color,
    alpha: PROVINCE_BORDER_STYLE.alpha,
    cap: PIXI.LINE_CAP.ROUND,
    join: PIXI.LINE_JOIN.ROUND,
  });

  // Draw all province outlines
  outlineResults.forEach((result) => {
    result.outlines.forEach((path) => {
      if (path.length === 0) return;

      graphics.moveTo(path[0].start.x, path[0].start.y);

      for (const segment of path) {
        graphics.lineTo(segment.end.x, segment.end.y);
      }

      // Close the path if it loops back
      const firstPoint = path[0].start;
      const lastPoint = path[path.length - 1].end;
      const tolerance = 0.1;
      const isLoop =
        Math.abs(firstPoint.x - lastPoint.x) < tolerance &&
        Math.abs(firstPoint.y - lastPoint.y) < tolerance;

      if (isLoop) {
        graphics.closePath();
      }
    });
  });

  layer.addChild(graphics);
}
