/**
 * RiverConnectorRenderer - Renders interactive river connector dots during river editing
 * Only active when in River Edit Mode
 * 
 * Uses canonical edge IDs to ensure each edge is rendered exactly once, eliminating duplicates.
 */

import { logger } from '../../../utils/Logger';
import { getEdgeMidpoint, getHexCenter, getAllEdges } from '../../../utils/riverUtils';
import type { EdgeDirection, ConnectorState, CenterConnectorState } from '../../../models/Hex';
import { getKingdomData } from '../../../stores/KingdomStore';
import { getEdgeIdForDirection, parseCanonicalEdgeId, edgeNameToIndex } from '../../../utils/edgeUtils';

// Connector colors
const CONNECTOR_COLORS = {
  source: 0x00FF00,      // 🟢 Green - river starts here
  end: 0xFF0000,         // 🔴 Red - river terminates here
  flow: 0x87CEEB,        // 🔵 Light Blue - river flows through
  inactive: 0xFFFFFF,    // ⚪ White - no river
  'flow-through': 0x87CEEB, // 🔵 Light Blue - center flow-through
};

const CONNECTOR_ALPHA = {
  active: 1.0,
  inactive: 0.5,
};

const EDGE_DOT_RADIUS = 8;
const CENTER_DOT_RADIUS = 10;
const OUTLINE_WIDTH = 2;

/**
 * Render river connector dots for all claimed hexes
 * Called when river edit mode is activated
 * 
 * Uses canonical edge IDs to ensure each shared edge is rendered exactly once.
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 * @param selectedConnector - Currently selected connector (if any) for visual highlight
 */
export async function renderRiverConnectors(
  layer: PIXI.Container,
  canvas: any,
  selectedConnector?: { hexI: number; hexJ: number; edge?: EdgeDirection; isCenter?: boolean } | null
): Promise<void> {
  if (!canvas?.grid) {
    logger.warn('[RiverConnectorRenderer] Canvas grid not available');
    return;
  }

  // Clear previous connector graphics
  clearRiverConnectors(layer);

  const graphics = new PIXI.Graphics();
  graphics.name = 'RiverConnectors';

  // Get kingdom data to check for existing river features
  const kingdom = getKingdomData();

  // Build list of ALL hexes to render (no filtering)
  // Show control points on every hex for maximum editing flexibility
  const allHexes = kingdom.hexes || [];
  
  const hexesToRender: Array<{ i: number; j: number; isHovered: boolean }> = allHexes.map((hex: any) => {
    const [i, j] = hex.id.split('.').map(Number);
    return { i, j, isHovered: true };  // Always render at full visibility in editor mode
  });

  logger.info(`[RiverConnectorRenderer] Rendering connectors for ${hexesToRender.length} hexes (all hexes on map)`);

  // Render edge connectors using canonical edge map (prevents duplicates)
  // Import edge utilities
  const edgeEntries = Object.entries(kingdom.rivers?.edges || {});
  const renderedEdges = new Set<string>();
  
  // First pass: render all edges from canonical map (active edges)
  for (const [edgeId, edgeData] of edgeEntries) {
    if (renderedEdges.has(edgeId)) continue;
    
    const { parseCanonicalEdgeId } = await import('../../../utils/edgeUtils');
    const { hex1, hex2 } = parseCanonicalEdgeId(edgeId);
    
    // Use hex1's perspective for rendering (arbitrary choice - both are equivalent)
    const position = getEdgeMidpoint(hex1.i, hex1.j, hex1.dir as EdgeDirection, canvas);
    if (!position) continue;
    
    // Check if this connector is selected
    const isSelected = selectedConnector && 
      selectedConnector.hexI === hex1.i && 
      selectedConnector.hexJ === hex1.j && 
      selectedConnector.edge === (hex1.dir as EdgeDirection);
    
    // Render the edge connector ONCE
    renderEdgeConnector(
      graphics, 
      position.x, 
      position.y, 
      hex1.dir as EdgeDirection, 
      edgeData.state, 
      true,  // Always visible (no hover filter)
      edgeId,
      edgeData.flowsToHex,
      canvas,
      hex1.i,
      hex1.j,
      isSelected || false
    );
    
    renderedEdges.add(edgeId);
  }
  
  // Second pass: render inactive edges for all hexes
  for (const hex of hexesToRender) {
    const edges = getAllEdges();
    
    for (const edge of edges) {
      const edgeIndex = edgeNameToIndex(edge);
      const edgeId = getEdgeIdForDirection(hex.i, hex.j, edgeIndex, canvas);
      
      // Skip if already rendered as active
      if (renderedEdges.has(edgeId)) continue;
      
      const position = getEdgeMidpoint(hex.i, hex.j, edge, canvas);
      if (!position) continue;
      
      // Check if this connector is selected
      const isSelected = selectedConnector && 
        selectedConnector.hexI === hex.i && 
        selectedConnector.hexJ === hex.j && 
        selectedConnector.edge === edge;
      
      // Render inactive edge connector
      renderEdgeConnector(
        graphics, 
        position.x, 
        position.y, 
        edge, 
        'inactive', 
        true,
        edgeId,
        undefined,
        canvas,
        hex.i,
        hex.j,
        isSelected || false
      );
      
      renderedEdges.add(edgeId);
    }
  }

  // Render center connectors for each hex (these are NOT shared between hexes)
  for (const hex of hexesToRender) {
    const centerPos = getHexCenter(hex.i, hex.j, canvas);
    if (!centerPos) continue;

    // Get center connector state from hex features (center connectors remain hex-local)
    const hexId = `${hex.i}.${hex.j}`;
    const hexData = kingdom.hexes?.find((h: any) => h.id === hexId);
    const riverFeature = hexData?.features?.find((f: any) => f.type === 'river');
    
    let centerState: CenterConnectorState = 'inactive';
    if (riverFeature?.segments) {
      for (const segment of riverFeature.segments) {
        if (segment.centerConnector) {
          centerState = segment.centerConnector.state;
          break;
        }
      }
    }
    
    renderCenterConnector(graphics, centerPos.x, centerPos.y, centerState, hex.isHovered);
  }

  layer.addChild(graphics);
}

