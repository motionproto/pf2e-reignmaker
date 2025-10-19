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

/**
 * Main map layer service (Singleton)
 */
export class ReignMakerMapLayer {
  private static instance: ReignMakerMapLayer | null = null;
  private container: PIXI.Container | null = null;
  private layers: Map<LayerId, MapLayer> = new Map();
  private initialized: boolean = false;

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
   * Create or get a layer by ID
   */
  createLayer(id: LayerId, zIndex: number = 0): PIXI.Container {
    this.ensureInitialized();

    if (this.layers.has(id)) {
      return this.layers.get(id)!.container;
    }

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

    console.log(`[ReignMakerMapLayer] Created layer: ${id} (zIndex: ${zIndex})`);
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
      layer.container.removeChildren().forEach(child => child.destroy());
      console.log(`[ReignMakerMapLayer] Cleared layer: ${id}`);
    }
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
   * Draw multiple hexes with the same style
   */
  drawHexes(hexIds: string[], style: HexStyle, layerId: LayerId = 'hex-selection'): void {
    console.log(`[ReignMakerMapLayer] 🎨 Drawing ${hexIds.length} hexes...`);
    this.ensureInitialized();
    const layer = this.createLayer(layerId);

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
   * Toggle kingdom territory hexes (scene control button)
   */
  async toggleKingdomHexes(): Promise<void> {
    const layerId: LayerId = 'kingdom-territory';
    const layer = this.getLayer(layerId);

    if (layer && layer.visible) {
      // Hide existing layer
      this.hideLayer(layerId);
      console.log('[ReignMakerMapLayer] Kingdom hexes hidden');
    } else {
      // Show or create layer
      await this.showKingdomHexes();
    }
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
    
    // Access the tokens control group (controls is an object)
    if (!controls.tokens) {
      console.warn('[ReignMakerMapLayer] Tokens controls group not found');
      return;
    }
    
    console.log('[ReignMakerMapLayer] Found tokens controls, adding kingdom hex button');
    
    // Add the tool to the tokens controls (assign as property like Kingmaker does)
    controls.tokens.tools['kingdom-hexes'] = {
      name: 'kingdom-hexes',
      title: 'Toggle Kingdom Hexes',
      icon: 'fas fa-chess-rook', // Rook icon
      toggle: true,
      active: ReignMakerMapLayer.getInstance().isKingdomHexesVisible(),
      onClick: async (toggled: boolean) => {
        console.log('[ReignMakerMapLayer] Button clicked, toggled:', toggled);
        const layer = ReignMakerMapLayer.getInstance();
        await layer.toggleKingdomHexes();
      },
      button: true
    };
    
    console.log('[ReignMakerMapLayer] Scene control button registered successfully');
  });

  // Clean up on canvas tear down
  Hooks.on('canvasTearDown', () => {
    const layer = ReignMakerMapLayer.getInstance();
    layer.destroy();
  });
  
  console.log('[ReignMakerMapLayer] Hook listeners registered');
}
