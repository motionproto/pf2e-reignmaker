/**
 * ArmyMoralePanel - Army morale check floating UI
 * 
 * Similar to ArmyDeploymentPanel but simpler:
 * - No path plotting (armies stay in place)
 * - Process armies sequentially (one roll at a time)
 * - Highlight hex for current army being checked
 * - Returns array of results when all checks complete
 */

import { logger } from '../../utils/Logger';
import { getKingdomData, getKingdomActor, updateKingdom } from '../../stores/KingdomStore';
import type { Army } from '../../models/Army';
import { appWindowManager } from '../ui/AppWindowManager';
import type { SvelteComponent } from 'svelte';
import type { 
  MoraleCheckResult, 
  ArmyMoraleStatus, 
  MoralePanelState, 
  MoraleSkill,
  MoraleOutcome 
} from '../../types/MoraleCheck';
import { MORALE_OUTCOMES } from '../../types/MoraleCheck';
import { TokenHelpers } from '../tokens/TokenHelpers';
import { PLAYER_KINGDOM } from '../../types/ownership';

export class ArmyMoralePanel {
  private active = false;
  private selectedSkill: MoraleSkill = 'diplomacy';
  private armyStatuses: ArmyMoraleStatus[] = [];
  private currentArmyId: string | null = null;
  private panelMountPoint: HTMLElement | null = null;
  private component: SvelteComponent | null = null;
  private resolve: ((results: MoraleCheckResult[]) => void) | null = null;
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  private rollCompleteHandler: ((event: any) => void) | null = null;
  private results: MoraleCheckResult[] = [];
  
  // Panel state machine
  private panelState: MoralePanelState = 'selection';
  
  // Hex highlighting
  private highlightedHexId: string | null = null;
  
  // Custom panel title
  private panelTitle: string = 'Morale Check';
  
  // Pending disband - army waiting for user confirmation
  private pendingDisbandArmy: Army | null = null;
  
  // Best character for current skill (auto-selected)
  private bestCharacterId: string | null = null;
  private bestCharacterName: string | null = null;
  private bestCharacterBonus: number | null = null;
  
  /**
   * Main entry point - opens panel and returns results when all checks complete
   * @param armyIds - IDs of armies that need morale checks
   * @param options - Optional configuration (title for the panel)
   */
  async checkArmyMorale(armyIds: string[], options?: { title?: string }): Promise<MoraleCheckResult[]> {
    if (this.active) {
      throw new Error('Morale check already in progress');
    }
    
    if (armyIds.length === 0) {
      return [];
    }
    
    return new Promise(async (resolve) => {
      this.resolve = resolve;
      this.active = true;
      this.panelState = 'selection';
      this.results = [];
      this.currentArmyId = null;
      this.selectedSkill = 'diplomacy';
      this.panelTitle = options?.title || 'Morale Check';
      this.pendingDisbandArmy = null;
      
      try {
        // Build army status list
        await this.initializeArmyStatuses(armyIds);
        
        // Find best character for default skill
        await this.updateBestCharacterForSkill();
        
        if (this.armyStatuses.length === 0) {
          logger.warn('[ArmyMoralePanel] No valid armies found for morale check');
          resolve([]);
          return;
        }
        
        // Minimize Reignmaker app
        this.minimizeReignmakerApp();
        
        // Mount floating panel
        await this.mountPanel();
        
        // Attach roll completion listener (no escape key - morale checks are required)
        this.attachRollCompleteListener();
        
        // Notify user
        const ui = (globalThis as any).ui;
        ui?.notifications?.info(`Morale check required for ${this.armyStatuses.length} ${this.armyStatuses.length === 1 ? 'army' : 'armies'}`);
        
      } catch (error) {
        logger.error('[ArmyMoralePanel] Failed to start morale check:', error);
        this.cleanup();
        resolve([]);
      }
    });
  }
  
