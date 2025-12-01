/**
 * HexSelectorService - Main orchestrator for hex selection
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

import type { HexSelectionConfig } from './types';
import { ReignMakerMapLayer } from '../map/core/ReignMakerMapLayer';
import { logger } from '../../utils/Logger';
import { SceneManager } from './SceneManager';
import { HexRenderer } from './HexRenderer';
import { SelectionPanelManager } from './SelectionPanelManager';
import { CanvasInteractionHandler } from './CanvasInteractionHandler';

export type { HexSelectionConfig, HexSelectionType, ColorConfig } from './types';

export class HexSelectorService {
  private active = false;
  private config: HexSelectionConfig | null = null;
  private selectedHexes: string[] = [];
  private selectedRoadConnections: Map<string, string[]> = new Map();
  private resolve: ((result: any) => void) | null = null;
  
  // Components
  private mapLayer: ReignMakerMapLayer;
  private sceneManager: SceneManager;
  private renderer: HexRenderer;
  private panelManager: SelectionPanelManager;
  private interactionHandler: CanvasInteractionHandler;
  
  constructor() {
    this.mapLayer = ReignMakerMapLayer.getInstance();
    this.sceneManager = new SceneManager(this.mapLayer);
    this.renderer = new HexRenderer(this.mapLayer);
    this.panelManager = new SelectionPanelManager();
    this.interactionHandler = new CanvasInteractionHandler(this.mapLayer, this.renderer);
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
      this.selectedHexes = config.existingHexes || [];  // Pre-populate if provided
      this.active = true;
      
      logger.info(`[HexSelector] Starting selection with config:`, {
        mode: config.mode,
        count: config.count,
        existingHexesCount: config.existingHexes?.length || 0,
        existingHexes: config.existingHexes,
        selectedHexesCount: this.selectedHexes.length
      });
      
      try {
        // Configure components
        this.renderer.setConfig(config);
        
        // 1. Switch to kingdom scene
        await this.sceneManager.switchToKingdomScene();
        
        // 2. Minimize Reignmaker app
        this.sceneManager.minimizeReignmakerApp();
        
        // 3. Ensure map layer container is visible
        this.mapLayer.showPixiContainer();
        
        // 4. Show appropriate overlays based on action type
        await this.sceneManager.showRelevantOverlays(config.colorType);
        
        // 5. Mount floating panel
        this.panelManager.setConfig(
          config,
          this.selectedHexes,
          () => this.handleCancel(),
          () => this.handleDone()
        );
        this.panelManager.mountPanel();
        
        // Render pre-selected hexes immediately
        if (config.existingHexes && config.existingHexes.length > 0) {
          const style = this.renderer.getSelectionStyle();
          for (const hexId of config.existingHexes) {
            this.renderer.renderSelection(hexId, style);
          }
          this.panelManager.updatePanel();
        }
        
        // Listen for panel events
        const panelMount = document.getElementById('hex-selection-panel-mount');
        panelMount?.addEventListener('hex-deselected', ((e: CustomEvent) => {
          this.handleHexDeselection(e.detail.hexId);
        }) as EventListener);
        
        panelMount?.addEventListener('completed-ok', () => {
          this.handleCompletedOk();
        });
        
        // 6. Check for display mode
        const isDisplayMode = config.mode === 'display';
        
        if (isDisplayMode) {
          // Display-only mode: show completion panel immediately, resolve when user clicks OK
          logger.info('[HexSelector] Display mode - showing pre-selected hexes');
          
          // Detach any canvas listeners to prevent interaction
          this.interactionHandler.detachCanvasListeners();
          
          // Capture hex info for completion display (if available)
          let completionHexInfo: string | null = null;
          if (config.getHexInfo && this.selectedHexes.length > 0) {
            completionHexInfo = config.getHexInfo(this.selectedHexes[0]);
          }
          
          // Transition to completed state FIRST (panel shows before executing action)
          this.panelManager.transitionToCompleted(completionHexInfo);
          
          // THEN resolve promise with selected hexes (but only after panel is shown)
          // This allows the pipeline to continue to Step 8 (execute)
          // Note: We resolve immediately but the panel stays visible until user clicks OK
          const hexes = [...this.selectedHexes];
          const resolver = this.resolve;
          this.resolve = null;
          resolver?.(hexes);
        } else {
          // Interactive selection mode
          this.interactionHandler.setConfig(
            config,
            this.selectedHexes,
            this.selectedRoadConnections,
            (hexId) => this.handleHexSelection(hexId),
            (hexId) => this.handleHexDeselection(hexId),
            () => this.panelManager.updatePanel()
          );
          this.interactionHandler.attachCanvasListeners();
          
          // 7. Notify user
          const ui = (globalThis as any).ui;
          ui?.notifications?.info(`Click hexes on the map to select them`);
        }

      } catch (error) {
        logger.error('[HexSelector] Failed to start selection:', error);
        this.cleanup();
        resolve(null);
      }
    });
  }
  
  /**
   * Handle hex selection
   */
  private handleHexSelection(hexId: string): void {
    this.selectedHexes.push(hexId);
    
    // Get road connections for this hex (if road type)
    const roadConnections = this.config?.colorType === 'road'
      ? this.renderer.getAdjacentRoadsForPreview(hexId, this.selectedHexes)
      : undefined;
    
    // Store for later reference
    if (roadConnections) {
      this.selectedRoadConnections.set(hexId, roadConnections);
    }
    
    // Render selection
    const style = this.renderer.getSelectionStyle();
    this.renderer.renderSelection(hexId, style, roadConnections);
    
    // Update panel
    this.panelManager.setConfig(
      this.config!,
      this.selectedHexes,
      () => this.handleCancel(),
      () => this.handleDone()
    );
    this.panelManager.updatePanel();
    
    // Update hex info display (if callback provided)
    this.panelManager.updateHexInfo(hexId);
  }
  
  /**
   * Handle hex deselection
   */
  private handleHexDeselection(hexId: string): void {
    const index = this.selectedHexes.indexOf(hexId);
    if (index !== -1) {
      this.selectedHexes.splice(index, 1);
      this.selectedRoadConnections.delete(hexId);
      this.mapLayer.removeHexFromSelection(hexId);

      // Validate remaining selections and remove orphaned hexes
      this.interactionHandler.setConfig(
        this.config!,
        this.selectedHexes,
        this.selectedRoadConnections,
        (hexId) => this.handleHexSelection(hexId),
        (hexId) => this.handleHexDeselection(hexId),
        () => this.panelManager.updatePanel()
      );
      this.interactionHandler.validateAndPruneInvalidSelections();
      
      // Update panel
      this.panelManager.setConfig(
        this.config!,
        this.selectedHexes,
        () => this.handleCancel(),
        () => this.handleDone()
      );
      this.panelManager.updatePanel();
      
      // Clear hex info display (no hex selected anymore)
      this.panelManager.updateHexInfo(null);
    }
  }
  
  /**
   * Handle Done button click - returns hexes and shows completion panel
   */
  private async handleDone(): Promise<void> {
    // In display mode, skip count validation
    if (this.config?.mode !== 'display') {
      if (!this.config || this.selectedHexes.length !== this.config.count) {
        return;
      }
    }
    
    logger.info('[HexSelector] Done clicked, updating kingdom and showing completion');
    
    // Remove canvas listeners (no more interaction needed)
    this.interactionHandler.detachCanvasListeners();
    
    // Clear hover (but keep selection highlighted until user clicks OK)
    this.mapLayer.hideInteractiveHover();
    
    // Capture hex info BEFORE applying changes (shows cost that was actually paid)
    let completionHexInfo: string | null = null;
    if (this.config.getHexInfo && this.selectedHexes.length > 0) {
      completionHexInfo = this.config.getHexInfo(this.selectedHexes[0]);
    }
    
    // Return hexes to action (this triggers kingdom data update)
    const hexes = [...this.selectedHexes];
    const resolver = this.resolve;
    this.resolve = null;
    
    // Return data - if custom selector exists, return object with metadata
    const metadata = this.panelManager.getSelectedMetadata();
    if (this.config.customSelector && metadata) {
      resolver?.({ hexIds: hexes, metadata });
    } else {
      resolver?.(hexes);
    }
    
    // Give kingdom data update time to propagate to reactive overlays
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear selection layer (permanent overlays show through now)
    this.mapLayer.clearSelection();
    this.selectedRoadConnections.clear();
    
    // Set completion hex info (captured before changes were applied)
    if (completionHexInfo) {
      this.panelManager.setCompletionHexInfo(completionHexInfo);
    }
    
    // Switch to completed state - panel stays visible
    this.panelManager.setPanelState('completed');
    this.panelManager.updatePanel();
  }
  
  /**
   * Reveal selected hexes in World Explorer (for scout actions)
   */
  private async revealHexesInWorldExplorer(): Promise<void> {
    try {
      const { worldExplorerService } = await import('../WorldExplorerService');
      
      if (worldExplorerService.isAvailable()) {
        worldExplorerService.revealHexes(this.selectedHexes);
        logger.info('[HexSelector] Revealed hexes in World Explorer:', this.selectedHexes);
        
        const ui = (globalThis as any).ui;
        ui?.notifications?.info(`🗺️ Revealed ${this.selectedHexes.length} hex${this.selectedHexes.length !== 1 ? 'es' : ''} on the map`);
      } else {
        logger.warn('[HexSelector] World Explorer module not available - hexes not revealed');
      }
    } catch (error) {
      logger.error('[HexSelector] Failed to reveal hexes:', error);
    }
  }
  
  /**
   * Handle OK button click in completed state
   */
  private async handleCompletedOk(): Promise<void> {
    logger.info('[HexSelector] OK clicked, cleaning up');
    await this.cleanup();
  }
  
  /**
   * Handle Cancel button click
   */
  private async handleCancel(): Promise<void> {
    const resolver = this.resolve;
    await this.cleanup();
    resolver?.(null);
  }
  
  /**
   * Cleanup and restore state
   */
  private async cleanup(): Promise<void> {
    // Detach canvas listeners
    this.interactionHandler.detachCanvasListeners();
    
    // Clear interactive layers
    this.interactionHandler.resetHoverState();
    this.mapLayer.clearSelection();
    this.selectedRoadConnections.clear();
    
    // Restore player's overlay preferences
    await this.sceneManager.restoreOverlays();
    
    // Cleanup panel
    this.panelManager.cleanup();
    
    // Restore Reignmaker app
    this.sceneManager.restoreReignmakerApp();
    
    // Reset state
    this.active = false;
    this.config = null;
    this.selectedHexes = [];
    this.resolve = null;
  }
}

// Export singleton instance
export const hexSelectorService = new HexSelectorService();
