/**
 * WaterRenderer - Renders water and river connections between adjacent hexes
 * Separated from RoadRenderer to allow independent overlay control
 */

import { getKingdomActor } from '../../../main.kingdom';
import type { KingdomData } from '../../../actors/KingdomActor';
import { isWaterTerrain } from '../../../types/terrain';
import { ROAD_COLORS } from '../../../view/kingdom/utils/presentation';
import { logger } from '../../../utils/Logger';

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
 * Draw water/river connections between adjacent water hexes
 * Creates a network of blue lines connecting water hexes
 * 
 * @param layer - PIXI container to add graphics to
 * @param canvas - Foundry canvas object
 */
export async function renderWaterConnections(
  layer: PIXI.Container,
  canvas: any
): Promise<void> {

  if (!canvas?.grid) {
    logger.warn('[WaterRenderer] ❌ Canvas grid not available');
    return;
  }

  // Get kingdom data to find water hexes
  const kingdomActor = await getKingdomActor();
  const kingdom = kingdomActor?.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
  
  // Build water hex set
  const waterHexIds: string[] = [];
  if (kingdom?.hexes) {
    kingdom.hexes.forEach(hex => {
      if (isWaterTerrain(hex.terrain)) {
        waterHexIds.push(hex.id);
      }
    });
  }

  if (waterHexIds.length === 0) {
    logger.info('[WaterRenderer] No water hexes found');
    return;
  }

  // Normalize all water hex IDs for consistent matching
  const normalizedWaterHexIds = waterHexIds.map(id => normalizeHexId(id));
  const waterHexSet = new Set(normalizedWaterHexIds);

  logger.info(`[WaterRenderer] Drawing connections for ${waterHexIds.length} water hexes`);

  // Graphics object for drawing lines
  const graphics = new PIXI.Graphics();
  graphics.name = 'WaterConnections';
  graphics.visible = true;

  // Track connections we've already drawn (to avoid duplicates)
  const drawnConnections = new Set<string>();

  let connectionCount = 0;

  // Store water segments
  const waterSegments: Array<Array<{x: number, y: number}>> = [];
  
  waterHexIds.forEach(hexId => {
    try {
      const parts = hexId.split('.');
      if (parts.length !== 2) return;

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      if (isNaN(i) || isNaN(j)) return;

      const hexCenter = canvas.grid.getCenterPoint({i, j});
      
      // Get neighbors directly from grid API (Foundry v13+)
      const neighbors = canvas.grid.getNeighbors(i, j);

      const normalizedHexId = normalizeHexId(hexId);

      neighbors.forEach((neighbor: any) => {
        // Foundry returns [i, j] arrays, not {i, j} objects
        const neighborI = neighbor[0];
        const neighborJ = neighbor[1];
        const neighborId = `${neighborI}.${neighborJ}`;

        // Only connect to other water hexes
        if (!waterHexSet.has(neighborId)) return;

        const connectionId = [normalizedHexId, neighborId].sort().join('|');
        if (drawnConnections.has(connectionId)) return;

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
        
        waterSegments.push(points);
        connectionCount++;
      });
    } catch (error) {
      logger.error(`[WaterRenderer] Failed to process hex ${hexId}:`, error);
    }
  });
  
  // Get road width from settings (use same width as roads)
  // @ts-ignore - Foundry globals
  const roadWidth = game.settings?.get('pf2e-reignmaker', 'roadWidth') as number || 32;
  const waterRoadWidth = roadWidth / 2;
  const waterBorderWidth = waterRoadWidth + 2;
  
  // PASS 1: Draw water borders (darker blue)
  if (waterSegments.length > 0) {
    graphics.lineStyle({
      width: waterBorderWidth,
      color: ROAD_COLORS.waterBorder,
      alpha: ROAD_COLORS.waterBorderAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    waterSegments.forEach(points => {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    });
  }
  
  // PASS 2: Draw water (light blue) on top of borders
  if (waterSegments.length > 0) {
    graphics.lineStyle({
      width: waterRoadWidth,
      color: ROAD_COLORS.waterRoad,
      alpha: ROAD_COLORS.waterRoadAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    waterSegments.forEach(points => {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    });
  }

  layer.addChild(graphics);
  logger.info(`[WaterRenderer] ✅ Drew ${connectionCount} water connections`);

  if (connectionCount === 0) {
    logger.warn('[WaterRenderer] ⚠️ No water connections drawn - check that hex IDs match neighbor format');
  }
}
