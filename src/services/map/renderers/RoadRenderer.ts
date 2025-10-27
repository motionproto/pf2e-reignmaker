/**
 * RoadRenderer - Renders road connections between adjacent hexes
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

  // Combine road hexes with water hexes (water = automatic roads)
  const allRoadHexIds = [...roadHexIds];
  waterHexSet.forEach(waterHexId => {
    if (!allRoadHexIds.includes(waterHexId)) {
      allRoadHexIds.push(waterHexId);
    }
  });

  // Normalize all road hex IDs for consistent matching
  const normalizedRoadHexIds = allRoadHexIds.map(id => normalizeHexId(id));
  const roadHexSet = new Set(normalizedRoadHexIds);


  // Graphics object for drawing lines
  const graphics = new PIXI.Graphics();
  graphics.name = 'RoadConnections';
  graphics.visible = true;

  // Track connections we've already drawn (to avoid duplicates)
  const drawnConnections = new Set<string>();

  const GridHex = (globalThis as any).foundry.grid.GridHex;
  let connectionCount = 0;

  // Store road segments by type (land roads vs water roads)
  const landRoadSegments: Array<Array<{x: number, y: number}>> = [];
  const waterRoadSegments: Array<Array<{x: number, y: number}>> = [];
  
  allRoadHexIds.forEach(hexId => {
    try {
      const parts = hexId.split('.');
      if (parts.length !== 2) return;

      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      if (isNaN(i) || isNaN(j)) return;

      const hex = new GridHex({i, j}, canvas.grid);
      const hexCenter = hex.center;
      const neighbors: any[] = hex.getNeighbors();

      // Check if this hex is water
      const normalizedHexId = normalizeHexId(hexId);
      const isWater = waterHexSet.has(normalizedHexId);

      neighbors.forEach((neighbor: any) => {
        const neighborI = neighbor.offset.i;
        const neighborJ = neighbor.offset.j;
        const neighborId = `${neighborI}.${neighborJ}`;

        if (!roadHexSet.has(neighborId)) return;

        const connectionId = [normalizedHexId, neighborId].sort().join('|');
        if (drawnConnections.has(connectionId)) return;

        drawnConnections.add(connectionId);

        // Check if neighbor is water
        const isNeighborWater = waterHexSet.has(neighborId);
        const isWaterConnection = isWater || isNeighborWater;

        const neighborCenter = neighbor.center;

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
        
        // Add to appropriate segment list
        if (isWaterConnection) {
          waterRoadSegments.push(points);
        } else {
          landRoadSegments.push(points);
        }
        connectionCount++;
      });
    } catch (error) {
      logger.error(`[RoadRenderer] Failed to process hex ${hexId}:`, error);
    }
  });
  
  // Get road width from settings (borders are 4 pixels wider)
  // @ts-ignore - Foundry globals
  const roadWidth = game.settings?.get('pf2e-reignmaker', 'roadWidth') as number || 32;
  const borderWidth = roadWidth + 4;
  
  // Water roads are half width
  const waterRoadWidth = roadWidth / 2;
  const waterBorderWidth = waterRoadWidth + 2;
  
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
  
  // PASS 2: Draw water road borders (darker blue)
  if (waterRoadSegments.length > 0) {
    graphics.lineStyle({
      width: waterBorderWidth,
      color: ROAD_COLORS.waterBorder,
      alpha: ROAD_COLORS.waterBorderAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    waterRoadSegments.forEach(points => {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    });
  }
  
  // PASS 3: Draw land roads (brown) on top of borders
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
  
  // PASS 4: Draw water roads (light blue) on top of borders
  if (waterRoadSegments.length > 0) {
    graphics.lineStyle({
      width: waterRoadWidth,
      color: ROAD_COLORS.waterRoad,
      alpha: ROAD_COLORS.waterRoadAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    waterRoadSegments.forEach(points => {
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
