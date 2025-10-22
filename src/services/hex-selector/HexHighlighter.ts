/**
 * HexHighlighter - Custom PIXI layer for hex selection
 * 
 * Creates a persistent PIXI.Container attached directly to the canvas stage.
 * This ensures highlights remain visible and aren't cleared by Foundry.
 */

import { kingmakerIdToOffset, hexToKingmakerId, getHexVertices } from './coordinates';
import { HEX_HIGHLIGHT_COLORS, type ColorConfig, type HexSelectionType } from './types';

export class HexHighlighter {
  private container: PIXI.Container;
  private kingdomGraphics: PIXI.Graphics;
  private selectionGraphics: Map<string, PIXI.Graphics> = new Map();
  
  constructor() {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      throw new Error('Canvas stage not available');
    }
    
    // Create our own persistent container
    this.container = new PIXI.Container();
    this.container.name = 'ReignmakerHexHighlights';
    this.container.sortableChildren = true; // Enable z-index sorting
    this.container.zIndex = 1000; // Render above map
    
    // Create graphics for kingdom territory (persistent)
    this.kingdomGraphics = new PIXI.Graphics();
    this.kingdomGraphics.name = 'KingdomTerritory';
    this.kingdomGraphics.zIndex = 1; // Below selections
    this.container.addChild(this.kingdomGraphics);
    
    // Foundry v12 uses canvas groups - add to OverlayCanvasGroup instead of stage
    const overlayGroup = canvas.stage.children.find((c: any) => c.name === 'OverlayCanvasGroup');
    if (overlayGroup) {
      overlayGroup.addChild(this.container);
      console.log('[HexHighlighter] Container added to OverlayCanvasGroup');
    } else {
      // Fallback to stage if group not found
      canvas.stage.addChild(this.container);
      console.log('[HexHighlighter] Container added to canvas.stage (fallback)');
    }
    
