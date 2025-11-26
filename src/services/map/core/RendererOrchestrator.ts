/**
 * RendererOrchestrator - Coordinates renderer calls with consistent layer management
 * 
 * Provides a standardized pattern for rendering overlays:
 * 1. Validate layer is empty
 * 2. Clear layer content
 * 3. Create layer with appropriate z-index
 * 4. Delegate to specialized renderer
 * 5. Show layer after drawing
 * 
 * All overlay rendering methods follow this pattern for consistency.
 */

import type { LayerId } from '../types';
import { renderTerrainOverlay } from '../renderers/TerrainRenderer';
import { renderTerrainDifficultyOverlay } from '../renderers/TerrainDifficultyRenderer';
import { renderRoadConnections } from '../renderers/RoadRenderer';
import { renderWorksiteIcons } from '../renderers/WorksiteRenderer';
import { renderResourceIcons } from '../renderers/ResourceRenderer';
import { renderSettlementIcons } from '../renderers/SettlementIconRenderer';
import { generateTerritoryOutline } from '../utils/TerritoryOutline';
import { TERRITORY_BORDER_COLORS } from '../../../view/kingdom/utils/presentation';
import { logger } from '../../../utils/Logger';

/**
 * Context object passed to renderer methods
 * Provides access to layer management and drawing utilities
 */
export interface RendererContext {
  validateLayerEmpty: (id: LayerId) => boolean;
  clearLayerContent: (id: LayerId) => void;
  createLayer: (id: LayerId, zIndex: number) => PIXI.Container;
  showLayer: (id: LayerId) => void;
  drawSingleHex: (graphics: PIXI.Graphics, hexId: string, style: any, canvas: any) => boolean;
  canvas: any;
}

/**
 * Renderer orchestrator
 * Coordinates all renderer calls with consistent layer management
 */
export class RendererOrchestrator {
  /**
   * Draw terrain overlay for hexes with terrain type data
   * Colors hexes based on terrain type (forest, plains, mountains, etc.)
   */
  drawTerrainOverlay(
    hexData: Array<{ id: string; terrain: string }>,
    ctx: RendererContext
  ): void {
    const layerId: LayerId = 'terrain-overlay';
    
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 5);
    
    // Delegate to renderer
    renderTerrainOverlay(layer, hexData, ctx.canvas, ctx.drawSingleHex);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw terrain difficulty overlay for hexes with terrain type data
   * Colors hexes based on travel difficulty (green, yellow, crimson)
   */
  drawTerrainDifficultyOverlay(
    hexData: Array<{ id: string; terrain: string }>,
    ctx: RendererContext
  ): void {
    const layerId: LayerId = 'terrain-difficulty-overlay';
    
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 5); // Same z-index as terrain overlay (they're never shown together)
    
    // Delegate to renderer
    renderTerrainDifficultyOverlay(layer, hexData, ctx.canvas, ctx.drawSingleHex);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw territory outline around claimed hexes
   * Creates a polygonal border around the kingdom territory
   */
  drawTerritoryOutline(
    hexIds: string[],
    ctx: RendererContext,
    layerId: LayerId = 'kingdom-territory-outline'
  ): void {
    if (!ctx.canvas?.grid) {
      logger.warn('[RendererOrchestrator] ❌ Canvas grid not available');
      return;
    }

    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 10); // Higher zIndex to render above territory

    // Generate outline paths
    const outlineResult = generateTerritoryOutline(hexIds);
    
    if (outlineResult.outlines.length === 0) {
      logger.warn('[RendererOrchestrator] ⚠️ No outline paths generated');
      return;
    }

    // Create graphics object for the outline
    const graphics = new PIXI.Graphics();
    graphics.name = 'TerritoryOutline';
    graphics.visible = true;

    // Draw outline with single pass - thick bright blue border
    graphics.lineStyle({
      width: 16,
      color: TERRITORY_BORDER_COLORS.outline,
      alpha: TERRITORY_BORDER_COLORS.outlineAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });

