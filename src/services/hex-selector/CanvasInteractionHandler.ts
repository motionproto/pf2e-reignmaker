/**
 * CanvasInteractionHandler - Handles canvas click and mousemove events
 * for hex selection, including validation and hover previews
 */

import { positionToOffset, hexToKingmakerId } from './coordinates';
import type { HexSelectionConfig } from './types';
import { ReignMakerMapLayer } from '../map/core/ReignMakerMapLayer';
import { HexRenderer } from './HexRenderer';
import { logger } from '../../utils/Logger';

export class CanvasInteractionHandler {
  private config: HexSelectionConfig | null = null;
  private selectedHexes: string[] = [];
  private selectedRoadConnections: Map<string, string[]> = new Map();
  private currentHoveredHex: string | null = null;
  private mapLayer: ReignMakerMapLayer;
  private renderer: HexRenderer;
  
  // Event handlers
  private canvasClickHandler: ((event: any) => void) | null = null;
  private canvasMoveHandler: ((event: any) => void) | null = null;
  
  // Callbacks
  private onHexSelected: ((hexId: string) => void) | null = null;
  private onHexDeselected: ((hexId: string) => void) | null = null;
  private onPanelUpdate: (() => void) | null = null;

  constructor(mapLayer: ReignMakerMapLayer, renderer: HexRenderer) {
    this.mapLayer = mapLayer;
    this.renderer = renderer;
  }

  /**
   * Set configuration and callbacks
   */
  setConfig(
    config: HexSelectionConfig,
    selectedHexes: string[],
    selectedRoadConnections: Map<string, string[]>,
    onHexSelected: (hexId: string) => void,
    onHexDeselected: (hexId: string) => void,
    onPanelUpdate: () => void
  ): void {
    this.config = config;
    this.selectedHexes = selectedHexes;
    this.selectedRoadConnections = selectedRoadConnections;
    this.onHexSelected = onHexSelected;
    this.onHexDeselected = onHexDeselected;
    this.onPanelUpdate = onPanelUpdate;
  }

