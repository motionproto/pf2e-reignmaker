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
const RIVER_WIDTH = 20;
const RIVER_BORDER_WIDTH = 22;
const RIVER_ALPHA = 0.5;
const RIVER_BORDER_ALPHA = 0.5;

// River state colors
const FLOW_COLOR = 0x4A90E2;      // Medium blue - flowing water
const SOURCE_COLOR = 0x50C878;     // Emerald green - river source
const END_COLOR = 0x9370DB;        // Medium purple - river terminus
const RIVER_BORDER_COLOR = 0x00008B;  // Dark blue - border for all states

// Arrow constants
const ARROW_SIZE = 24;
const ARROW_COLOR = 0xFFFFFF;      // White arrows
const ARROW_ALPHA = 0.6;

// Lake/Swamp constants
const LAKE_COLOR = 0x4A90E2;       // Match river blue - medium blue
const LAKE_ALPHA = 0.4;            // More transparent than rivers
const SWAMP_COLOR = 0x6B8E23;      // Brighter murky green - olive drab
const SWAMP_ALPHA = 0.6;

// Crossing constants
const BRIDGE_COLOR = 0x8B4513;     // Saddle brown - wooden bridge
const BRIDGE_WIDTH = 50;           // Wide enough to span across river
const BRIDGE_THICKNESS = 12;       // Thick enough to clearly cut through river
const BRIDGE_ALPHA = 0.95;
const FORD_COLOR = 0x4A90E2;       // Blue - matches river color for shallow water
const FORD_WIDTH = 40;             // Rectangle width (perpendicular to river)
const FORD_THICKNESS = 16;         // Rectangle thickness (along river)
const FORD_ALPHA = 0.85;
const WATERFALL_COLOR = 0xFFFFFF;  // White - waterfall spray
const WATERFALL_ALPHA = 0.8;

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
  
  // Render waterfalls (segment-based, above lakes/swamps)
  if (kingdom.rivers?.waterfalls && kingdom.rivers.waterfalls.length > 0) {
    renderWaterfalls(layer, canvas, kingdom.rivers.paths || [], kingdom.rivers.waterfalls);
  }
  
  if (!kingdom?.rivers?.paths) {
    return;
  }

  // Get all paths
  const paths = kingdom.rivers.paths;
  
  if (paths.length === 0) {
    return;
  }

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
  
  // Render crossings (bridges and fords) on top of rivers
  if (kingdom.rivers?.crossings && kingdom.rivers.crossings.length > 0) {
    renderCrossings(layer, canvas, kingdom.rivers.paths || [], kingdom.rivers.crossings);
  }
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
 * Render lake features (80% hex fills)
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
    drawHexFill(lakeGraphics, lake.hexI, lake.hexJ, canvas, LAKE_COLOR, LAKE_ALPHA, 0.8);
  }
  
  layer.addChild(lakeGraphics);
}

/**
 * Render swamp features (80% hex fills)
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
    drawHexFill(swampGraphics, swamp.hexI, swamp.hexJ, canvas, SWAMP_COLOR, SWAMP_ALPHA, 0.8);
  }
  
  layer.addChild(swampGraphics);
}

/**
 * Draw a filled hex at the specified grid position
 * Uses Foundry's grid API for accurate hex vertices (matches terrain overlay pattern)
 * 
 * @param graphics - PIXI Graphics object
 * @param hexI - Hex row index
 * @param hexJ - Hex column index
 * @param canvas - Foundry canvas object
 * @param color - Fill color
 * @param alpha - Fill alpha
 * @param sizeScale - Scale factor for hex size (default 1.02 for slight overlap, 0.8 for water features)
 */
function drawHexFill(
  graphics: PIXI.Graphics,
  hexI: number,
  hexJ: number,
  canvas: any,
  color: number,
  alpha: number,
  sizeScale: number = 1.02
): void {
  // Get hex center using Foundry's API
  const center = canvas.grid.getCenterPoint({i: hexI, j: hexJ});
  if (!center) return;
  
  // Use Foundry's GridHex class for vertex calculation
  const GridHex = (globalThis as any).foundry.grid.GridHex;
  const hex = new GridHex({i: hexI, j: hexJ}, canvas.grid);
  
  // Get vertices in grid-relative coordinates
  const relativeVertices = canvas.grid.getShape(hex.offset);
  
  if (!relativeVertices || relativeVertices.length === 0) {
    logger.warn(`[WaterRenderer] No vertices for hex (${hexI}, ${hexJ})`);
    return;
  }
  
  // Apply size scaling
  // Default 1.02 provides slight overlap to prevent gaps (for terrain)
  // 0.8 makes water features 80% of hex size (to differentiate from terrain)
  const scale = sizeScale;
  
  // Translate vertices to world coordinates
  const worldVertices = relativeVertices.map((v: any) => ({
    x: center.x + (v.x * scale),
    y: center.y + (v.y * scale)
  }));
  
  // Draw filled hexagon
  graphics.beginFill(color, alpha);
  graphics.drawPolygon(worldVertices.flatMap((v: any) => [v.x, v.y]));
  graphics.endFill();
}

