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

/**
 * Render all river segments across the map
 * Now includes flow direction visualization with arrows and state-specific colors
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

  // Get kingdom data to find river features
  const kingdomActor = await getKingdomActor();
  const kingdom = kingdomActor?.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
  
  if (!kingdom?.hexes) {
    // logger.info('[WaterRenderer] No kingdom hexes found');
    return;
  }

  // Find all hexes with river features
  const riverHexes = kingdom.hexes.filter(hex => 
    hex.features?.some(f => f.type === 'river' && f.segments && f.segments.length > 0)
  );

  if (riverHexes.length === 0) {
    // logger.info('[WaterRenderer] No river segments found');
    return;
  }

  // logger.info(`[WaterRenderer] Rendering rivers for ${riverHexes.length} hexes`);

  // Graphics objects for multi-pass rendering
  const borderGraphics = new PIXI.Graphics();
  borderGraphics.name = 'RiverBorders';

  const riverGraphics = new PIXI.Graphics();
  riverGraphics.name = 'Rivers';

  const arrowGraphics = new PIXI.Graphics();
  arrowGraphics.name = 'FlowArrows';

  // Collect all river paths
  let segmentCount = 0;

  riverHexes.forEach(hex => {
    const riverFeature = hex.features?.find(f => f.type === 'river');
    if (!riverFeature?.segments) return;

    const hexCoords = parseHexId(hex.id);
    if (!hexCoords) return;

    riverFeature.segments.forEach((segment: any) => {
      const pathData = buildSegmentPath(segment, hexCoords.i, hexCoords.j, canvas);
      if (pathData && pathData.path.length > 0) {
        // Draw border (same for all states)
        drawRiverPath(borderGraphics, pathData.path, RIVER_BORDER_WIDTH, RIVER_BORDER_COLOR, RIVER_BORDER_ALPHA);
        
        // Draw river with state-specific color
        const riverColor = getRiverColor(pathData.state);
        drawRiverPath(riverGraphics, pathData.path, RIVER_WIDTH, riverColor, RIVER_ALPHA);
        
        // Draw flow arrow for 'flow' state
        if (pathData.state === 'flow' && pathData.path.length >= 2) {
          drawFlowArrow(arrowGraphics, pathData.path);
        }
        
        segmentCount++;
      }
    });
  });

  // Add to layer (borders first, rivers, then arrows on top)
  layer.addChild(borderGraphics);
  layer.addChild(riverGraphics);
  layer.addChild(arrowGraphics);

  // logger.info(`[WaterRenderer] ✅ Rendered ${segmentCount} river segments`);
}

/**
 * Build path points for a river segment with state information
 * 
 * @param segment - River segment data
 * @param hexI - Hex row coordinate
 * @param hexJ - Hex column coordinate
 * @param canvas - Foundry canvas object
 * @returns Object with path points and state, or null if no path
 */
function buildSegmentPath(
  segment: RiverSegment,
  hexI: number,
  hexJ: number,
  canvas: any
): { path: Array<{ x: number; y: number }>; state: 'flow' | 'source' | 'end' } | null {
  if (!segment.connectors || segment.connectors.length === 0) {
    return null;
  }

  // Get positions for all active connectors (not inactive)
  const connectorPositions: Array<{ edge: EdgeDirection; x: number; y: number }> = [];
  
  // Determine segment state (use first active connector's state)
  let segmentState: 'flow' | 'source' | 'end' = 'flow';
  
  segment.connectors.forEach(connector => {
    if (connector.state === 'inactive') return;
    
    // Capture state from first active connector
    if (connectorPositions.length === 0) {
      segmentState = connector.state === 'source' ? 'source' : 
                     connector.state === 'end' ? 'end' : 'flow';
    }
    
    const pos = getEdgeMidpoint(hexI, hexJ, connector.edge, canvas);
    if (pos) {
      connectorPositions.push({
        edge: connector.edge,
        x: pos.x,
        y: pos.y
      });
    }
  });

  if (connectorPositions.length === 0) {
    return null;
  }

  // Check if center connector is active
  const centerConnector = segment.centerConnector;
  const hasCenterConnector = centerConnector && centerConnector.state !== 'inactive';

  if (hasCenterConnector) {
    // Bent river: draw through center
    const centerPos = getHexCenter(hexI, hexJ, canvas);
    if (!centerPos) return null;

    // Draw from each edge to center
    const path: Array<{ x: number; y: number }> = [];
    
    // For a bent river, we draw each edge → center as a curved segment
    // Then connect center to other edges
    connectorPositions.forEach((connector, index) => {
      if (index === 0) {
        // Start at first edge
        path.push({ x: connector.x, y: connector.y });
        // Curve to center
        const midX = (connector.x + centerPos.x) / 2;
        const midY = (connector.y + centerPos.y) / 2;
        path.push({ x: midX, y: midY });
        path.push({ x: centerPos.x, y: centerPos.y });
      } else {
        // Continue from center to next edge
        const midX = (centerPos.x + connector.x) / 2;
        const midY = (centerPos.y + connector.y) / 2;
        path.push({ x: midX, y: midY });
        path.push({ x: connector.x, y: connector.y });
      }
    });

    return { path, state: segmentState };
  } else {
    // Straight river: draw directly between edges
    if (connectorPositions.length < 2) {
      // Need at least 2 edges for a straight river
      return null;
    }

    // Draw straight line between the two edge connectors
    const path: Array<{ x: number; y: number }> = [];
    
    // Add all connector positions in order
    connectorPositions.forEach(connector => {
      path.push({ x: connector.x, y: connector.y });
    });

    return { path, state: segmentState };
  }
}

/**
 * Get river color based on connector state
 * 
 * @param state - Connector state
 * @returns Color value for the state
 */
function getRiverColor(state: 'flow' | 'source' | 'end'): number {
  switch (state) {
    case 'source':
      return SOURCE_COLOR;
    case 'end':
      return END_COLOR;
    case 'flow':
    default:
      return FLOW_COLOR;
  }
}

/**
 * Draw flow direction arrow at midpoint of river path
 * 
 * @param graphics - PIXI Graphics object
 * @param path - River path points
 */
function drawFlowArrow(
  graphics: PIXI.Graphics,
  path: Array<{ x: number; y: number }>
): void {
  if (path.length < 2) return;

  // Find midpoint of path for arrow placement
  const midIndex = Math.floor(path.length / 2);
  const p1 = path[midIndex - 1];
  const p2 = path[midIndex];

  // Calculate midpoint between these two points
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Calculate angle of flow direction
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx);

  // Draw chevron arrow pointing in flow direction
  const arrowLength = ARROW_SIZE;
  const arrowWidth = ARROW_SIZE * 0.6;

  // Calculate arrow points (chevron shape: >)
  const tipX = mx + Math.cos(angle) * arrowLength / 2;
  const tipY = my + Math.sin(angle) * arrowLength / 2;

  const baseX = mx - Math.cos(angle) * arrowLength / 2;
  const baseY = my - Math.sin(angle) * arrowLength / 2;

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
