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

import { HexHighlighter } from './HexHighlighter';
import { positionToOffset, hexToKingmakerId } from './coordinates';
import type { HexSelectionConfig } from './types';

export type { HexSelectionConfig, HexSelectionType, ColorConfig } from './types';

export class HexSelectorService {
  private active = false;
  private config: HexSelectionConfig | null = null;
  private selectedHexes: string[] = [];
  private highlighter: HexHighlighter | null = null;
  private canvasClickHandler: ((event: any) => void) | null = null;
  private resolve: ((hexes: string[] | null) => void) | null = null;
  private panelMountPoint: HTMLElement | null = null;
  private panelComponent: any = null;  // Svelte component instance
  
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
        
        // 3. Create highlighter
        this.highlighter = new HexHighlighter();
        
        // 4. Draw background highlights
        this.highlighter.drawKingdomTerritory();
        this.highlighter.drawExistingFeatures(config.colorType, config.existingHexes);
        
        // 5. Mount floating panel
        this.mountPanel();
        
        // 6. Attach canvas click listener
        this.attachCanvasListener();
        
        // 7. Notify user
        const ui = (globalThis as any).ui;
        ui?.notifications?.info(`Click hexes on the map to select them`);
        
        console.log(`🗺️ [HexSelector] Started selection mode: ${config.title} (${config.count} hexes)`);
      } catch (error) {
        console.error('[HexSelector] Failed to start selection:', error);
        this.cleanup();
        resolve(null);
      }
    });
  }
  
  /**
   * Switch to the kingdom map scene
   */
  private async switchToKingdomScene(): Promise<void> {
    console.log('[HexSelector] Attempting scene switch...');
    
    try {
      const game = (globalThis as any).game;
      
      // Get kingdom scene ID from settings
      const sceneId = game.settings?.get('pf2e-reignmaker', 'kingdomSceneId');
      console.log('[HexSelector] Kingdom scene ID from settings:', sceneId);
      
      if (!sceneId) {
        console.warn('[HexSelector] ⚠️  No kingdom scene configured in settings - skipping scene switch');
        console.log('[HexSelector] 💡 Configure scene in Module Settings to enable auto-switching');
        return;
      }
      
      const scene = game.scenes?.get(sceneId);
      console.log('[HexSelector] Scene lookup result:', scene?.name || 'NOT FOUND');
      
      if (!scene) {
        console.warn('[HexSelector] ⚠️  Kingdom scene not found:', sceneId);
        return;
      }
      
      // Only switch if not already viewing this scene
      const currentSceneId = game.scenes?.active?.id;
      console.log('[HexSelector] Current scene:', currentSceneId, '- Target scene:', sceneId);
      
      if (currentSceneId !== sceneId) {
        console.log('[HexSelector] Switching to scene:', scene.name);
        await scene.view();
        console.log('✅ [HexSelector] Switched to kingdom scene:', scene.name);
        
        // Give the scene time to render
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.log('✅ [HexSelector] Already viewing kingdom scene');
      }
    } catch (error) {
      console.warn('[HexSelector] ❌ Failed to switch scene:', error);
    }
  }
  
  /**
   * Minimize the Reignmaker Application window
   */
  private minimizeReignmakerApp(): void {
    console.log('[HexSelector] Attempting to minimize Reignmaker app...');
    
    try {
      const ui = (globalThis as any).ui;
      
      // IMPORTANT: The app's HTML element has id="pf2e-reignmaker"
      // Try multiple strategies to find the Reignmaker app
      let reignmakerApp = null;
      
      // Strategy 1: Find by element ID
      reignmakerApp = ui?.windows?.find((w: any) => 
        w.element?.id === 'pf2e-reignmaker' ||
        w.element?.[0]?.id === 'pf2e-reignmaker'
      );
      
      console.log('[HexSelector] Strategy 1 (element id="pf2e-reignmaker") result:', reignmakerApp ? 'FOUND' : 'not found');
      
      // Strategy 2: Find by constructor name
      if (!reignmakerApp) {
        reignmakerApp = ui?.windows?.find((w: any) => 
          w.constructor?.name === 'KingdomApp'
        );
        console.log('[HexSelector] Strategy 2 (constructor name) result:', reignmakerApp ? 'FOUND' : 'not found');
      }
      
      // Strategy 3: Find by title
      if (!reignmakerApp) {
        reignmakerApp = ui?.windows?.find((w: any) => 
          w.title?.includes('ReignMaker')
        );
        console.log('[HexSelector] Strategy 3 (title) result:', reignmakerApp ? 'FOUND' : 'not found');
      }
      
      if (reignmakerApp) {
        console.log('[HexSelector] Found app:', {
          constructor: reignmakerApp.constructor?.name,
          title: reignmakerApp.title,
          elementId: reignmakerApp.element?.id || reignmakerApp.element?.[0]?.id,
          minimized: reignmakerApp.minimized,
          hasMinimize: typeof reignmakerApp.minimize === 'function'
        });
        
        if (reignmakerApp.minimize && !reignmakerApp.minimized) {
          reignmakerApp.minimize();
          console.log('✅ [HexSelector] Minimized Reignmaker app');
        } else if (reignmakerApp.minimized) {
          console.log('ℹ️  [HexSelector] Reignmaker app already minimized');
        } else {
          console.warn('[HexSelector] ⚠️  App found but no minimize() method available');
        }
      } else {
        console.warn('[HexSelector] ⚠️  Could not find Reignmaker app to minimize');
        console.log('[HexSelector] 💡 App will need to be manually minimized');
      }
    } catch (error) {
      console.warn('[HexSelector] ❌ Failed to minimize Reignmaker app:', error);
    }
  }
  
  /**
   * Restore the Reignmaker Application window
   */
  private restoreReignmakerApp(): void {
    try {
      const ui = (globalThis as any).ui;
      
      // Find by element ID (matching minimize logic)
      let reignmakerApp = ui?.windows?.find((w: any) => 
        w.element?.id === 'pf2e-reignmaker' ||
        w.element?.[0]?.id === 'pf2e-reignmaker'
      );
      
      // Fallback to constructor name
      if (!reignmakerApp) {
        reignmakerApp = ui?.windows?.find((w: any) => 
          w.constructor?.name === 'KingdomApp'
        );
      }
      
      if (reignmakerApp && reignmakerApp.minimized) {
        reignmakerApp.maximize();
        console.log('✅ [HexSelector] Restored Reignmaker app');
      }
    } catch (error) {
      console.warn('[HexSelector] Failed to restore Reignmaker app:', error);
    }
  }
  
  /**
   * Attach canvas click listener
   */
  private attachCanvasListener(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      throw new Error('Canvas not available');
    }
    
    this.canvasClickHandler = this.handleCanvasClick.bind(this);
    canvas.stage.on('click', this.canvasClickHandler);
  }
  
  /**
   * Handle canvas click event
   */
  private handleCanvasClick(event: any): void {
    if (!this.active || !this.config || !this.highlighter) return;
    
    try {
      // Get click position
      const position = event.data.getLocalPosition((globalThis as any).canvas.stage);
      
      // Convert to hex offset
      const offset = positionToOffset(position.x, position.y);
      
      // Convert to Kingmaker format
      const hexId = hexToKingmakerId(offset);
      
      console.log(`🖱️ [HexSelector] Clicked hex: ${hexId}`);
      
      // Toggle selection
      const index = this.selectedHexes.indexOf(hexId);
      const allowToggle = this.config.allowToggle !== false;
      
      if (index !== -1) {
        // Already selected - deselect if allowed
        if (allowToggle) {
          this.selectedHexes.splice(index, 1);
          this.highlighter.removeHighlight(hexId);
          this.updatePanel();
          console.log(`  ↩️  Deselected hex: ${hexId}`);
        }
      } else if (this.selectedHexes.length < this.config.count) {
        // Not selected and room available - select
        this.selectedHexes.push(hexId);
        this.highlighter.highlightSelection(this.config.colorType, hexId);
        this.updatePanel();
        console.log(`  ✅ Selected hex: ${hexId} (${this.selectedHexes.length}/${this.config.count})`);
      }
    } catch (error) {
      console.error('[HexSelector] Error handling canvas click:', error);
    }
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
            this.highlighter?.removeHighlight(hexId);
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
    
    console.log(`✅ [HexSelector] Selection complete: ${this.selectedHexes.join(', ')}`);
    
    const hexes = [...this.selectedHexes];
    this.cleanup();
    this.resolve?.(hexes);
  }
  
  /**
   * Handle Cancel button click
   */
  private handleCancel(): void {
    console.log(`❌ [HexSelector] Selection cancelled`);
    
    this.cleanup();
    this.resolve?.(null);
  }
  
  /**
   * Cleanup and restore state
   */
  private cleanup(): void {
    // Remove canvas listener
    if (this.canvasClickHandler) {
      const canvas = (globalThis as any).canvas;
      canvas?.stage?.off('click', this.canvasClickHandler);
      this.canvasClickHandler = null;
    }
    
    // Cleanup highlighter
    if (this.highlighter) {
      this.highlighter.destroy();
      this.highlighter = null;
    }
    
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
