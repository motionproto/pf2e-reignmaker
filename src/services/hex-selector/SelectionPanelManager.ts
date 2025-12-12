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
  private perHexMetadata: Map<string, any> = new Map();  // Per-hex metadata (e.g., worksite type for each hex)
  
  // 2-Step Workflow State
  private currentStep: 'select-hex' | 'select-type' = 'select-hex';
  private pendingHex: string | null = null;
  private completedSelections: Array<{ hexId: string; metadata: any }> = [];
  
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
   * Get selected metadata (returns per-hex metadata map as object)
   */
  getSelectedMetadata(): any {
    if (this.perHexMetadata.size === 0) return null;
    
    // Convert Map to plain object for JSON serialization
    const metadata: Record<string, any> = {};
    this.perHexMetadata.forEach((value, key) => {
      metadata[key] = value;
    });
    
    return metadata;
  }

  /**
   * Check if 2-step workflow is active
   */
  is2StepWorkflow(): boolean {
    return Boolean(this.config?.customSelector && this.config.colorType === 'worksite');
  }

  /**
   * Get current workflow step
   */
  getCurrentStep(): 'select-hex' | 'select-type' {
    return this.currentStep;
  }

  /**
   * Handle hex selection in 2-step workflow
   * Returns true if hex should be added to selection, false if it should be blocked
   */
  handle2StepHexSelection(hexId: string): boolean {
    if (!this.is2StepWorkflow()) {
      return true; // Not in 2-step workflow, allow normal selection
    }

    // In 2-step workflow
    if (this.currentStep === 'select-hex') {
      // Step 1: User clicked a hex
      // Check if already completed or pending
      const alreadyCompleted = this.completedSelections.some(s => s.hexId === hexId);
      if (alreadyCompleted) {
        return false; // Don't allow selecting same hex twice
      }

      // Set as pending and transition to step 2
      this.pendingHex = hexId;
      this.currentStep = 'select-type';
      this.updatePanel();
      return true; // Allow hex to be added to selectedHexes
    } else {
      // Step 2: User is choosing type, block hex clicks
      return false;
    }
  }

  /**
   * Check if hex selection should be blocked in 2-step workflow
   */
  shouldBlockHexSelection(): boolean {
    return this.is2StepWorkflow() && this.currentStep === 'select-type';
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
    
    // Check if we should use 2-step workflow (only for custom selectors)
    const use2StepWorkflow = this.config.customSelector && this.config.colorType === 'worksite';
    
    if (use2StepWorkflow) {
      this.render2StepWorkflow(slotsContainer, btnDone);
    } else {
      this.renderTraditionalWorkflow(slotsContainer, btnDone);
    }
  }

  /**
   * Render 2-step workflow (for custom selector configs like worksite creation)
   */
  private render2StepWorkflow(slotsContainer: Element, btnDone: HTMLButtonElement | null): void {
    if (!this.config) return;
    
    slotsContainer.innerHTML = '';
    
    // Render completed selections as tokens
    if (this.completedSelections.length > 0) {
      const tokensContainer = document.createElement('div');
      tokensContainer.style.cssText = `
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #D2691E;
      `;
      
      const tokensHeader = document.createElement('div');
      tokensHeader.style.cssText = 'font-size: 12px; color: #999; margin-bottom: 8px;';
      tokensHeader.textContent = 'Completed Selections:';
      tokensContainer.appendChild(tokensHeader);
      
      this.completedSelections.forEach(({ hexId, metadata }) => {
        const token = document.createElement('div');
        const terrain = this.getHexTerrain(hexId);
        const worksiteType = metadata.worksiteType || 'Worksite';
        
        token.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(76, 175, 80, 0.2);
          border: 1px solid #4CAF50;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 14px;
        `;
        
        token.innerHTML = `
          <span style="flex: 1; color: #4CAF50;">
            <i class="fas fa-industry"></i> ${worksiteType} at ${hexId} <span style="font-size: 12px; color: #999;">[${terrain}]</span>
          </span>
          <i class="fas fa-times-circle" data-hex-id="${hexId}" style="color: #999; cursor: pointer; font-size: 16px;" title="Remove"></i>
        `;
        
        // Wire up dismiss button
        const dismissBtn = token.querySelector('.fa-times-circle');
        dismissBtn?.addEventListener('click', () => {
          this.removeCompletedSelection(hexId);
        });
        
        tokensContainer.appendChild(token);
      });
      
      slotsContainer.appendChild(tokensContainer);
    }
    
    // Render step indicators
    const stepsContainer = document.createElement('div');
    stepsContainer.style.cssText = 'margin-bottom: 12px;';
    
    // Step 1: Select a Hex
    const step1 = document.createElement('div');
    const step1Active = this.currentStep === 'select-hex';
    step1.style.cssText = `
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      ${step1Active 
        ? 'background: rgba(210, 105, 30, 0.2); border: 2px solid #D2691E;' 
        : 'background: rgba(255, 255, 255, 0.05); border: 1px solid #666; opacity: 0.6;'}
    `;
    
    const step1Icon = step1Active ? '<i class="fas fa-hand-pointer"></i>' : '<i class="fas fa-check"></i>';
    const step1Text = this.pendingHex 
      ? `Step 1: Select a Hex ✓<br><span style="font-size: 12px; color: #999;">Hex ${this.pendingHex} [${this.getHexTerrain(this.pendingHex)}] selected</span>`
      : `Step 1: Select a Hex<br><span style="font-size: 12px; color: #999;">${step1Active ? 'Click a hex on the map...' : ''}</span>`;
    
    step1.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; color: ${step1Active ? '#D2691E' : '#999'};">
        ${step1Icon} ${step1Text}
      </div>
    `;
    stepsContainer.appendChild(step1);
    
    // Step 2: Choose Worksite Type
    const step2 = document.createElement('div');
    const step2Active = this.currentStep === 'select-type';
    step2.style.cssText = `
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      ${step2Active 
        ? 'background: rgba(210, 105, 30, 0.2); border: 2px solid #D2691E;' 
        : 'background: rgba(255, 255, 255, 0.05); border: 1px solid #666; opacity: 0.6;'}
    `;
    
    step2.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; color: ${step2Active ? '#D2691E' : '#999'};">
        <i class="fas fa-industry"></i> Step 2: Choose Worksite Type<br>
        <span style="font-size: 12px; color: #999;">${step2Active ? '' : '(Select a hex first)'}</span>
      </div>
    `;
    stepsContainer.appendChild(step2);
    
    slotsContainer.appendChild(stepsContainer);
    
    // Progress indicator
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = `
      text-align: center;
      padding: 8px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #999;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    `;
    
    const completed = this.completedSelections.length;
    const total = this.config.count;
    const allComplete = completed === total;
    
    progressDiv.innerHTML = allComplete
      ? `<i class="fas fa-check-circle" style="color: #4CAF50;"></i> All selections complete! (${completed} of ${total})`
      : `Progress: ${completed} of ${total} completed`;
    
    slotsContainer.appendChild(progressDiv);
    
    // Mount custom selector if in step 2
    if (step2Active && this.pendingHex) {
      const customMount = document.createElement('div');
      customMount.id = 'custom-selector-mount';
      slotsContainer.appendChild(customMount);
      
      this.mountCustomSelectorFor2Step(customMount, this.pendingHex);
    }
    
    // Update Done button
    if (btnDone) {
      btnDone.disabled = !allComplete;
      btnDone.style.opacity = allComplete ? '1' : '0.5';
    }
  }

  /**
   * Remove a completed selection
   */
  private removeCompletedSelection(hexId: string): void {
    logger.info(`[SelectionPanelManager] Removing completed selection: ${hexId}`);
    
    // Remove from completed selections
    this.completedSelections = this.completedSelections.filter(s => s.hexId !== hexId);
    
    // Remove from metadata map
    this.perHexMetadata.delete(hexId);
    
    // Remove from selected hexes array
    const index = this.selectedHexes.indexOf(hexId);
    if (index > -1) {
      this.selectedHexes.splice(index, 1);
      logger.info(`[SelectionPanelManager] Removed ${hexId} from selectedHexes. Remaining:`, this.selectedHexes);
    }
    
    // If we're currently in step 2 with this hex, reset to step 1
    if (this.pendingHex === hexId) {
      this.pendingHex = null;
      this.currentStep = 'select-hex';
    }
    
    // Dispatch event to deselect from map (this should trigger handleHexDeselection in HexSelectorService)
    const event = new CustomEvent('hex-deselected', { 
      detail: { hexId },
      bubbles: true 
    });
    this.panelMountPoint?.dispatchEvent(event);
    
    // Update panel display
    this.updatePanel();
  }

  /**
   * Mount custom selector for 2-step workflow
   */
  private mountCustomSelectorFor2Step(container: Element, hexId: string): void {
    if (!this.config?.customSelector) return;
    
    // Unmount previous instance if exists
    if (this.panelComponent) {
      this.panelComponent.$destroy();
      this.panelComponent = null;
    }
    
    // Import and mount the component
    const ComponentConstructor = this.config.customSelector.component;
    
    this.panelComponent = new ComponentConstructor({
      target: container,
      props: {
        selectedHex: hexId,
        onSelect: (metadata: any) => {
          // Store metadata for the pending hex
          logger.info(`[SelectionPanelManager] 2-step: Storing metadata for hex ${hexId}:`, metadata);
          
          // Add to completed selections
          this.completedSelections.push({ hexId, metadata });
          this.perHexMetadata.set(hexId, metadata);
          
          // Reset to step 1 for next selection
          this.pendingHex = null;
          this.currentStep = 'select-hex';
          
          // Update panel
          this.updatePanel();
        },
        ...this.config.customSelector.props
      }
    });
  }

  /**
   * Render traditional workflow (for non-custom-selector configs)
   */
  private renderTraditionalWorkflow(slotsContainer: Element, btnDone: HTMLButtonElement | null): void {
    if (!this.config) return;
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
    
    // Check if all selected hexes have metadata (if required)
    let allHexesHaveMetadata = true;
    if (metadataRequired) {
      for (const hexId of this.selectedHexes) {
        if (!this.perHexMetadata.has(hexId)) {
          allHexesHaveMetadata = false;
          break;
        }
      }
    }
    
    const isComplete = this.selectedHexes.length === this.config.count && allHexesHaveMetadata;
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
    const selectedHex = this.selectedHexes[this.selectedHexes.length - 1];  // Most recently selected hex
    
    this.panelComponent = new ComponentConstructor({
      target: customMount,
      props: {
        selectedHex,
        onSelect: (metadata: any) => {
          // Store metadata for the current hex
          if (selectedHex) {
            logger.info(`[SelectionPanelManager] Storing metadata for hex ${selectedHex}:`, metadata);
            this.perHexMetadata.set(selectedHex, metadata);
            this.updatePanel();
          }
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
    
    // Generate metadata display HTML if per-hex data exists
    let metadataHTML = '';
    if (this.perHexMetadata.size > 0) {
      const metadataEntries = Array.from(this.perHexMetadata.entries());
      const displayEntries = metadataEntries.map(([hexId, data]) => {
        const worksiteType = data.worksiteType || 'Worksite';
        return `<div style="font-size: var(--font-lg); color: var(--text-secondary);">${worksiteType} on ${hexId}</div>`;
      }).join('');
      
      metadataHTML = `
        <div style="margin-bottom: 16px;">
          <div style="font-size: var(--font-2xl); font-weight: var(--font-weight-bold); color: var(--text-primary); margin-bottom: 4px;">
            Worksites Created
          </div>
          ${displayEntries}
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
    const panelMount = this.panelMountPoint;
    if (btnOk && panelMount) {
      btnOk.addEventListener('click', () => {
        const event = new CustomEvent('completed-ok');
        panelMount.dispatchEvent(event);
      });
    }
    
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
    this.perHexMetadata.clear();
    this.completedSelections = [];
    this.currentStep = 'select-hex';
    this.pendingHex = null;
    this.config = null;
    this.selectedHexes = [];
    this.onCancel = null;
    this.onDone = null;
  }
}
