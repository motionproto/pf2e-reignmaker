/**
 * ArmyMovementRenderer - Renders army movement paths and range overlays
 */

import type { ReachabilityMap } from '../../pathfinding/types';
import { logger } from '../../../utils/Logger';

/**
 * Colors for army movement visualization
 */
const MOVEMENT_COLORS = {
  // Origin hex (where army starts)
  origin: 0x00FF00,         // Bright green
  originAlpha: 0.4,

  // Reachable hexes (movement range overlay)
  reachable: 0x4CAF50,      // Green
  reachableAlpha: 0.15,

  // Path lines
  pathValid: 0x4CAF50,      // Green
  pathValidAlpha: 1.0,       // Fully opaque
  pathWidth: 12,             // Thicker line

  // Endpoint indicators
  endpointValid: 0x4CAF50,  // Green circle
  endpointInvalid: 0xFF0000, // Red X
  endpointAlpha: 1.0,
  endpointSize: 40
};

/**
 * Cached stripe pattern texture for movement range overlay
 */
let cachedStripeTexture: PIXI.Texture | null = null;

/**
 * Create a diagonal stripe pattern texture for movement range
 * The texture is cached and reused for performance
 */
function getStripePatternTexture(): PIXI.Texture {
  if (cachedStripeTexture) {
    return cachedStripeTexture;
  }

  const canvas = (globalThis as any).canvas;
  if (!canvas?.app?.renderer) {
    logger.warn('[ArmyMovementRenderer] Canvas renderer not available for texture generation');
    // Return a 1x1 white texture as fallback
    return PIXI.Texture.WHITE;
  }

  const patternSize = 64;
  const stripeWidth = 8;
  const patternGraphics = new PIXI.Graphics();

  // Transparent background
  patternGraphics.beginFill(0x000000, 0);
  patternGraphics.drawRect(0, 0, patternSize, patternSize);
  patternGraphics.endFill();

  // Draw diagonal stripes (green)
  patternGraphics.lineStyle(stripeWidth, MOVEMENT_COLORS.reachable, 0.5);

  // Multiple diagonal lines to cover the pattern tile
  for (let offset = -patternSize; offset < patternSize * 2; offset += 32) {
    patternGraphics.moveTo(offset, 0);
    patternGraphics.lineTo(offset + patternSize, patternSize);
  }

  // Use Foundry's renderer to generate texture (PIXI v7 API)
  cachedStripeTexture = canvas.app.renderer.generateTexture(patternGraphics, {
    resolution: 1,
    region: new PIXI.Rectangle(0, 0, patternSize, patternSize)
  });

  patternGraphics.destroy();
  return cachedStripeTexture;
}

/**
 * Draw a single hex with pattern texture fill
 */
