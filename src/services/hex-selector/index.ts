/**
 * HexSelectorService - General-purpose hex selection utility
 * 
 * Provides a Promise-based API for selecting hexes from the Kingmaker map.
 * Minimizes the Reignmaker app, enters hex selection mode with a floating panel,
 * and returns the selected hex coordinates.
 * 
 * Usage:
 * ```typescript
 * const hexes = await hexSelectorService.selectHexes({
 *   title: 'Select Hexes to Claim',
 *   count: 3,
 *   colorType: 'claim'
 * });
 * ```
 */

import { positionToOffset, hexToKingmakerId } from './coordinates';
import type { HexSelectionConfig } from './types';
import { HEX_HIGHLIGHT_COLORS } from './types';
import { ReignMakerMapLayer } from '../map/ReignMakerMapLayer';
import { getOverlayManager } from '../map/OverlayManager';
import type { HexStyle } from '../map/types';
import { getKingdomData } from '../../stores/KingdomStore';
import { getAdjacentRoadsAndSettlements } from '../../actions/build-roads/roadValidator';
import { logger } from '../../utils/Logger';
import { appWindowManager } from '../ui/AppWindowManager';

export type { HexSelectionConfig, HexSelectionType, ColorConfig } from './types';

export class HexSelectorService {
  private active = false;
  private config: HexSelectionConfig | null = null;
  private selectedHexes: string[] = [];
  private selectedRoadConnections: Map<string, string[]> = new Map();  // Track road connections for preview
  private mapLayer: ReignMakerMapLayer;
  private overlayManager = getOverlayManager();
  private canvasClickHandler: ((event: any) => void) | null = null;
  private canvasMoveHandler: ((event: any) => void) | null = null;
  private resolve: ((hexes: string[] | null) => void) | null = null;
  private panelMountPoint: HTMLElement | null = null;
  private panelComponent: any = null;  // Svelte component instance
  private currentHoveredHex: string | null = null;
  
  constructor() {
    this.mapLayer = ReignMakerMapLayer.getInstance();
  }
  
  /**
   * Main entry point - returns Promise that resolves when selection complete
   */
  async selectHexes(config: HexSelectionConfig): Promise<string[] | null> {
    if (this.active) {
      throw new Error('Hex selection already in progress');
    }
    
    return new Promise(async (resolve) => {
      this.resolve = resolve;
      this.config = config;
      this.selectedHexes = [];
      this.active = true;
      
      try {
        // 1. Switch to kingdom scene
        await this.switchToKingdomScene();
        
        // 2. Minimize Reignmaker app
        this.minimizeReignmakerApp();
        
        // 3. Ensure map layer container is visible
        this.mapLayer.showPixiContainer();
        
        // 4. Show appropriate overlays based on action type
        await this.showRelevantOverlays(config.colorType);
        
        // 5. Mount floating panel
        this.mountPanel();
        
        // 6. Attach canvas listeners (click and hover)
        this.attachCanvasListeners();
        
        // 7. Notify user
        const ui = (globalThis as any).ui;
        ui?.notifications?.info(`Click hexes on the map to select them`);

      } catch (error) {
        logger.error('[HexSelector] Failed to start selection:', error);
        this.cleanup();
        resolve(null);
      }
    });
  }
  