/**
 * Clear all river connector graphics from layer
 * 
 * @param layer - PIXI container to clear
 */
export function clearRiverConnectors(layer: PIXI.Container): void {
  const existing = layer.children.find((child: any) => child.name === 'RiverConnectors');
  if (existing) {
    layer.removeChild(existing);
    existing.destroy();
  }
}

/**
 * Render connector dots for a single hex
 * 
 * @param graphics - PIXI Graphics object
 * @param canvas - Foundry canvas object
 * @param hexI - Hex row coordinate
 * @param hexJ - Hex column coordinate
 * @param kingdom - Kingdom data
 * @param isHovered - Whether this is the hovered hex (vs a neighbor)
 */
function renderHexConnectors(
  graphics: PIXI.Graphics,
  canvas: any,
  hexI: number,
  hexJ: number,
  kingdom: any,
  isHovered: boolean
): void {
  const hexId = `${hexI}.${hexJ}`;
  const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
  const riverFeature = hex?.features?.find((f: any) => f.type === 'river');

  // Get all existing connectors from segments
  const existingConnectors = new Map<EdgeDirection | 'center', ConnectorState | CenterConnectorState>();
  
  if (riverFeature?.segments) {
    riverFeature.segments.forEach((segment: any) => {
      // Edge connectors
      segment.connectors?.forEach((connector: any) => {
        existingConnectors.set(connector.edge, connector.state);
      });
      
      // Center connector
      if (segment.centerConnector) {
        existingConnectors.set('center', segment.centerConnector.state);
      }
    });
  }

  // Render edge connectors
  const edges = getAllEdges();
  edges.forEach(edge => {
    const position = getEdgeMidpoint(hexI, hexJ, edge, canvas);
    if (!position) return;

    const state = existingConnectors.get(edge) || 'inactive';
    renderEdgeConnector(graphics, position.x, position.y, edge, state, isHovered);
  });

  // Render center connector
  const centerPos = getHexCenter(hexI, hexJ, canvas);
  if (centerPos) {
    const centerState = existingConnectors.get('center') || 'inactive';
    renderCenterConnector(graphics, centerPos.x, centerPos.y, centerState, isHovered);
  }
}