  /**
   * Attach canvas listeners (click and mousemove)
   */
  attachCanvasListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      throw new Error('Canvas not available');
    }
    
    this.canvasClickHandler = this.handleCanvasClick.bind(this);
    this.canvasMoveHandler = this.handleCanvasMove.bind(this);
    
    canvas.stage.on('click', this.canvasClickHandler);
    canvas.stage.on('mousemove', this.canvasMoveHandler);
  }

  /**
   * Detach canvas listeners
   */
  detachCanvasListeners(): void {
    const canvas = (globalThis as any).canvas;
    if (this.canvasClickHandler) {
      canvas?.stage?.off('click', this.canvasClickHandler);
      this.canvasClickHandler = null;
    }
    if (this.canvasMoveHandler) {
      canvas?.stage?.off('mousemove', this.canvasMoveHandler);
      this.canvasMoveHandler = null;
    }
  }

  /**
   * Handle canvas mousemove event (hover detection)
   */
  private handleCanvasMove(event: any): void {
    if (!this.config) {
      logger.warn('[CanvasInteractionHandler] handleCanvasMove called but config is null');
      return;
    }
    
    try {
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);
      const offset = positionToOffset(position.x, position.y);
      const hexId = hexToKingmakerId(offset);
      
      // Don't show hover on already selected hexes
      if (this.selectedHexes.includes(hexId)) {
        if (this.currentHoveredHex !== null) {
          this.mapLayer.hideInteractiveHover();
          this.currentHoveredHex = null;
        }
        return;
      }
      
      // Only redraw if different hex
      if (this.currentHoveredHex !== hexId) {
        this.currentHoveredHex = hexId;
        logger.debug(`[CanvasInteractionHandler] Hovering hex: ${hexId}`);
        
      // Validate hex if validation function provided
      let isValid = true;
      if (this.config.validateHex) {
        const result = this.config.validateHex(hexId, this.selectedHexes);
        isValid = typeof result === 'boolean' ? result : result.valid;
        logger.debug(`[CanvasInteractionHandler] Validation result for ${hexId}: ${isValid}`);
      } else {
        logger.warn('[CanvasInteractionHandler] No validateHex provided in config');
      }
        
        if (isValid) {
          // Get road preview for 'road' type
          const roadPreview = this.config.colorType === 'road'
            ? this.renderer.getAdjacentRoadsForPreview(hexId, this.selectedHexes)
            : undefined;
          
          const style = this.renderer.getHoverStyle();
          logger.debug(`[CanvasInteractionHandler] Showing valid hover (green) for ${hexId}`, style);
          this.mapLayer.showInteractiveHover(hexId, style, roadPreview);
        } else {
          // Show invalid hover (red)
          const invalidStyle = { fillColor: 0xFF0000, fillAlpha: 0.2 };
          logger.debug(`[CanvasInteractionHandler] Showing invalid hover (red) for ${hexId}`);
          this.mapLayer.showInteractiveHover(hexId, invalidStyle);
        }
      }
    } catch (error) {
      // Silently fail for hover - might be outside valid hex area
      logger.debug('[CanvasInteractionHandler] Hover failed (outside valid hex area):', error);
      if (this.currentHoveredHex !== null) {
        this.mapLayer.hideInteractiveHover();
        this.currentHoveredHex = null;
      }
    }
  }

  /**
   * Handle canvas click event
   */
  private handleCanvasClick(event: any): void {
    if (!this.config) return;
    
    try {
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);
      const offset = positionToOffset(position.x, position.y);
      const hexId = hexToKingmakerId(offset);

      // Validate hex if validation function provided
      if (this.config.validateHex) {
        const result = this.config.validateHex(hexId, this.selectedHexes);
        
        const isValid = typeof result === 'boolean' ? result : result.valid;
        const message = typeof result === 'boolean' 
          ? 'Cannot select this hex - it doesn\'t meet the requirements' 
          : (result.message || 'Cannot select this hex');
        
        if (!isValid) {
          const ui = (globalThis as any).ui;
          ui?.notifications?.warn(message);
          return;
        }
      }
      
      // Toggle selection
      const index = this.selectedHexes.indexOf(hexId);
      const allowToggle = this.config.allowToggle !== false;
      
      if (index !== -1) {
        // Already selected - deselect if allowed
        if (allowToggle) {
          this.onHexDeselected?.(hexId);
        }
      } else if (this.selectedHexes.length < this.config.count) {
        // Not selected and room available - select
        this.onHexSelected?.(hexId);
      } else if (this.config.count === 1 && this.selectedHexes.length === 1) {
        // Single selection mode - replace current selection
        const oldHexId = this.selectedHexes[0];
        this.onHexDeselected?.(oldHexId);
        this.onHexSelected?.(hexId);
      }
    } catch (error) {
      logger.error('[HexSelector] Error handling canvas click:', error);
    }
  }

  /**
   * Validate all selected hexes and remove any that are now invalid
   * This handles cascading removals when a hex is deselected
   * 
   * @returns Array of hexIds that were removed due to being invalid
   */
  validateAndPruneInvalidSelections(): string[] {
    if (!this.config?.validateHex) {
      return [];
    }
    
    const removed: string[] = [];
    let changed = true;
    
    // Keep looping until no more hexes are removed (handles cascading)
    while (changed) {
      changed = false;
      
      for (let i = this.selectedHexes.length - 1; i >= 0; i--) {
        const hexId = this.selectedHexes[i];
        
        // Validate against current pending list (excluding this hex)
        const otherPending = this.selectedHexes.filter(id => id !== hexId);
        const isValid = this.config.validateHex(hexId, otherPending);
        
        if (!isValid) {
          this.onHexDeselected?.(hexId);
          removed.push(hexId);
          changed = true;
        }
      }
    }
    
    return removed;
  }

  /**
   * Reset hover state
   */
  resetHoverState(): void {
    this.currentHoveredHex = null;
    this.mapLayer.hideInteractiveHover();
  }
}
