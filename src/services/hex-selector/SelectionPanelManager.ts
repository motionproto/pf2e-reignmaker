/**
 * SelectionPanelManager - Manages the floating selection panel UI
 * 
 * ## Two States of Hex Selection Dialog
 * 
 * ### State 1: Selection Panel (Interactive)
 * - User actively selects hexes from the map
 * - Custom selector components (like WorksiteTypeSelector) appear below hex slots
 * - Buttons: Cancel | Done
 * - Exit: Click "Done" → transitions to Completion Panel
 * 
 * ### State 2: Completion Panel (Review/Confirmation)
 * - Shows summary of what was selected (hexes + metadata)
 * - Displays completion message ("Worksite Created!", etc.)
 * - Button: OK (single button)
 * - Exit: Click "OK" → closes dialog, restores Reignmaker app
 */

import type { HexSelectionConfig } from './types';
import { getKingdomData } from '../../stores/KingdomStore';
import { logger } from '../../utils/Logger';

export class SelectionPanelManager {
  private config: HexSelectionConfig | null = null;
  private selectedHexes: string[] = [];
  private panelMountPoint: HTMLElement | null = null;
  private panelComponent: any = null;  // Svelte component instance (for custom selectors in Selection Panel)
  private panelState: 'selection' | 'revealing' | 'completed' = 'selection';
  private completionHexInfo: string | null = null;
  private selectedMetadata: any = null;  // Custom selector data (e.g., worksite type)
  
  // Callbacks
  private onCancel: (() => void) | null = null;
  private onDone: (() => void) | null = null;

  /**
   * Set configuration and callbacks
   */
  setConfig(
    config: HexSelectionConfig,
    selectedHexes: string[],
    onCancel: () => void,
    onDone: () => void
  ): void {
    this.config = config;
    this.selectedHexes = selectedHexes;
    this.onCancel = onCancel;
    this.onDone = onDone;
  }

  /**
   * Set selected metadata (for custom selectors)
   */
  setSelectedMetadata(metadata: any): void {
    this.selectedMetadata = metadata;
  }

  /**
   * Get selected metadata
   */
  getSelectedMetadata(): any {
    return this.selectedMetadata;
  }

  /**
   * Set panel state
   */
  setPanelState(state: 'selection' | 'revealing' | 'completed'): void {
    this.panelState = state;
  }

  /**
   * Set completion hex info
   */
  setCompletionHexInfo(info: string | null): void {
    this.completionHexInfo = info;
  }

  /**
   * Transition directly to completed state (for display mode)
   * Skips selection phase and goes straight to showing results
   */
  transitionToCompleted(hexInfo: string | null): void {
    this.panelState = 'completed';
    this.completionHexInfo = hexInfo;
    this.updatePanel();
  }

  /**
   * Mount floating panel
   */
  mountPanel(): void {
    // Create mount point
    this.panelMountPoint = document.createElement('div');
    this.panelMountPoint.id = 'hex-selection-panel-mount';
    document.body.appendChild(this.panelMountPoint);
    
    this.createSimplePanel();
  }

