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
   * Normalize hex ID format (remove leading zeros for consistent matching)
   * "5.08" -> "5.8", "50.18" -> "50.18"
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
   * Draw road connections between adjacent hexes with roads
   * Creates a network of lines connecting road hexes
   */
  drawRoadConnections(roadHexIds: string[], layerId: LayerId = 'routes'): void {
    console.log(`[ReignMakerMapLayer] 🛣️ Drawing road connections for ${roadHexIds.length} hexes...`);
    this.ensureInitialized();
    const layer = this.createLayer(layerId);

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

    roadHexIds.forEach(hexId => {
      try {
        // Parse hex ID: "50.18" -> {i: 50, j: 18}
        const parts = hexId.split('.');
        if (parts.length !== 2) {
          console.warn(`[ReignMakerMapLayer] Invalid hex ID format: ${hexId}`);
          return;
        }

        const i = parseInt(parts[0], 10);
        const j = parseInt(parts[1], 10);
        if (isNaN(i) || isNaN(j)) {
          console.warn(`[ReignMakerMapLayer] Invalid hex coordinates: ${hexId}`);
          return;
        }

        // Create GridHex instance
        const hex = new GridHex({i, j}, canvas.grid);
        const hexCenter = hex.center;

        // Get neighbors using Foundry's built-in method
        const neighbors = canvas.grid.getNeighbors(hex.offset);

        neighbors.forEach((neighbor: any) => {
          // Skip invalid neighbors
          if (!neighbor || typeof neighbor.i !== 'number' || typeof neighbor.j !== 'number') {
            return;
          }

          // Build neighbor hex ID (normalized format without padding)
          const neighborId = `${neighbor.i}.${neighbor.j}`;

          // Only draw if neighbor also has a road
          if (!roadHexSet.has(neighborId)) return;

          // Create a unique connection ID (sorted to avoid A->B and B->A duplicates)
          const normalizedHexId = this.normalizeHexId(hexId);
          const connectionId = [normalizedHexId, neighborId].sort().join('|');
          if (drawnConnections.has(connectionId)) return;

          // Mark as drawn
          drawnConnections.add(connectionId);

          // Get neighbor center in world coordinates
          const neighborHex = new GridHex({i: neighbor.i, j: neighbor.j}, canvas.grid);
          const neighborCenter = neighborHex.center;

          // Draw line from hex center to neighbor center (both in world coordinates)
          graphics.lineStyle(32, 0x8B4513, 0.8); // Brown road color, 32px wide
          graphics.moveTo(hexCenter.x, hexCenter.y);
          graphics.lineTo(neighborCenter.x, neighborCenter.y);

          connectionCount++;
        });
      } catch (error) {
        console.error(`[ReignMakerMapLayer] Failed to process hex ${hexId}:`, error);
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
   * Toggle map overlay toolbar (scene control button)
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
        this.hideMapOverlayToolbar();
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
      active: ReignMakerMapLayer.getInstance().isToolbarVisible(),
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
        await layer.toggleMapOverlayToolbar();
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

  // Clean up on canvas tear down
  Hooks.on('canvasTearDown', () => {
    const layer = ReignMakerMapLayer.getInstance();
    layer.destroy();
  });
  
  console.log('[ReignMakerMapLayer] Hook listeners registered');
}