/**
 * Render an edge connector (chevron for flow, dot for source/end)
 */
function renderEdgeConnector(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  edge: EdgeDirection,
  state: ConnectorState | CenterConnectorState,
  isHovered: boolean,
  edgeId?: string,
  flowsToHex?: { i: number; j: number },
  canvas?: any,
  hexI?: number,
  hexJ?: number,
  isSelected?: boolean
): void {
  // Draw selection highlight (yellow glow) if selected
  if (isSelected) {
    graphics.lineStyle({
      width: 4,
      color: 0xFFAA00,  // Orange/yellow
      alpha: 0.8,
    });
    graphics.beginFill(0xFFAA00, 0.3);
    graphics.drawCircle(x, y, EDGE_DOT_RADIUS + 6);
    graphics.endFill();
  }
  
  // Type guard: CenterConnectorState should never be passed here, but handle gracefully
  const edgeState: ConnectorState = (state === 'flow-through') ? 'inactive' : state as ConnectorState;
  
  const color = CONNECTOR_COLORS[edgeState as keyof typeof CONNECTOR_COLORS] || CONNECTOR_COLORS.inactive;
  const alpha = edgeState === 'inactive' ? CONNECTOR_ALPHA.inactive : CONNECTOR_ALPHA.active;
  
  if (edgeState === 'flow') {
    // Calculate chevron angle based on flow direction
    let angle = getEdgeAngle(edge);
    
    if (edgeId && flowsToHex && canvas && hexI !== undefined && hexJ !== undefined) {
      // Parse canonical ID to get both hexes (already imported at top of file)
      const { hex1, hex2 } = parseCanonicalEdgeId(edgeId);
      
      // Check if water flows toward second hex
      const flowsToSecond = 
        flowsToHex.i === hex2.i &&
        flowsToHex.j === hex2.j;
      
      // If flows toward first hex, flip arrow 180°
      if (!flowsToSecond) {
        angle += Math.PI;
      }
    }
    
    renderChevron(graphics, x, y, angle, color, isHovered ? alpha : alpha * 0.6, isHovered);
  } else {
    // Draw colored dot for source/end/inactive
    renderDot(graphics, x, y, color, EDGE_DOT_RADIUS, isHovered ? alpha : alpha * 0.6, edgeState === 'inactive', isHovered);
  }
}

/**
 * Render a center connector dot
 */
function renderCenterConnector(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  state: ConnectorState | CenterConnectorState,
  isHovered: boolean
): void {
  // Type guard: ConnectorState 'flow' should never be passed here, but handle gracefully
  const centerState: CenterConnectorState = (state === 'flow') ? 'inactive' : state as CenterConnectorState;
  
  const color = CONNECTOR_COLORS[centerState as keyof typeof CONNECTOR_COLORS] || CONNECTOR_COLORS.inactive;
  const alpha = centerState === 'inactive' ? CONNECTOR_ALPHA.inactive : CONNECTOR_ALPHA.active;
  
  // Center connector always renders as a dot
  renderDot(graphics, x, y, color, CENTER_DOT_RADIUS, isHovered ? alpha : alpha * 0.6, centerState === 'inactive', isHovered);
}

/**
 * Render a simple colored dot
 */
function renderDot(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  color: number,
  radius: number,
  alpha: number,
  isInactive: boolean,
  isHovered: boolean
): void {
  // Draw outline (always white/black for visibility)
  graphics.lineStyle({
    width: OUTLINE_WIDTH,
    color: isInactive ? 0x000000 : 0xFFFFFF,
    alpha: isHovered ? 1.0 : 0.6,
  });
  
  // Draw fill
  graphics.beginFill(color, alpha);
  graphics.drawCircle(x, y, radius);
  graphics.endFill();
}

/**
 * Render a chevron (>) pointing in a direction
 */