function drawHexWithPattern(
  graphics: PIXI.Graphics,
  hexId: string,
  texture: PIXI.Texture,
  canvas: any
): boolean {
  try {
    const parts = hexId.split('.');
    const i = parseInt(parts[0], 10);
    const j = parseInt(parts[1], 10);

    if (isNaN(i) || isNaN(j)) return false;

    const GridHex = (globalThis as any).foundry.grid.GridHex;
    const hex = new GridHex({ i, j }, canvas.grid);
    const center = hex.center;
    const relativeVertices = canvas.grid.getShape(hex.offset);
    const scale = (canvas.grid.sizeY + 2) / canvas.grid.sizeY;

    const worldVertices = relativeVertices.map((v: any) => ({
      x: center.x + (v.x * scale),
      y: center.y + (v.y * scale)
    }));

    // Draw with texture fill
    graphics.beginTextureFill({
      texture,
      color: 0xFFFFFF,
      alpha: 1.0
    });
    graphics.drawPolygon(worldVertices.flatMap((v: any) => [v.x, v.y]));
    graphics.endFill();

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Render origin hex highlight (green hex at army position)
 */
export function renderOriginHex(
  layer: PIXI.Container,
  hexId: string,
  canvas: any,
  drawHexFn: (graphics: PIXI.Graphics, hexId: string, style: any, canvas: any) => boolean
): void {
  const graphics = new PIXI.Graphics();
  graphics.name = 'OriginHex';
  graphics.visible = true;

  const style = {
    fillColor: MOVEMENT_COLORS.origin,
    fillAlpha: MOVEMENT_COLORS.originAlpha,
    borderWidth: 16,
    borderColor: MOVEMENT_COLORS.origin,
    borderAlpha: 1.0
  };

  drawHexFn(graphics, hexId, style, canvas);
  layer.addChild(graphics);
}

/**
 * Render movement range overlay (diagonal stripe pattern on reachable hexes)
 */
export function renderReachableHexes(
  layer: PIXI.Container,
  reachableHexes: ReachabilityMap,
  canvas: any,
  _drawHexFn: (graphics: PIXI.Graphics, hexId: string, style: any, canvas: any) => boolean
): void {
  if (!canvas?.grid) {
    logger.warn('[ArmyMovementRenderer] Canvas grid not available');
    return;
  }

  const graphics = new PIXI.Graphics();
  graphics.name = 'ReachableHexes';
  graphics.visible = true;

  // Get the stripe pattern texture (cached)
  const patternTexture = getStripePatternTexture();

  let count = 0;
  reachableHexes.forEach((_cost, hexId) => {
    // Draw each hex with pattern fill
    const drawn = drawHexWithPattern(graphics, hexId, patternTexture, canvas);
    if (drawn) count++;
  });

  layer.addChild(graphics);
  logger.info(`[ArmyMovementRenderer] Rendered ${count} reachable hexes with pattern`);
}

/**
 * Render path as connected lines (center-to-center, through every hex)
 */
export function renderPath(
  layer: PIXI.Container,
  path: string[],
  isValid: boolean,
  canvas: any
): void {
  if (!canvas?.grid) {
    logger.warn('[ArmyMovementRenderer] Canvas grid not available');
    return;
  }

  if (path.length < 2) {
    return; // No path to draw
  }

  const graphics = new PIXI.Graphics();
  graphics.name = 'PathLines';
  graphics.visible = true;

  const color = isValid ? MOVEMENT_COLORS.pathValid : MOVEMENT_COLORS.endpointInvalid;
  const alpha = isValid ? MOVEMENT_COLORS.pathValidAlpha : 0.6;

  const GridHex = (globalThis as any).foundry.grid.GridHex;

  // Draw straight lines center-to-center through every hex
  graphics.lineStyle({
    width: MOVEMENT_COLORS.pathWidth,
    color,
    alpha,
    cap: PIXI.LINE_CAP.ROUND,
    join: PIXI.LINE_JOIN.ROUND
  });

  // Move to first hex center
  try {
    const firstParts = path[0].split('.');
    const firstI = parseInt(firstParts[0], 10);
    const firstJ = parseInt(firstParts[1], 10);
    
    if (!isNaN(firstI) && !isNaN(firstJ)) {
      const firstHex = new GridHex({ i: firstI, j: firstJ }, canvas.grid);
      graphics.moveTo(firstHex.center.x, firstHex.center.y);
    }
  } catch (error) {
    logger.error(`[ArmyMovementRenderer] Failed to parse first hex:`, error);
    return;
  }

  // Draw lines to each subsequent hex center
  for (let i = 1; i < path.length; i++) {
    try {
      const parts = path[i].split('.');
      const hexI = parseInt(parts[0], 10);
      const hexJ = parseInt(parts[1], 10);

      if (isNaN(hexI) || isNaN(hexJ)) {
        continue;
      }

      const center = canvas.grid.getCenterPoint({ i: hexI, j: hexJ });
      graphics.lineTo(center.x, center.y);
    } catch (error) {
      logger.error(`[ArmyMovementRenderer] Failed to draw to hex ${path[i]}:`, error);
    }
  }

  // Draw small dots at each hex center (except first and last)
  graphics.lineStyle(0); // No border for dots
  graphics.beginFill(color, alpha);
  
  for (let i = 1; i < path.length - 1; i++) {
    try {
      const parts = path[i].split('.');
      const hexI = parseInt(parts[0], 10);
      const hexJ = parseInt(parts[1], 10);

      if (isNaN(hexI) || isNaN(hexJ)) {
        continue;
      }

      const center = canvas.grid.getCenterPoint({ i: hexI, j: hexJ });
      graphics.drawCircle(center.x, center.y, 6); // 6px radius dots
    } catch (error) {
      logger.error(`[ArmyMovementRenderer] Failed to draw dot at hex ${path[i]}:`, error);
    }
  }
  
  graphics.endFill();

  layer.addChild(graphics);
}

/**
 * Render cell path for debug visualization
 * Shows the actual A* cell path (8px grid) instead of hex center-to-center lines
 */
export function renderCellPath(
  layer: PIXI.Container,
  cellPath: Array<{ x: number; y: number }>,
  cellSize: number  // 8 pixels (from NavigationGrid.CELL_SIZE)
): void {
  if (cellPath.length < 2) {
    return; // No path to draw
  }

  const graphics = new PIXI.Graphics();
  graphics.name = 'CellPathLines';
  graphics.visible = true;

  const color = 0x00FFFF; // Cyan
  const alpha = 1.0;

  // Draw connecting lines between cells
  graphics.lineStyle({
    width: 3,
    color,
    alpha,
    cap: PIXI.LINE_CAP.ROUND,
    join: PIXI.LINE_JOIN.ROUND
  });

  // Calculate pixel position for first cell (cell center)
  const firstX = cellPath[0].x * cellSize + cellSize / 2;
  const firstY = cellPath[0].y * cellSize + cellSize / 2;
  graphics.moveTo(firstX, firstY);

  // Draw lines to each subsequent cell
  for (let i = 1; i < cellPath.length; i++) {
    const x = cellPath[i].x * cellSize + cellSize / 2;
    const y = cellPath[i].y * cellSize + cellSize / 2;
    graphics.lineTo(x, y);
  }

  // Draw dots at each cell (every Nth cell to avoid clutter)
  const dotInterval = 3; // Draw every 3rd cell
  graphics.lineStyle(0);
  graphics.beginFill(color, alpha);

  for (let i = 0; i < cellPath.length; i += dotInterval) {
    const x = cellPath[i].x * cellSize + cellSize / 2;
    const y = cellPath[i].y * cellSize + cellSize / 2;
    graphics.drawCircle(x, y, 4); // 4px radius dots
  }

  // Always draw last cell
  const lastIdx = cellPath.length - 1;
  if (lastIdx % dotInterval !== 0) {
    const x = cellPath[lastIdx].x * cellSize + cellSize / 2;
    const y = cellPath[lastIdx].y * cellSize + cellSize / 2;
    graphics.drawCircle(x, y, 4);
  }

  graphics.endFill();

  layer.addChild(graphics);
  logger.info(`[ArmyMovementRenderer] Rendered cell path with ${cellPath.length} cells`);
}

/**
 * Render endpoint indicator (green circle or red X)
 * @param movementCost - Optional movement cost to display next to circle
 */
export function renderEndpoint(
  layer: PIXI.Container,
  hexId: string,
  isReachable: boolean,
  canvas: any,
  movementCost?: number
): void {
  if (!canvas?.grid) {
    logger.warn('[ArmyMovementRenderer] Canvas grid not available');
    return;
  }

  try {
    const parts = hexId.split('.');
    const i = parseInt(parts[0], 10);
    const j = parseInt(parts[1], 10);

    if (isNaN(i) || isNaN(j)) {
      return;
    }

    const GridHex = (globalThis as any).foundry.grid.GridHex;
    const center = canvas.grid.getCenterPoint({ i, j });

    const graphics = new PIXI.Graphics();
    graphics.name = 'EndpointIndicator';
    graphics.visible = true;

    if (isReachable) {
      // Draw green circle
      graphics.beginFill(MOVEMENT_COLORS.endpointValid, MOVEMENT_COLORS.endpointAlpha);
      graphics.drawCircle(center.x, center.y, MOVEMENT_COLORS.endpointSize);
      graphics.endFill();

      // Draw border
      graphics.lineStyle(3, 0xFFFFFF, 1.0);
      graphics.drawCircle(center.x, center.y, MOVEMENT_COLORS.endpointSize);

      // Draw movement cost label if provided
      if (movementCost !== undefined) {
        const text = new PIXI.Text(movementCost.toString(), {
          fontFamily: 'Arial',
          fontSize: 64,
          fontWeight: 'bold',
          fill: 0xFFFFFF,
          stroke: 0x000000,
          strokeThickness: 6,
          align: 'center'
        });
        
        text.anchor.set(0.5, 0.5);
        // Position to the right of the circle
        text.x = center.x + MOVEMENT_COLORS.endpointSize + 50;
        text.y = center.y;
        
        graphics.addChild(text);
      }
    } else {
      // Draw red X
      const size = MOVEMENT_COLORS.endpointSize;
      const thickness = 6;

      graphics.lineStyle(thickness, MOVEMENT_COLORS.endpointInvalid, MOVEMENT_COLORS.endpointAlpha);
      
      // Draw X (two diagonal lines)
      graphics.moveTo(center.x - size, center.y - size);
      graphics.lineTo(center.x + size, center.y + size);
      graphics.moveTo(center.x + size, center.y - size);
      graphics.lineTo(center.x - size, center.y + size);

      // Draw circle background
      graphics.beginFill(0x000000, 0.5);
      graphics.drawCircle(center.x, center.y, size + 5);
      graphics.endFill();

      // Redraw X on top
      graphics.lineStyle(thickness, MOVEMENT_COLORS.endpointInvalid, MOVEMENT_COLORS.endpointAlpha);
      graphics.moveTo(center.x - size, center.y - size);
      graphics.lineTo(center.x + size, center.y + size);
      graphics.moveTo(center.x + size, center.y - size);
      graphics.lineTo(center.x - size, center.y + size);
    }

    layer.addChild(graphics);
  } catch (error) {
    logger.error(`[ArmyMovementRenderer] Failed to render endpoint at ${hexId}:`, error);
  }
}