/**
 * Render bridge and ford crossings (segment-based)
 * Bridges = brown rectangles spanning the river
 * Fords = blue rectangles indicating shallow crossing
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param paths - River paths
 * @param crossings - Array of crossing features
 */
function renderCrossings(
  layer: PIXI.Container,
  canvas: any,
  paths: Array<{ id: string; points: Array<{ hexI: number; hexJ: number; edge?: string; isCenter?: boolean; order: number }> }>,
  crossings: Array<{ id: string; pathId: string; segmentIndex: number; position: number; type: 'bridge' | 'ford' }>
): void {
  const crossingGraphics = new PIXI.Graphics();
  crossingGraphics.name = 'RiverCrossings';
  
  for (const crossing of crossings) {
    // Find the path
    const path = paths.find(p => p.id === crossing.pathId);
    if (!path) continue;
    
    // Get sorted points
    const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
    if (crossing.segmentIndex >= sortedPoints.length - 1) continue;
    
    // Get segment endpoints
    const p1 = sortedPoints[crossing.segmentIndex];
    const p2 = sortedPoints[crossing.segmentIndex + 1];
    
    // Get screen positions
    const pos1 = p1.isCenter 
      ? getHexCenter(p1.hexI, p1.hexJ, canvas)
      : getEdgeMidpoint(p1.hexI, p1.hexJ, p1.edge as EdgeDirection, canvas);
    
    const pos2 = p2.isCenter
      ? getHexCenter(p2.hexI, p2.hexJ, canvas)
      : getEdgeMidpoint(p2.hexI, p2.hexJ, p2.edge as EdgeDirection, canvas);
    
    if (!pos1 || !pos2) continue;
    
    // Interpolate position along segment
    const x = pos1.x + (pos2.x - pos1.x) * crossing.position;
    const y = pos1.y + (pos2.y - pos1.y) * crossing.position;
    
    // Calculate segment angle for bridge orientation
    const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
    
    if (crossing.type === 'bridge') {
      drawBridgeSegment(crossingGraphics, x, y, angle);
    } else if (crossing.type === 'ford') {
      drawFord(crossingGraphics, x, y, angle);
    }
  }
  
  layer.addChild(crossingGraphics);
}

/**
 * Draw a bridge crossing (segment-based)
 * Renders as a wide brown rectangle perpendicular to the river segment
 * The bridge extends across the river, visually cutting through it
 * 
 * @param graphics - PIXI Graphics object
 * @param x - X position along segment
 * @param y - Y position along segment
 * @param angle - Angle of river segment (radians)
 */
function drawBridgeSegment(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  angle: number
): void {
  
  // Perpendicular angle (bridge crosses river at right angle)
  const perpAngle = angle + Math.PI / 2;
  
  // Calculate rectangle corners (perpendicular to river)
  const halfWidth = BRIDGE_WIDTH / 2;  // Extends across river
  const halfThickness = BRIDGE_THICKNESS / 2;  // Along river direction
  
  const cosPerp = Math.cos(perpAngle);
  const sinPerp = Math.sin(perpAngle);
  const cosRiver = Math.cos(angle);
  const sinRiver = Math.sin(angle);
  
  const corners = [
    { 
      x: x - halfWidth * cosPerp - halfThickness * cosRiver, 
      y: y - halfWidth * sinPerp - halfThickness * sinRiver 
    },
    { 
      x: x + halfWidth * cosPerp - halfThickness * cosRiver, 
      y: y + halfWidth * sinPerp - halfThickness * sinRiver 
    },
    { 
      x: x + halfWidth * cosPerp + halfThickness * cosRiver, 
      y: y + halfWidth * sinPerp + halfThickness * sinRiver 
    },
    { 
      x: x - halfWidth * cosPerp + halfThickness * cosRiver, 
      y: y - halfWidth * sinPerp + halfThickness * sinRiver 
    }
  ];
  
  // Draw bridge rectangle
  graphics.beginFill(BRIDGE_COLOR, BRIDGE_ALPHA);
  graphics.drawPolygon(corners.flatMap(c => [c.x, c.y]));
  graphics.endFill();
  
  // Add dark border for definition
  graphics.lineStyle(2, 0x000000, 0.6);
  graphics.drawPolygon(corners.flatMap(c => [c.x, c.y]));
}

/**
 * Draw a ford crossing
 * Renders as a thick blue rectangle perpendicular to the river
 * Indicates a natural shallow crossing point
 * 
 * @param graphics - PIXI Graphics object
 * @param x - X position along segment
 * @param y - Y position along segment
 * @param angle - Angle of river segment (radians)
 */