  /**
   * Initialize army status list from army IDs
   */
  private async initializeArmyStatuses(armyIds: string[]): Promise<void> {
    const kingdom = getKingdomData();
    if (!kingdom?.armies) {
      this.armyStatuses = [];
      return;
    }
    
    this.armyStatuses = [];
    
    for (const armyId of armyIds) {
      const army = kingdom.armies.find((a: Army) => a.id === armyId);
      if (!army) {
        logger.warn(`[ArmyMoralePanel] Army not found: ${armyId}`);
        continue;
      }
      
      // Get token info if available
      let hexId: string | null = null;
      let tokenImage: string | null = null;
      
      if (army.actorId) {
        const token = TokenHelpers.findTokenByActor(army.actorId);
        if (token) {
          hexId = TokenHelpers.getTokenHexId(token);
          // Get token image from actor or token
          const game = (globalThis as any).game;
          const actor = game?.actors?.get(army.actorId);
          tokenImage = actor?.img || token?.texture?.src || null;
        }
      }
      
      this.armyStatuses.push({
        army,
        hexId,
        tokenImage,
        status: 'pending'
      });
    }
    
    logger.info(`[ArmyMoralePanel] Initialized ${this.armyStatuses.length} armies for morale check`);
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
   * Mount floating panel (Svelte component)
   */
  private async mountPanel(): Promise<void> {
    this.panelMountPoint = document.createElement('div');
    this.panelMountPoint.id = 'army-morale-panel-mount';
    document.body.appendChild(this.panelMountPoint);
    
    // Dynamically import and mount Svelte component
    const { default: ArmyMoralePanelComponent } = await import('../../view/army/ArmyMoralePanel.svelte');
    
    this.component = new ArmyMoralePanelComponent({
      target: this.panelMountPoint,
      props: {
        title: this.panelTitle,
        skill: this.selectedSkill,
        armies: this.armyStatuses,
        panelState: this.panelState,
        currentArmyId: this.currentArmyId,
        pendingDisbandArmy: this.pendingDisbandArmy,
        bestCharacterName: this.bestCharacterName,
        bestCharacterBonus: this.bestCharacterBonus,
        onCheckMorale: (armyId: string) => this.handleCheckMorale(armyId),
        onDone: () => this.handleDone(),
        onDisbandConfirm: (armyId: string, deleteActor: boolean) => this.handleDisbandConfirm(armyId, deleteActor),
        onDisbandCancel: (armyId: string) => this.handleDisbandCancel(armyId)
      }
    });
    
    // Make panel draggable after it's rendered
    await this.makePanelDraggable();
  }
  
  /**
   * Make panel draggable by the header
   */
  private async makePanelDraggable(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const panel = document.querySelector('.army-morale-panel') as HTMLElement;
    if (!panel) {
      logger.warn('[ArmyMoralePanel] Could not find panel element for dragging');
      return;
    }
    
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const header = target.closest('.panel-header') as HTMLElement;
      if (!header || target.closest('button, input, select, a')) return;
      
      isDragging = true;
      
      const rect = panel.getBoundingClientRect();
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;
      
      document.body.style.cursor = 'grabbing';
      panel.querySelectorAll('.panel-header').forEach((h: Element) => {
        (h as HTMLElement).style.cursor = 'grabbing';
      });
      
      e.preventDefault();
    };
    
    const onMouseMove = (e: MouseEvent) => {
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
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
    };
    
    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        panel.querySelectorAll('.panel-header').forEach((h: Element) => {
          (h as HTMLElement).style.cursor = 'move';
        });
      }
    };
    
    panel.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    logger.info('[ArmyMoralePanel] Panel is now draggable');
  }
  
  /**
   * Attach roll completion listener
   */
  private attachRollCompleteListener(): void {
    this.rollCompleteHandler = async (event: any) => {
      const detail = event.detail;
      logger.info('[ArmyMoralePanel] Roll complete event received:', detail);
      
      if (!this.currentArmyId || this.panelState !== 'waiting-for-roll') {
        logger.warn('[ArmyMoralePanel] Ignoring roll complete - no current army or not waiting');
        return;
      }
      
      // Process the roll result
      const outcome = detail.outcome as MoraleOutcome;
      await this.processRollResult(this.currentArmyId, outcome, detail);
    };
    
    window.addEventListener('kingdomRollComplete', this.rollCompleteHandler as any);
    logger.info('[ArmyMoralePanel] Roll completion listener attached');
  }
  
  /**
   * Handle skill dropdown change
   */
  /**
   * Find the best character AND skill combination and update state
   * Compares both Diplomacy and Intimidation across all characters
   */
  private async updateBestCharacterForSkill(): Promise<void> {
    const best = await this.findBestCharacterAndSkill();
    if (best) {
      this.selectedSkill = best.skill;
      this.bestCharacterId = best.actor.id;
      this.bestCharacterName = best.actor.name;
      this.bestCharacterBonus = best.bonus;
      logger.info(`[ArmyMoralePanel] Best combination: ${best.actor.name} using ${best.skill} (+${best.bonus})`);
    } else {
      this.bestCharacterId = null;
      this.bestCharacterName = null;
      this.bestCharacterBonus = null;
      logger.warn(`[ArmyMoralePanel] No character found with Diplomacy or Intimidation skill`);
    }
  }
  
  /**
   * Find the best character AND skill combination
   * Returns the character/skill pair with the highest bonus
   */
  private async findBestCharacterAndSkill(): Promise<{ actor: any; skill: MoraleSkill; bonus: number } | null> {
    const { PF2eCharacterService } = await import('../pf2e/PF2eCharacterService');
    const characterService = PF2eCharacterService.getInstance();
    
    const playerChars = characterService.getPlayerCharacters();
    if (!playerChars || playerChars.length === 0) {
      logger.warn('[ArmyMoralePanel] No player characters found');
      return null;
    }
    
    const skills: MoraleSkill[] = ['diplomacy', 'intimidation'];
    let bestActor: any = null;
    let bestSkill: MoraleSkill = 'diplomacy';
    let bestBonus = -Infinity;
    
    for (const pc of playerChars) {
      const actor = pc.character;
      if (!actor?.skills) continue;
      
      for (const skill of skills) {
        const skillData = actor.skills[skill];
        if (!skillData) continue;
        
        // PF2e stores total modifier in different places depending on version
        const bonus = skillData.totalModifier ?? skillData.mod ?? skillData.check?.mod ?? 0;
        
        logger.debug(`[ArmyMoralePanel] ${actor.name} ${skill}: +${bonus}`);
        
        if (bonus > bestBonus) {
          bestBonus = bonus;
          bestActor = actor;
          bestSkill = skill;
        }
      }
    }
    
    return bestActor ? { actor: bestActor, skill: bestSkill, bonus: bestBonus } : null;
  }
  
  /**
   * Handle "Check Morale" button click for an army
   */
  private async handleCheckMorale(armyId: string): Promise<void> {
    logger.info(`[ArmyMoralePanel] Starting morale check for army: ${armyId}`);
    
    // Find army status
    const armyStatus = this.armyStatuses.find(s => s.army.id === armyId);
    if (!armyStatus || armyStatus.status !== 'pending') {
      logger.warn('[ArmyMoralePanel] Army not found or already checked');
      return;
    }
    
    // Set current army and update status
    this.currentArmyId = armyId;
    armyStatus.status = 'checking';
    this.panelState = 'waiting-for-roll';
    this.updateComponentProps();
    
    // Highlight the army's hex
    await this.highlightArmyHex(armyStatus.hexId);
    
    // Trigger the skill roll
    await this.triggerMoraleRoll(armyStatus.army);
  }
  
  /**
   * Trigger a morale check roll using PF2e skill system
   * Uses the best available character for the selected skill
   */
  private async triggerMoraleRoll(army: Army): Promise<void> {
    try {
      const { getCurrentUserCharacter, showCharacterSelectionDialog } = await import('../pf2e');
      const { getPartyLevel, getLevelBasedDC } = await import('../../pipelines/shared/ActionHelpers');
      const { pf2eSkillService } = await import('../pf2e/PF2eSkillService');
      
      // Use pre-selected best character, or fall back to current user's character
      let actingCharacter: any = null;
      
      if (this.bestCharacterId) {
        const game = (globalThis as any).game;
        actingCharacter = game?.actors?.get(this.bestCharacterId);
        if (actingCharacter) {
          logger.info(`[ArmyMoralePanel] Using best character: ${actingCharacter.name} (+${this.bestCharacterBonus})`);
        }
      }
      
      // Fall back to current user's character if best not found
      if (!actingCharacter) {
        actingCharacter = getCurrentUserCharacter();
      }
      
      // Last resort: show character selection dialog
      if (!actingCharacter) {
        actingCharacter = await showCharacterSelectionDialog();
        if (!actingCharacter) {
          logger.warn('[ArmyMoralePanel] No character selected, cancelling roll');
          this.resetCurrentArmyToSelection();
          return;
        }
      }
      
      // Get skill
      const skillSlug = this.selectedSkill;
      const skill = actingCharacter.skills?.[skillSlug];
      
      if (!skill) {
        logger.error(`[ArmyMoralePanel] Character ${actingCharacter.name} doesn't have ${this.selectedSkill}`);
        const ui = (globalThis as any).ui;
        ui?.notifications?.error(`${actingCharacter.name} doesn't have the ${this.selectedSkill} skill`);
        this.resetCurrentArmyToSelection();
        return;
      }
      
      // Calculate DC (party level based)
      const characterLevel = actingCharacter.level || 1;
      const effectiveLevel = getPartyLevel(characterLevel);
      const dc = getLevelBasedDC(effectiveLevel);
      
      logger.info(`[ArmyMoralePanel] Rolling ${this.selectedSkill} for ${army.name}, DC ${dc}`);
      
      // Get kingdom modifiers (including leadership penalty!)
      const { kingdomModifierService } = await import('../domain/KingdomModifierService');
      const modifiers = kingdomModifierService.getModifiersForCheck({
        skillName: skillSlug,
        checkType: 'action'
      });
      
      // Use PF2eSkillService to execute roll with proper modifier handling
      await pf2eSkillService.executeSkillRoll({
        actor: actingCharacter,
        skill,
        dc,
        label: `Morale Check: ${army.name}`,
        modifiers,
        extraRollOptions: ['morale-check', `army:${army.id}`],
        callback: async (roll: any, outcome: string | null | undefined) => {
          // Dispatch custom event for roll completion
          const event = new CustomEvent('kingdomRollComplete', {
            detail: {
              outcome: outcome,
              total: roll?.total,
              actorName: actingCharacter.name,
              skillName: this.selectedSkill
            }
          });
          window.dispatchEvent(event);
        }
      });
      
    } catch (error) {
      logger.error('[ArmyMoralePanel] Failed to trigger morale roll:', error);
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Failed to trigger morale roll');
      this.resetCurrentArmyToSelection();
    }
  }
  
  /**
   * Process roll result and apply effects
   */
  private async processRollResult(
    armyId: string, 
    outcome: MoraleOutcome,
    rollDetails: any
  ): Promise<void> {
    const armyStatus = this.armyStatuses.find(s => s.army.id === armyId);
    if (!armyStatus) return;
    
    const army = armyStatus.army;
    const outcomeData = MORALE_OUTCOMES[outcome];
    
    logger.info(`[ArmyMoralePanel] Processing result for ${army.name}: ${outcome}`);
    
    // Create result
    const result: MoraleCheckResult = {
      armyId: army.id,
      armyName: army.name,
      outcome,
      disbanded: outcomeData.disband,
      unrestGained: outcomeData.unrest,
      actorName: rollDetails.actorName || 'Unknown',
      skillName: rollDetails.skillName || this.selectedSkill,
      rollBreakdown: rollDetails
    };
    
    // Update army status
    armyStatus.status = 'completed';
    armyStatus.result = result;
    this.results.push(result);
    this.currentArmyId = null;
    
    // Clear hex highlight
    await this.clearHexHighlight();
    
    // Show notification (before potential disband dialog)
    const ui = (globalThis as any).ui;
    if (result.disbanded) {
      ui?.notifications?.warn(`${army.name} has failed morale! (+${result.unrestGained} Unrest)`);
    } else if (result.unrestGained > 0) {
      ui?.notifications?.info(`${army.name} holds together. (+${result.unrestGained} Unrest)`);
    } else {
      ui?.notifications?.info(`${army.name} rallies! Morale restored.`);
    }
    
    // Apply effects (may show disband dialog)
    await this.applyMoraleResult(army, result);
    
    // Check if all armies are complete (and no pending disband)
    const allComplete = this.armyStatuses.every(s => s.status === 'completed');
    const hasPendingDisband = this.pendingDisbandArmy !== null;
    
    if (allComplete && !hasPendingDisband) {
      this.panelState = 'completed';
    } else if (!hasPendingDisband) {
      this.panelState = 'showing-result';
    }
    // If there's a pending disband, keep current state - dialog will handle transition
    
    this.updateComponentProps();
  }
  
  /**
   * Apply morale check result effects (except disband - that requires confirmation)
   */
  private async applyMoraleResult(army: Army, result: MoraleCheckResult): Promise<void> {
    const outcomeData = MORALE_OUTCOMES[result.outcome];
    
    // Apply unrest change
    if (outcomeData.unrest > 0) {
      await updateKingdom(kingdom => {
        kingdom.unrest = (kingdom.unrest || 0) + outcomeData.unrest;
      });
      logger.info(`[ArmyMoralePanel] Added ${outcomeData.unrest} unrest`);
    }
    
    // Reset turns unsupported on critical success
    if (outcomeData.resetUnsupported) {
      await updateKingdom(kingdom => {
        const armyToUpdate = kingdom.armies?.find((a: Army) => a.id === army.id);
        if (armyToUpdate) {
          armyToUpdate.turnsUnsupported = 0;
        }
      });
      logger.info(`[ArmyMoralePanel] Reset turnsUnsupported for ${army.name}`);
    }
    
    // Show disband dialog on failure/critical failure (don't auto-disband)
    if (outcomeData.disband) {
      logger.info(`[ArmyMoralePanel] Showing disband dialog for: ${army.name}`);
      this.pendingDisbandArmy = army;
      this.updateComponentProps();
    }
  }
  
  /**
   * Handle user confirming army disband from dialog
   */
  private async handleDisbandConfirm(armyId: string, deleteActor: boolean): Promise<void> {
    const army = this.pendingDisbandArmy;
    if (!army || army.id !== armyId) {
      logger.warn(`[ArmyMoralePanel] Disband confirm for unknown army: ${armyId}`);
      return;
    }
    
    logger.info(`[ArmyMoralePanel] User confirmed disband: ${army.name}, deleteActor: ${deleteActor}`);
    
    try {
      const { armyService } = await import('./index');
      const result = await armyService.disbandArmy(army.id, deleteActor);
      logger.info(`[ArmyMoralePanel] Disbanded army: ${army.name}, result:`, result);
      
      const ui = (globalThis as any).ui;
      if (deleteActor && result?.actorId) {
        ui?.notifications?.info(`${result.armyName} disbanded and actor deleted`);
      } else {
        ui?.notifications?.info(`${result?.armyName || army.name} disbanded`);
      }
    } catch (error) {
      logger.error(`[ArmyMoralePanel] Failed to disband army ${army.name}:`, error);
      const ui = (globalThis as any).ui;
      ui?.notifications?.error(`Failed to disband ${army.name}: ${error}`);
    }
    
    // Clear pending disband and continue
    this.pendingDisbandArmy = null;
    this.updateComponentProps();
    
    // Check if all armies are now complete
    this.checkAllComplete();
  }
  
  /**
   * Handle user canceling army disband from dialog (X button)
   * Still disbands the army but keeps the actor (doesn't delete it)
   */
  private async handleDisbandCancel(armyId: string): Promise<void> {
    const army = this.pendingDisbandArmy;
    if (!army || army.id !== armyId) {
      logger.warn(`[ArmyMoralePanel] Disband cancel for unknown army: ${armyId}`);
      return;
    }
    
    logger.info(`[ArmyMoralePanel] User canceled disband dialog for: ${army.name} - disbanding but keeping actor`);
    
    try {
      // Disband army but DON'T delete the actor (deleteActor: false)
      const { armyService } = await import('./index');
      const result = await armyService.disbandArmy(army.id, false);
      logger.info(`[ArmyMoralePanel] Disbanded army (kept actor): ${army.name}, result:`, result);
      
      const ui = (globalThis as any).ui;
      ui?.notifications?.info(`${result?.armyName || army.name} disbanded (actor preserved)`);
    } catch (error) {
      logger.error(`[ArmyMoralePanel] Failed to disband army ${army.name}:`, error);
      const ui = (globalThis as any).ui;
      ui?.notifications?.error(`Failed to disband ${army.name}: ${error}`);
    }
    
    // Clear pending disband and continue
    this.pendingDisbandArmy = null;
    this.updateComponentProps();
    
    // Check if all armies are now complete
    this.checkAllComplete();
  }
  
  /**
   * Check if all armies are complete and transition to completed state
   */
  private checkAllComplete(): void {
    const allComplete = this.armyStatuses.every(s => s.status === 'completed');
    const hasPendingDisband = this.pendingDisbandArmy !== null;
    
    if (allComplete && !hasPendingDisband) {
      this.panelState = 'completed';
      this.updateComponentProps();
    }
  }
  
  /**
   * Reset current army back to pending state (for cancelled rolls)
   */
  private resetCurrentArmyToSelection(): void {
    if (this.currentArmyId) {
      const armyStatus = this.armyStatuses.find(s => s.army.id === this.currentArmyId);
      if (armyStatus) {
        armyStatus.status = 'pending';
      }
    }
    this.currentArmyId = null;
    this.panelState = 'selection';
    this.updateComponentProps();
    this.clearHexHighlight();
  }
  
  /**
   * Highlight the hex where an army is located
   */
  private async highlightArmyHex(hexId: string | null): Promise<void> {
    if (!hexId) return;
    
    try {
      // Clear any existing highlight
      await this.clearHexHighlight();
      
      // Import map layer
      const { ReignMakerMapLayer } = await import('../map/core/ReignMakerMapLayer');
      const mapLayer = ReignMakerMapLayer.getInstance();
      
      if (mapLayer) {
        // Draw highlight with warning color (yellow/orange)
        const style = {
          fillColor: 0xFFA500, // Orange
          fillAlpha: 0.5,
          borderColor: 0xFFA500,
          borderAlpha: 1,
          borderWidth: 3
        };
        
        mapLayer.drawHexes([hexId], style, 'morale-check-highlight');
        this.highlightedHexId = hexId;
        
        logger.info(`[ArmyMoralePanel] Highlighted hex: ${hexId}`);
      }
    } catch (error) {
      logger.error('[ArmyMoralePanel] Failed to highlight hex:', error);
    }
  }
  
  /**
   * Clear hex highlight
   */
  private async clearHexHighlight(): Promise<void> {
    if (!this.highlightedHexId) return;
    
    try {
      const { ReignMakerMapLayer } = await import('../map/core/ReignMakerMapLayer');
      const mapLayer = ReignMakerMapLayer.getInstance();
      
      if (mapLayer) {
        mapLayer.clearLayer('morale-check-highlight');
        this.highlightedHexId = null;
        logger.info('[ArmyMoralePanel] Cleared hex highlight');
      }
    } catch (error) {
      logger.error('[ArmyMoralePanel] Failed to clear hex highlight:', error);
    }
  }
  
  /**
   * Update component props when state changes
   */
  private updateComponentProps(): void {
    if (!this.component) return;
    
    this.component.$set({
      skill: this.selectedSkill,
      armies: this.armyStatuses,
      panelState: this.panelState,
      currentArmyId: this.currentArmyId,
      pendingDisbandArmy: this.pendingDisbandArmy,
      bestCharacterName: this.bestCharacterName,
      bestCharacterBonus: this.bestCharacterBonus
    });
  }
  
  /**
   * Handle Done button click
   */
  private handleDone(): void {
    logger.info('[ArmyMoralePanel] Done clicked, completing morale check');
    
    const resolver = this.resolve;
    const results = [...this.results];
    this.cleanup();
    resolver?.(results);
  }
  
  /**
   * Cleanup and restore state
   */
  private cleanup(): void {
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
    
    // Clear hex highlight
    this.clearHexHighlight();
    
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
    this.selectedSkill = 'diplomacy';
    this.armyStatuses = [];
    this.currentArmyId = null;
    this.resolve = null;
    this.panelState = 'selection';
    this.results = [];
  }
}

// Export singleton instance
export const armyMoralePanel = new ArmyMoralePanel();

