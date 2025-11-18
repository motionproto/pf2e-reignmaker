/**
 * RoadRenderer - Renders road connections between adjacent hexes
 */

import { getKingdomActor } from '../../../main.kingdom';
import type { KingdomData } from '../../../actors/KingdomActor';
import { isWaterTerrain } from '../../../types/terrain';
import { ROAD_COLORS } from '../../../view/kingdom/utils/presentation';
import { logger } from '../../../utils/Logger';
import { getAdjacentHexes } from '../../../utils/hexUtils';

/**
 * Normalize hex ID format (remove leading zeros for consistent matching)
 * "5.08" -> "5.8", "50.18" -> "50.18"
 */
function normalizeHexId(hexId: string): string {
  const parts = hexId.split('.');
  if (parts.length !== 2) return hexId;
  
  const i = parseInt(parts[0], 10);
  const j = parseInt(parts[1], 10);
  
  if (isNaN(i) || isNaN(j)) return hexId;
  
  return `${i}.${j}`;
}

/**
 * Draw road connections between adjacent hexes with roads
 * Creates a network of lines connecting road hexes
 * Water hexes automatically count as roads with special styling
 * 
 * @param layer - PIXI container to add graphics to
 * @param roadHexIds - Array of hex IDs with roads
 * @param canvas - Foundry canvas object
 */
export async function renderRoadConnections(
  layer: PIXI.Container,
  roadHexIds: string[],
  canvas: any
): Promise<void> {

  if (!canvas?.grid) {
    logger.warn('[RoadRenderer] ❌ Canvas grid not available');
    return;
  }

  // Get kingdom data to check for water hexes
  const kingdomActor = await getKingdomActor();
  const kingdom = kingdomActor?.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
  
  // Build water hex set for quick lookup
  const waterHexSet = new Set<string>();
  if (kingdom?.hexes) {
    kingdom.hexes.forEach(hex => {
      if (isWaterTerrain(hex.terrain)) {
        waterHexSet.add(normalizeHexId(hex.id));
      }
    });
  }

  // DO NOT include water hexes - they are now handled by WaterRenderer
  // Only process actual road hexes (land roads)
  const normalizedRoadHexIds = roadHexIds.map(id => normalizeHexId(id));
  const roadHexSet = new Set(normalizedRoadHexIds);


  // Graphics object for drawing lines
  const graphics = new PIXI.Graphics();
  graphics.name = 'RoadConnections';
  graphics.visible = true;

  // Track connections we've already drawn (to avoid duplicates)
  const drawnConnections = new Set<string>();

  let connectionCount = 0;

  // Get blocked connections from kingdom data
  const blockedConnections = kingdom?.roads?.blockedConnections || [];

  // Store land road segments only
  const landRoadSegments: Array<Array<{x: number, y: number}>> = [];
  
  roadHexIds.forEach(hexId => {
    try {
      const parts = hexId.split('.');
      if (parts.length !== 2) return;

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      if (isNaN(i) || isNaN(j)) return;

      const hexCenter = canvas.grid.getCenterPoint({i, j});
      
      // Get neighbors using shared utility
      const neighbors = getAdjacentHexes(i, j);

      const normalizedHexId = normalizeHexId(hexId);

      neighbors.forEach((neighbor) => {
        // Convert to hex ID format
        const neighborI = neighbor.i;
        const neighborJ = neighbor.j;
        const neighborId = `${neighborI}.${neighborJ}`;

        if (!roadHexSet.has(neighborId)) return;

        const connectionId = [normalizedHexId, neighborId].sort().join('|');
        if (drawnConnections.has(connectionId)) return;

        // Check if this connection is blocked (scissor tool)
        const isBlocked = blockedConnections.some(conn => 
          (conn.hex1 === normalizedHexId && conn.hex2 === neighborId) ||
          (conn.hex1 === neighborId && conn.hex2 === normalizedHexId)
        );
        if (isBlocked) {
          logger.info(`[RoadRenderer] ✂️ Skipping blocked connection: ${normalizedHexId} <-> ${neighborId}`);
          return;
        }

        drawnConnections.add(connectionId);

        const neighborCenter = canvas.grid.getCenterPoint({i: neighborI, j: neighborJ});

        // Calculate Bezier curve control point
        const midX = (hexCenter.x + neighborCenter.x) / 2;
        const midY = (hexCenter.y + neighborCenter.y) / 2;
        const dx = neighborCenter.x - hexCenter.x;
        const dy = neighborCenter.y - hexCenter.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length;
        const perpY = dx / length;
        const curveOffset = 20;
        const controlX = midX + perpX * curveOffset;
        const controlY = midY + perpY * curveOffset;
        
        // Sample curve points
        const segments = 10;
        const points: Array<{x: number, y: number}> = [];
        for (let t = 0; t <= segments; t++) {
          const u = t / segments;
          const x = Math.pow(1 - u, 2) * hexCenter.x +
                   2 * (1 - u) * u * controlX +
                   Math.pow(u, 2) * neighborCenter.x;
          const y = Math.pow(1 - u, 2) * hexCenter.y +
                   2 * (1 - u) * u * controlY +
                   Math.pow(u, 2) * neighborCenter.y;
          points.push({x, y});
        }
        
        // Add to land road segments
        landRoadSegments.push(points);
        connectionCount++;
      });
    } catch (error) {
      logger.error(`[RoadRenderer] Failed to process hex ${hexId}:`, error);
    }
  });
  
  // Get road width from settings (borders are 4 pixels wider)
  // @ts-ignore - Foundry globals
  const roadWidth = game.settings?.get('pf2e-reignmaker', 'roadWidth') as number || 20;
  const borderWidth = roadWidth + 4;
  
  // PASS 1: Draw land road borders (black)
  if (landRoadSegments.length > 0) {
    graphics.lineStyle({
      width: borderWidth,
      color: ROAD_COLORS.roadBorder,
      alpha: ROAD_COLORS.roadBorderAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    landRoadSegments.forEach(points => {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    });
  }
  
  // PASS 2: Draw land roads (brown) on top of borders
  if (landRoadSegments.length > 0) {
    graphics.lineStyle({
      width: roadWidth,
      color: ROAD_COLORS.landRoad,
      alpha: ROAD_COLORS.landRoadAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    landRoadSegments.forEach(points => {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    });
  }

  layer.addChild(graphics);

  if (connectionCount === 0) {
    logger.warn('[RoadRenderer] ⚠️ No road connections drawn - check that hex IDs match neighbor format');
  }
}