function drawFord(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  angle: number
): void {
  
  // Perpendicular angle (ford crosses river at right angle)
  const perpAngle = angle + Math.PI / 2;
  
  // Calculate rectangle corners (perpendicular to river)
  const halfWidth = FORD_WIDTH / 2;  // Extends across river
  const halfThickness = FORD_THICKNESS / 2;  // Along river direction
  
  const cosPerp = Math.cos(perpAngle);
  const sinPerp = Math.sin(perpAngle);
  const cosRiver = Math.cos(angle);
  const sinRiver = Math.sin(angle);
  
  const corners = [
    { 
      x: x - halfWidth * cosPerp - halfThickness * cosRiver, 
      y: y - halfWidth * sinPerp - halfThickness * sinRiver 
    },
    { 
      x: x + halfWidth * cosPerp - halfThickness * cosRiver, 
      y: y + halfWidth * sinPerp - halfThickness * sinRiver 
    },
    { 
      x: x + halfWidth * cosPerp + halfThickness * cosRiver, 
      y: y + halfWidth * sinPerp + halfThickness * sinRiver 
    },
    { 
      x: x - halfWidth * cosPerp + halfThickness * cosRiver, 
      y: y - halfWidth * sinPerp + halfThickness * sinRiver 
    }
  ];
  
  // Draw ford rectangle (blue, same color as river)
  graphics.beginFill(FORD_COLOR, FORD_ALPHA);
  graphics.drawPolygon(corners.flatMap(c => [c.x, c.y]));
  graphics.endFill();
  
  // Add lighter blue border for definition
  graphics.lineStyle(2, 0x87CEEB, 0.7);  // Sky blue border
  graphics.drawPolygon(corners.flatMap(c => [c.x, c.y]));
}

/**
 * Render waterfall features (segment-based)
 * Waterfalls = white cascading lines on segments (blocks boats)
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param paths - River paths
 * @param waterfalls - Array of waterfall features
 */
function renderWaterfalls(
  layer: PIXI.Container,
  canvas: any,
  paths: Array<{ id: string; points: Array<{ hexI: number; hexJ: number; edge?: string; isCenter?: boolean; order: number }> }>,
  waterfalls: Array<{ id: string; pathId: string; segmentIndex: number; position: number }>
): void {
  const waterfallGraphics = new PIXI.Graphics();
  waterfallGraphics.name = 'Waterfalls';
  
  for (const waterfall of waterfalls) {
    // Find the path
    const path = paths.find(p => p.id === waterfall.pathId);
    if (!path) continue;
    
    // Get sorted points
    const sortedPoints = [...path.points].sort((a, b) => a.order - b.order);
    if (waterfall.segmentIndex >= sortedPoints.length - 1) continue;
    
    // Get segment endpoints
    const p1 = sortedPoints[waterfall.segmentIndex];
    const p2 = sortedPoints[waterfall.segmentIndex + 1];
    
    // Get screen positions
    const pos1 = p1.isCenter 
      ? getHexCenter(p1.hexI, p1.hexJ, canvas)
      : getEdgeMidpoint(p1.hexI, p1.hexJ, p1.edge as EdgeDirection, canvas);
    
    const pos2 = p2.isCenter
      ? getHexCenter(p2.hexI, p2.hexJ, canvas)
      : getEdgeMidpoint(p2.hexI, p2.hexJ, p2.edge as EdgeDirection, canvas);
    
    if (!pos1 || !pos2) continue;
    
    // Interpolate position along segment
    const x = pos1.x + (pos2.x - pos1.x) * waterfall.position;
    const y = pos1.y + (pos2.y - pos1.y) * waterfall.position;
    
    // Calculate segment angle
    const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
    
    drawWaterfallSegment(waterfallGraphics, x, y, angle);
  }
  
  layer.addChild(waterfallGraphics);
}

/**
 * Draw a waterfall indicator (segment-based)
 * Renders as white cascading lines perpendicular to the segment
 * 
 * @param graphics - PIXI Graphics object
 * @param x - X position along segment
 * @param y - Y position along segment
 * @param angle - Angle of river segment (radians)
 */
function drawWaterfallSegment(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  angle: number
): void {
  
  // Draw multiple cascading lines for waterfall effect
  const lineCount = 5;
  const lineSpacing = 6;
  const lineLength = 30;
  
  graphics.lineStyle(3, WATERFALL_COLOR, WATERFALL_ALPHA);
  
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  for (let i = 0; i < lineCount; i++) {
    const offset = (i - (lineCount - 1) / 2) * lineSpacing;
    
    // Calculate line start and end (perpendicular to edge)
    const startX = x + offset * cos - (lineLength / 2) * sin;
    const startY = y + offset * sin + (lineLength / 2) * cos;
    const endX = x + offset * cos + (lineLength / 2) * sin;
    const endY = y + offset * sin - (lineLength / 2) * cos;
    
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);
  }
  
  // Add blue tint behind for water context
  graphics.lineStyle(5, FLOW_COLOR, 0.3);
  for (let i = 0; i < lineCount; i++) {
    const offset = (i - (lineCount - 1) / 2) * lineSpacing;
    const startX = x + offset * cos - (lineLength / 2) * sin;
    const startY = y + offset * sin + (lineLength / 2) * cos;
    const endX = x + offset * cos + (lineLength / 2) * sin;
    const endY = y + offset * sin - (lineLength / 2) * cos;
    
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);
  }
}
