/**
 * HexRenderer - Handles rendering of hex selections and previews
 * for different action types (claim, road, fortify, etc.)
 */

import { ReignMakerMapLayer } from '../map/core/ReignMakerMapLayer';
import type { HexStyle } from '../map/types';
import type { HexSelectionConfig } from './types';
import { HEX_HIGHLIGHT_COLORS } from './types';
import { getKingdomData } from '../../stores/KingdomStore';
import { getAdjacentRoadsAndSettlements } from '../../pipelines/shared/roadValidator';
import { drawSingleHex } from '../map/renderers/HexRenderer';

export class HexRenderer {
  private mapLayer: ReignMakerMapLayer;
  private config: HexSelectionConfig | null = null;

  constructor(mapLayer: ReignMakerMapLayer) {
    this.mapLayer = mapLayer;
  }

  /**
   * Set the current configuration
   */
  setConfig(config: HexSelectionConfig | null): void {
    this.config = config;
  }

  /**
   * Get hover style for action type
   */
  getHoverStyle(): HexStyle {
    if (!this.config) {
      return { fillColor: 0xFFD700, fillAlpha: 0.4 }; // Default gold
    }
    
    const colorKey = this.getHoverColorKey(this.config.colorType);
    const config = HEX_HIGHLIGHT_COLORS[colorKey];
    
    return {
      fillColor: config.color,
      fillAlpha: config.alpha
    };
  }

  /**
   * Get selection style for action type
   */
  getSelectionStyle(): HexStyle {
    if (!this.config) {
      return { fillColor: 0xD2691E, fillAlpha: 0.5 }; // Default orange
    }
    
    const colorKey = this.getNewColorKey(this.config.colorType);
    const config = HEX_HIGHLIGHT_COLORS[colorKey];
    
    return {
      fillColor: config.color,
      fillAlpha: config.alpha
    };
  }

  /**
   * Get hover color key
   */
  private getHoverColorKey(type: string): string {
    switch (type) {
      case 'claim': return 'hoverClaim';
      case 'road': return 'hoverRoad';
      case 'settlement': return 'hoverSettlement';
      case 'scout': return 'hoverScout';
      case 'fortify': return 'hoverFortify';
      case 'unclaim': return 'hoverUnclaim';
      case 'worksite': return 'hoverWorksite';
      case 'destroyed': return 'hoverDestroyed';
      default: return 'hoverClaim';
    }
  }

  /**
   * Get selection color key
   */
  private getNewColorKey(type: string): string {
    switch (type) {
      case 'claim': return 'newClaim';
      case 'road': return 'newRoad';
      case 'settlement': return 'newSettlement';
      case 'scout': return 'newScout';
      case 'fortify': return 'newFortify';
      case 'unclaim': return 'newUnclaim';
      case 'worksite': return 'newWorksite';
      case 'destroyed': return 'newDestroyed';
      default: return 'newClaim';
    }
  }

  /**
   * Get adjacent road hexes for preview (includes pending roads)
   */
  getAdjacentRoadsForPreview(hexId: string, selectedHexes: string[]): string[] {
    const kingdom = getKingdomData();
    return getAdjacentRoadsAndSettlements(hexId, kingdom, selectedHexes);
  }

  /**
   * Render selection based on action type (explicit routing)
   */
  renderSelection(hexId: string, style: HexStyle, roadConnections?: string[]): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;
    
    // Route to type-specific renderer (they handle layer creation)
    if (this.config?.colorType === 'road') {
      this.renderRoadSelection(hexId, roadConnections);
    } else {
      // For claim, settlement, scout, fortify, unclaim - render hex fill
      this.renderHexSelection(hexId, style);
    }
  }

  /**
   * Render hex fill selection (claim, settlement, scout actions)
   */
  private renderHexSelection(hexId: string, style: HexStyle): void {
    const layer = this.mapLayer.createLayer('interactive-selection', 20);
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return;
    
    const hexGraphics = new PIXI.Graphics();
    hexGraphics.name = `Selection_${hexId}`;
    hexGraphics.visible = true;
    
    // Draw hex fill using imported function
    const drawn = drawSingleHex(hexGraphics, hexId, style, canvas);
    if (drawn) {
      layer.addChild(hexGraphics);
      // Critical: Make layer visible so selection renders
      this.mapLayer.showLayer('interactive-selection');
    }
  }

  /**
   * Render road connection lines (roads action only)
   */
  private renderRoadSelection(hexId: string, roadConnections?: string[]): void {
    if (!roadConnections || roadConnections.length === 0) return;
    
    const layer = this.mapLayer.createLayer('interactive-selection', 20);
    
    const roadGraphics = new PIXI.Graphics();
    roadGraphics.name = `RoadConnection_${hexId}`;
    roadGraphics.visible = true;
    
    // Use mapLayer's drawRoadPreviewLines method (now public)
    this.mapLayer.drawRoadPreviewLines(roadGraphics, hexId, roadConnections, {
      color: 0x64e76a,  // Green
      alpha: 1.0,       // Solid
      width: 20,        // 20px for selection
      dashed: false     // Solid line
    });
    
    layer.addChild(roadGraphics);
    // Critical: Make layer visible so selection renders
    this.mapLayer.showLayer('interactive-selection');
  }
}
