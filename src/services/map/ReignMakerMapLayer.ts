/**
 * ReignMakerMapLayer - Core PIXI canvas layer manager
 * 
 * Responsibilities:
 * - PIXI container lifecycle (init, destroy, visibility)
 * - Layer creation and management (z-index, clearing)
 * - Generic hex drawing utilities
 * - Coordination of renderers and toolbar
 * 
 * Rendering is delegated to specialized modules in ./renderers/
 */

import { getKingdomActor } from '../../main.kingdom';
import { PLAYER_KINGDOM } from '../../types/ownership';
import type { KingdomData } from '../../actors/KingdomActor';
import type { LayerId, HexStyle, MapLayer } from './types';
import { DEFAULT_HEX_STYLES, WORKSITE_ICONS } from './types';
import { TERRITORY_BORDER_COLORS } from '../../view/kingdom/utils/presentation';
import type { SvelteComponent } from 'svelte';
import { generateTerritoryOutline } from './TerritoryOutline';
import { isWaterTerrain } from '../../types/terrain';
import { ToolbarManager } from './ToolbarManager';
import { renderTerrainOverlay } from './renderers/TerrainRenderer';
import { renderTerrainDifficultyOverlay } from './renderers/TerrainDifficultyRenderer';
import { renderTerritoryOutline } from './renderers/TerritoryRenderer';
import { renderRoadConnections } from './renderers/RoadRenderer';
import { renderWorksiteIcons } from './renderers/WorksiteRenderer';
import { renderResourceIcons } from './renderers/ResourceRenderer';
import { renderSettlementIcons } from './renderers/SettlementIconRenderer';
import { logger } from '../../utils/Logger';

/**
 * Main map layer service (Singleton)
 * 
 * VISIBILITY MODEL:
 * 
 * Container (this.container):
 *   - Master on/off switch via scene control (rook button)
 *   - visible=false hides ALL layers regardless of individual layer.visible state
 *   - Controlled by: handleSceneControlToggle()
 *   - PIXI respects display tree: child layers invisible when parent hidden
 * 
 * Layers (individual PIXI.Container children):
 *   - Controlled by: showLayer() / hideLayer()
 *   - State persists when container toggles off/on
 *   - Only visible when BOTH layer.visible=true AND container.visible=true
 *   - Managed by toolbar overlays (territories, roads, settlements, etc.)
 * 
 * Interactive Layers (hover, selection):
 *   - Temporary - cleared after actions complete
 *   - NOT controlled by toolbar
 *   - Used during hex selection workflows
 *   - Must be explicitly cleared via clearSelection() / hideInteractiveHover()
 * 
 * LAYER LIFECYCLE:
 *   1. createLayer() - Singleton pattern, reuses existing layers
 *   2. drawSomething() - Renders content into layer
 *   3. showLayer() - Makes layer visible (if container also visible)
 *   4. clearLayerContent() - Removes graphics, preserves visibility state
 *   5. clearLayer() - Removes graphics AND hides layer
 */
export class ReignMakerMapLayer {
  private static instance: ReignMakerMapLayer | null = null;
  private container: PIXI.Container | null = null;
  private layers: Map<LayerId, MapLayer> = new Map();
  private initialized: boolean = false;
  private toolbarManager: ToolbarManager = new ToolbarManager();
  private toggleState: boolean = false; // Scene control toggle state

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ReignMakerMapLayer {
    if (!ReignMakerMapLayer.instance) {
      ReignMakerMapLayer.instance = new ReignMakerMapLayer();
    }
    return ReignMakerMapLayer.instance;
  }

