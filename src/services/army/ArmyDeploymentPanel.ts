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
import { positionToOffset, hexToKingmakerId } from '../hex-selector/coordinates';

export interface DeploymentResult {
  armyId: string;
  path: string[];
  skill: string;
}

export interface RollResultData {
  outcome: string;
  actorName: string;
  skillName?: string;
  rollBreakdown?: any;
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
  private rollCompleteHandler: ((event: any) => void) | null = null;
  private onRollTrigger: ((skill: string, armyId: string, path: string[]) => Promise<void>) | null = null;
  
  // Panel state machine
  private panelState: 'selection' | 'waiting-for-roll' | 'showing-result' | 'animating' | 'completed' = 'selection';
  private rollResult: RollResultData | null = null;
  
  /**
   * Main entry point - returns Promise that resolves when deployment complete
   * @param skill - The skill being used for the deployment roll
   * @param onRollTrigger - Callback to trigger the roll (called when Done is clicked)
   */
  async selectArmyAndPlotPath(
    skill: string, 
    onRollTrigger: (skill: string, armyId: string, path: string[]) => Promise<void>
  ): Promise<DeploymentResult | null> {
    if (this.active) {
      throw new Error('Army deployment already in progress');
    }
    
    return new Promise(async (resolve) => {
      this.resolve = resolve;
      this.skill = skill;
      this.selectedArmyId = null;
      this.plottedPath = [];
      this.active = true;
      this.onRollTrigger = onRollTrigger;
      this.panelState = 'selection';
      this.rollResult = null;
      
      try {
        // 1. Minimize Reignmaker app
        this.minimizeReignmakerApp();
        
        // 2. Mount floating panel
        this.mountPanel();
        
        // 3. Attach canvas token click listener
        this.attachTokenClickListener();
        
        // 4. Attach escape key listener
        this.attachKeyListener();
        
        // 5. Attach roll completion listener
        this.attachRollCompleteListener();
        
        // 6. Notify user
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
    appWindowManager.enterMapMode('hide');
  }
  
  /**
   * Restore the Reignmaker Application window
   */
  private restoreReignmakerApp(): void {
    appWindowManager.exitMapMode();
  }
  
  /**
   * Get all armies that have tokens on the current scene
   * Filters out armies that have already been deployed this turn
   */
  private async getArmiesOnMap(): Promise<Array<{army: Army, hexId: string | null, deployed: boolean}>> {
    const kingdom = getKingdomData();
    if (!kingdom?.armies) return [];
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.scene) return [];
    
    // Get deployed army IDs from turnState
    const deployedArmyIds = kingdom.turnState?.actionsPhase?.deployedArmyIds || [];
    
    const { TokenHelpers } = await import('../tokens/TokenHelpers');
    const result: Array<{army: Army, hexId: string | null, deployed: boolean}> = [];
    
    for (const army of kingdom.armies) {
      if (!army.actorId) continue;
      
      // Find token for this army on current scene
      const token = TokenHelpers.findTokenByActor(army.actorId);

      if (token) {
        // Get hex ID from token position
        const hexId = TokenHelpers.getTokenHexId(token);
        
        // Check if already deployed this turn
        const deployed = deployedArmyIds.includes(army.id);
        
        result.push({ army, hexId, deployed });
      }
    }
    
    return result;
  }
  
  /**
   * Get hex ID from token position
   */
  private getTokenHexId(tokenDoc: any): string | null {
    try {
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
    
    this.tokenClickHandler = async (event: any) => {
      // Always check for token clicks first, regardless of movement mode state
      const token = this.findTokenUnderPointer(event);
      
      if (token) {
        const armyId = await this.getArmyIdFromToken(token);
        if (armyId) {
          logger.info('[ArmyDeploymentPanel] Clicked army token:', armyId);
          
          // Stop event propagation so movement mode doesn't handle this click
          if (event.stopPropagation) {
            event.stopPropagation();
          }
          if (event.stopImmediatePropagation) {
            event.stopImmediatePropagation();
          }
          
          // Select the army (this will update the panel and movement mode if active)
          await this.selectArmy(armyId);
          return;
        }
      }
      
      // No token clicked - let other handlers (like movement mode) process the click
    };
    
    // Use pointerdown with capture phase to handle token clicks before other handlers
    // This ensures token selection always works, even when movement mode is active
    canvas.stage.on('pointerdown', this.tokenClickHandler);
    logger.info('[ArmyDeploymentPanel] Token click listener attached (pointerdown)');
  }
  
  /**
   * Find token under pointer event
   * Uses multiple methods to reliably detect token clicks
   */
  private findTokenUnderPointer(event: any): any {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.tokens?.placeables) return null;
    
    // Method 1: Check if event target is directly a token or token child
    let current = event.target;
    while (current) {
      if (current.document?.documentName === 'Token') {
        return current;
      }
      // Check if it's a token sprite
      if (current.constructor?.name === 'Token' || current.isToken) {
        return current;
      }
      current = current.parent;
    }
    
    // Method 2: Use pointer position to find tokens
    let pointer: { x: number; y: number };
    
    if (event.data) {
      // PIXI event - use getLocalPosition to get stage coordinates
      const stage = canvas.stage;
      const localPos = event.data.getLocalPosition(stage);
      pointer = { x: localPos.x, y: localPos.y };
    } else if (event.clientX !== undefined) {
      // DOM event - convert to canvas coordinates
      const point = { x: event.clientX, y: event.clientY };
      const canvasPos = canvas.canvasCoordinatesFromClient?.(point) || point;
      pointer = canvasPos;
    } else {
      return null;
    }
    
    // Find tokens that contain the pointer position
    const tokensAtPoint = canvas.tokens.placeables.filter((token: any) => {
      if (!token || !token.visible) return false;
      
      // Use token's hitArea or bounds to check if point is inside
      try {
        if (token.hitArea && typeof token.hitArea.contains === 'function') {
          // Convert pointer to token's local coordinates
          const localPoint = token.toLocal?.(pointer) || pointer;
          return token.hitArea.contains(localPoint.x, localPoint.y);
        }
      } catch (e) {
        // Fall through to bounds check
      }
      
      // Fallback: check bounds
      const bounds = token.bounds;
      if (bounds) {
        return pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width &&
               pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.height;
      }
      
      return false;
    });
    
    // Return the topmost token (highest elevation/z-order)
    if (tokensAtPoint.length > 0) {
      // Sort by elevation (higher elevation = on top)
      tokensAtPoint.sort((a: any, b: any) => {
        const aElevation = a.document?.elevation ?? a.document?.z ?? 0;
        const bElevation = b.document?.elevation ?? b.document?.z ?? 0;
        return bElevation - aElevation;
      });
      return tokensAtPoint[0];
    }
    
    return null;
  }
  
  /**
   * Get army ID from token document
   */
  private async getArmyIdFromToken(token: any): Promise<string | null> {
    try {
      const tokenDoc = token.document || token;
      if (!tokenDoc) return null;
      
      // Method 1: Check actor flag for army metadata
      const actor = tokenDoc.actor;
      if (actor) {
        const armyMetadata = await actor.getFlag('pf2e-reignmaker', 'army-metadata');
        if (armyMetadata?.armyId) {
          return armyMetadata.armyId;
        }
      }
      
      // Method 2: Find army by actor ID
      const actorId = tokenDoc.actorId || tokenDoc.actor?.id;
      if (actorId) {
        const kingdom = getKingdomData();
        const army = kingdom?.armies?.find((a: any) => a.actorId === actorId);
        if (army) {
          return army.id;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('[ArmyDeploymentPanel] Error getting army ID from token:', error);
      return null;
    }
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
   * Attach roll completion listener
   */
  private attachRollCompleteListener(): void {
    this.rollCompleteHandler = (event: any) => {
      const { checkId, outcome, actorName, skillName, rollBreakdown } = event.detail;
      
      // Only handle deploy-army rolls
      if (checkId !== 'deploy-army') return;
      
      // Ignore if not waiting for roll
      if (this.panelState !== 'waiting-for-roll') return;
      
      logger.info('[ArmyDeploymentPanel] Roll complete:', { outcome, actorName });
      
      // Store result and switch to result display state
      this.rollResult = {
        outcome,
        actorName,
        skillName,
        rollBreakdown
      };
      
      this.panelState = 'showing-result';
      this.updatePanel();
    };
    
    window.addEventListener('kingdomRollComplete', this.rollCompleteHandler as any);
    logger.info('[ArmyDeploymentPanel] Roll completion listener attached');
  }
  
  /**
   * Select an army (from panel click or token click)
   */
  private async selectArmy(armyId: string): Promise<void> {
    logger.info('[ArmyDeploymentPanel] Selecting army:', armyId);
    
    // Get army's current hex and deployment status
    const armiesOnMap = await this.getArmiesOnMap();
    const armyData = armiesOnMap.find(a => a.army.id === armyId);
    
    if (!armyData) {
      logger.error('[ArmyDeploymentPanel] Army not found on map');
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Army not found on map');
      return;
    }
    
    // Check if army has already been deployed this turn
    if (armyData.deployed) {
      logger.warn('[ArmyDeploymentPanel] Army already deployed this turn:', armyData.army.name);
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn(`${armyData.army.name} has already moved this turn`);
      return;
    }
    
    if (!armyData.hexId) {
      logger.error('[ArmyDeploymentPanel] Could not find army hex');
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Could not determine army location');
      return;
    }
    
    // Deactivate current movement if any
    if (armyMovementMode.isActive()) {
      armyMovementMode.deactivate();
    }
    
    this.selectedArmyId = armyId;
    this.plottedPath = [];
    
    // Activate movement mode
    await armyMovementMode.activateForArmy(armyId, armyData.hexId);
    
    // Set up path change callback
    armyMovementMode.setPathChangedCallback((path: string[]) => {
      this.plottedPath = path;
      this.updatePanel();
    });
    
    // Set up path complete callback (double-click or max movement)
    armyMovementMode.setPathCompleteCallback(async () => {
      logger.info('[ArmyDeploymentPanel] Path auto-completed, triggering roll');
      await this.handleDone();
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
      box-shadow: 0 4px 12px var(--overlay-high);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    panel.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #D2691E;">
        <h3 style="margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-chess-knight"></i>
          Deploy Army
        </h3>
        <p style="margin: 8px 0 0 0; font-size: 0.875rem; color: #999;">
          Skill: <span style="color: #D2691E; font-weight: bold;">${this.skill}</span>
        </p>
      </div>
      <div id="army-list" style="margin-bottom: 12px; max-height: 400px; overflow-y: auto;">
        <!-- Armies will be added here -->
      </div>
      <div id="movement-info" style="margin-bottom: 12px; padding: 8px; background: var(--hover-low); border-radius: 4px; font-size: 0.875rem; color: #999; display: none;">
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
    btnDone?.addEventListener('click', async () => await this.handleDone());
    
    // Initial render
    this.updatePanel();
  }
  
  /**
   * Update panel with current selection state or result display
   */
  private async updatePanel(): Promise<void> {
    if (!this.panelMountPoint) return;
    
    // Handle different panel states
    if (this.panelState === 'waiting-for-roll') {
      this.renderWaitingState();
      return;
    } else if (this.panelState === 'showing-result') {
      this.renderResultState();
      return;
    } else if (this.panelState === 'animating') {
      this.renderAnimatingState();
      return;
    } else if (this.panelState === 'completed') {
      this.renderCompletedState();
      return;
    }
    
    // Default: selection state
    const armyList = this.panelMountPoint.querySelector('#army-list');
    const movementInfo = this.panelMountPoint.querySelector('#movement-info');
    const btnDone = this.panelMountPoint.querySelector('#btn-done') as HTMLButtonElement;
    
    if (!armyList) return;
    
    // Render army list
    const armiesOnMap = await this.getArmiesOnMap();
    armyList.innerHTML = '';
    
    // Separate available and deployed armies
    const availableArmies = armiesOnMap.filter(a => !a.deployed);
    const deployedArmies = armiesOnMap.filter(a => a.deployed);
    
    if (armiesOnMap.length === 0) {
      armyList.innerHTML = '<p style="color: #999; font-size: 0.875rem; text-align: center; padding: 16px;">No armies found on current scene</p>';
    } else if (availableArmies.length === 0) {
      armyList.innerHTML = '<p style="color: #ff6b6b; font-size: 0.875rem; text-align: center; padding: 16px;"><i class="fas fa-exclamation-triangle"></i> All armies have already moved this turn</p>';
    } else {
      // Render available armies
      for (const { army, hexId, deployed } of availableArmies) {
        const isSelected = army.id === this.selectedArmyId;
        
        const armyDiv = document.createElement('div');
        armyDiv.style.cssText = `
          padding: 12px;
          margin-bottom: 8px;
          background: ${isSelected ? 'rgba(210, 105, 30, 0.3)' : 'var(--hover-low)'};
          border: 2px solid ${isSelected ? '#D2691E' : 'transparent'};
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        `;
        
        armyDiv.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: bold; font-size: 1rem;">${army.name}</span>
            ${isSelected ? '<i class="fas fa-check-circle" style="color: #4CAF50;"></i>' : ''}
          </div>
          <div style="font-size: 0.875rem; color: #999;">
            Level ${army.level} • ${army.isSupported ? '<span style="color: #4CAF50;">Supported</span>' : '<span style="color: #ff6b6b;">Unsupported</span>'}
          </div>
          <div style="font-size: 0.875rem; color: #666; font-family: monospace; margin-top: 4px;">
            Hex: ${hexId || 'Unknown'}
          </div>
        `;
        
        armyDiv.addEventListener('click', () => {
          this.selectArmy(army.id);
        });
        
        armyDiv.addEventListener('mouseenter', () => {
          if (!isSelected) {
            (armyDiv as HTMLElement).style.background = 'var(--hover)';
          }
        });
        
        armyDiv.addEventListener('mouseleave', () => {
          if (!isSelected) {
            (armyDiv as HTMLElement).style.background = 'var(--hover-low)';
          }
        });
        
        armyList.appendChild(armyDiv);
      }
      
      // Show deployed armies section if any exist
      if (deployedArmies.length > 0) {
        const divider = document.createElement('div');
        divider.style.cssText = 'margin: 16px 0; border-top: 1px solid #666; padding-top: 12px;';
        divider.innerHTML = '<p style="font-size: 0.875rem; color: #999; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Already Deployed</p>';
        armyList.appendChild(divider);
        
        for (const { army, hexId } of deployedArmies) {
          const armyDiv = document.createElement('div');
          armyDiv.style.cssText = `
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(255, 255, 255, 0.02);
            border: 2px solid transparent;
            border-radius: 4px;
            opacity: 0.5;
            cursor: not-allowed;
          `;
          
          armyDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: bold; font-size: 1rem;">${army.name}</span>
              <i class="fas fa-check" style="color: #4CAF50;"></i>
            </div>
            <div style="font-size: 0.875rem; color: #999;">
              Level ${army.level} • Already moved this turn
            </div>
            <div style="font-size: 0.875rem; color: #666; font-family: monospace; margin-top: 4px;">
              Hex: ${hexId || 'Unknown'}
            </div>
          `;
          
          armyDiv.addEventListener('click', () => {
            const ui = (globalThis as any).ui;
            ui?.notifications?.warn(`${army.name} has already moved this turn`);
          });
          
          armyList.appendChild(armyDiv);
        }
      }
    }
    
    // Update movement info
    if (movementInfo instanceof HTMLElement) {
      if (this.selectedArmyId && this.plottedPath.length > 0) {
        movementInfo.style.display = 'block';
        const hexCount = this.plottedPath.length;
        const movement = hexCount - 1; // First hex is origin
        
        // Get max movement for this army
        const maxMovement = armyMovementMode.isActive() ? (armyMovementMode as any).maxMovement : 20;
        
        movementInfo.innerHTML = `
          <div style="display: flex; justify-content: space-between;">
            <span>Path Length:</span>
            <span style="color: #D2691E; font-weight: bold;">${hexCount} hexes</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px;">
            <span>Movement Used:</span>
            <span style="color: ${movement >= maxMovement ? '#4CAF50' : '#D2691E'}; font-weight: bold;">${movement} / ${maxMovement}</span>
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
   * Render waiting for roll state
   */
  private renderWaitingState(): void {
    if (!this.panelMountPoint) return;
    
    const panel = this.panelMountPoint.querySelector('.army-deployment-panel');
    if (!panel) return;
    
    panel.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #D2691E;">
        <h3 style="margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-dice-d20"></i>
          Deploy Army - Rolling
        </h3>
      </div>
      <div style="padding: 40px 20px; text-align: center;">
        <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #D2691E; margin-bottom: 16px;"></i>
        <p style="margin: 0; color: #999; font-size: 1rem;">Waiting for roll to complete...</p>
        <p style="margin: 8px 0 0 0; color: #666; font-size: 0.875rem;">Complete the Foundry roll dialog</p>
      </div>
    `;
  }
  
  /**
   * Render result display state
   */
  private renderResultState(): void {
    if (!this.panelMountPoint || !this.rollResult) return;
    
    const panel = this.panelMountPoint.querySelector('.army-deployment-panel');
    if (!panel) return;
    
    // Get outcome styling
    const outcomeColors: Record<string, string> = {
      criticalSuccess: '#4CAF50',
      success: '#8BC34A',
      failure: '#ff9800',
      criticalFailure: '#f44336'
    };
    
    const outcomeLabels: Record<string, string> = {
      criticalSuccess: 'Critical Success',
      success: 'Success',
      failure: 'Failure',
      criticalFailure: 'Critical Failure'
    };
    
    const outcomeColor = outcomeColors[this.rollResult.outcome] || '#999';
    const outcomeLabel = outcomeLabels[this.rollResult.outcome] || this.rollResult.outcome;
    
    // Get army name
    const kingdom = getKingdomData();
    const army = kingdom?.armies?.find((a: any) => a.id === this.selectedArmyId);
    const armyName = army?.name || 'Unknown Army';
    
    // Get destination hex (last hex in path)
    const destinationHex = this.plottedPath.length > 0 ? this.plottedPath[this.plottedPath.length - 1] : 'Unknown';
    
    // Get conditions/effects that will be applied based on outcome
    const conditionsToApply = this.rollResult.outcome === 'criticalSuccess' ?
      ['+1 initiative (status bonus)', '+1 saving throws (status bonus)', '+1 attack (status bonus)'] :
      this.rollResult.outcome === 'failure' ?
      ['-1 initiative (status penalty)', 'fatigued'] :
      this.rollResult.outcome === 'criticalFailure' ?
      ['-2 initiative (status penalty)', 'enfeebled 1', 'fatigued'] :
      [];
    
    // Build effects display HTML
    let effectsHTML = '';
    if (conditionsToApply.length > 0) {
      const effectItems = conditionsToApply.map(condition => {
        // Style negative effects differently
        const isNegative = condition.includes('penalty') || condition.includes('fatigued') || condition.includes('enfeebled');
        const effectColor = isNegative ? '#ff9800' : '#4CAF50';
        const icon = isNegative ? 'fa-exclamation-triangle' : 'fa-check-circle';
        return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <i class="fas ${icon}" style="color: ${effectColor}; font-size: var(--font-sm);"></i>
          <span style="font-size: var(--font-md); color: white;">${condition}</span>
        </div>`;
      }).join('');
      
      effectsHTML = `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          <div style="font-size: var(--font-sm); color: #999; margin-bottom: 8px;">Effects Applied:</div>
          <div>${effectItems}</div>
        </div>
      `;
    }
    
    panel.innerHTML = `
      <div style="margin-bottom: var(--space-12); padding-bottom: var(--space-12); border-bottom: 1px solid #D2691E;">
        <h3 style="margin: 0; font-size: var(--font-lg); display: flex; align-items: center; gap: var(--space-8);">
          <i class="fas fa-check-circle"></i>
          Deployment Complete
        </h3>
      </div>
      <div style="padding: var(--space-20);">
        <div style="background: var(--hover-low); border-radius: var(--radius-md); padding: var(--space-16); margin-bottom: var(--space-16);">
          <div style="display: flex; align-items: center; gap: var(--space-12); margin-bottom: var(--space-12);">
            <div style="flex: 1;">
              <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Outcome</div>
              <div style="font-size: var(--font-xl); font-weight: var(--font-weight-bold); color: ${outcomeColor};">${outcomeLabel}</div>
            </div>
            <i class="fas fa-chess-knight" style="font-size: var(--font-3xl); color: #D2691E; opacity: 0.5;"></i>
          </div>
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Rolled by</div>
          <div style="font-size: var(--font-md); color: var(--text-primary); margin-bottom: var(--space-12);">${this.rollResult.actorName}</div>
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Army</div>
          <div style="font-size: var(--font-md); color: var(--text-primary); margin-bottom: var(--space-12);">${armyName}</div>
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Destination</div>
          <div style="font-size: var(--font-md); color: var(--text-primary); margin-bottom: var(--space-12);">Hex: ${destinationHex}</div>
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Path Length</div>
          <div style="font-size: var(--font-md); color: var(--text-primary);">${this.plottedPath.length} hexes (${this.plottedPath.length - 1} movement)</div>
          ${effectsHTML}
        </div>
        <div style="display: flex; gap: var(--space-8);">
          <button id="btn-cancel" style="flex: 1; padding: var(--space-8); background: var(--surface-low); border: 1px solid var(--border-faint); border-radius: var(--radius-md); color: var(--text-primary); cursor: pointer; font-size: var(--font-md);">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button id="btn-confirm" style="flex: 1; padding: var(--space-8); background: var(--color-orange); border: none; border-radius: var(--radius-md); color: white; cursor: pointer; font-size: var(--font-md);">
            <i class="fas fa-check"></i> Confirm
          </button>
        </div>
      </div>
    `;
    
    // Wire up buttons
    const btnCancel = panel.querySelector('#btn-cancel') as HTMLButtonElement;
    const btnConfirm = panel.querySelector('#btn-confirm') as HTMLButtonElement;
    
    btnCancel?.addEventListener('click', () => this.handleCancel());
    btnConfirm?.addEventListener('click', async () => await this.handleResultConfirm());
  }
  
  /**
   * Render animating state
   */
  private renderAnimatingState(): void {
    if (!this.panelMountPoint) return;
    
    const panel = this.panelMountPoint.querySelector('.army-deployment-panel');
    if (!panel) return;
    
    panel.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #D2691E;">
        <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-route"></i>
          Deploying Army
        </h3>
      </div>
      <div style="padding: 40px 20px; text-align: center;">
        <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #4CAF50; margin-bottom: 16px;"></i>
        <p style="margin: 0; color: #999; font-size: 1rem;">Army is moving into position...</p>
        <p style="margin: 8px 0 0 0; color: #666; font-size: 0.875rem;">Watch the map for animation</p>
      </div>
    `;
  }
  
  /**
   * Render completed state with outcome message and OK button
   */
  private renderCompletedState(): void {
    if (!this.panelMountPoint || !this.rollResult) return;
    
    const panel = this.panelMountPoint.querySelector('.army-deployment-panel');
    if (!panel) return;
    
    // Get outcome styling
    const outcomeColors: Record<string, string> = {
      criticalSuccess: '#4CAF50',
      success: '#8BC34A',
      failure: '#ff9800',
      criticalFailure: '#f44336'
    };
    
    const outcomeLabels: Record<string, string> = {
      criticalSuccess: 'Critical Success',
      success: 'Success',
      failure: 'Failure',
      criticalFailure: 'Critical Failure'
    };
    
    const outcomeColor = outcomeColors[this.rollResult.outcome] || '#999';
    const outcomeLabel = outcomeLabels[this.rollResult.outcome] || this.rollResult.outcome;
    
    // Get army name
    const kingdom = getKingdomData();
    const army = kingdom?.armies?.find((a: any) => a.id === this.selectedArmyId);
    const armyName = army?.name || 'Unknown Army';
    
    // Get final hex
    const finalHex = this.plottedPath.length > 0 ? this.plottedPath[this.plottedPath.length - 1] : 'Unknown';
    const movementCost = this.plottedPath.length - 1;
    
    // Get conditions/effects that were applied based on outcome
    const conditionsToApply = this.rollResult.outcome === 'criticalSuccess' ?
      ['+1 initiative (status bonus)', '+1 saving throws (status bonus)', '+1 attack (status bonus)'] :
      this.rollResult.outcome === 'failure' ?
      ['-1 initiative (status penalty)', 'fatigued'] :
      this.rollResult.outcome === 'criticalFailure' ?
      ['-2 initiative (status penalty)', 'enfeebled 1', 'fatigued'] :
      [];
    
    // Build effects display HTML
    let effectsHTML = '';
    if (conditionsToApply.length > 0) {
      const effectItems = conditionsToApply.map(condition => {
        // Style negative effects differently
        const isNegative = condition.includes('penalty') || condition.includes('fatigued') || condition.includes('enfeebled');
        const effectColor = isNegative ? '#ff9800' : '#4CAF50';
        const icon = isNegative ? 'fa-exclamation-triangle' : 'fa-check-circle';
        return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <i class="fas ${icon}" style="color: ${effectColor}; font-size: var(--font-sm);"></i>
          <span style="font-size: var(--font-md); color: white;">${condition}</span>
        </div>`;
      }).join('');
      
      effectsHTML = `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          <div style="font-size: var(--font-sm); color: #999; margin-bottom: 8px;">Effects Applied:</div>
          <div>${effectItems}</div>
        </div>
      `;
    }
    
    panel.innerHTML = `
      <div style="margin-bottom: var(--space-12); padding-bottom: var(--space-12); border-bottom: 1px solid #D2691E;">
        <h3 style="margin: 0; font-size: var(--font-lg); display: flex; align-items: center; gap: var(--space-8);">
          <i class="fas fa-check-circle"></i>
          Deployment Complete
        </h3>
      </div>
      <div style="padding: var(--space-20);">
        <div style="background: var(--hover-low); border-radius: var(--radius-md); padding: var(--space-16); margin-bottom: var(--space-16);">
          <div style="display: flex; align-items: center; gap: var(--space-12); margin-bottom: var(--space-12);">
            <div style="flex: 1;">
              <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Outcome</div>
              <div style="font-size: var(--font-xl); font-weight: var(--font-weight-bold); color: ${outcomeColor};"><i class="fas fa-trophy" style="margin-right: var(--space-8);"></i>${outcomeLabel}</div>
            </div>
            <i class="fas fa-chess-knight" style="font-size: var(--font-3xl); color: #D2691E; opacity: 0.5;"></i>
          </div>
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Army</div>
          <div style="font-size: var(--font-md); color: var(--text-primary); margin-bottom: var(--space-12);">${armyName}</div>
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Destination</div>
          <div style="font-size: var(--font-md); color: var(--text-primary); margin-bottom: var(--space-12); font-family: monospace;">${finalHex}</div>
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4);">Movement</div>
          <div style="font-size: var(--font-md); color: var(--text-primary);">${movementCost} hexes</div>
          ${effectsHTML}
        </div>
        <button id="btn-ok" style="width: 100%; padding: var(--space-12); background: #4CAF50; border: none; border-radius: var(--radius-md); color: white; cursor: pointer; font-size: var(--font-md); font-weight: bold;">
          <i class="fas fa-check"></i> OK
        </button>
      </div>
    `;
    
    // Wire up OK button
    const btnOk = panel.querySelector('#btn-ok') as HTMLButtonElement;
    btnOk?.addEventListener('click', () => this.handleCompletedOk());
  }
  
  /**
   * Handle OK button click in completed state
   */
  private handleCompletedOk(): void {
    logger.info('[ArmyDeploymentPanel] OK clicked, completing deployment');
    
    // Complete successfully
    const deploymentResult: DeploymentResult = {
      armyId: this.selectedArmyId!,
      path: this.plottedPath,
      skill: this.skill
    };
    
    const resolver_callback = this.resolve;
    this.cleanup();
    resolver_callback?.(deploymentResult);
  }
  
  /**
   * Handle Done button click - triggers roll instead of completing
   */
  private async handleDone(): Promise<void> {
    if (!this.selectedArmyId || this.plottedPath.length < 2) {
      return;
    }
    
    logger.info('[ArmyDeploymentPanel] Done clicked, triggering roll:', {
      armyId: this.selectedArmyId,
      pathLength: this.plottedPath.length,
      skill: this.skill
    });
    
    // Deactivate movement mode to stop hover graphics and input
    if (armyMovementMode.isActive()) {
      armyMovementMode.deactivate();
    }
    
    // Switch to waiting state
    this.panelState = 'waiting-for-roll';
    this.updatePanel();
    
    // Trigger the roll via callback
    if (this.onRollTrigger) {
      try {
        await this.onRollTrigger(this.skill, this.selectedArmyId, this.plottedPath);
      } catch (error) {
        logger.error('[ArmyDeploymentPanel] Roll trigger failed:', error);
        this.panelState = 'selection';
        this.updatePanel();
        const ui = (globalThis as any).ui;
        ui?.notifications?.error('Failed to trigger roll');
      }
    }
  }
  
  /**
   * Handle result confirmation - apply effects, animate, restore app
   */
  private async handleResultConfirm(): Promise<void> {
    if (!this.selectedArmyId || !this.rollResult) {
      return;
    }
    
    logger.info('[ArmyDeploymentPanel] Result confirmed, applying effects and animating');
    
    // Switch to animating state
    this.panelState = 'animating';
    this.updatePanel();
    
    try {
      // Get action data for game command
      const actionData = await this.getDeployActionData();
      if (!actionData) {
        throw new Error('Failed to load deploy army action data');
      }
      
      // Get conditions to apply based on outcome
      const effect = actionData.effects?.[this.rollResult.outcome];
      const gameCommand = effect?.gameCommands?.find((cmd: any) => cmd.type === 'deployArmy');
      const conditionsToApply = gameCommand?.conditionsToApply || [];
      
      // Apply game command
      const { createGameCommandsResolver } = await import('../GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      
      const result = await resolver.deployArmy(
        this.selectedArmyId,
        this.plottedPath,
        this.rollResult.outcome,
        conditionsToApply
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to deploy army');
      }
      
      logger.info('[ArmyDeploymentPanel] Effects applied, switching to completed state');
      
      // Switch to completed state - user must click OK to dismiss
      this.panelState = 'completed';
      this.updatePanel();
      
    } catch (error) {
      logger.error('[ArmyDeploymentPanel] Failed to apply effects:', error);
      const ui = (globalThis as any).ui;
      ui?.notifications?.error(`Deployment failed: ${error}`);
      
      // Return to selection state on error
      this.panelState = 'selection';
      this.updatePanel();
    }
  }
  
  /**
   * Get deploy army action data
   */
  private async getDeployActionData(): Promise<any> {
    try {
      const { actionLoader } = await import('../../controllers/actions/pipeline-loader');
      const action = actionLoader.getAllActions().find(a => a.id === 'deploy-army');
      return action;
    } catch (error) {
      logger.error('[ArmyDeploymentPanel] Failed to load action data:', error);
      return null;
    }
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
      canvas?.stage?.off('pointerdown', this.tokenClickHandler);
      this.tokenClickHandler = null;
    }
    
    // Remove keyboard listener
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    
    // Remove roll completion listener
    if (this.rollCompleteHandler) {
      window.removeEventListener('kingdomRollComplete', this.rollCompleteHandler as any);
      this.rollCompleteHandler = null;
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
    this.onRollTrigger = null;
    this.panelState = 'selection';
    this.rollResult = null;
  }
}

// Export singleton instance
export const armyDeploymentPanel = new ArmyDeploymentPanel();
