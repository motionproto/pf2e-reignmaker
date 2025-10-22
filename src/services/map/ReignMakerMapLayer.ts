/**
 * ReignMakerMapLayer - General-purpose PIXI canvas layer service
 * 
 * Provides a unified foundation for all map annotations:
 * - Kingdom territory highlights
 * - Hex selections during actions
 * - Settlement markers/sprites
 * - Roads and routes
 * - Custom annotations
 * 
 * Uses Foundry VTT v13 patterns for proper canvas integration.
 */

import { getKingdomActor } from '../../main.kingdom';
import type { KingdomData } from '../../actors/KingdomActor';
import type { LayerId, HexStyle, MapLayer } from './types';
import { DEFAULT_HEX_STYLES } from './types';
import type { SvelteComponent } from 'svelte';
import { generateTerritoryOutline } from './TerritoryOutline';

/**
 * Main map layer service (Singleton)
 */
export class ReignMakerMapLayer {
  private static instance: ReignMakerMapLayer | null = null;
  private container: PIXI.Container | null = null;
  private layers: Map<LayerId, MapLayer> = new Map();
  private initialized: boolean = false;
  private toolbarComponent: SvelteComponent | null = null;
  private toolbarElement: HTMLElement | null = null;
  private toggleState: boolean = false; // Scene control toggle state
  private toolbarManuallyClosed: boolean = false; // Track if toolbar was manually closed via X button

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
      console.warn('[ReignMakerMapLayer] Canvas not ready');
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
      console.log('[ReignMakerMapLayer] ✅ Initialized and added to canvas.primary (world-space)');
      console.log('[ReignMakerMapLayer] Container visible:', this.container.visible);
      console.log('[ReignMakerMapLayer] Container children:', this.container.children.length);
      console.log('[ReignMakerMapLayer] Primary group children:', primaryGroup.children?.length);
    } else {
      console.error('[ReignMakerMapLayer] ❌ canvas.primary not found!');
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
      console.log(`[ReignMakerMapLayer] ♻️ Reusing existing layer: ${id} (zIndex: ${existingLayer.zIndex})`);
      
      // Update z-index if different (allows re-ordering)
      if (existingLayer.zIndex !== zIndex && zIndex !== 0) {
        console.log(`[ReignMakerMapLayer] Updating z-index for ${id}: ${existingLayer.zIndex} → ${zIndex}`);
        existingLayer.container.zIndex = zIndex;
        existingLayer.zIndex = zIndex;
      }
      
      return existingLayer.container;
    }

    // Create new layer
    const layerContainer = new PIXI.Container();
    layerContainer.name = `Layer_${id}`;
    layerContainer.zIndex = zIndex;

    const layer: MapLayer = {
      id,
      container: layerContainer,
      visible: true,
      zIndex
    };

    this.layers.set(id, layer);
    this.container?.addChild(layerContainer);

    console.log(`[ReignMakerMapLayer] ✨ Created NEW layer: ${id} (zIndex: ${zIndex})`);
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
      console.log(`[ReignMakerMapLayer] Removed layer: ${id}`);
    }
  }

  /**
   * Clear all content from a layer (but keep the layer)
   */
  clearLayer(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      // Clear and destroy all children
      layer.container.removeChildren().forEach(child => {
        // If it's a Graphics object, clear it first
        if (child instanceof PIXI.Graphics) {
          child.clear();
        }
        child.destroy({ children: true, texture: false, baseTexture: false });
      });
      // Also hide the layer when clearing to ensure it's not visible
      layer.container.visible = false;
      layer.visible = false;
      console.log(`[ReignMakerMapLayer] Cleared and hid layer: ${id}`);
    } else {
      console.log(`[ReignMakerMapLayer] Layer ${id} not found when trying to clear`);
    }
  }

  /**
   * Clear territory-related layers (territory fill + outline)
   * These should always be cleared together to prevent orphaned graphics
   */
  clearTerritoryLayers(): void {
    console.log('[ReignMakerMapLayer] 🧹 Clearing territory-related layers...');
    this.clearLayer('kingdom-territory');
    this.clearLayer('kingdom-territory-outline');
    this.hideLayer('kingdom-territory');
    this.hideLayer('kingdom-territory-outline');
  }

  /**
   * Clear road layer (routes only - roads-overlay is deprecated)
   */
  clearRoadLayers(): void {
    console.log('[ReignMakerMapLayer] 🧹 Clearing road layer...');
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
    console.log('[ReignMakerMapLayer] 🧹 Clearing all layers...');
    console.log('[ReignMakerMapLayer] Layer IDs to clear:', Array.from(this.layers.keys()));
    
    this.layers.forEach((layer, id) => {
      console.log(`[ReignMakerMapLayer] Clearing layer ${id}, children count: ${layer.container.children.length}`);
      
      // Clear and destroy all children
      layer.container.removeChildren().forEach(child => {
        // If it's a Graphics object, clear it first to remove all drawing commands
        if (child instanceof PIXI.Graphics) {
          console.log(`[ReignMakerMapLayer] Clearing Graphics object: ${child.name}`);
          child.clear();
        }
        child.destroy({ children: true, texture: false, baseTexture: false });
      });
      
      // Hide the layer
      layer.container.visible = false;
      layer.visible = false;
      
      console.log(`[ReignMakerMapLayer] Layer ${id} cleared, visible: ${layer.container.visible}`);
    });
    
    console.log(`[ReignMakerMapLayer] ✅ Cleared ${this.layers.size} layers`);
  }

  /**
   * Draw multiple hexes with the same style
   */
  drawHexes(hexIds: string[], style: HexStyle, layerId: LayerId = 'hex-selection', zIndex?: number): void {
    console.log(`[ReignMakerMapLayer] 🎨 Drawing ${hexIds.length} hexes...`);
    this.ensureInitialized();
    
    // ALWAYS clear the layer first to prevent duplicate graphics
    this.clearLayer(layerId);
    
    // Determine z-index based on layer type if not explicitly provided
    const layerZIndex = zIndex ?? this.getDefaultZIndex(layerId);
    const layer = this.createLayer(layerId, layerZIndex);

    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      console.warn('[ReignMakerMapLayer] ❌ Canvas grid not available');
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
    console.log(`[ReignMakerMapLayer] ✅ Drew ${successCount}/${hexIds.length} hexes on layer: ${layerId}`);
  }

  /**
   * Draw a single hex
   */
  drawHex(hexId: string, style: HexStyle, layerId: LayerId = 'hex-selection'): void {
    this.ensureInitialized();
    const layer = this.createLayer(layerId);

    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      console.warn('[ReignMakerMapLayer] Canvas grid not available');
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
        console.warn(`[ReignMakerMapLayer] ⚠️ Invalid hex ID format: ${hexId}`);
        return false;
      }
      
      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      
      if (isNaN(i) || isNaN(j)) {
        console.warn(`[ReignMakerMapLayer] ⚠️ Invalid hex coordinates: ${hexId}`);
        return false;
      }
      
      // Use GridHex class for proper coordinate handling (matching Kingmaker pattern)
      const GridHex = (globalThis as any).foundry.grid.GridHex;
      const hex = new GridHex({i, j}, canvas.grid);
      
      // Get hex center in world coordinates
      const center = hex.center;
      
      // Get vertices in grid-relative coordinates
      // getShape() returns vertices relative to (0,0), not world coordinates!
      const relativeVertices = canvas.grid.getShape(hex.offset);
      
      if (!relativeVertices || relativeVertices.length === 0) {
        console.warn(`[ReignMakerMapLayer] ⚠️ No vertices for hex ${hexId} (i:${i}, j:${j})`);
        return false;
      }
      
      // Apply Kingmaker's scaling factor (this fixes slight gaps between hexes)
      const scale = (canvas.grid.sizeY + 2) / canvas.grid.sizeY;
      
      // Translate vertices to world coordinates by adding to hex center
      // This matches how Kingmaker does it for Foundry v13
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
      console.error(`[ReignMakerMapLayer] ❌ Failed to draw hex ${hexId}:`, error);
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
   * Get default z-index for a layer based on its type
   * Ensures consistent layer ordering across the application
   */
  private getDefaultZIndex(layerId: LayerId): number {
    switch (layerId) {
      case 'terrain-overlay':
        return 5; // Terrain at very bottom
      case 'kingdom-territory':
      case 'kingdom-territory-outline':
        return 10; // Territory layers above terrain
      case 'settlements-overlay':
        return 30; // Settlements in middle
      case 'routes':
        return 40; // Roads on top
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
    console.log(`[ReignMakerMapLayer] 🌄 Drawing terrain overlay for ${hexData.length} hexes...`);
    this.ensureInitialized();
    
    const layerId: LayerId = 'terrain-overlay';
    
    // ALWAYS clear the layer first to prevent duplicate graphics
    this.clearLayer(layerId);
    
    const layer = this.createLayer(layerId, 5); // z=5: terrain at bottom

    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      console.warn('[ReignMakerMapLayer] ❌ Canvas grid not available');
      return;
    }

    // Import terrain colors
    const { TERRAIN_COLORS } = require('./types');

    // Group hexes by terrain type for efficient rendering
    const terrainGroups = new Map<string, string[]>();
    hexData.forEach(({ id, terrain }) => {
      const terrainType = terrain?.toLowerCase() || 'default';
      if (!terrainGroups.has(terrainType)) {
        terrainGroups.set(terrainType, []);
      }
      terrainGroups.get(terrainType)!.push(id);
    });

    console.log(`[ReignMakerMapLayer] Rendering ${terrainGroups.size} terrain types`);

    // Draw each terrain type group
    terrainGroups.forEach((hexIds, terrainType) => {
      const terrainStyle = TERRAIN_COLORS[terrainType] || TERRAIN_COLORS['default'];
      
      const graphics = new PIXI.Graphics();
      graphics.name = `Terrain_${terrainType}`;
      graphics.visible = true;

      let successCount = 0;
      hexIds.forEach(hexId => {
        const style: HexStyle = {
          fillColor: terrainStyle.color,
          fillAlpha: terrainStyle.alpha,
          borderWidth: 0 // No borders for terrain overlay
        };
        const drawn = this.drawSingleHex(graphics, hexId, style, canvas);
        if (drawn) successCount++;
      });

      layer.addChild(graphics);
      console.log(`[ReignMakerMapLayer] ✅ Drew ${successCount} ${terrainType} hexes`);
    });

    this.showLayer(layerId);
    console.log(`[ReignMakerMapLayer] ✅ Terrain overlay complete`);
  }

  /**
   * Draw territory outline around claimed hexes
   * Creates a polygonal border around the kingdom territory
   */
  drawTerritoryOutline(hexIds: string[], layerId: LayerId = 'kingdom-territory-outline'): void {
    console.log(`[ReignMakerMapLayer] 🎨 Drawing territory outline for ${hexIds.length} hexes...`);
    this.ensureInitialized();
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      console.warn('[ReignMakerMapLayer] ❌ Canvas grid not available');
      return;
    }

    // ALWAYS clear any existing outline first to prevent duplicates
    this.clearLayer(layerId);
    const layer = this.createLayer(layerId, 10); // Higher zIndex to render above territory

    // Generate outline paths
    const outlineResult = generateTerritoryOutline(hexIds);
    
    if (outlineResult.outlines.length === 0) {
      console.warn('[ReignMakerMapLayer] ⚠️ No outline paths generated');
      return;
    }

    console.log(`[ReignMakerMapLayer] Generated ${outlineResult.outlines.length} outline path(s)`);

    // Create graphics object for the outline
    const graphics = new PIXI.Graphics();
    graphics.name = 'TerritoryOutline';
    graphics.visible = true;

    // Draw outline with single pass - thick bright blue border
    graphics.lineStyle({
      width: 16,
      color: 0x00D4FF, // Bright electric blue - highly visible
      alpha: 1.0, // Fully opaque
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

      console.log(`[ReignMakerMapLayer] Path ${pathIndex}: ${path.length} segments, loop: ${isLoop}`);
    });

    layer.addChild(graphics);
    this.showLayer(layerId);

    console.log(`[ReignMakerMapLayer] ✅ Territory outline drawn with ${outlineResult.debugInfo?.boundaryEdges} boundary edges`);
  }

  /**
   * Draw road connections between adjacent hexes with roads
   * Creates a network of lines connecting road hexes
   */
  drawRoadConnections(roadHexIds: string[], layerId: LayerId = 'routes'): void {
    console.log(`[ReignMakerMapLayer] 🛣️ Drawing road connections for ${roadHexIds.length} hexes...`);
    this.ensureInitialized();
    
    // ALWAYS clear the layer first to prevent duplicate graphics
    this.clearLayer(layerId);
    
    const layer = this.createLayer(layerId, 40); // z=40: routes (top layer, above settlements)

    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) {
      console.warn('[ReignMakerMapLayer] ❌ Canvas grid not available');
      return;
    }

    // Normalize all road hex IDs for consistent matching
    const normalizedRoadHexIds = roadHexIds.map(id => this.normalizeHexId(id));
    const roadHexSet = new Set(normalizedRoadHexIds);
    
    console.log('[ReignMakerMapLayer] Road hex IDs:', normalizedRoadHexIds.slice(0, 10));

    // Graphics object for drawing lines
    const graphics = new PIXI.Graphics();
    graphics.name = 'RoadConnections';
    graphics.visible = true;

    // Track connections we've already drawn (to avoid duplicates)
    const drawnConnections = new Set<string>();

    const GridHex = (globalThis as any).foundry.grid.GridHex;
    let connectionCount = 0;

    // Store all road segments to draw in two passes (black borders first, then brown roads)
    const roadSegments: Array<Array<{x: number, y: number}>> = [];
    
    roadHexIds.forEach(hexId => {
      try {
        const parts = hexId.split('.');
        if (parts.length !== 2) return;

        const i = parseInt(parts[0], 10);
        const j = parseInt(parts[1], 10);
        if (isNaN(i) || isNaN(j)) return;

        const hex = new GridHex({i, j}, canvas.grid);
        const hexCenter = hex.center;
        const neighbors: any[] = hex.getNeighbors();

        neighbors.forEach((neighbor: any) => {
          const neighborI = neighbor.offset.i;
          const neighborJ = neighbor.offset.j;
          const neighborId = `${neighborI}.${neighborJ}`;

          if (!roadHexSet.has(neighborId)) return;

          const normalizedHexId = this.normalizeHexId(hexId);
          const connectionId = [normalizedHexId, neighborId].sort().join('|');
          if (drawnConnections.has(connectionId)) return;

          drawnConnections.add(connectionId);

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
          
          roadSegments.push(points);
          connectionCount++;
        });
      } catch (error) {
        console.error(`[ReignMakerMapLayer] Failed to process hex ${hexId}:`, error);
      }
    });
    
    // Get road width from settings (borders are 4 pixels wider)
    // @ts-ignore - Foundry globals
    const roadWidth = game.settings?.get('pf2e-reignmaker', 'roadWidth') as number || 32;
    const borderWidth = roadWidth + 4;
    
    // PASS 1: Draw all black borders
    graphics.lineStyle({
      width: borderWidth,
      color: 0x000000,
      alpha: 0.6,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    roadSegments.forEach(points => {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    });
    
    // PASS 2: Draw all brown roads on top
    graphics.lineStyle({
      width: roadWidth,
      color: 0x8B4513,
      alpha: 0.8,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    
    roadSegments.forEach(points => {
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
    });

    layer.addChild(graphics);
    console.log(`[ReignMakerMapLayer] ✅ Drew ${connectionCount} road connections`);
    
    if (connectionCount === 0) {
      console.warn('[ReignMakerMapLayer] ⚠️ No road connections drawn - check that hex IDs match neighbor format');
    }
  }

  /**
   * Add a sprite to a layer
   */
  addSprite(sprite: PIXI.Sprite, layerId: LayerId = 'settlements'): void {
    this.ensureInitialized();
    const layer = this.createLayer(layerId);
    layer.addChild(sprite);
    console.log(`[ReignMakerMapLayer] Added sprite to layer: ${layerId}`);
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
      console.log('[ReignMakerMapLayer] PIXI container shown');
    } else {
      console.warn('[ReignMakerMapLayer] Cannot show container - initialization failed');
    }
  }

  /**
   * Hide the PIXI overlays container
   */
  hidePixiContainer(): void {
    if (this.container) {
      this.container.visible = false;
      console.log('[ReignMakerMapLayer] PIXI container hidden');
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
      console.log('[ReignMakerMapLayer] Toggle OFF -> ON');
      this.toggleState = true;
      this.toolbarManuallyClosed = false;
      this.showPixiContainer();
      await this.showMapOverlayToolbar();
      // Toolbar's onMount will automatically restore saved overlay states
    } else {
      // Toggle ON -> OFF
      console.log('[ReignMakerMapLayer] Toggle ON -> OFF');
      this.toggleState = false;
      this.toolbarManuallyClosed = false;
      
      // Hide and destroy the toolbar FIRST (before clearing layers)
      // This ensures the toolbar can't try to re-draw while we're clearing
      this.hideMapOverlayToolbar();
      
      // Clear all overlays to ensure they're not visible
      this.clearAllLayers();
      
      // Hide the PIXI container (this makes everything invisible immediately)
      this.hidePixiContainer();
      
      // Force canvas to re-render to ensure changes are visible
      const canvas = (globalThis as any).canvas;
      if (canvas?.stage) {
        canvas.stage.render(canvas.app.renderer);
      }
      
      // DO NOT clear localStorage - we want to preserve overlay states
      // so they can be restored when toggled back ON
      console.log('[ReignMakerMapLayer] Overlay states preserved in localStorage for restoration');
    }
    
    // Update scene control button state
    this.updateSceneControlButton();
  }

  /**
   * Handle toolbar manual close (X button)
   */
  handleToolbarManualClose(): void {
    console.log('[ReignMakerMapLayer] Toolbar manually closed via X button');
    this.toolbarManuallyClosed = true;
    this.hideMapOverlayToolbar();
    // Keep toggleState = true and PIXI container visible
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
   * Toggle map overlay toolbar (scene control button)
   * @deprecated Use handleSceneControlToggle instead
   */
  async toggleMapOverlayToolbar(): Promise<void> {
    if (this.toolbarComponent) {
      // Hide toolbar
      this.hideMapOverlayToolbar();
      console.log('[ReignMakerMapLayer] Toolbar hidden');
    } else {
      // Show toolbar
      await this.showMapOverlayToolbar();
    }
  }

  /**
   * Show the map overlay toolbar
   */
  async showMapOverlayToolbar(): Promise<void> {
    if (this.toolbarComponent) {
      console.log('[ReignMakerMapLayer] Toolbar already visible');
      return;
    }

    try {
      // KingdomStore is now initialized globally in the ready hook
      // No need for on-demand initialization here

      // Dynamically import the toolbar component
      const { default: MapOverlayToolbar } = await import('../../view/map/MapOverlayToolbar.svelte');

      // Create container element
      this.toolbarElement = document.createElement('div');
      this.toolbarElement.id = 'reignmaker-map-overlay-toolbar';
      document.body.appendChild(this.toolbarElement);

      // Mount Svelte component
      this.toolbarComponent = new MapOverlayToolbar({
        target: this.toolbarElement
      });

      // Listen for close event
      this.toolbarElement.addEventListener('close', () => {
        this.handleToolbarManualClose();
      });

      console.log('[ReignMakerMapLayer] ✅ Toolbar shown');
    } catch (error) {
      console.error('[ReignMakerMapLayer] Failed to show toolbar:', error);
      ui?.notifications?.error('Failed to show map overlay toolbar');
    }
  }

  /**
   * Hide the map overlay toolbar
   */
  hideMapOverlayToolbar(): void {
    if (this.toolbarComponent) {
      this.toolbarComponent.$destroy();
      this.toolbarComponent = null;
    }

    if (this.toolbarElement) {
      this.toolbarElement.remove();
      this.toolbarElement = null;
    }

    console.log('[ReignMakerMapLayer] Toolbar hidden');
  }

  /**
   * Check if toolbar is currently visible
   */
  isToolbarVisible(): boolean {
    return this.toolbarComponent !== null;
  }

  /**
   * Show kingdom territory hexes
   */
  async showKingdomHexes(): Promise<void> {
    console.log('[ReignMakerMapLayer] 🎯 showKingdomHexes() called');
    const layerId: LayerId = 'kingdom-territory';
    
    // Clear and recreate layer
    this.clearLayer(layerId);
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.ready) {
      console.warn('[ReignMakerMapLayer] ❌ Canvas not ready');
      return;
    }

    console.log('[ReignMakerMapLayer] Canvas ready, attempting to get hex data...');

    // Try to get hex data from multiple sources
    let hexIds: string[] = [];
    
    // Source 1: Try Kingmaker module first (if available)
    const kingmaker = (globalThis as any).game?.kingmaker;
    if (kingmaker?.region?.hexes) {
      console.log('[ReignMakerMapLayer] ✅ Kingmaker module available, reading claimed hexes...');
      const claimedHexes = kingmaker.region.hexes.filter((h: any) => h.data?.claimed);
      
      if (claimedHexes && claimedHexes.length > 0) {
        hexIds = claimedHexes.map((h: any) => `${h.offset.i}.${h.offset.j}`);
        console.log(`[ReignMakerMapLayer] Got ${hexIds.length} hex IDs from Kingmaker:`, hexIds.slice(0, 5));
      } else {
        console.log('[ReignMakerMapLayer] ⚠️ No claimed hexes in Kingmaker module');
      }
    } else {
      console.log('[ReignMakerMapLayer] ⚠️ Kingmaker module not available, trying fallback...');
    }
    
    // Source 2: Fallback to our stored data (if Kingmaker didn't work)
    if (hexIds.length === 0) {
      console.log('[ReignMakerMapLayer] Attempting to read from KingdomActor flags...');
      const kingdomActor = await getKingdomActor();
      
      if (kingdomActor) {
        const kingdom = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
        if (kingdom?.hexes && kingdom.hexes.length > 0) {
          // Map hex IDs from our stored data (assuming correct Foundry coordinates)
          hexIds = kingdom.hexes.map((h: any) => h.id);
          console.log(`[ReignMakerMapLayer] 📋 Using ${hexIds.length} hex IDs from KingdomActor:`, hexIds.slice(0, 5));
        }
      }
    }
    
    if (hexIds.length === 0) {
      console.warn('[ReignMakerMapLayer] ❌ No hex data available from any source');
      // @ts-ignore
      ui?.notifications?.warn('No kingdom hex data available. Claim some hexes first!');
      return;
    }

    console.log(`[ReignMakerMapLayer] 📍 Drawing ${hexIds.length} kingdom hexes...`);
    
    // Draw kingdom hexes using default style
    this.drawHexes(hexIds, DEFAULT_HEX_STYLES.kingdomTerritory, layerId);
    this.showLayer(layerId);
    
    // Draw territory outline
    try {
      console.log('[ReignMakerMapLayer] About to draw territory outline...');
      this.drawTerritoryOutline(hexIds);
      console.log('[ReignMakerMapLayer] Territory outline drawing completed');
    } catch (error) {
      console.error('[ReignMakerMapLayer] Failed to draw territory outline:', error);
    }

    console.log('[ReignMakerMapLayer] ✅ Kingdom hexes rendering complete');
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
    this.hideMapOverlayToolbar();

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
    console.log('[ReignMakerMapLayer] Destroyed');
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

/**
 * Register the kingdom hex control button in the scene controls
 */
export function registerKingdomHexControl(): void {
  console.log('[ReignMakerMapLayer] Registering scene control button...');
  
  Hooks.on('getSceneControlButtons', (controls: any) => {
    console.log('[ReignMakerMapLayer] getSceneControlButtons hook fired');
    console.log('[ReignMakerMapLayer] Controls type:', typeof controls, 'Is array:', Array.isArray(controls));
    
    // Find the tokens control group (controls is an array in Foundry v11-12, might be object in v13)
    let tokensControl;
    if (Array.isArray(controls)) {
      tokensControl = controls.find((c: any) => c.name === 'token');
    } else {
      // If controls is an object, try accessing directly
      tokensControl = controls.token || controls.tokens;
    }
    
    if (!tokensControl) {
      console.warn('[ReignMakerMapLayer] Tokens control group not found');
      console.log('[ReignMakerMapLayer] Available controls:', Object.keys(controls));
      return;
    }
    
    // Ensure tools array/object exists
    if (!tokensControl.tools) {
      tokensControl.tools = Array.isArray(controls) ? [] : {};
    }
    
    const toolsArray = Array.isArray(tokensControl.tools) ? tokensControl.tools : Object.values(tokensControl.tools);
    console.log('[ReignMakerMapLayer] Found tokens control group, current tools:', toolsArray.length);
    console.log('[ReignMakerMapLayer] Tool names:', toolsArray.map((t: any) => t?.name));
    
    // Check individual settings for hiding Kingmaker module's controls
    // @ts-ignore - Foundry globals
    const hideHexControls = game.settings?.get('pf2e-reignmaker', 'hideKingmakerHexControls');
    // @ts-ignore - Foundry globals
    const hideShowRegions = game.settings?.get('pf2e-reignmaker', 'hideKingmakerShowRegions');
    
    console.log('[ReignMakerMapLayer] Hide settings:', { hideHexControls, hideShowRegions });
    
    // Remove Kingmaker controls based on user settings
    if (hideHexControls || hideShowRegions) {
      if (Array.isArray(tokensControl.tools)) {
        // Array format
        const before = tokensControl.tools.length;
        tokensControl.tools = tokensControl.tools.filter((tool: any) => {
          if (hideHexControls && tool.name === 'km-hex-overlay') {
            console.log('[ReignMakerMapLayer] Filtering out Kingmaker "Hex Controls" button');
            return false;
          }
          if (hideShowRegions && tool.name === 'km-show-regions') {
            console.log('[ReignMakerMapLayer] Filtering out Kingmaker "Show Regions" button');
            return false;
          }
          return true;
        });
        console.log(`[ReignMakerMapLayer] Removed ${before - tokensControl.tools.length} Kingmaker button(s)`);
      } else {
        // Object format
        if (hideHexControls && tokensControl.tools['km-hex-overlay']) {
          delete tokensControl.tools['km-hex-overlay'];
          console.log('[ReignMakerMapLayer] Removed Kingmaker "Hex Controls" button');
        }
        if (hideShowRegions && tokensControl.tools['km-show-regions']) {
          delete tokensControl.tools['km-show-regions'];
          console.log('[ReignMakerMapLayer] Removed Kingmaker "Show Regions" button');
        }
      }
    }
    
    // Check if our rook button already exists (avoid duplicates)
    const rookExists = Array.isArray(tokensControl.tools)
      ? tokensControl.tools.some((t: any) => t.name === 'reignmaker-hexes')
      : !!tokensControl.tools['reignmaker-hexes'];
    
    if (rookExists) {
      console.log('[ReignMakerMapLayer] Rook button already exists, skipping');
      return;
    }
    
    // Add our rook button
    const rookButton = {
      name: 'reignmaker-hexes',
      title: 'Reignmaker Overlays',
      icon: 'fas fa-chess-rook',
      toggle: true,
      active: ReignMakerMapLayer.getInstance().getToggleState(),
      onClick: async (toggled: boolean) => {
        console.log('[ReignMakerMapLayer] Rook button clicked, toggled:', toggled);
        
        // Check if map has been imported yet
        const kingdomActor = await getKingdomActor();
        if (kingdomActor) {
          const kingdom = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
          const hasImportedMap = kingdom?.hexes && kingdom.hexes.length > 0;
          
          if (!hasImportedMap) {
            console.log('[ReignMakerMapLayer] No map data found, opening Kingdom UI to show import dialog...');
            
            // Open Kingdom UI - it will automatically show the WelcomeDialog for first-time setup
            const { openKingdomUI } = await import('../../ui/KingdomIcon');
            const actorId = kingdomActor.id;
            openKingdomUI(actorId);
            
            // Don't show toolbar - user needs to import data first
            return;
          }
        }
        
        const layer = ReignMakerMapLayer.getInstance();
        await layer.handleSceneControlToggle();
      },
      button: true
    };
    
    if (Array.isArray(tokensControl.tools)) {
      tokensControl.tools.push(rookButton);
    } else {
      tokensControl.tools['reignmaker-hexes'] = rookButton;
    }
    
    console.log('[ReignMakerMapLayer] ✅ Rook button added successfully');
  });

  // Initialize PIXI container when canvas is ready
  Hooks.on('canvasReady', () => {
    const layer = ReignMakerMapLayer.getInstance();
    layer.showPixiContainer(); // Ensures initialization
    layer.hidePixiContainer(); // Start hidden (controlled by scene toggle)
    console.log('[ReignMakerMapLayer] Initialized PIXI container on canvasReady');
  });

  // Clean up on canvas tear down
  Hooks.on('canvasTearDown', () => {
    const layer = ReignMakerMapLayer.getInstance();
    layer.destroy();
  });
  
  console.log('[ReignMakerMapLayer] Hook listeners registered');
}