  /**
   * Initialize the main container (called on first use)
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    const canvas = (globalThis as any).canvas;
    if (!canvas?.ready) {
      logger.warn('[ReignMakerMapLayer] Canvas not ready');
      return;
    }

    // Create main container
    this.container = new PIXI.Container();
    this.container.name = 'ReignMakerMapLayer';
    this.container.sortableChildren = true;
    // Start hidden - only show when toggle is turned ON
    this.container.visible = false;

    // Add to canvas.primary (Foundry v13 world-space group)
    // PrimaryCanvasGroup contains physical objects that pan/zoom with the scene
    const primaryGroup = canvas.primary;
    if (primaryGroup) {
      primaryGroup.addChild(this.container);


    } else {
      logger.error('[ReignMakerMapLayer] ❌ canvas.primary not found!');
      return;
    }

    this.initialized = true;
  }

  /**
   * Create or get a layer by ID (SINGLETON PATTERN)
   * 
   * If a layer with this ID already exists, returns the existing layer.
   * This prevents duplicate layer containers and ensures proper lifecycle management.
   * 
   * @param id - Unique layer identifier
   * @param zIndex - Z-index for rendering order (only used when creating new layer)
   * @returns The layer's PIXI container
   */
  createLayer(id: LayerId, zIndex: number = 0): PIXI.Container {
    this.ensureInitialized();

    // SINGLETON: Return existing layer if it already exists
    if (this.layers.has(id)) {
      const existingLayer = this.layers.get(id)!;

      // Update z-index if different (allows re-ordering)
      if (existingLayer.zIndex !== zIndex && zIndex !== 0) {

        existingLayer.container.zIndex = zIndex;
        existingLayer.zIndex = zIndex;
      }
      
      return existingLayer.container;
    }

    // Create new layer
    const layerContainer = new PIXI.Container();
    layerContainer.name = `Layer_${id}`;
    layerContainer.zIndex = zIndex;
    layerContainer.visible = true; // Explicitly set visible

    const layer: MapLayer = {
      id,
      container: layerContainer,
      visible: true,
      zIndex
    };

    this.layers.set(id, layer);
    this.container?.addChild(layerContainer);

    return layerContainer;
  }

  /**
   * Get an existing layer
   */
  getLayer(id: LayerId): PIXI.Container | undefined {
    return this.layers.get(id)?.container;
  }

