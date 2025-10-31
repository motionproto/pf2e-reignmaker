/**
 * ArmyDeploymentPanel - Army selection + movement plotting UI
 * 
 * Similar to HexSelectorService but for army deployment:
 * - Shows floating panel with list of armies on map
 * - Allows selection via panel click or token click
 * - Integrates with armyMovementMode for path plotting
 * - Returns army + path for skill check + gameCommand execution
 */

import { logger } from '../../utils/Logger';
import { armyMovementMode } from './movementMode';
import { getKingdomData } from '../../stores/KingdomStore';
import type { Army } from '../../models/Army';
import { appWindowManager } from '../ui/AppWindowManager';

export interface DeploymentResult {
  armyId: string;
  path: string[];
  skill: string;
}

export class ArmyDeploymentPanel {
  private active = false;
  private skill: string = '';
  private selectedArmyId: string | null = null;
  private plottedPath: string[] = [];
  private panelMountPoint: HTMLElement | null = null;
  private resolve: ((result: DeploymentResult | null) => void) | null = null;
  private tokenClickHandler: ((event: any) => void) | null = null;
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  
  /**
   * Main entry point - returns Promise that resolves when deployment complete
   */
  async selectArmyAndPlotPath(skill: string): Promise<DeploymentResult | null> {
    if (this.active) {
      throw new Error('Army deployment already in progress');
    }
    
    return new Promise(async (resolve) => {
      this.resolve = resolve;
      this.skill = skill;
      this.selectedArmyId = null;
      this.plottedPath = [];
      this.active = true;
      
      try {
        // 1. Minimize Reignmaker app
        this.minimizeReignmakerApp();
        
        // 2. Mount floating panel
        this.mountPanel();
        
        // 3. Attach canvas token click listener
        this.attachTokenClickListener();
        
        // 4. Attach escape key listener
        this.attachKeyListener();
        
        // 5. Notify user
        const ui = (globalThis as any).ui;
        ui?.notifications?.info(`Select an army from the panel or click an army token on the map`);
        
      } catch (error) {
        logger.error('[ArmyDeploymentPanel] Failed to start deployment:', error);
        this.cleanup();
        resolve(null);
      }
    });
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
   * Get all armies that have tokens on the current scene
   */
  private getArmiesOnMap(): Array<{army: Army, hexId: string | null}> {
    const kingdom = getKingdomData();
    if (!kingdom?.armies) return [];
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.scene) return [];
    
    const result: Array<{army: Army, hexId: string | null}> = [];
    
    for (const army of kingdom.armies) {
      if (!army.actorId) continue;
      
      // Find token for this army on current scene
      const tokens = canvas.scene.tokens.filter((t: any) => t.actorId === army.actorId);
      
      if (tokens.length > 0) {
        const token = tokens[0];
        
        // Get hex ID from token position
        const hexId = this.getTokenHexId(token);
        
        result.push({ army, hexId });
      }
    }
    
    return result;
  }
  
  /**
   * Get hex ID from token position
   */
  private getTokenHexId(tokenDoc: any): string | null {
    try {
      const { positionToOffset, hexToKingmakerId } = require('../hex-selector/coordinates');
      
      // Token center position (tokens positioned by top-left corner)
      const canvas = (globalThis as any).canvas;
      const gridSize = canvas?.grid?.size || 100;
      const centerX = tokenDoc.x + (tokenDoc.width * gridSize) / 2;
      const centerY = tokenDoc.y + (tokenDoc.height * gridSize) / 2;
      
      const offset = positionToOffset(centerX, centerY);
      return hexToKingmakerId(offset);
    } catch (error) {
      logger.error('[ArmyDeploymentPanel] Failed to get token hex:', error);
      return null;
    }
  }
  
  /**
   * Attach canvas token click listener
   */
  private attachTokenClickListener(): void {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage) {
      logger.error('[ArmyDeploymentPanel] Canvas not available');
      return;
    }
    
