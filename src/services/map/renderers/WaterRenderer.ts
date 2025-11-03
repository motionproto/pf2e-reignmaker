/**
 * WaterRenderer - Renders river segments using edge-to-edge connector system
 * Supports straight rivers and bent rivers (using center connector)
 */

import { getKingdomActor } from '../../../main.kingdom';
import type { KingdomData } from '../../../actors/KingdomActor';
import { logger } from '../../../utils/Logger';
import { getEdgeMidpoint, getHexCenter, parseHexId } from '../../../utils/riverUtils';
import type { RiverSegment, EdgeDirection } from '../../../models/Hex';

// River visual constants
const RIVER_WIDTH = 16;
const RIVER_BORDER_WIDTH = 18;
const RIVER_ALPHA = 0.8;
const RIVER_BORDER_ALPHA = 0.6;

// River state colors
const FLOW_COLOR = 0x4A90E2;      // Medium blue - flowing water
const SOURCE_COLOR = 0x50C878;     // Emerald green - river source
const END_COLOR = 0x9370DB;        // Medium purple - river terminus
const RIVER_BORDER_COLOR = 0x00008B;  // Dark blue - border for all states

// Arrow constants
const ARROW_SIZE = 12;
const ARROW_COLOR = 0xFFFFFF;      // White arrows
const ARROW_ALPHA = 0.9;

// Lake/Swamp constants
const LAKE_COLOR = 0x87CEEB;       // Light blue - sky blue
const LAKE_ALPHA = 0.6;
const SWAMP_COLOR = 0x556B2F;      // Murky green - dark olive green
const SWAMP_ALPHA = 0.6;

/**
 * Render all river segments across the map
 * Uses canonical edge map to prevent duplicate rendering
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 */
export async function renderWaterConnections(
  layer: PIXI.Container,
  canvas: any
): Promise<void> {
  if (!canvas?.grid) {
    logger.warn('[WaterRenderer] Canvas grid not available');
    return;
  }

  // Get kingdom data
  const kingdomActor = await getKingdomActor();
  const kingdom = kingdomActor?.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
  
  if (!kingdom) {
    return;
  }
  
  // Render lakes first (bottom layer)
  if (kingdom.waterFeatures?.lakes && kingdom.waterFeatures.lakes.length > 0) {
    renderLakes(layer, canvas, kingdom.waterFeatures.lakes);
  }
  
  // Render swamps second (above lakes)
  if (kingdom.waterFeatures?.swamps && kingdom.waterFeatures.swamps.length > 0) {
    renderSwamps(layer, canvas, kingdom.waterFeatures.swamps);
  }
  
  if (!kingdom?.rivers?.paths) {
    // logger.info('[WaterRenderer] No rivers found');
    return;
  }

  // Get all paths
  const paths = kingdom.rivers.paths;
  
  if (paths.length === 0) {
    // logger.info('[WaterRenderer] No river paths found');
    return;
  }

  // logger.info(`[WaterRenderer] Rendering ${paths.length} river paths`);

  // Graphics objects for multi-pass rendering
  const borderGraphics = new PIXI.Graphics();
  borderGraphics.name = 'RiverBorders';

  const riverGraphics = new PIXI.Graphics();
  riverGraphics.name = 'Rivers';

  // Create graphics for arrows (on top)
  const arrowGraphics = new PIXI.Graphics();
  arrowGraphics.name = 'RiverArrows';

  // Render each path
  for (const path of paths) {
    // Sort points by order
    const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
    
    // Get positions for each point
    const positions: Array<{x: number, y: number}> = [];
    
    for (const point of sortedPoints) {
      let pos;
      if (point.isCenter) {
        pos = getHexCenter(point.hexI, point.hexJ, canvas);
      } else if (point.edge) {
        pos = getEdgeMidpoint(point.hexI, point.hexJ, point.edge as EdgeDirection, canvas);
      }
      
      if (pos) {
        positions.push(pos);
      }
    }
    
    if (positions.length < 2) continue;
    
    // Determine color (use navigable property or default to blue)
    const riverColor = path.navigable !== false ? FLOW_COLOR : FLOW_COLOR;
    
    // Draw border
    drawRiverPath(borderGraphics, positions, RIVER_BORDER_WIDTH, RIVER_BORDER_COLOR, RIVER_BORDER_ALPHA);
    
    // Draw river
    drawRiverPath(riverGraphics, positions, RIVER_WIDTH, riverColor, RIVER_ALPHA);
    
    // Draw flow arrows
    drawFlowArrows(arrowGraphics, positions);
  }

  // Add to layer (borders first, then rivers, then arrows on top)
  layer.addChild(borderGraphics);
  layer.addChild(riverGraphics);
  layer.addChild(arrowGraphics);

  // logger.info(`[WaterRenderer] ✅ Rendered ${paths.length} river paths`);
}


/**
 * Draw a river path using PIXI graphics
 * 
 * @param graphics - PIXI Graphics object
 * @param path - Array of {x, y} points
 * @param width - Line width
 * @param color - Line color
 * @param alpha - Line alpha
 */
function drawRiverPath(
  graphics: PIXI.Graphics,
  path: Array<{ x: number; y: number }>,
  width: number,
  color: number,
  alpha: number
): void {
  if (path.length < 2) return;

  graphics.lineStyle({
    width,
    color,
    alpha,
    cap: PIXI.LINE_CAP.ROUND,
    join: PIXI.LINE_JOIN.ROUND
  });

  // Move to first point
  graphics.moveTo(path[0].x, path[0].y);

  // Draw lines through remaining points
  for (let i = 1; i < path.length; i++) {
    graphics.lineTo(path[i].x, path[i].y);
  }
}