  /**
   * Create a simple HTML panel
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
      box-shadow: 0 4px 12px var(--overlay-high);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    panel.innerHTML = `
      <div class="panel-header" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #D2691E; cursor: move;">
        <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-map-marked-alt"></i>
          ${this.config.title}
        </h3>
      </div>
      <div id="hex-slots" style="margin-bottom: 12px;">
        <!-- Slots will be added here -->
      </div>
      <div id="hex-info" style="margin-bottom: 12px; display: none;"></div>
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
    
    btnCancel?.addEventListener('click', () => this.onCancel?.());
    btnDone?.addEventListener('click', () => this.onDone?.());
    
    // Add drag functionality
    this.makePanelDraggable(panel);
    
    // Initial slot render
    this.updatePanel();
  }

  /**
   * Make panel draggable by the header
   */
  private makePanelDraggable(panel: HTMLElement): void {
    const header = panel.querySelector('.panel-header') as HTMLElement;
    if (!header) return;
    
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    
    header.addEventListener('mousedown', (e: MouseEvent) => {
      isDragging = true;
      
      const rect = panel.getBoundingClientRect();
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;
      
      document.body.style.cursor = 'grabbing';
      header.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      
      panel.style.left = `${currentX}px`;
      panel.style.top = `${currentY}px`;
      panel.style.right = 'auto';
      panel.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        header.style.cursor = 'move';
      }
    });
  }

  /**
   * Get terrain type for a hex
   */
  private getHexTerrain(hexId: string): string {
    const kingdom = getKingdomData();
    const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
    return hex?.terrain || 'Unknown';
  }

  /**
   * Update hex info panel with hex-specific information
   * @param hexId - Hex to show info for, or null to clear
   */
  updateHexInfo(hexId: string | null): void {
    if (!this.panelMountPoint || !this.config) {
      return;
    }
    
    const hexInfoDiv = this.panelMountPoint.querySelector('#hex-info') as HTMLElement;
    if (!hexInfoDiv) {
      return;
    }
    
    // If no getHexInfo callback, hide panel
    if (!this.config.getHexInfo) {
      hexInfoDiv.style.display = 'none';
      return;
    }
    
    // If no hex selected, hide panel
    if (!hexId) {
      hexInfoDiv.style.display = 'none';
      return;
    }
    
    // Get hex info from callback
    const info = this.config.getHexInfo(hexId);
    
    if (!info) {
      // No info available for this hex, hide panel
      hexInfoDiv.style.display = 'none';
    } else {
      // Show panel with hex info
      hexInfoDiv.style.display = 'block';
      hexInfoDiv.innerHTML = info;
    }
  }

  /**
   * Update panel with current selection state or completion display
   */
  updatePanel(): void {
    if (!this.panelMountPoint || !this.config) return;
    
    if (this.panelState === 'completed') {
      this.renderCompletedState();
      return;
    }
    
    const slotsContainer = this.panelMountPoint.querySelector('#hex-slots');
    const btnDone = this.panelMountPoint.querySelector('#btn-done') as HTMLButtonElement;
    
    if (!slotsContainer) return;
    
    // 🔧 FIX: Preserve custom selector mount point if component is already mounted
    let customSelectorMount: HTMLElement | null = null;
    if (this.panelComponent) {
      customSelectorMount = slotsContainer.querySelector('#custom-selector-mount') as HTMLElement;
      if (customSelectorMount) {
        customSelectorMount.remove(); // Temporarily remove from DOM to preserve it
      }
    }
    
    // Render slots (this clears slotsContainer)
    slotsContainer.innerHTML = '';
    for (let i = 0; i < this.config.count; i++) {
      const slot = document.createElement('div');
      const hexId = this.selectedHexes[i];
      const terrain = hexId ? this.getHexTerrain(hexId) : '';
      
      slot.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: ${hexId ? 'rgba(210, 105, 30, 0.2)' : 'var(--hover-low)'};
        border: 1px solid ${hexId ? '#D2691E' : '#333'};
        border-radius: 4px;
        margin-bottom: 4px;
        cursor: ${hexId ? 'pointer' : 'default'};
      `;
      
      slot.innerHTML = `
        <span style="font-weight: bold; color: #999; min-width: 30px;">[${i + 1}]</span>
        ${hexId 
          ? `<span style="flex: 1; font-family: monospace; font-size: 16px; color: #D2691E;">${hexId} <span style="font-size: 12px; color: #999;">[${terrain}]</span></span>
             <i class="fas fa-minus-circle delete-btn" style="color: #999; cursor: pointer;" title="Remove selection"></i>`
          : `<span style="flex: 1; font-family: monospace; color: #666; opacity: 0.5;">______</span>`
        }
      `;
      
      slotsContainer.appendChild(slot);

      // Wire up delete button
      if (hexId) {
        const deleteBtn = slot.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          logger.info(`[SelectionPanel] Deselecting hex: ${hexId}`);
          const event = new CustomEvent('hex-deselected', { 
            detail: { hexId },
            bubbles: true 
          });
          this.panelMountPoint?.dispatchEvent(event);
        });
      }
    }
    
    // 🔧 FIX: Restore custom selector mount point or create new one
    // Always mount custom selector if configured (don't wait for hex selection)
    if (this.config.customSelector) {
      if (customSelectorMount) {
        // Re-attach preserved mount point
        slotsContainer.appendChild(customSelectorMount);
      } else {
        // Create new mount point and component (always remount if not preserved)
        this.mountCustomSelector(slotsContainer);
      }
    }
    
    // Update Done button
    // For settlement type, metadata is optional (has fallback), so don't require it
    const metadataRequired = this.config.customSelector && this.config.colorType !== 'settlement';
    const isComplete = this.selectedHexes.length === this.config.count && 
                       (!metadataRequired || this.selectedMetadata !== null);
    if (btnDone) {
      btnDone.disabled = !isComplete;
      btnDone.style.opacity = isComplete ? '1' : '0.5';
    }
  }

  /**
   * Mount custom selector component (e.g., WorksiteTypeSelector)
   */
  private mountCustomSelector(container: Element): void {
    if (!this.config?.customSelector) return;
    
    // Unmount previous instance if exists
    if (this.panelComponent) {
      this.panelComponent.$destroy();
      this.panelComponent = null;
    }
    
    // Create mount point for custom component
    const customMount = document.createElement('div');
    customMount.id = 'custom-selector-mount';
    container.appendChild(customMount);
    
    // Import and mount the component
    const ComponentConstructor = this.config.customSelector.component;
    const selectedHex = this.selectedHexes[0];
    
    this.panelComponent = new ComponentConstructor({
      target: customMount,
      props: {
        selectedHex,
        onSelect: (metadata: any) => {
          this.selectedMetadata = metadata;
          this.updatePanel();
        },
        ...this.config.customSelector.props
      }
    });
  }

  /**
   * Render completed state with hex list and OK button
   * Shows both hex selections and any custom selector metadata (e.g., worksite type)
   */
  private renderCompletedState(): void {
    if (!this.panelMountPoint || !this.config) return;
    
    const panel = this.panelMountPoint.querySelector('.hex-selection-panel') as HTMLElement;
    if (!panel) return;
    
    // Use custom title if provided (for display mode), otherwise use action-specific messages
    let title: string;
    let icon: string;
    
    if (this.config.mode === 'display') {
      // Display mode: use the custom title directly
      title = this.config.title;
      icon = this.config.colorType === 'destroyed' ? 'fa-exclamation-triangle' 
           : this.config.colorType === 'demanded' ? 'fa-bullseye'
           : 'fa-info-circle';
    } else {
      // Interactive mode: use action-specific messages
      const actionMessages: Record<string, string> = {
        scout: 'Hexes Revealed!',
        claim: 'Hexes Claimed!',
        road: 'Roads Built!',
        settlement: 'Settlement Established!',
        fortify: 'Hex Fortified!',
        unclaim: 'Hexes Unclaimed!',
        worksite: 'Worksite Created!',
        destroyed: 'Worksites Destroyed!',
        demanded: 'Citizens Demand This Hex!'
      };
      title = actionMessages[this.config.colorType] || 'Selection Complete!';
      icon = this.config.colorType === 'scout' ? 'fa-map-marked-alt' : 'fa-check-circle';
    }
    
    // Generate metadata display HTML if custom selector data exists
    let metadataHTML = '';
    if (this.selectedMetadata && this.selectedMetadata.worksiteType) {
      // Get production info from completionHexInfo if available
      const productionMatch = this.completionHexInfo?.match(/\+\d+\s+\w+/);
      const production = productionMatch ? productionMatch[0] : '';
      
      metadataHTML = `
        <div style="margin-bottom: 16px;">
          <div style="font-size: var(--font-2xl); font-weight: var(--font-weight-bold); color: var(--text-primary); margin-bottom: 4px;">
            ${this.selectedMetadata.worksiteType}
          </div>
          ${production ? `
            <div style="font-size: var(--font-lg); color: var(--text-secondary);">
              ${production}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    panel.innerHTML = `
      <div class="panel-header" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #D2691E; cursor: move;">
        <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas ${icon}"></i>
          ${title}
        </h3>
      </div>
      ${metadataHTML}
      <div style="padding: 20px;">
        <div style="background: var(--hover-low); border-radius: 4px; padding: 8px; margin-bottom: 16px;">
          ${this.config.mode === 'display' && this.config.getHexInfo ? `
            <!-- Display mode with custom hex info: show only the info, no "Selected X hexes" label -->
            <div style="max-height: 200px; overflow-y: auto;">
              ${this.selectedHexes.map(hexId => {
                const hexInfo = this.config.getHexInfo ? this.config.getHexInfo(hexId) : null;
                return `
                  <div style="padding: 8px 4px; font-size: var(--font-lg); border-bottom: 1px solid var(--border-subtle);">
                    ${hexInfo || hexId}
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <!-- Interactive mode or display without custom info: show "Selected X hexes" with hex IDs -->
            <div style="font-size: 12px; color: #999; margin-bottom: 4px;">Selected ${this.selectedHexes.length} ${this.selectedHexes.length === 1 ? 'hex' : 'hexes'}:</div>
            <div style="max-height: 200px; overflow-y: auto;">
              ${this.selectedHexes.map(hexId => {
                const terrain = this.getHexTerrain(hexId);
                return `
                  <div style="padding: 2px 4px; font-family: monospace; font-size: var(--font-md); color: #D2691E;">
                    ${hexId} <span style="font-size: 12px; color: #999;">[${terrain}]</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
          ${this.config.colorType === 'scout' ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #666; font-size: 12px; color: #999; text-align: center;">
              <i class="fas fa-eye"></i> Check the map to see newly revealed areas!
            </div>
          ` : ''}
        </div>
        <button id="btn-ok" style="width: 100%; padding: 12px; background: #4CAF50; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 16px; font-weight: bold;">
          <i class="fas fa-check"></i> OK
        </button>
      </div>
    `;
    
    // Wire up OK button (handled by parent through event)
    const btnOk = panel.querySelector('#btn-ok') as HTMLButtonElement;
    btnOk?.addEventListener('click', () => {
      const event = new CustomEvent('completed-ok');
      this.panelMountPoint?.dispatchEvent(event);
    });
    
    // Make panel draggable
    this.makePanelDraggable(panel);
  }

  /**
   * Cleanup panel and reset all state
   */
  cleanup(): void {
    if (this.panelMountPoint) {
      this.panelMountPoint.remove();
      this.panelMountPoint = null;
    }
    
    if (this.panelComponent) {
      this.panelComponent.$destroy();
      this.panelComponent = null;
    }
    
    // Reset all state for next use
    this.panelState = 'selection';
    this.completionHexInfo = null;
    this.selectedMetadata = null;
    this.config = null;
    this.selectedHexes = [];
    this.onCancel = null;
    this.onDone = null;
  }
}