function renderChevron(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  angle: number, // radians, 0 = east
  color: number,
  alpha: number,
  isHovered: boolean
): void {
  const size = 18;  // Much larger chevron
  const thickness = 5;  // Thicker lines
  
  // Calculate chevron points (pointing right by default)
  // Chevron shape: >
  const points = [
    { x: -size/2, y: -size/2 }, // top left
    { x: size/2, y: 0 },        // right point
    { x: -size/2, y: size/2 },  // bottom left
  ];
  
  // Rotate and translate points
  const rotatedPoints = points.map(p => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: x + (p.x * cos - p.y * sin),
      y: y + (p.x * sin + p.y * cos)
    };
  });
  
  // Draw chevron outline
  graphics.lineStyle({
    width: thickness,
    color: color,
    alpha: alpha,
    cap: PIXI.LINE_CAP.ROUND,
    join: PIXI.LINE_JOIN.ROUND,
  });
  
  graphics.moveTo(rotatedPoints[0].x, rotatedPoints[0].y);
  graphics.lineTo(rotatedPoints[1].x, rotatedPoints[1].y);
  graphics.lineTo(rotatedPoints[2].x, rotatedPoints[2].y);
}

/**
 * Get angle for edge direction (in radians)
 * 0 = east, π/2 = south, π = west, 3π/2 = north
 */
function getEdgeAngle(edge: EdgeDirection): number {
  const angles: Record<EdgeDirection, number> = {
    'e': 0,                    // East
    'se': Math.PI / 3,         // Southeast (60°)
    'sw': 2 * Math.PI / 3,     // Southwest (120°)
    'w': Math.PI,              // West (180°)
    'nw': 4 * Math.PI / 3,     // Northwest (240°)
    'ne': 5 * Math.PI / 3,     // Northeast (300°)
  };
  return angles[edge];
}

/**
 * Get connector state at a specific position
 * Used for click detection
 * 
 * @param hexI - Hex row coordinate
 * @param hexJ - Hex column coordinate
 * @param clickPos - Click position {x, y}
 * @param canvas - Foundry canvas object
 * @returns { edge: EdgeDirection, state: ConnectorState } or { center: true, state: CenterConnectorState } or null
 */
export function getConnectorAtPosition(
  hexI: number,
  hexJ: number,
  clickPos: { x: number; y: number },
  canvas: any
): { edge: EdgeDirection; state: ConnectorState } | { center: true; state: CenterConnectorState } | null {
  const CLICK_THRESHOLD = 15; // pixels

  // Check center first (larger click target)
  const centerPos = getHexCenter(hexI, hexJ, canvas);
  if (centerPos) {
    const dx = clickPos.x - centerPos.x;
    const dy = clickPos.y - centerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= CLICK_THRESHOLD) {
      // Get current state from kingdom data
      const kingdom = getKingdomData();
      const hexId = `${hexI}.${hexJ}`;
      const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
      const riverFeature = hex?.features?.find((f: any) => f.type === 'river');
      
      let centerState: CenterConnectorState = 'inactive';
      if (riverFeature?.segments) {
        for (const segment of riverFeature.segments) {
          if (segment.centerConnector) {
            centerState = segment.centerConnector.state;
            break;
          }
        }
      }
      
      return { center: true, state: centerState };
    }
  }

  // Check edge connectors using canonical edge IDs
  const kingdom = getKingdomData();
  const edges = getAllEdges();
  
  for (const edge of edges) {
    const position = getEdgeMidpoint(hexI, hexJ, edge, canvas);
    if (!position) continue;

    const dx = clickPos.x - position.x;
    const dy = clickPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= CLICK_THRESHOLD) {
      // Convert edge name to proper direction index (0-5)
      const edgeIndex = edgeNameToIndex(edge);
      
      // Look up state from canonical edge map
      const edgeId = getEdgeIdForDirection(hexI, hexJ, edgeIndex, canvas);
      const edgeData = kingdom.rivers?.edges?.[edgeId];
      const edgeState: ConnectorState = edgeData?.state || 'inactive';
      
      return { edge, state: edgeState };
    }
  }

  return null;
}