  /**
   * Remove a layer completely
   */
  removeLayer(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      this.container?.removeChild(layer.container);
      layer.container.destroy({ children: true });
      this.layers.delete(id);

    }
  }

  /**
   * Clear content from a layer (remove graphics but keep visibility state)
   * Use this when you want to redraw a layer without changing its visibility
   * Creates the layer if it doesn't exist yet
   */
  clearLayerContent(id: LayerId): void {
    // Ensure layer exists (create if needed)
    let layer = this.layers.get(id);
    if (!layer) {
      // Create empty layer with default z-index
      const zIndex = this.getDefaultZIndex(id);
      this.createLayer(id, zIndex);
      return; // Layer is already empty, nothing to clear
    }
    
    const childCount = layer.container.children.length;
    
    // Clear and destroy all children
    layer.container.removeChildren().forEach(child => {
      // If it's a Graphics object, clear it first
      if (child instanceof PIXI.Graphics) {
        child.clear();
      }
      child.destroy({ children: true, texture: false, baseTexture: false });
    });
    
    if (childCount > 0) {

    }
  }

  /**
   * Clear all content from a layer AND hide it
   * Use this when you want to completely remove a layer from view
   */
  clearLayer(id: LayerId): void {
    this.clearLayerContent(id);
    this.hideLayer(id);

  }

  /**
   * Clear territory-related layers (territory fill + outline)
   * These should always be cleared together to prevent orphaned graphics
   */
  clearTerritoryLayers(): void {

    this.clearLayer('kingdom-territory');
    this.clearLayer('kingdom-territory-outline');
    this.hideLayer('kingdom-territory');
    this.hideLayer('kingdom-territory-outline');
  }

  /**
   * Clear road layer (routes only - roads-overlay is deprecated)
   */
  clearRoadLayers(): void {

    this.clearLayer('routes');
    this.hideLayer('routes');
  }

  /**
   * Show a layer
   */
  showLayer(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.container.visible = true;
      layer.visible = true;
    }
  }

  /**
   * Hide a layer
   */
  hideLayer(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.container.visible = false;
      layer.visible = false;
    }
  }

  /**
   * Clear all layers and reset the map
   */
  clearAllLayers(): void {


    this.layers.forEach((layer, id) => {

      // Clear and destroy all children
      layer.container.removeChildren().forEach(child => {
        // If it's a Graphics object, clear it first to remove all drawing commands
        if (child instanceof PIXI.Graphics) {

          child.clear();
        }
        child.destroy({ children: true, texture: false, baseTexture: false });
      });
      
      // Hide the layer
      layer.container.visible = false;
      layer.visible = false;

    });

  }

  /**
   * Draw multiple hexes with the same style
   */
  drawHexes(hexIds: string[], style: HexStyle, layerId: LayerId = 'hex-selection', zIndex?: number): void {

    this.ensureInitialized();
    
    // Validate layer is empty (detect leftover artifacts)
    this.validateLayerEmpty(layerId);
    
    // Clear content only (preserve visibility state for now)
    this.clearLayerContent(layerId);
    
    // Determine z-index based on layer type if not explicitly provided
    const layerZIndex = zIndex ?? this.getDefaultZIndex(layerId);
    const layer = this.createLayer(layerId, layerZIndex);

    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[ReignMakerMapLayer] ❌ Canvas grid not available');
      return;
    }

    const graphics = new PIXI.Graphics();
    graphics.name = 'HexGroup';
    graphics.visible = true;

    let successCount = 0;
    hexIds.forEach(hexId => {
      const drawn = this.drawSingleHex(graphics, hexId, style, canvas);
      if (drawn) successCount++;
    });

    layer.addChild(graphics);
    
    // PHASE 1 FIX: Always show layer after drawing (consistency with other draw methods)
    this.showLayer(layerId);

  }

  /**
   * Draw a single hex
   */
  drawHex(hexId: string, style: HexStyle, layerId: LayerId = 'hex-selection'): void {
    this.ensureInitialized();
    const layer = this.createLayer(layerId);

    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[ReignMakerMapLayer] Canvas grid not available');
      return;
    }

    const graphics = new PIXI.Graphics();
    graphics.name = `Hex_${hexId}`;

    this.drawSingleHex(graphics, hexId, style, canvas);
    layer.addChild(graphics);
  }

  /**
   * Internal: Draw a single hex to a graphics object
   * @returns true if hex was drawn successfully
   */
  private drawSingleHex(graphics: PIXI.Graphics, hexId: string, style: HexStyle, canvas: any): boolean {
    try {
      // Parse dot notation: "50.18" -> {i: 50, j: 18}
      const parts = hexId.split('.');
      if (parts.length !== 2) {
        logger.warn(`[ReignMakerMapLayer] ⚠️ Invalid hex ID format: ${hexId}`);
        return false;
      }
      
      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        logger.warn(`[ReignMakerMapLayer] ⚠️ Invalid hex coordinates: ${hexId}`);
        return false;
      }
      
      // Get hex center using Foundry's official API
      const center = canvas.grid.getCenterPoint({i, j});
      
      // Use GridHex class for vertex calculation
      const GridHex = (globalThis as any).foundry.grid.GridHex;
      const hex = new GridHex({i, j}, canvas.grid);
      
      // Get vertices in grid-relative coordinates
      // getShape() returns vertices relative to (0,0), not world coordinates!
      const relativeVertices = canvas.grid.getShape(hex.offset);
      
      if (!relativeVertices || relativeVertices.length === 0) {
        logger.warn(`[ReignMakerMapLayer] ⚠️ No vertices for hex ${hexId} (i:${i}, j:${j})`);
        return false;
      }
      
      // Apply scaling factor to fix slight gaps between hexes
      const scale = (canvas.grid.sizeY + 2) / canvas.grid.sizeY;
      
      // Translate vertices to world coordinates by adding to hex center
      const worldVertices = relativeVertices.map((v: any) => ({
        x: center.x + (v.x * scale),
        y: center.y + (v.y * scale)
      }));
      
      // Draw fill
      graphics.beginFill(style.fillColor, style.fillAlpha);
      graphics.drawPolygon(worldVertices.flatMap((v: any) => [v.x, v.y]));
      graphics.endFill();
      
      // Draw border if specified
      if (style.borderWidth && style.borderWidth > 0) {
        const borderColor = style.borderColor ?? style.fillColor;
        const borderAlpha = style.borderAlpha ?? 1.0;
        graphics.lineStyle(style.borderWidth, borderColor, borderAlpha);
        graphics.drawPolygon(worldVertices.flatMap((v: any) => [v.x, v.y]));
      }
      
      return true;
    } catch (error) {
      logger.error(`[ReignMakerMapLayer] ❌ Failed to draw hex ${hexId}:`, error);
      return false;
    }
  }

  /**
   * Normalize hex ID format (remove leading zeros for consistent matching)
   * \"5.08\" -> \"5.8\", \"50.18\" -> \"50.18\"
   */
  private normalizeHexId(hexId: string): string {
    const parts = hexId.split('.');
    if (parts.length !== 2) return hexId;
    
    const i = parseInt(parts[0], 10);
    const j = parseInt(parts[1], 10);
    
    if (isNaN(i) || isNaN(j)) return hexId;
    
    return `${i}.${j}`;
  }

  /**
   * Validate that a layer is empty (no children)
   * Logs a warning if layer has unexpected content
   * 
   * @param id - Layer ID to validate
   * @returns true if layer is empty or doesn't exist, false if has children
   */
  private validateLayerEmpty(id: LayerId): boolean {
    const layer = this.layers.get(id);
    if (!layer) return true;
    
    const childCount = layer.container.children.length;
    if (childCount > 0) {
      logger.warn(
        `[ReignMakerMapLayer] ⚠️ Layer '${id}' has ${childCount} children when expected to be empty!`,
        'Children:', layer.container.children.map(c => c.name || c.constructor.name)
      );
      return false;
    }
    return true;
  }

  /**
   * Get default z-index for a layer based on its type
   * Ensures consistent layer ordering across the application
   */
  private getDefaultZIndex(layerId: LayerId): number {
    switch (layerId) {
      case 'terrain-overlay':
      case 'terrain-difficulty-overlay':
        return 5; // Terrain/difficulty overlays at very bottom (never shown together)
      case 'kingdom-territory':
      case 'kingdom-territory-outline':
        return 10; // Territory layers above terrain
      case 'settlements-overlay':
        return 30; // Settlements in middle
      case 'routes':
        return 40; // Roads on top
      case 'worksites':
        return 45; // Worksites above roads
      case 'resources':
        return 45; // Resources same level as worksites (never shown together)
      case 'settlement-icons':
        return 50; // Settlement icons above everything
      case 'hex-selection':
      default:
        return 0; // Default z-index
    }
  }

  /**
   * Draw terrain overlay for hexes with terrain type data
   * Colors hexes based on terrain type (forest, plains, mountains, etc.)
   */
  drawTerrainOverlay(hexData: Array<{ id: string; terrain: string }>): void {
    this.ensureInitialized();
    
    const layerId: LayerId = 'terrain-overlay';
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 5);
    const canvas = (globalThis as any).canvas;
    
    // Delegate to renderer
    renderTerrainOverlay(layer, hexData, canvas, this.drawSingleHex.bind(this));
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Draw terrain difficulty overlay for hexes with terrain type data
   * Colors hexes based on travel difficulty (green, yellow, crimson)
   */
  drawTerrainDifficultyOverlay(hexData: Array<{ id: string; terrain: string }>): void {
    this.ensureInitialized();
    
    const layerId: LayerId = 'terrain-difficulty-overlay';
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 5); // Same z-index as terrain overlay (they're never shown together)
    const canvas = (globalThis as any).canvas;
    
    // Delegate to renderer
    renderTerrainDifficultyOverlay(layer, hexData, canvas, this.drawSingleHex.bind(this));
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Draw territory outline around claimed hexes
   * Creates a polygonal border around the kingdom territory
   */
  drawTerritoryOutline(hexIds: string[], layerId: LayerId = 'kingdom-territory-outline'): void {

    this.ensureInitialized();
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[ReignMakerMapLayer] ❌ Canvas grid not available');
      return;
    }

    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 10); // Higher zIndex to render above territory

    // Generate outline paths
    const outlineResult = generateTerritoryOutline(hexIds);
    
    if (outlineResult.outlines.length === 0) {
      logger.warn('[ReignMakerMapLayer] ⚠️ No outline paths generated');
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
    this.showLayer(layerId);

  }

  /**
   * Draw road connections between adjacent hexes with roads
   * Creates a network of lines connecting road hexes
   * Water hexes automatically count as roads with special styling
   */
  async drawRoadConnections(roadHexIds: string[], layerId: LayerId = 'routes'): Promise<void> {
    this.ensureInitialized();
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 40);
    const canvas = (globalThis as any).canvas;
    
    // Delegate to renderer
    await renderRoadConnections(layer, roadHexIds, canvas);
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Draw worksite icons on hexes
   * Places icon sprites at hex centers based on worksite type
   */
  async drawWorksiteIcons(worksiteData: Array<{ id: string; worksiteType: string }>): Promise<void> {
    this.ensureInitialized();
    
    const layerId: LayerId = 'worksites';
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 45);
    const canvas = (globalThis as any).canvas;
    
    // Delegate to renderer
    await renderWorksiteIcons(layer, worksiteData, canvas);
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Draw resource/commodity icons on hexes (mapped from worksite positions)
   * Places commodity icon sprites at hex centers based on what the worksite produces
   */
  async drawResourceIcons(worksiteData: Array<{ id: string; worksiteType: string }>): Promise<void> {
    this.ensureInitialized();
    
    const layerId: LayerId = 'resources';
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 45);
    const canvas = (globalThis as any).canvas;
    
    // Delegate to renderer
    await renderResourceIcons(layer, worksiteData, canvas);
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Draw settlement tier icons on hexes
   * Places tier-specific icon sprites at hex centers (village, town, city, metropolis)
   */
  async drawSettlementIcons(settlementData: Array<{ id: string; tier: string }>): Promise<void> {
    this.ensureInitialized();
    
    const layerId: LayerId = 'settlement-icons';
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 50);
    const canvas = (globalThis as any).canvas;
    
    // Delegate to renderer
    await renderSettlementIcons(layer, settlementData, canvas);
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Draw settlement name labels on hexes
   * Places text labels below settlement icons with background panels
   */
  async drawSettlementLabels(settlementData: Array<{ id: string; name: string; tier: string }>): Promise<void> {
    this.ensureInitialized();
    
    const layerId: LayerId = 'settlement-labels';
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 51); // Above settlement icons (50)
    const canvas = (globalThis as any).canvas;
    
    // Delegate to renderer
    const { renderSettlementLabels } = await import('./renderers/SettlementLabelRenderer');
    await renderSettlementLabels(layer, settlementData, canvas);
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Draw fortification icons on hexes
   * Places fortification icon sprites at hex centers based on tier
   * Shows red border for unpaid maintenance
   */
  async drawFortificationIcons(fortificationData: Array<{ id: string; tier: number; maintenancePaid: boolean }>): Promise<void> {
    this.ensureInitialized();
    
    const layerId: LayerId = 'fortifications';
    
    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
    const layer = this.createLayer(layerId, 48); // Between settlement icons (50) and worksites (45)
    const canvas = (globalThis as any).canvas;
    
    // Import and delegate to renderer
    const { renderFortificationIcons } = await import('./renderers/FortificationRenderer');
    await renderFortificationIcons(layer, fortificationData, canvas);
    
    // Show layer after drawing
    this.showLayer(layerId);
  }

  /**
   * Show interactive hover (hex highlight + optional road preview)
   * Used during hex selection to show which hex is being hovered over
   */
  showInteractiveHover(hexId: string, style: HexStyle, roadPreview?: string[]): void {
    this.ensureInitialized();
    
    const layerId: LayerId = 'interactive-hover';
    
    // Create/get layer first (persists, stays visible)
    const layer = this.createLayer(layerId, 15);
    
    // Clear previous hover content
    this.clearLayerContent(layerId);
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[ReignMakerMapLayer] Canvas grid not available');
      return;
    }
    
    // Draw road preview if provided (valid hover - roads only, no hex fill)
    if (roadPreview && roadPreview.length > 0) {
      const roadGraphics = new PIXI.Graphics();
      roadGraphics.name = `RoadPreview_${hexId}`;
      roadGraphics.visible = true;
      this.drawRoadPreviewLines(roadGraphics, hexId, roadPreview, {
        color: 0x64e76a,  // Green
        alpha: 0.65,       // Slightly transparent
        width: 20,         // 8px for hover
        dashed: false     // Solid line
      });
      layer.addChild(roadGraphics);
    } else {
      // Invalid hover - show red hex fill (no road preview)
      const hexGraphics = new PIXI.Graphics();
      hexGraphics.name = `Hover_${hexId}`;
      hexGraphics.visible = true;
      
      const drawn = this.drawSingleHex(hexGraphics, hexId, style, canvas);
      if (drawn) {
        layer.addChild(hexGraphics);
      }
    }
  }
  
  /**
   * Clear interactive hover (just clear content, layer persists)
   */
  hideInteractiveHover(): void {
    this.clearLayerContent('interactive-hover');
  }
  
  /**
   * Add a hex to the interactive selection layer (hex + optional road connections)
   * Used during hex selection to show which hexes have been clicked
   */
  addHexToSelection(hexId: string, style: HexStyle, roadConnections?: string[]): void {
    this.ensureInitialized();
    
    const layerId: LayerId = 'interactive-selection';
    // Create/get layer first (persists, stays visible)
    const layer = this.createLayer(layerId, 20); // Above hover
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      logger.warn('[ReignMakerMapLayer] Canvas grid not available');
      return;
    }
    
    // Draw road connections only (no hex fill)
    if (roadConnections && roadConnections.length > 0) {
      const roadGraphics = new PIXI.Graphics();
      roadGraphics.name = `RoadConnection_${hexId}`;
      roadGraphics.visible = true;
      this.drawRoadPreviewLines(roadGraphics, hexId, roadConnections, {
        color: 0x64e76a,  // Green
        alpha: 1.0,       // Solid
        width: 20,        // 20px for selection
        dashed: false     // Solid line
      });
      layer.addChild(roadGraphics);

    }
  }
  
  /**
   * Remove a hex from the selection layer
   */
  removeHexFromSelection(hexId: string): void {
    const layer = this.getLayer('interactive-selection');
    if (!layer) return;
    
    // Find and remove the hex graphic
    const hexGraphic = layer.children.find(child => child.name === `Selection_${hexId}`);
    if (hexGraphic) {
      layer.removeChild(hexGraphic);
      hexGraphic.destroy();
    }
    
    // Find and remove the road graphic
    const roadGraphic = layer.children.find(child => child.name === `RoadConnection_${hexId}`);
    if (roadGraphic) {
      layer.removeChild(roadGraphic);
      roadGraphic.destroy();
    }

  }
  
  /**
   * Clear the selection layer (just clear content, layer persists)
   */
  clearSelection(): void {
    this.clearLayerContent('interactive-selection');
  }
  
  /**
   * Draw road preview lines between a hex and its adjacent road hexes
   * Now draws on a graphics object instead of a layer container
   */
  private drawRoadPreviewLines(
    graphics: PIXI.Graphics,
    fromHexId: string,
    toHexIds: string[],
    style: { color: number; alpha: number; width: number; dashed: boolean }
  ): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;
    
    // Get center of source hex
    const fromParts = fromHexId.split('.');
    const fromI = parseInt(fromParts[0], 10);
    const fromJ = parseInt(fromParts[1], 10);
    
    if (isNaN(fromI) || isNaN(fromJ)) return;
    
    const GridHex = (globalThis as any).foundry.grid.GridHex;
    const fromHex = new GridHex({i: fromI, j: fromJ}, canvas.grid);
    const fromCenter = fromHex.center;
    
    // Draw line to each adjacent road hex
    toHexIds.forEach(toHexId => {
      const toParts = toHexId.split('.');
      const toI = parseInt(toParts[0], 10);
      const toJ = parseInt(toParts[1], 10);
      
      if (isNaN(toI) || isNaN(toJ)) return;
      
      const toHex = new GridHex({i: toI, j: toJ}, canvas.grid);
      const toCenter = toHex.center;
      
      // Draw Bezier curve (matches RoadRenderer logic)
      const midX = (fromCenter.x + toCenter.x) / 2;
      const midY = (fromCenter.y + toCenter.y) / 2;
      const dx = toCenter.x - fromCenter.x;
      const dy = toCenter.y - fromCenter.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const perpX = -dy / length;
      const perpY = dx / length;
      const curveOffset = 20;
      const controlX = midX + perpX * curveOffset;
      const controlY = midY + perpY * curveOffset;
      
      if (style.dashed) {
        // Draw dashed line
        graphics.lineStyle({
          width: style.width,
          color: style.color,
          alpha: style.alpha,
          cap: PIXI.LINE_CAP.ROUND,
          join: PIXI.LINE_JOIN.ROUND
        });
        
        // Sample curve and draw dashes
        const segments = 20;
        let drawing = true;
        for (let t = 0; t <= segments; t++) {
          const u = t / segments;
          const x = Math.pow(1 - u, 2) * fromCenter.x +
                   2 * (1 - u) * u * controlX +
                   Math.pow(u, 2) * toCenter.x;
          const y = Math.pow(1 - u, 2) * fromCenter.y +
                   2 * (1 - u) * u * controlY +
                   Math.pow(u, 2) * toCenter.y;
          
          if (t % 3 === 0) drawing = !drawing; // Toggle every 3 segments for dash effect
          
          if (drawing) {
            if (t === 0 || !drawing) {
              graphics.moveTo(x, y);
            } else {
              graphics.lineTo(x, y);
            }
          }
        }
      } else {
        // Draw solid curved line
        graphics.lineStyle({
          width: style.width,
          color: style.color,
          alpha: style.alpha,
          cap: PIXI.LINE_CAP.ROUND,
          join: PIXI.LINE_JOIN.ROUND
        });
        
        graphics.moveTo(fromCenter.x, fromCenter.y);
        graphics.quadraticCurveTo(controlX, controlY, toCenter.x, toCenter.y);
      }
    });
  }
  
  /**
   * Add a sprite to a layer
   */
  addSprite(sprite: PIXI.Sprite, layerId: LayerId = 'settlements'): void {
    this.ensureInitialized();
    const layer = this.createLayer(layerId);
    layer.addChild(sprite);

  }

  /**
   * Remove a sprite
   */
  removeSprite(sprite: PIXI.Sprite): void {
    sprite.parent?.removeChild(sprite);
    sprite.destroy();
  }

  /**
   * Show the PIXI overlays container
   */
  showPixiContainer(): void {
    this.ensureInitialized(); // Ensure container exists first
    if (this.container) {
      this.container.visible = true;

    } else {
      logger.warn('[ReignMakerMapLayer] Cannot show container - initialization failed');
    }
  }

  /**
   * Hide the PIXI overlays container
   */
  hidePixiContainer(): void {
    if (this.container) {
      this.container.visible = false;


    } else {
      logger.error('[ReignMakerMapLayer] ❌ Cannot hide container - container is null!');
    }
  }

  /**
   * Get the current toggle state
   */
  getToggleState(): boolean {
    return this.toggleState;
  }

  /**
   * Handle scene control toggle click
   */
  async handleSceneControlToggle(): Promise<void> {


    if (!this.toggleState) {
      // Toggle OFF -> ON

      this.toggleState = true;
      this.toolbarManager.resetManuallyClosed();
      this.showPixiContainer();
      await this.toolbarManager.show(() => this.handleToolbarManualClose());
      // Toolbar's onMount will automatically restore saved overlay states
    } else {
      // Toggle ON -> OFF

      this.toggleState = false;
      this.toolbarManager.resetManuallyClosed();
      
      // Step 1: Hide toolbar

      this.toolbarManager.hide();
      
      // Step 2: Clear all overlays - THIS IS CRITICAL
      // Unsubscribes from all reactive stores to prevent rendering while hidden
      // BUT preserve state so overlays restore when toggling back ON

      const { getOverlayManager } = await import('./OverlayManager');
      const overlayManager = getOverlayManager();
      overlayManager.clearAll(true); // preserveState = true
      
      // Step 3: Hide the PIXI container

      this.hidePixiContainer();


    }
    
    // Update scene control button state
    this.updateSceneControlButton();
  }

  /**
   * Handle toolbar manual close (X button)
   * Toolbar is just a control panel - closing it doesn't affect overlay visibility
   */
  private handleToolbarManualClose(): void {


    // Keep toggleState = true and PIXI container visible
    // Overlays persist until user toggles rook button off
  }

  /**
   * Update the scene control button's active state
   */
  private updateSceneControlButton(): void {
    const button = document.querySelector('[data-tool="reignmaker-hexes"]') as HTMLElement;
    if (button) {
      if (this.toggleState) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
      }
    }
  }

  /**
   * Check if toolbar is currently visible
   */
  isToolbarVisible(): boolean {
    return this.toolbarManager.isVisible();
  }

  /**
   * Show kingdom territory hexes
   */
  async showKingdomHexes(): Promise<void> {

    const layerId: LayerId = 'kingdom-territory';
    
    // Clear and recreate layer
    this.clearLayer(layerId);
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.ready) {
      logger.warn('[ReignMakerMapLayer] ❌ Canvas not ready');
      return;
    }

    // Use ONLY kingdom data (canonical source)
    const kingdomActor = await getKingdomActor();
    
    if (!kingdomActor) {
      logger.warn('[ReignMakerMapLayer] ❌ No kingdom actor found');
      // @ts-ignore
      ui?.notifications?.warn('No kingdom data available');
      return;
    }

    const kingdom = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
    if (!kingdom?.hexes || kingdom.hexes.length === 0) {
      logger.warn('[ReignMakerMapLayer] ❌ No hex data in kingdom');
      // @ts-ignore
      ui?.notifications?.warn('No kingdom hex data available. Claim some hexes first!');
      return;
    }

    // Map hex IDs from our stored data
    const hexIds = kingdom.hexes
      .filter((h: any) => h.claimedBy === PLAYER_KINGDOM) // Only player-claimed
      .map((h: any) => h.id);

    if (hexIds.length === 0) {
      logger.warn('[ReignMakerMapLayer] ❌ No claimed hexes found');
      // @ts-ignore
      ui?.notifications?.warn('No claimed territory to display');
      return;
    }

    // Draw kingdom hexes using default style
    this.drawHexes(hexIds, DEFAULT_HEX_STYLES.kingdomTerritory, layerId);
    this.showLayer(layerId);
    
    // Draw territory outline
    try {

      this.drawTerritoryOutline(hexIds);

    } catch (error) {
      logger.error('[ReignMakerMapLayer] Failed to draw territory outline:', error);
    }

    // @ts-ignore
    ui?.notifications?.info(`Showing ${hexIds.length} kingdom hexes`);
  }

  /**
   * Check if kingdom hexes are currently visible
   */
  isKingdomHexesVisible(): boolean {
    const layer = this.layers.get('kingdom-territory');
    return layer?.visible ?? false;
  }

  /**
   * Destroy and cleanup all layers
   */
  destroy(): void {
    // Hide toolbar if visible
    this.toolbarManager.hide();

    // Destroy all layers
    this.layers.forEach(layer => {
      layer.container.destroy({ children: true });
    });
    this.layers.clear();

    // Remove main container
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }

    this.initialized = false;

  }

  /**
   * Get all layer IDs
   */
  getLayerIds(): LayerId[] {
    return Array.from(this.layers.keys());
  }

  /**
   * Get layer count
   */
  getLayerCount(): number {
    return this.layers.size;
  }
}

// Export registerKingdomHexControl from the dedicated module
export { registerKingdomHexControl } from './SceneControlRegistration';