    outlineResult.outlines.forEach((path, pathIndex) => {
      if (path.length === 0) return;

      graphics.moveTo(path[0].start.x, path[0].start.y);

      for (const segment of path) {
        graphics.lineTo(segment.end.x, segment.end.y);
      }

      const firstPoint = path[0].start;
      const lastPoint = path[path.length - 1].end;
      const tolerance = 0.1;
      const isLoop = Math.abs(firstPoint.x - lastPoint.x) < tolerance && 
                     Math.abs(firstPoint.y - lastPoint.y) < tolerance;
      
      if (isLoop) {
        graphics.closePath();
      }
    });

    layer.addChild(graphics);
    ctx.showLayer(layerId);
  }

  /**
   * Draw road connections between adjacent hexes with roads
   * Creates a network of lines connecting road hexes
   */
  async drawRoadConnections(
    roadHexIds: string[],
    ctx: RendererContext,
    layerId: LayerId = 'routes'
  ): Promise<void> {
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 40);
    
    // Delegate to renderer
    await renderRoadConnections(layer, roadHexIds, ctx.canvas);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw water/river connections between adjacent water hexes
   * Creates a network of blue lines connecting water hexes
   */
  async drawWaterConnections(
    ctx: RendererContext,
    layerId: LayerId = 'water',
    activePathId?: string | null
  ): Promise<void> {
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 41); // Just above roads (40)
    
    // Delegate to renderer
    const { renderWaterConnections } = await import('../renderers/WaterRenderer');
    await renderWaterConnections(layer, ctx.canvas, activePathId);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw worksite icons on hexes
   * Places icon sprites at hex centers based on worksite type
   */
  async drawWorksiteIcons(
    worksiteData: Array<{ id: string; worksiteType: string }>,
    ctx: RendererContext
  ): Promise<void> {
    const layerId: LayerId = 'worksites';
    
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 45);
    
    // Delegate to renderer
    await renderWorksiteIcons(layer, worksiteData, ctx.canvas);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw resource/commodity bounty icons on hexes
   * Places commodity icon sprites at hex centers based on hex.commodities data
   */
  async drawResourceIcons(
    bountyData: Array<{ id: string; commodities: Record<string, number> }>,
    ctx: RendererContext
  ): Promise<void> {
    const layerId: LayerId = 'resources';
    
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 45);
    
    // Delegate to renderer
    await renderResourceIcons(layer, bountyData, ctx.canvas);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw settlement tier icons on hexes
   * Places tier-specific icon sprites at hex centers (village, town, city, metropolis)
   */
  async drawSettlementIcons(
    settlementData: Array<{ id: string; tier: string }>,
    ctx: RendererContext
  ): Promise<void> {
    const layerId: LayerId = 'settlement-icons';
    
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 50);
    
    // Delegate to renderer
    await renderSettlementIcons(layer, settlementData, ctx.canvas);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw settlement name labels on hexes
   * Places text labels below settlement icons with background panels
   */
  async drawSettlementLabels(
    settlementData: Array<{ id: string; name: string; tier: string }>,
    ctx: RendererContext
  ): Promise<void> {
    const layerId: LayerId = 'settlement-labels';
    
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 51); // Above settlement icons (50)
    
    // Delegate to renderer
    const { renderSettlementLabels } = await import('../renderers/SettlementLabelRenderer');
    await renderSettlementLabels(layer, settlementData, ctx.canvas);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }

  /**
   * Draw fortification icons on hexes
   * Places fortification icon sprites at hex centers based on tier
   * Shows red border for unpaid maintenance
   */
  async drawFortificationIcons(
    fortificationData: Array<{ id: string; tier: number; maintenancePaid: boolean }>,
    ctx: RendererContext
  ): Promise<void> {
    const layerId: LayerId = 'fortifications';
    
    // Validate and clear content
    ctx.validateLayerEmpty(layerId);
    ctx.clearLayerContent(layerId);
    
    const layer = ctx.createLayer(layerId, 48); // Between settlement icons (50) and worksites (45)
    
    // Import and delegate to renderer
    const { renderFortificationIcons } = await import('../renderers/FortificationRenderer');
    await renderFortificationIcons(layer, fortificationData, ctx.canvas);
    
    // Show layer after drawing
    ctx.showLayer(layerId);
  }
}