  /**
   * Switch to the kingdom map scene
   */
  private async switchToKingdomScene(): Promise<void> {

    try {
      const game = (globalThis as any).game;
      
      // Get kingdom scene ID from settings
      const sceneId = game.settings?.get('pf2e-reignmaker', 'kingdomSceneId');

      if (!sceneId) {
        logger.warn('[HexSelector] ⚠️  No kingdom scene configured in settings - skipping scene switch');

        return;
      }
      
      const scene = game.scenes?.get(sceneId);

      if (!scene) {
        logger.warn('[HexSelector] ⚠️  Kingdom scene not found:', sceneId);
        return;
      }
      
      // Only switch if not already viewing this scene
      const currentSceneId = game.scenes?.active?.id;

      if (currentSceneId !== sceneId) {

        await scene.view();

        // Give the scene time to render
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {

      }
    } catch (error) {
      logger.warn('[HexSelector] ❌ Failed to switch scene:', error);
    }
  }
  
  /**
   * Minimize the Reignmaker Application window
   */
  private minimizeReignmakerApp(): void {
    appWindowManager.enterMapMode('slide');
  }
  
  /**
   * Restore the Reignmaker Application window
   */
  private restoreReignmakerApp(): void {
    appWindowManager.exitMapMode();
  }
  
  /**
   * Attach canvas listeners (click and mousemove)
   */
  private attachCanvasListeners(): void {
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
   * Show relevant overlays based on action type
   */
  private async showRelevantOverlays(colorType: string): Promise<void> {

    // Clear any existing selection/hover layers
    this.mapLayer.clearSelection();
    this.mapLayer.hideInteractiveHover();
    
    // Show appropriate overlays based on action type
    switch (colorType) {
      case 'claim':
      case 'scout':
        // Show territory for claiming/scouting
        await this.overlayManager.showOverlay('territories');
        await this.overlayManager.showOverlay('territory-border');
        break;
        
      case 'road':
        // Show territory, existing roads, AND settlements for road building
        // (settlements count as roads for adjacency)
        await this.overlayManager.showOverlay('territories');
        await this.overlayManager.showOverlay('territory-border');
        await this.overlayManager.showOverlay('roads');
        await this.overlayManager.showOverlay('settlement-icons');
        break;
        
      case 'settlement':
        // Show territory, existing settlements, and settlement icons
        await this.overlayManager.showOverlay('territories');
        await this.overlayManager.showOverlay('territory-border');
        await this.overlayManager.showOverlay('settlements');
        await this.overlayManager.showOverlay('settlement-icons');
        break;
    }
  }
  
  /**
   * Get hover style for action type
   */
  private getHoverStyle(): HexStyle {
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
  private getSelectionStyle(): HexStyle {
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
      default: return 'newClaim';
    }
  }
  
  /**
   * Handle canvas mousemove event (hover detection)
   */
  private handleCanvasMove(event: any): void {
    if (!this.active || !this.config) return;
    
    try {
      // Get mouse position
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);
      
      // Convert to hex offset
      const offset = positionToOffset(position.x, position.y);
      
      // Convert to Kingmaker format
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
        
        // Validate hex if validation function provided (pass pending selections for road chaining)
        const isValid = !this.config.validationFn || this.config.validationFn(hexId, this.selectedHexes);
        
        if (isValid) {
          // Get road preview for 'road' type (include pending roads)
          const roadPreview = this.config.colorType === 'road'
            ? this.getAdjacentRoadsForPreview(hexId)
            : undefined;
          
          // Show hover with optional road preview
          const style = this.getHoverStyle();
          this.mapLayer.showInteractiveHover(hexId, style, roadPreview);
        } else {
          // Show invalid hover (red, no preview)
          const invalidStyle = { fillColor: 0xFF0000, fillAlpha: 0.2 };
          this.mapLayer.showInteractiveHover(hexId, invalidStyle);
        }
      }
    } catch (error) {
      // Silently fail for hover - might be outside valid hex area
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
    if (!this.active || !this.config) return;
    
    try {
      // Get click position
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);
      
      // Convert to hex offset
      const offset = positionToOffset(position.x, position.y);
      
      // Convert to Kingmaker format
      const hexId = hexToKingmakerId(offset);

      // Validate hex if validation function provided (pass pending selections for road chaining)
      if (this.config.validationFn && !this.config.validationFn(hexId, this.selectedHexes)) {
        const ui = (globalThis as any).ui;
        ui?.notifications?.warn(`Cannot select this hex - it doesn't meet the requirements`);
        return;
      }
      
      // Toggle selection
      const index = this.selectedHexes.indexOf(hexId);
      const allowToggle = this.config.allowToggle !== false;
      
      if (index !== -1) {
        // Already selected - deselect if allowed
        if (allowToggle) {
          this.selectedHexes.splice(index, 1);
          this.selectedRoadConnections.delete(hexId);
          this.mapLayer.removeHexFromSelection(hexId);

          // Validate remaining selections and remove orphaned hexes
          const removed = this.validateAndPruneInvalidSelections();
          if (removed.length > 0) {

          }
          
          this.updatePanel();
        }
      } else if (this.selectedHexes.length < this.config.count) {
        // Not selected and room available - select
        this.selectedHexes.push(hexId);
        
        // Get road connections for this hex (if road type)
        const roadConnections = this.config.colorType === 'road'
          ? this.getAdjacentRoadsForPreview(hexId)
          : undefined;
        
        // Store for later reference
        if (roadConnections) {
          this.selectedRoadConnections.set(hexId, roadConnections);
        }
        
        const style = this.getSelectionStyle();
        this.mapLayer.addHexToSelection(hexId, style, roadConnections);
        this.updatePanel();

      }
    } catch (error) {
      logger.error('[HexSelector] Error handling canvas click:', error);
    }
  }
  
