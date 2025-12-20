/**
 * WaterRenderer - Renders river segments using edge-to-edge connector system
 * Supports straight rivers and bent rivers (using center connector)
 * 
 * Also exports computed river segments for pathfinding use via notifySegmentsReady callback.
 */

import { getKingdomActor } from '../../../main.kingdom';
import type { KingdomData } from '../../../actors/KingdomActor';
import { logger } from '../../../utils/Logger';
import { getEdgeMidpoint, getHexCenter, parseHexId } from '../../../utils/riverUtils';
import type { RiverSegment, EdgeDirection } from '../../../models/Hex';
import { waterwayGeometryService } from '../../pathfinding/WaterwayGeometryService';

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
 * Convert a river path point into a world-space position using the unified
 * hex connection point model (center, edge, or corner).
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
 * Render all river segments across the map
 * Uses canonical edge map to prevent duplicate rendering
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param activePathId - Optional ID of the path currently being edited (for highlight)
 */
export async function renderWaterConnections(
  layer: PIXI.Container,
  canvas: any,
  activePathId?: string | null
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
    
    // Get positions for each point (center, edge, or corner)
    const positions: Array<{ x: number; y: number }> = [];
    
    for (const point of sortedPoints) {
      const pos = getConnectorPosition(point, canvas);
      if (pos) {
        positions.push(pos);
      }
    }
    
    if (positions.length < 2) continue;

    // Determine color (use navigable property or default to blue)
    const isActive = !!activePathId && path.id === activePathId;
    const riverColor = isActive ? 0x66CCFF : FLOW_COLOR; // brighter blue for active path
    const riverAlpha = isActive ? Math.min(1, RIVER_ALPHA + 0.2) : RIVER_ALPHA;

    // Draw border
    drawRiverPath(borderGraphics, positions, RIVER_BORDER_WIDTH, RIVER_BORDER_COLOR, RIVER_BORDER_ALPHA);

    // Draw river
    drawRiverPath(riverGraphics, positions, RIVER_WIDTH, riverColor, riverAlpha);
    
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
  
  // Geometry is computed by WaterwayGeometryService, not here
  // The service reactively rebuilds when kingdom data changes
  logger.info(`[WaterRenderer] River rendering complete`);
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
 * Render bridge and ford crossings (connection-point-based)
 * Bridges = brown badges on connector dots
 * Fords = blue badges on connector dots
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param paths - River paths (unused now, kept for compatibility)
 * @param crossings - Array of crossing features
 */
function renderCrossings(
  layer: PIXI.Container,
  canvas: any,
  paths: Array<{ id: string; points: Array<{ hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number; order: number }> }>,
  crossings: Array<{ id: string; hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number; type: 'bridge' | 'ford' }>
): void {
  const crossingGraphics = new PIXI.Graphics();
  crossingGraphics.name = 'RiverCrossings';
  
  for (const crossing of crossings) {
    // Get screen position for this connection point
    const pos = getConnectorPosition(crossing, canvas);
    if (!pos) continue;
    
    // Draw crossing badge at connection point
    if (crossing.type === 'bridge') {
      drawBridgeBadge(crossingGraphics, pos.x, pos.y);
    } else if (crossing.type === 'ford') {
      drawFordBadge(crossingGraphics, pos.x, pos.y);
    }
  }
  
  layer.addChild(crossingGraphics);
}

/**
 * Draw a bridge crossing badge at a connection point
 * Renders as a brown diamond badge on the connector dot
 * 
 * @param graphics - PIXI Graphics object
 * @param x - X position of connection point
 * @param y - Y position of connection point
 */
function drawBridgeBadge(
  graphics: PIXI.Graphics,
  x: number,
  y: number
): void {
  const badgeSize = 18; // Size of the badge
  
  // Draw brown diamond badge
  graphics.lineStyle(0);
  graphics.beginFill(BRIDGE_COLOR, 0.9);
  
  // Diamond shape: top, right, bottom, left
  graphics.moveTo(x, y - badgeSize);
  graphics.lineTo(x + badgeSize, y);
  graphics.lineTo(x, y + badgeSize);
  graphics.lineTo(x - badgeSize, y);
  graphics.closePath();
  graphics.endFill();
  
  // Add dark border for definition
  graphics.lineStyle(2, 0x000000, 0.8);
  graphics.moveTo(x, y - badgeSize);
  graphics.lineTo(x + badgeSize, y);
  graphics.lineTo(x, y + badgeSize);
  graphics.lineTo(x - badgeSize, y);
  graphics.closePath();
}

/**
 * Draw a ford crossing badge at a connection point
 * Renders as a blue diamond badge on the connector dot
 * Indicates a natural shallow crossing point
 * 
 * @param graphics - PIXI Graphics object
 * @param x - X position of connection point
 * @param y - Y position of connection point
 */
function drawFordBadge(
  graphics: PIXI.Graphics,
  x: number,
  y: number
): void {
  const badgeSize = 18; // Size of the badge
  
  // Draw blue diamond badge
  graphics.lineStyle(0);
  graphics.beginFill(FORD_COLOR, 0.9);
  
  // Diamond shape: top, right, bottom, left
  graphics.moveTo(x, y - badgeSize);
  graphics.lineTo(x + badgeSize, y);
  graphics.lineTo(x, y + badgeSize);
  graphics.lineTo(x - badgeSize, y);
  graphics.closePath();
  graphics.endFill();
  
  // Add lighter blue border for definition
  graphics.lineStyle(2, 0x87CEEB, 0.8);  // Sky blue border
  graphics.moveTo(x, y - badgeSize);
  graphics.lineTo(x + badgeSize, y);
  graphics.lineTo(x, y + badgeSize);
  graphics.lineTo(x - badgeSize, y);
  graphics.closePath();
}

/**
 * Render waterfall features (connection-point-based)
 * Waterfalls = white cascading badges on connector dots (blocks boats)
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param paths - River paths (unused now, kept for compatibility)
 * @param waterfalls - Array of waterfall features
 */
function renderWaterfalls(
  layer: PIXI.Container,
  canvas: any,
  paths: Array<{ id: string; points: Array<{ hexI: number; hexJ: number; edge?: string; isCenter?: boolean; order: number }> }>,
  waterfalls: Array<{ id: string; hexI: number; hexJ: number; edge?: string; isCenter?: boolean; cornerIndex?: number }>
): void {
  const waterfallGraphics = new PIXI.Graphics();
  waterfallGraphics.name = 'Waterfalls';
  
  for (const waterfall of waterfalls) {
    // Get screen position for this connection point
    const pos = getConnectorPosition(waterfall, canvas);
    if (!pos) continue;
    
    // Draw waterfall badge at connection point
    drawWaterfallBadge(waterfallGraphics, pos.x, pos.y);
  }
  
  layer.addChild(waterfallGraphics);
}

/**
 * Draw a waterfall badge at a connection point
 * Renders as a white diamond badge with waterfall effects
 * 
 * @param graphics - PIXI Graphics object
 * @param x - X position of connection point
 * @param y - Y position of connection point
 */
function drawWaterfallBadge(
  graphics: PIXI.Graphics,
  x: number,
  y: number
): void {
  const badgeSize = 18; // Size of the badge
  
  // Draw white diamond badge
  graphics.lineStyle(0);
  graphics.beginFill(WATERFALL_COLOR, 0.9);
  
  // Diamond shape: top, right, bottom, left
  graphics.moveTo(x, y - badgeSize);
  graphics.lineTo(x + badgeSize, y);
  graphics.lineTo(x, y + badgeSize);
  graphics.lineTo(x - badgeSize, y);
  graphics.closePath();
  graphics.endFill();
  
  // Add blue border for definition
  graphics.lineStyle(2, FLOW_COLOR, 0.8);
  graphics.moveTo(x, y - badgeSize);
  graphics.lineTo(x + badgeSize, y);
  graphics.lineTo(x, y + badgeSize);
  graphics.lineTo(x - badgeSize, y);
  graphics.closePath();
}