/**
 * Draw flow direction arrows along a river path
 * Places arrows at regular intervals to show flow direction
 * 
 * @param graphics - PIXI Graphics object
 * @param path - Array of {x, y} points defining the path
 */
function drawFlowArrows(
  graphics: PIXI.Graphics,
  path: Array<{ x: number; y: number }>
): void {
  if (path.length < 2) return;

  // Calculate total path length
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i-1].x;
    const dy = path[i].y - path[i-1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Place arrows every 100 pixels along the path
  const ARROW_SPACING = 100;
  const numArrows = Math.floor(totalLength / ARROW_SPACING);
  
  if (numArrows === 0) return;

  // Calculate positions for arrows
  for (let arrowIndex = 0; arrowIndex < numArrows; arrowIndex++) {
    const targetDistance = (arrowIndex + 1) * ARROW_SPACING;
    
    // Find the segment and position for this arrow
    let currentDistance = 0;
    for (let i = 1; i < path.length; i++) {
      const p1 = path[i - 1];
      const p2 = path[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      
      if (currentDistance + segmentLength >= targetDistance) {
        // Arrow should be placed on this segment
        const distanceAlongSegment = targetDistance - currentDistance;
        const t = distanceAlongSegment / segmentLength;
        
        // Interpolate position
        const arrowX = p1.x + dx * t;
        const arrowY = p1.y + dy * t;
        
        // Calculate angle (direction of flow)
        const angle = Math.atan2(dy, dx);
        
        // Draw arrow at this position
        drawSingleArrow(graphics, arrowX, arrowY, angle);
        break;
      }
      
      currentDistance += segmentLength;
    }
  }
}

/**
 * Draw a single flow arrow
 * 
 * @param graphics - PIXI Graphics object
 * @param x - X position
 * @param y - Y position
 * @param angle - Angle in radians (direction of flow)
 */
function drawSingleArrow(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  angle: number
): void {
  const arrowLength = ARROW_SIZE;
  const arrowWidth = ARROW_SIZE * 0.6;

  // Calculate arrow points (triangle/chevron shape: >)
  const tipX = x + Math.cos(angle) * arrowLength / 2;
  const tipY = y + Math.sin(angle) * arrowLength / 2;

  const baseX = x - Math.cos(angle) * arrowLength / 2;
  const baseY = y - Math.sin(angle) * arrowLength / 2;

  const leftX = baseX - Math.cos(angle + Math.PI / 2) * arrowWidth / 2;
  const leftY = baseY - Math.sin(angle + Math.PI / 2) * arrowWidth / 2;

  const rightX = baseX + Math.cos(angle + Math.PI / 2) * arrowWidth / 2;
  const rightY = baseY + Math.sin(angle + Math.PI / 2) * arrowWidth / 2;

  // Draw arrow as filled triangle
  graphics.beginFill(ARROW_COLOR, ARROW_ALPHA);
  graphics.moveTo(tipX, tipY);
  graphics.lineTo(leftX, leftY);
  graphics.lineTo(rightX, rightY);
  graphics.lineTo(tipX, tipY);
  graphics.endFill();
}

/**
 * Render lake features (full hex fills)
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param lakes - Array of lake features
 */
function renderLakes(
  layer: PIXI.Container,
  canvas: any,
  lakes: Array<{ hexI: number; hexJ: number }>
): void {
  const lakeGraphics = new PIXI.Graphics();
  lakeGraphics.name = 'Lakes';
  
  for (const lake of lakes) {
    drawHexFill(lakeGraphics, lake.hexI, lake.hexJ, canvas, LAKE_COLOR, LAKE_ALPHA);
  }
  
  layer.addChild(lakeGraphics);
}

/**
 * Render swamp features (full hex fills)
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param swamps - Array of swamp features
 */
function renderSwamps(
  layer: PIXI.Container,
  canvas: any,
  swamps: Array<{ hexI: number; hexJ: number }>
): void {
  const swampGraphics = new PIXI.Graphics();
  swampGraphics.name = 'Swamps';
  
  for (const swamp of swamps) {
    drawHexFill(swampGraphics, swamp.hexI, swamp.hexJ, canvas, SWAMP_COLOR, SWAMP_ALPHA);
  }
  
  layer.addChild(swampGraphics);
}

/**
 * Draw a filled hex at the specified grid position
 * 
 * @param graphics - PIXI Graphics object
 * @param hexI - Hex row index
 * @param hexJ - Hex column index
 * @param canvas - Foundry canvas object
 * @param color - Fill color
 * @param alpha - Fill alpha
 */
function drawHexFill(
  graphics: PIXI.Graphics,
  hexI: number,
  hexJ: number,
  canvas: any,
  color: number,
  alpha: number
): void {
  // Get hex center and size
  const center = getHexCenter(hexI, hexJ, canvas);
  if (!center) return;
  
  const hexSize = canvas.grid.size;
  const hexWidth = hexSize;
  const hexHeight = hexSize;
  
  // Calculate hex vertices (pointy-top hexagon)
  const vertices: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // Start from top-right, rotate 30 degrees
    const x = center.x + hexWidth * 0.5 * Math.cos(angle);
    const y = center.y + hexHeight * 0.5 * Math.sin(angle);
    vertices.push({ x, y });
  }
  
  // Draw filled hexagon
  graphics.beginFill(color, alpha);
  graphics.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    graphics.lineTo(vertices[i].x, vertices[i].y);
  }
  graphics.closePath();
  graphics.endFill();
}