    this.tokenClickHandler = (event: any) => {
      // Check if we're clicking on a token
      const target = event.target;
      
      // Walk up the display object tree to find a token
      let current = target;
      while (current) {
        if (current.document?.documentName === 'Token') {
          const tokenDoc = current.document;
          
          // Check if this token is an army
          const armyMetadata = tokenDoc.actor?.getFlag('pf2e-reignmaker', 'army-metadata');
          if (armyMetadata?.armyId) {
            logger.info('[ArmyDeploymentPanel] Clicked army token:', armyMetadata.armyId);
            this.selectArmy(armyMetadata.armyId);
            return;
          }
        }
        current = current.parent;
      }
    };
    
    canvas.stage.on('click', this.tokenClickHandler);
    logger.info('[ArmyDeploymentPanel] Token click listener attached');
  }
  
  /**
   * Attach keyboard listener for Escape key
   */
  private attachKeyListener(): void {
    this.keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        logger.info('[ArmyDeploymentPanel] Escape pressed - cancelling');
        this.handleCancel();
      }
    };
    
    document.addEventListener('keydown', this.keyDownHandler);
  }
  
  /**
   * Select an army (from panel click or token click)
   */
  private async selectArmy(armyId: string): Promise<void> {
    logger.info('[ArmyDeploymentPanel] Selecting army:', armyId);
    
    // Deactivate current movement if any
    if (armyMovementMode.isActive()) {
      armyMovementMode.deactivate();
    }
    
    this.selectedArmyId = armyId;
    this.plottedPath = [];
    
    // Get army's current hex
    const armiesOnMap = this.getArmiesOnMap();
    const armyData = armiesOnMap.find(a => a.army.id === armyId);
    
    if (!armyData || !armyData.hexId) {
      logger.error('[ArmyDeploymentPanel] Could not find army hex');
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Could not determine army location');
      return;
    }
    
    // Activate movement mode
    await armyMovementMode.activateForArmy(armyId, armyData.hexId);
    
    // Set up path change callback
    armyMovementMode.setPathChangedCallback((path: string[]) => {
      this.plottedPath = path;
      this.updatePanel();
    });
    
    // Update panel UI
    this.updatePanel();
  }
  
  /**
   * Mount floating panel
   */
  private mountPanel(): void {
    this.panelMountPoint = document.createElement('div');
    this.panelMountPoint.id = 'army-deployment-panel-mount';
    document.body.appendChild(this.panelMountPoint);
    
    this.createPanel();
  }
  
  /**
   * Create panel HTML
   */
  private createPanel(): void {
    if (!this.panelMountPoint) return;
    
    const panel = document.createElement('div');
    panel.className = 'army-deployment-panel';
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
      min-width: 320px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    panel.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #D2691E;">
        <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-chess-knight"></i>
          Deploy Army
        </h3>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">
          Skill: <span style="color: #D2691E; font-weight: bold;">${this.skill}</span>
        </p>
      </div>
      <div id="army-list" style="margin-bottom: 12px; max-height: 400px; overflow-y: auto;">
        <!-- Armies will be added here -->
      </div>
      <div id="movement-info" style="margin-bottom: 12px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; font-size: 12px; color: #999; display: none;">
        <!-- Movement info will be shown here -->
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
    
    // Initial render
    this.updatePanel();
  }
  
  /**
   * Update panel with current selection state
   */
  private updatePanel(): void {
    if (!this.panelMountPoint) return;
    
    const armyList = this.panelMountPoint.querySelector('#army-list');
    const movementInfo = this.panelMountPoint.querySelector('#movement-info');
    const btnDone = this.panelMountPoint.querySelector('#btn-done') as HTMLButtonElement;
    
    if (!armyList) return;
    
    // Render army list
    const armiesOnMap = this.getArmiesOnMap();
    armyList.innerHTML = '';
    
    if (armiesOnMap.length === 0) {
      armyList.innerHTML = '<p style="color: #999; font-size: 12px; text-align: center; padding: 16px;">No armies found on current scene</p>';
    } else {
      for (const { army, hexId } of armiesOnMap) {
        const isSelected = army.id === this.selectedArmyId;
        
        const armyDiv = document.createElement('div');
        armyDiv.style.cssText = `
          padding: 12px;
          margin-bottom: 8px;
          background: ${isSelected ? 'rgba(210, 105, 30, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
          border: 2px solid ${isSelected ? '#D2691E' : 'transparent'};
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        `;
        
        armyDiv.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold; font-size: 14px;">${army.name}</span>
            ${isSelected ? '<i class="fas fa-check-circle" style="color: #4CAF50;"></i>' : ''}
          </div>
          <div style="font-size: 12px; color: #999;">
            Level ${army.level} • ${army.isSupported ? '<span style="color: #4CAF50;">Supported</span>' : '<span style="color: #ff6b6b;">Unsupported</span>'}
          </div>
          <div style="font-size: 11px; color: #666; font-family: monospace; margin-top: 4px;">
            Hex: ${hexId || 'Unknown'}
          </div>
        `;
        
        armyDiv.addEventListener('click', () => {
          this.selectArmy(army.id);
        });
        
        armyDiv.addEventListener('mouseenter', () => {
          if (!isSelected) {
            (armyDiv as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
          }
        });
        
        armyDiv.addEventListener('mouseleave', () => {
          if (!isSelected) {
            (armyDiv as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
          }
        });
        
        armyList.appendChild(armyDiv);
      }
    }
    
    // Update movement info
    if (movementInfo instanceof HTMLElement) {
      if (this.selectedArmyId && this.plottedPath.length > 0) {
        movementInfo.style.display = 'block';
        const hexCount = this.plottedPath.length;
        const movement = hexCount - 1; // First hex is origin
        movementInfo.innerHTML = `
          <div style="display: flex; justify-content: space-between;">
            <span>Path Length:</span>
            <span style="color: #D2691E; font-weight: bold;">${hexCount} hexes</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px;">
            <span>Movement Used:</span>
            <span style="color: ${movement >= 20 ? '#4CAF50' : '#D2691E'}; font-weight: bold;">${movement} / 20</span>
          </div>
        `;
      } else {
        movementInfo.style.display = 'none';
      }
    }
    
    // Update Done button
    const canComplete = this.selectedArmyId && this.plottedPath.length > 1;
    if (btnDone) {
      btnDone.disabled = !canComplete;
      btnDone.style.opacity = canComplete ? '1' : '0.5';
      btnDone.style.cursor = canComplete ? 'pointer' : 'not-allowed';
    }
  }
  
  /**
   * Handle Done button click
   */
  private handleDone(): void {
    if (!this.selectedArmyId || this.plottedPath.length < 2) {
      return;
    }
    
    logger.info('[ArmyDeploymentPanel] Deployment complete:', {
      armyId: this.selectedArmyId,
      pathLength: this.plottedPath.length,
      skill: this.skill
    });
    
    const result: DeploymentResult = {
      armyId: this.selectedArmyId,
      path: this.plottedPath,
      skill: this.skill
    };
    
    const resolver = this.resolve;
    this.cleanup();
    resolver?.(result);
  }
  
  /**
   * Handle Cancel button click
   */
  private handleCancel(): void {
    logger.info('[ArmyDeploymentPanel] Deployment cancelled');
    
    const resolver = this.resolve;
    this.cleanup();
    resolver?.(null);
  }
  
  /**
   * Cleanup and restore state
   */
  private cleanup(): void {
    // Remove token click listener
    const canvas = (globalThis as any).canvas;
    if (this.tokenClickHandler) {
      canvas?.stage?.off('click', this.tokenClickHandler);
      this.tokenClickHandler = null;
    }
    
    // Remove keyboard listener
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    
    // Deactivate movement mode
    if (armyMovementMode.isActive()) {
      armyMovementMode.deactivate();
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
    this.skill = '';
    this.selectedArmyId = null;
    this.plottedPath = [];
    this.resolve = null;
  }
}

// Export singleton instance
export const armyDeploymentPanel = new ArmyDeploymentPanel();