  /**
   * Get adjacent road hexes for preview (includes pending roads)
   */
  private getAdjacentRoadsForPreview(hexId: string): string[] {
    const kingdom = getKingdomData();
    return getAdjacentRoadsAndSettlements(hexId, kingdom, this.selectedHexes);
  }
  
  /**
   * Validate all selected hexes and remove any that are now invalid
   * This handles cascading removals when a hex is deselected
   * 
   * @returns Array of hexIds that were removed due to being invalid
   */
  private validateAndPruneInvalidSelections(): string[] {
    if (!this.config?.validationFn) {
      return [];
    }
    
    const removed: string[] = [];
    let changed = true;
    
    // Keep looping until no more hexes are removed (handles cascading)
    while (changed) {
      changed = false;
      
      // Check each hex against current pending list
      for (let i = this.selectedHexes.length - 1; i >= 0; i--) {
        const hexId = this.selectedHexes[i];
        
        // Validate against current pending list (excluding this hex)
        const otherPending = this.selectedHexes.filter(id => id !== hexId);
        const isValid = this.config.validationFn(hexId, otherPending);
        
        if (!isValid) {

          this.selectedHexes.splice(i, 1);
          this.selectedRoadConnections.delete(hexId);
          this.mapLayer.removeHexFromSelection(hexId);
          removed.push(hexId);
          changed = true;
        }
      }
    }
    
    return removed;
  }
  
  /**
   * Mount floating panel
   */
  private mountPanel(): void {
    // Create mount point
    this.panelMountPoint = document.createElement('div');
    this.panelMountPoint.id = 'hex-selection-panel-mount';
    document.body.appendChild(this.panelMountPoint);
    
    // TODO: Mount Svelte component here when HexSelectionPanel is created
    // For now, create a simple HTML panel as placeholder
    this.createSimplePanel();
  }
  
