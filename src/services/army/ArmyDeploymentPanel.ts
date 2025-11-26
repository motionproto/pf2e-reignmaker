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
import { getKingdomData, getKingdomActor } from '../../stores/KingdomStore';
import type { Army } from '../../models/Army';
import { appWindowManager } from '../ui/AppWindowManager';
import { positionToOffset, hexToKingmakerId } from '../hex-selector/coordinates';
import type { SvelteComponent } from 'svelte';
import { 
  canRerollWithFame, 
  deductFameForReroll, 
  restoreFameAfterFailedReroll 
} from '../../controllers/shared/RerollHelpers';
import { createOutcomePreviewService } from '../OutcomePreviewService';

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
  private component: SvelteComponent | null = null;
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
        
        // 2. Mount floating panel (Svelte component)
        await this.mountPanel();
        
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
        this.handleCancel().catch(err => logger.error('[ArmyDeploymentPanel] Error in cancel handler:', err));
      }
    };
    
    document.addEventListener('keydown', this.keyDownHandler);
  }
  
  /**
   * Attach roll completion listener
   */
  private attachRollCompleteListener(): void {
    this.rollCompleteHandler = async (event: any) => {
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
      await this.updateComponentProps();
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
      this.updateComponentProps();
    });
    
    // Set up path complete callback (double-click or max movement)
    armyMovementMode.setPathCompleteCallback(async () => {
      logger.info('[ArmyDeploymentPanel] Path auto-completed, triggering roll');
      await this.handleDone();
    });
    
    // Update component props
    await this.updateComponentProps();
  }
  
  /**
   * Mount floating panel (Svelte component)
   */
  private async mountPanel(): Promise<void> {
    this.panelMountPoint = document.createElement('div');
    this.panelMountPoint.id = 'army-deployment-panel-mount';
    document.body.appendChild(this.panelMountPoint);
    
    // Dynamically import and mount Svelte component
    const { default: ArmyDeploymentPanelComponent } = await import('../../view/army/ArmyDeploymentPanel.svelte');
    
    const armiesOnMap = await this.getArmiesOnMap();
    
    this.component = new ArmyDeploymentPanelComponent({
      target: this.panelMountPoint,
      props: {
        skill: this.skill,
        selectedArmyId: this.selectedArmyId,
        plottedPath: this.plottedPath,
        panelState: this.panelState,
        rollResult: this.rollResult,
        armiesOnMap: armiesOnMap,
        onCancel: () => { this.handleCancel().catch(err => logger.error('[ArmyDeploymentPanel] Error in cancel handler:', err)); },
        onDone: () => this.handleDone(),
        onConfirm: () => this.handleResultConfirm(),
        onOk: () => { this.handleCompletedOk().catch(err => logger.error('[ArmyDeploymentPanel] Error in completed OK handler:', err)); },
        onSelectArmy: (armyId: string) => this.selectArmy(armyId),
        onReroll: () => this.handleReroll(),
        currentFame: await this.getCurrentFame()
      }
    });
  }
  
  /**
   * Update component props when state changes
   */
  private async updateComponentProps(): Promise<void> {
    if (!this.component) return;
    
    const armiesOnMap = await this.getArmiesOnMap();
    const currentFame = await this.getCurrentFame();
    
    this.component.$set({
      selectedArmyId: this.selectedArmyId,
      plottedPath: this.plottedPath,
      panelState: this.panelState,
      rollResult: this.rollResult,
      armiesOnMap: armiesOnMap,
      currentFame: currentFame
    });
  }
  
  /**
   * Get current kingdom fame
   */
  private async getCurrentFame(): Promise<number> {
    const kingdom = getKingdomData();
    return kingdom?.fame || 0;
  }
  
  /**
   * Get instance ID from pending outcomes
   */
  private getInstanceId(): string | null {
    const kingdom = getKingdomData();
    if (!kingdom?.pendingOutcomes) return null;
    
    const instance = kingdom.pendingOutcomes.find(
      (i: any) => i.checkId === 'deploy-army' && i.checkType === 'action'
    );
    
    return instance?.previewId || null;
  }
  
  /**
   * Handle reroll with fame
   */
  private async handleReroll(): Promise<void> {
    if (!this.selectedArmyId || !this.plottedPath || this.plottedPath.length < 2) {
      logger.error('[ArmyDeploymentPanel] Cannot reroll - missing army or path');
      return;
    }
    
    // Check if reroll is possible
    const fameCheck = await canRerollWithFame();
    if (!fameCheck.canReroll) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn(fameCheck.error || 'Not enough fame to reroll');
      return;
    }
    
    // Deduct fame
    const deductResult = await deductFameForReroll();
    if (!deductResult.success) {
      const ui = (globalThis as any).ui;
      ui?.notifications?.error(deductResult.error || 'Failed to deduct fame');
      return;
    }
    
    logger.info('[ArmyDeploymentPanel] Rerolling with fame, clearing instance and resetting to waiting state');
    
    // Clear the current pipeline instance and ensure pipeline coordinator state is clean
    const instanceId = this.getInstanceId();
    if (instanceId) {
      try {
        const checkInstanceService = await createOutcomePreviewService();
        await checkInstanceService.clearInstance(instanceId);
        logger.info('[ArmyDeploymentPanel] Cleared pipeline instance for reroll:', instanceId);
        
        // The pipeline coordinator's cleanupOldInstances will be called when executePipeline runs
        // But we need to ensure the pending context is cleared now
        // Since cleanupOldInstances is called at the start of executePipeline, triggering a new
        // pipeline execution will clean up old instances automatically
      } catch (error) {
        logger.error('[ArmyDeploymentPanel] Failed to clear instance before reroll:', error);
        // Continue anyway - the new roll should create a new instance
      }
    }
    
    // Reset panel state
    this.panelState = 'waiting-for-roll';
    this.rollResult = null;
    await this.updateComponentProps();
    
    // Re-trigger roll using pipeline coordinator directly (same approach as handlePerformReroll)
    // This ensures we use the pipeline system and properly clean up old instances
    try {
      const { getPipelineCoordinator } = await import('../PipelineCoordinator');
      const { getCurrentUserCharacter, showCharacterSelectionDialog } = await import('../pf2e');
      const pipelineCoordinator = await getPipelineCoordinator();
      
      // Get character for reroll
      let actingCharacter = getCurrentUserCharacter();
      if (!actingCharacter) {
        actingCharacter = await showCharacterSelectionDialog();
        if (!actingCharacter) {
          // User cancelled - restore fame
          if (deductResult.previousFame !== undefined) {
            await restoreFameAfterFailedReroll(deductResult.previousFame);
          }
          this.panelState = 'showing-result';
          await this.updateComponentProps();
          return;
        }
      }
      
      // Get army name for metadata
      const kingdom = getKingdomData();
      const army = kingdom?.armies?.find((a: any) => a.id === this.selectedArmyId);
      
      logger.info('[ArmyDeploymentPanel] Re-executing pipeline for reroll', {
        skill: this.skill,
        armyId: this.selectedArmyId,
        pathLength: this.plottedPath.length
      });
      
      // Re-execute complete pipeline (Steps 1-9, pauses at Step 6 for user confirmation)
      // Pass deployment metadata directly - Step 2 will see it and skip opening the panel
      await pipelineCoordinator.executePipeline('deploy-army', {
        actor: {
          selectedSkill: this.skill,
          fullActor: actingCharacter,
          actorName: actingCharacter.name,
          actorId: actingCharacter.id,
          level: actingCharacter.level || 1,
          proficiencyRank: 0 // TODO: Get from actor
        },
        metadata: {
          deployment: {
            armyId: this.selectedArmyId,
            path: this.plottedPath,
            armyName: army?.name || 'Unknown'
          }
        }
      });
      
      logger.info('[ArmyDeploymentPanel] Pipeline reroll complete - Foundry dialog should have opened');
    } catch (error) {
      logger.error('[ArmyDeploymentPanel] Error during reroll:', error);
      
      // Restore fame on error
      if (deductResult.previousFame !== undefined) {
        await restoreFameAfterFailedReroll(deductResult.previousFame);
      }
      
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Failed to reroll. Fame has been restored.');
      
      // Return to result state
      this.panelState = 'showing-result';
      await this.updateComponentProps();
    }
  }
  
  /**
   * Handle OK button click in completed state
   */
  private async handleCompletedOk(): Promise<void> {
    logger.info('[ArmyDeploymentPanel] OK clicked, completing deployment');
    
    // Clear the pipeline instance to reset action card (safety check - pipeline Step 9 should have done this)
    const instanceId = this.getInstanceId();
    if (instanceId) {
      try {
        const checkInstanceService = await createOutcomePreviewService();
        await checkInstanceService.clearInstance(instanceId);
        logger.info('[ArmyDeploymentPanel] Cleared pipeline instance:', instanceId);
      } catch (error) {
        logger.error('[ArmyDeploymentPanel] Failed to clear instance:', error);
      }
    }
    
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
    await this.updateComponentProps();
    
    // Trigger the roll via callback
    if (this.onRollTrigger) {
      try {
        await this.onRollTrigger(this.skill, this.selectedArmyId, this.plottedPath);
      } catch (error) {
        logger.error('[ArmyDeploymentPanel] Roll trigger failed:', error);
        this.panelState = 'selection';
        await this.updateComponentProps();
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
    await this.updateComponentProps();
    
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
      await this.updateComponentProps();
      
    } catch (error) {
      logger.error('[ArmyDeploymentPanel] Failed to apply effects:', error);
      const ui = (globalThis as any).ui;
      ui?.notifications?.error(`Deployment failed: ${error}`);
      
      // Return to selection state on error
      this.panelState = 'selection';
      await this.updateComponentProps();
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
  private async handleCancel(): Promise<void> {
    logger.info('[ArmyDeploymentPanel] Deployment cancelled');
    
    // If in result state, clear the pipeline instance
    if (this.panelState === 'showing-result' || this.panelState === 'animating' || this.panelState === 'completed') {
      const instanceId = this.getInstanceId();
      if (instanceId) {
        try {
          const checkInstanceService = await createOutcomePreviewService();
          await checkInstanceService.clearInstance(instanceId);
          logger.info('[ArmyDeploymentPanel] Cleared pipeline instance:', instanceId);
        } catch (error) {
          logger.error('[ArmyDeploymentPanel] Failed to clear instance:', error);
        }
      }
    }
    
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
    
    // Unmount component
    if (this.component) {
      this.component.$destroy();
      this.component = null;
    }
    
    // Remove panel mount point
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