    console.log('[HexHighlighter] Created persistent PIXI.Container layer:', this.container.name);
  }
  
  /**
   * Draw faint fills on all kingdom hexes
   * Uses KingdomActor data instead of Kingmaker for accurate positioning
   */
  drawKingdomTerritory(): void {
    const game = (globalThis as any).game;
    
    // Find kingdom actor by checking for kingdom data flag
    const kingdomActor = game?.actors?.find((a: any) => {
      const kingdom = a.getFlag?.('pf2e-reignmaker', 'kingdom-data');
      return kingdom !== undefined && kingdom !== null;
    });
    
    if (!kingdomActor) {
      console.warn('[HexHighlighter] No kingdom actor found');
      return;
    }
    
    const kingdom = kingdomActor.getKingdom?.();
    if (!kingdom?.hexes || kingdom.hexes.length === 0) {
      console.warn('[HexHighlighter] No kingdom hexes data available');
      return;
    }
    
    const config = HEX_HIGHLIGHT_COLORS.kingdom;
    let count = 0;
    
    this.kingdomGraphics.clear();
    
    // Use kingdom.hexes[] which stores hex IDs in dot notation (e.g., "50.18")
    // These numbers DIRECTLY map to Foundry's hex coordinates!
    kingdom.hexes.forEach((hexData: any) => {
      try {
        // Parse dot notation directly: "50.18" -> {i: 50, j: 18}
        const [i, j] = hexData.id.split('.').map(Number);
        
        // Get vertices directly from Foundry's grid
        const canvas = (globalThis as any).canvas;
        const vertices = canvas.grid.getVertices({i, j});
        
        this.kingdomGraphics.beginFill(config.color, config.alpha);
        this.kingdomGraphics.drawPolygon(vertices.flatMap((v: any) => [v.x, v.y]));
        this.kingdomGraphics.endFill();
        
        count++;
      } catch (error) {
        console.error(`[HexHighlighter] Failed to draw hex ${hexData.id}:`, error);
      }
    });
    
    console.log(`[HexHighlighter] Drew ${count} kingdom territory hexes`);
    console.log('[HexHighlighter] Kingdom graphics bounds:', this.kingdomGraphics.getBounds());
    console.log('[HexHighlighter] Container visible:', this.container.visible);
  }
  
  /**
   * Draw existing roads/claims in darker shade
   */
  drawExistingFeatures(type: HexSelectionType, existingHexes?: string[]): void {
    if (!existingHexes || existingHexes.length === 0) return;
    
    const colorKey = this.getExistingColorKey(type);
    const config = HEX_HIGHLIGHT_COLORS[colorKey];
    
    // Create graphics for existing features
    const existingGraphics = new PIXI.Graphics();
    existingGraphics.name = 'ExistingFeatures';
    existingGraphics.beginFill(config.color, config.alpha);
    
    existingHexes.forEach(hexId => {
      const offset = kingmakerIdToOffset(hexId);
      const vertices = getHexVertices(offset);
      existingGraphics.drawPolygon(vertices.flatMap(v => [v.x, v.y]));
    });
    
    existingGraphics.endFill();
    this.container.addChild(existingGraphics);
  }
  
  /**
   * Highlight a selected hex
   */
  highlightSelection(type: HexSelectionType, hexId: string): void {
    const colorKey = this.getNewColorKey(type);
    const config = HEX_HIGHLIGHT_COLORS[colorKey];
    
    console.log(`[HexHighlighter] Highlighting ${hexId} with color ${colorKey}:`, config);
    
    // Create graphics for this selection
    const graphics = new PIXI.Graphics();
    graphics.name = `Selection_${hexId}`;
    graphics.zIndex = 10; // Above kingdom territory
    
    // Parse hex ID (dot notation "50.18") to Foundry coordinates
    const [i, j] = hexId.split('.').map(Number);
    
    // Get vertices directly from Foundry's grid
    const canvas = (globalThis as any).canvas;
    const vertices = canvas.grid.getVertices({i, j});
    
    graphics.beginFill(config.color, config.alpha);
    graphics.drawPolygon(vertices.flatMap((v: any) => [v.x, v.y]));
    graphics.endFill();
    
    this.container.addChild(graphics);
    this.selectionGraphics.set(hexId, graphics);
    
    console.log(`[HexHighlighter] Added selection for ${hexId}, container now has ${this.container.children.length} children`);
    console.log('[HexHighlighter] Selection bounds:', graphics.getBounds());
  }
  
  /**
   * Remove highlight from a hex
   */
  removeHighlight(hexId: string): void {
    const graphics = this.selectionGraphics.get(hexId);
    if (graphics) {
      this.container.removeChild(graphics);
      graphics.destroy();
      this.selectionGraphics.delete(hexId);
      console.log(`[HexHighlighter] Removed selection for ${hexId}`);
    }
  }
  
  /**
   * Clear all highlights and overlays
   */
  clearAllHighlights(): void {
    // Clear kingdom graphics
    this.kingdomGraphics.clear();
    
    // Clear all selection graphics
    this.selectionGraphics.forEach((graphics, hexId) => {
      this.container.removeChild(graphics);
      graphics.destroy();
    });
    this.selectionGraphics.clear();
    
    console.log('[HexHighlighter] Cleared all highlights');
  }
  
  /**
   * Cleanup and remove from canvas
   */
  destroy(): void {
    this.clearAllHighlights();
    
    // Remove container from canvas
    const canvas = (globalThis as any).canvas;
    if (canvas?.stage && this.container.parent === canvas.stage) {
      canvas.stage.removeChild(this.container);
      console.log('[HexHighlighter] Removed container from canvas.stage');
    }
    
    // Destroy container
    this.container.destroy({ children: true });
    
    console.log('[HexHighlighter] Destroyed');
  }
  
  /**
   * Get color key for existing features
   */
  private getExistingColorKey(type: HexSelectionType): string {
    switch (type) {
      case 'claim': return 'claimedHex';
      case 'road': return 'existingRoad';
      case 'settlement': return 'existingSettlement';
      case 'scout': return 'existingScouted';
      default: return 'claimedHex';
    }
  }
  
  /**
   * Get color key for new selections
   */
  private getNewColorKey(type: HexSelectionType): string {
    switch (type) {
      case 'claim': return 'newClaim';
      case 'road': return 'newRoad';
      case 'settlement': return 'newSettlement';
      case 'scout': return 'newScout';
      default: return 'newClaim';
    }
  }
}
