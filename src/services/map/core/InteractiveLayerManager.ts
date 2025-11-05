/**
 * InteractiveLayerManager - Manages interactive hex hover and selection layers
 * 
 * Handles temporary visualization during hex selection workflows:
 * - Hover highlights (shows which hex is being hovered over)
 * - Selection highlights (shows which hexes have been selected)
 * - Road preview lines (shows road connections during building)
 * 
 * Used by hex selector service and action workflows (claim hexes, build roads, etc.)
 */

import type { LayerId, HexStyle } from '../types';
import { drawSingleHex } from '../renderers/HexRenderer';
import { logger } from '../../../utils/Logger';

/**
 * Interactive layer manager
 * Handles hover and selection visualization for hex-based interactions
 */
export class InteractiveLayerManager {
  /**
   * Show interactive hover (hex highlight + optional road preview)
   * Used during hex selection to show which hex is being hovered over
   * 
   * @param hexId - Hex ID to highlight
   * @param style - Hex style (fill color, alpha, border)
   * @param roadPreview - Optional road preview hex IDs
   * @param createLayer - Function to create/get layer
   * @param clearLayerContent - Function to clear layer content
   * @param canvas - Foundry canvas object
   */
  showInteractiveHover(
    hexId: string,
    style: HexStyle,
    roadPreview: string[] | undefined,
    createLayer: (id: LayerId, zIndex?: number) => PIXI.Container,
    clearLayerContent: (id: LayerId) => void,
    canvas: any
  ): void {
    const layerId: LayerId = 'interactive-hover';
    
    // Create/get layer first (persists, stays visible)
    const layer = createLayer(layerId, 15);
    
    // Clear previous hover content
    clearLayerContent(layerId);
    
    if (!canvas?.grid) {
      logger.warn('[InteractiveLayerManager] Canvas grid not available');
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
      }, canvas);
      layer.addChild(roadGraphics);
    } else {
      // Invalid hover - show red hex fill (no road preview)
      const hexGraphics = new PIXI.Graphics();
      hexGraphics.name = `Hover_${hexId}`;
      hexGraphics.visible = true;
      
      const drawn = drawSingleHex(hexGraphics, hexId, style, canvas);
      if (drawn) {
        layer.addChild(hexGraphics);
      }
    }
  }
  
  /**
   * Clear interactive hover (just clear content, layer persists)
   * 
   * @param clearLayerContent - Function to clear layer content
   */
  hideInteractiveHover(clearLayerContent: (id: LayerId) => void): void {
    clearLayerContent('interactive-hover');
  }
  
  /**
   * Add a hex to the interactive selection layer (hex + optional road connections)
   * Used during hex selection to show which hexes have been clicked
   * 
   * @param hexId - Hex ID to add to selection
   * @param style - Hex style (fill color, alpha, border)
   * @param roadConnections - Optional road connection hex IDs
   * @param createLayer - Function to create/get layer
   * @param canvas - Foundry canvas object
   */
  addHexToSelection(
    hexId: string,
    style: HexStyle,
    roadConnections: string[] | undefined,
    createLayer: (id: LayerId, zIndex?: number) => PIXI.Container,
    canvas: any
  ): void {
    const layerId: LayerId = 'interactive-selection';
    // Create/get layer first (persists, stays visible)
    const layer = createLayer(layerId, 20); // Above hover
    
    if (!canvas?.grid) {
      logger.warn('[InteractiveLayerManager] Canvas grid not available');
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
      }, canvas);
      layer.addChild(roadGraphics);
    }
  }
  
  /**
   * Remove a hex from the selection layer
   * 
   * @param hexId - Hex ID to remove
   * @param getLayer - Function to get layer by ID
   */
  removeHexFromSelection(
    hexId: string,
    getLayer: (id: LayerId) => PIXI.Container | undefined
  ): void {
    const layer = getLayer('interactive-selection');
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
   * 
   * @param clearLayerContent - Function to clear layer content
   */
  clearSelection(clearLayerContent: (id: LayerId) => void): void {
    clearLayerContent('interactive-selection');
  }
  
  /**
   * Draw road preview lines between a hex and its adjacent road hexes
   * Draws curved Bezier lines matching RoadRenderer style
   * 
   * @param graphics - PIXI.Graphics object to draw into
   * @param fromHexId - Source hex ID
   * @param toHexIds - Target hex IDs
   * @param style - Line style (color, alpha, width, dashed)
   * @param canvas - Foundry canvas object
   */
  private drawRoadPreviewLines(
    graphics: PIXI.Graphics,
    fromHexId: string,
    toHexIds: string[],
    style: { color: number; alpha: number; width: number; dashed: boolean },
    canvas: any
  ): void {
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
}
