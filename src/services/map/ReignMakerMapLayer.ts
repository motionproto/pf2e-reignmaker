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
import type { KingdomData } from '../../actors/KingdomActor';
import type { LayerId, HexStyle, MapLayer } from './types';
import { DEFAULT_HEX_STYLES, TERRAIN_COLORS, WORKSITE_ICONS } from './types';
import type { SvelteComponent } from 'svelte';
import { generateTerritoryOutline } from './TerritoryOutline';
import { isWaterTerrain } from '../../types/terrain';
import { ToolbarManager } from './ToolbarManager';
import { renderTerrainOverlay } from './renderers/TerrainRenderer';
import { renderTerritoryOutline } from './renderers/TerritoryRenderer';
import { renderRoadConnections } from './renderers/RoadRenderer';
import { renderWorksiteIcons } from './renderers/WorksiteRenderer';
import { renderResourceIcons } from './renderers/ResourceRenderer';
import { renderSettlementIcons } from './renderers/SettlementIconRenderer';

/**
 * Main map layer service (Singleton)
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
   * Clear content from a layer (remove graphics but keep visibility state)
   * Use this when you want to redraw a layer without changing its visibility
   */
  clearLayerContent(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      const childCount = layer.container.children.length;
      
      // Clear and destroy all children
      layer.container.removeChildren().forEach(child => {
        // If it's a Graphics object, clear it first
        if (child instanceof PIXI.Graphics) {
          child.clear();
        }
        child.destroy({ children: true, texture: false, baseTexture: false });
      });
      
      console.log(`[ReignMakerMapLayer] Cleared ${childCount} children from layer: ${id} (visibility unchanged)`);
    } else {
      console.log(`[ReignMakerMapLayer] Layer ${id} not found when trying to clear content`);
    }
  }

  /**
   * Clear all content from a layer AND hide it
   * Use this when you want to completely remove a layer from view
   */
  clearLayer(id: LayerId): void {
    this.clearLayerContent(id);
    this.hideLayer(id);
    console.log(`[ReignMakerMapLayer] Cleared and hid layer: ${id}`);
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
    
    // Validate layer is empty (detect leftover artifacts)
    this.validateLayerEmpty(layerId);
    
    // Clear content only (preserve visibility state for now)
    this.clearLayerContent(layerId);
    
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
    
    // PHASE 1 FIX: Always show layer after drawing (consistency with other draw methods)
    this.showLayer(layerId);
    
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
      
      // Use GridHex class for proper coordinate handling
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
      console.warn(
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
        return 5; // Terrain at very bottom
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

    // Validate and clear content
    this.validateLayerEmpty(layerId);
    this.clearLayerContent(layerId);
    
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
      console.log('[ReignMakerMapLayer] PIXI container shown (visible:', this.container.visible, ')');
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
      console.log('[ReignMakerMapLayer] PIXI container hidden (visible:', this.container.visible, ')');
      console.log('[ReignMakerMapLayer] Container children count:', this.container.children.length);
      console.log('[ReignMakerMapLayer] Layer visibility states:', 
        Array.from(this.layers.entries()).map(([id, layer]) => ({
          id,
          visible: layer.visible,
          containerVisible: layer.container.visible,
          childCount: layer.container.children.length
        }))
      );
    } else {
      console.error('[ReignMakerMapLayer] ❌ Cannot hide container - container is null!');
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
    console.log('[ReignMakerMapLayer] 🎯 handleSceneControlToggle() called, current toggleState:', this.toggleState);
    console.log('[ReignMakerMapLayer] Container exists:', !!this.container, 'visible:', this.container?.visible);
    
    if (!this.toggleState) {
      // Toggle OFF -> ON
      console.log('[ReignMakerMapLayer] ═══ Toggle OFF -> ON ═══');
      this.toggleState = true;
      this.toolbarManager.resetManuallyClosed();
      this.showPixiContainer();
      await this.toolbarManager.show(() => this.handleToolbarManualClose());
      // Toolbar's onMount will automatically restore saved overlay states
    } else {
      // Toggle ON -> OFF
      console.log('[ReignMakerMapLayer] ═══ Toggle ON -> OFF ═══');
      this.toggleState = false;
      this.toolbarManager.resetManuallyClosed();
      
      // Hide and destroy the toolbar FIRST (before clearing layers)
      console.log('[ReignMakerMapLayer] Step 1: Hiding toolbar...');
      this.toolbarManager.hide();
      
      // Clear all overlays to ensure they're not visible
      console.log('[ReignMakerMapLayer] Step 2: Clearing all layers...');
      this.clearAllLayers();
      
      // Hide the PIXI container (this makes everything invisible immediately)
      console.log('[ReignMakerMapLayer] Step 3: Hiding PIXI container...');
      this.hidePixiContainer();
      
      // Verify container is actually hidden
      console.log('[ReignMakerMapLayer] Step 4: Verifying container hidden...');
      if (this.container && this.container.visible) {
        console.error('[ReignMakerMapLayer] ❌ CRITICAL: Container is still visible after hidePixiContainer()!');
        // Force it again
        this.container.visible = false;
      }
      
      // Force canvas to re-render to ensure changes are visible
      console.log('[ReignMakerMapLayer] Step 5: Forcing canvas re-render...');
      const canvas = (globalThis as any).canvas;
      if (canvas?.stage) {
        canvas.stage.render(canvas.app.renderer);
      }
      
      console.log('[ReignMakerMapLayer] ═══ Toggle OFF complete ═══');
      console.log('[ReignMakerMapLayer] Final state - Container visible:', this.container?.visible);
    }
    
    // Update scene control button state
    this.updateSceneControlButton();
  }

  /**
   * Handle toolbar manual close (X button)
   * Toolbar is just a control panel - closing it doesn't affect overlay visibility
   */
  private handleToolbarManualClose(): void {
    console.log('[ReignMakerMapLayer] 🔴 Toolbar manually closed via X button');
    console.log('[ReignMakerMapLayer] Overlays remain visible, toolbar hidden until next toggle');
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

    // Use ONLY kingdom data (canonical source)
    const kingdomActor = await getKingdomActor();
    
    if (!kingdomActor) {
      console.warn('[ReignMakerMapLayer] ❌ No kingdom actor found');
      // @ts-ignore
      ui?.notifications?.warn('No kingdom data available');
      return;
    }

    const kingdom = kingdomActor.getFlag('pf2e-reignmaker', 'kingdom-data') as KingdomData | null;
    if (!kingdom?.hexes || kingdom.hexes.length === 0) {
      console.warn('[ReignMakerMapLayer] ❌ No hex data in kingdom');
      // @ts-ignore
      ui?.notifications?.warn('No kingdom hex data available. Claim some hexes first!');
      return;
    }

    // Map hex IDs from our stored data
    const hexIds = kingdom.hexes
      .filter((h: any) => h.claimedBy === 1) // Only player-claimed
      .map((h: any) => h.id);
    
    console.log(`[ReignMakerMapLayer] 📋 Using ${hexIds.length} hex IDs from kingdom data:`, hexIds.slice(0, 5));

    if (hexIds.length === 0) {
      console.warn('[ReignMakerMapLayer] ❌ No claimed hexes found');
      // @ts-ignore
      ui?.notifications?.warn('No claimed territory to display');
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

// Export registerKingdomHexControl from the dedicated module
export { registerKingdomHexControl } from './SceneControlRegistration';