  /**
   * Create a simple HTML panel (temporary until Svelte component is ready)
   */
  private createSimplePanel(): void {
    if (!this.panelMountPoint || !this.config) return;
    
    const panel = document.createElement('div');
    panel.className = 'hex-selection-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      z-index: 1000;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #D2691E;
      border-radius: 8px;
      padding: 16px;
      min-width: 280px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    panel.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #D2691E;">
        <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-map-marked-alt"></i>
          ${this.config.title}
        </h3>
      </div>
      <div id="hex-slots" style="margin-bottom: 12px;">
        <!-- Slots will be added here -->
      </div>
      <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid #D2691E;">
        <button id="btn-cancel" style="flex: 1; padding: 8px; background: #333; border: 1px solid #666; border-radius: 4px; color: white; cursor: pointer;">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button id="btn-done" style="flex: 1; padding: 8px; background: #D2691E; border: none; border-radius: 4px; color: white; cursor: pointer;" disabled>
          <i class="fas fa-check"></i> Done
        </button>
      </div>
    `;
    
    this.panelMountPoint.appendChild(panel);
    
    // Wire up buttons
    const btnCancel = panel.querySelector('#btn-cancel') as HTMLButtonElement;
    const btnDone = panel.querySelector('#btn-done') as HTMLButtonElement;
    
    btnCancel?.addEventListener('click', () => this.handleCancel());
    btnDone?.addEventListener('click', () => this.handleDone());
    
    // Initial slot render
    this.updatePanel();
  }
  
  /**
   * Update panel with current selection state
   */
  private updatePanel(): void {
    if (!this.panelMountPoint || !this.config) return;
    
    const slotsContainer = this.panelMountPoint.querySelector('#hex-slots');
    const btnDone = this.panelMountPoint.querySelector('#btn-done') as HTMLButtonElement;
    
    if (!slotsContainer) return;
    
    // Render slots
    slotsContainer.innerHTML = '';
    for (let i = 0; i < this.config.count; i++) {
      const slot = document.createElement('div');
      const hexId = this.selectedHexes[i];
      
      slot.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: ${hexId ? 'rgba(210, 105, 30, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
        border: 1px solid ${hexId ? '#D2691E' : '#333'};
        border-radius: 4px;
        margin-bottom: 4px;
        cursor: ${hexId ? 'pointer' : 'default'};
      `;
      
      slot.innerHTML = `
        <span style="font-weight: bold; color: #999; min-width: 30px;">[${i + 1}]</span>
        ${hexId 
          ? `<span style="flex: 1; font-family: monospace; font-size: 16px; color: #D2691E;">${hexId}</span>
             <i class="fas fa-check" style="color: #4CAF50;"></i>`
          : `<span style="flex: 1; font-family: monospace; color: #666; opacity: 0.5;">______</span>`
        }
      `;
      
      // Allow clicking to deselect
      if (hexId) {
        slot.addEventListener('click', () => {
          const index = this.selectedHexes.indexOf(hexId);
          if (index !== -1) {
            this.selectedHexes.splice(index, 1);
            this.selectedRoadConnections.delete(hexId);
            this.mapLayer.removeHexFromSelection(hexId);

            // Validate remaining selections and remove orphaned hexes
            const removed = this.validateAndPruneInvalidSelections();
            if (removed.length > 0) {

            }
            
            this.updatePanel();
          }
        });
      }
      
      slotsContainer.appendChild(slot);
    }
    
    // Update Done button
    const isComplete = this.selectedHexes.length === this.config.count;
    if (btnDone) {
      btnDone.disabled = !isComplete;
      btnDone.style.opacity = isComplete ? '1' : '0.5';
    }
  }
  
  /**
   * Handle Done button click
   */
  private handleDone(): void {
    if (!this.config || this.selectedHexes.length !== this.config.count) {
      return;
    }

    const hexes = [...this.selectedHexes];
    const resolver = this.resolve; // Save resolver before cleanup
    this.cleanup();
    resolver?.(hexes); // Call after cleanup
  }
  
  /**
   * Handle Cancel button click
   */
  private handleCancel(): void {

    const resolver = this.resolve; // Save resolver before cleanup
    this.cleanup();
    resolver?.(null); // Call after cleanup
  }
  
  /**
   * Cleanup and restore state
   */
  private cleanup(): void {
    // Remove canvas listeners
    const canvas = (globalThis as any).canvas;
    if (this.canvasClickHandler) {
      canvas?.stage?.off('click', this.canvasClickHandler);
      this.canvasClickHandler = null;
    }
    if (this.canvasMoveHandler) {
      canvas?.stage?.off('mousemove', this.canvasMoveHandler);
      this.canvasMoveHandler = null;
    }
    
    // Clear interactive layers
    this.mapLayer.hideInteractiveHover();
    this.mapLayer.clearSelection();
    this.currentHoveredHex = null;
    this.selectedRoadConnections.clear();
    
    // Hide overlays that were shown
    // Note: We don't clear ALL overlays, just the ones we might have shown
    // This allows users to keep their toolbar overlays active
    
    // Remove panel
    if (this.panelMountPoint) {
      this.panelMountPoint.remove();
      this.panelMountPoint = null;
    }
    
    // Restore Reignmaker app
    this.restoreReignmakerApp();
    
    // Reset state
    this.active = false;
    this.config = null;
    this.selectedHexes = [];
    this.resolve = null;
    this.panelComponent = null;
  }
}

// Export singleton instance
export const hexSelectorService = new HexSelectorService();
