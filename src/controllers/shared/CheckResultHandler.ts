/**
 * CheckResultHandler - Manages check result display and application
 * 
 * Bridges between the CheckHandler and phase-specific controllers
 * to handle result display data and application logic
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import type { OutcomeResolutionData } from '../../services/resolution';

export interface DisplayData {
  effect: string;
  stateChanges: Record<string, any>;
  modifiers?: any[];
  manualEffects?: string[];
}

export interface ResolutionResult {
  success: boolean;
  error?: string;
  unresolvedEvent?: any;
  applied?: {
    resources: Array<{ resource: string; value: number }>;
    specialEffects: string[];
  };
}

export class CheckResultHandler {
  private lastSkillUsed = 'unknown';
  
  constructor(
    private checkType: 'event' | 'incident' | 'action',
    private controller: any
  ) {}

  /**
   * Get display data for the outcome preview
   */
  async getDisplayData(
    item: any, 
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    actorName: string
  ): Promise<DisplayData> {
    console.log(`📊 [CheckResultHandler] Getting display data for ${this.checkType} - ${outcome}`);

    // Check if controller is initialized
    if (!this.controller) {
      console.error(`❌ [CheckResultHandler] Controller is undefined for ${this.checkType}`);
      // Fallback - construct basic display data from item effects
      const effects = item.effects?.[outcome];
      return {
        effect: effects?.msg || `${outcome} outcome`,
        stateChanges: this.calculateBasicStateChanges(effects?.modifiers || []),
        modifiers: effects?.modifiers || [],
        manualEffects: effects?.manualEffects || []
      };
    }

    // Delegate to the phase-specific controller
    if (this.checkType === 'event') {
      return this.controller.getResolutionDisplayData(item, outcome, actorName);
    } else if (this.checkType === 'incident') {
      return this.controller.getResolutionDisplayData(item, outcome, actorName);
    } else if (this.checkType === 'action') {
      // Player actions might have a different method name
      if (this.controller.getActionDisplayData) {
        return this.controller.getActionDisplayData(item, outcome, actorName);
      }
      // Fallback to standard method
      return this.controller.getResolutionDisplayData(item, outcome, actorName);
    }

    // Fallback - construct basic display data from item effects
    const effects = item.effects?.[outcome];
    return {
      effect: effects?.msg || `${outcome} outcome`,
      stateChanges: this.calculateBasicStateChanges(effects?.modifiers || []),
      modifiers: effects?.modifiers || [],
      manualEffects: effects?.manualEffects || []
    };
  }

  /**
   * Apply the resolution through the appropriate controller
   * IMPORTANT: This method now handles persistence centrally
   */
  async applyResolution(
    item: any,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    resolutionData: OutcomeResolutionData
  ): Promise<ResolutionResult> {
    console.log(`✅ [CheckResultHandler] Applying ${this.checkType} resolution - ${outcome}`);

    // Track which skill was used (Phase 2 of TurnState Migration)
    if (resolutionData.skillUsed) {
      this.lastSkillUsed = resolutionData.skillUsed;
    }

    try {
      // Get display data before applying (we'll need it for persistence)
      const displayData = await this.getDisplayData(item, outcome, item.name || 'Unknown');
      
      let result: ResolutionResult;
      
      if (this.checkType === 'event') {
        result = await this.controller.applyEventOutcome(
          item,
          outcome,
          get(kingdomData),
          get(kingdomData).currentTurn || 1,
          resolutionData.diceRolls
        );
      } else if (this.checkType === 'incident') {
        // Pass detailed outcome directly to controller INCLUDING choice data
        result = await this.controller.resolveIncident(
          item.id,
          outcome,
          resolutionData.diceRolls,
          resolutionData.choice  // Pass choice data for resource array selections
        );
      } else if (this.checkType === 'action') {
        // Player actions might have different application method
        if (this.controller.applyActionResult) {
          result = await this.controller.applyActionResult(
            item,
            outcome,
            resolutionData
          );
        } else {
          result = { success: true };
        }
      } else {
        return { success: false, error: `Unknown check type: ${this.checkType}` };
      }
      
      // If successful, persist the applied outcome (centralized logic)
      if (result.success) {
        await this.saveAppliedOutcome(item, outcome, displayData);
        
        // Track player action (events and actions, NOT incidents)
        if (this.checkType === 'event' || this.checkType === 'action') {
          await this.trackPlayerAction(item, outcome, resolutionData);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [CheckResultHandler] Error applying ${this.checkType} resolution:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save applied outcome to KingdomActor for UI persistence
   * Centralized logic for all check types
   */
  private async saveAppliedOutcome(
    item: any,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    displayData: DisplayData
  ): Promise<void> {
    const { updateKingdom } = await import('../../stores/KingdomStore');
    const { getEventDisplayName } = await import('../../types/event-helpers');
    const { getIncidentDisplayName } = await import('../../types/event-helpers');
    
    if (this.checkType === 'event') {
      await updateKingdom(kingdom => {
        // Write ONLY to turnState (simplified migration)
        if (kingdom.turnState) {
          kingdom.turnState.eventsPhase.appliedOutcomes.push({
            eventId: item.id,
            eventName: getEventDisplayName(item),
            outcome: outcome,
            skillUsed: this.lastSkillUsed,
            effect: displayData.effect,
            stateChanges: displayData.stateChanges || {},
            modifiers: displayData.modifiers || [],
            manualEffects: displayData.manualEffects || []
          });
          kingdom.turnState.eventsPhase.eventResolved = true;
        }
      });
      console.log(`💾 [CheckResultHandler] Saved event outcome for: ${getEventDisplayName(item)}`);
    } else if (this.checkType === 'incident') {
      await updateKingdom(kingdom => {
        // Write ONLY to turnState (simplified migration)
        if (kingdom.turnState) {
          kingdom.turnState.unrestPhase.appliedOutcome = {
            incidentId: item.id,
            incidentName: getIncidentDisplayName(item),
            outcome: outcome,
            skillUsed: this.lastSkillUsed,
            effect: displayData.effect,
            stateChanges: displayData.stateChanges || {},
            modifiers: displayData.modifiers || [],
            manualEffects: displayData.manualEffects || []
          };
          kingdom.turnState.unrestPhase.incidentResolved = true;
        }
      });
      console.log(`💾 [CheckResultHandler] Saved incident outcome for: ${getIncidentDisplayName(item)}`);
    }
    // Actions don't need persistence (they're one-time activities)
  }

  /**
   * Track player action in the action log
   * Only for events and actions (NOT incidents)
   */
  private async trackPlayerAction(
    item: any,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    resolutionData: OutcomeResolutionData
  ): Promise<void> {
    try {
      // Get player info from game
      const currentUser = (window as any).game?.user;
      if (!currentUser) {
        console.warn('[CheckResultHandler] Cannot track action - no current user');
        return;
      }

      const playerId = currentUser.id;
      const playerName = currentUser.name || 'Unknown Player';
      
      // Get character name from player's assigned character
      let characterName = playerName; // Fallback to player name
      if (currentUser.character) {
        characterName = currentUser.character.name || playerName;
      }
      
      // Format action name: "item_id-outcome"
      const actionName = `${item.id}-${outcome}`;
      
      // Get current phase
      const kingdom = get(kingdomData);
      const currentPhase = kingdom.currentPhase;
      
      // Track the action using GameEffectsService
      const { createGameEffectsService } = await import('../../services/GameEffectsService');
      const gameEffects = await createGameEffectsService();
      
      await gameEffects.trackPlayerAction(
        playerId,
        playerName,
        characterName,
        actionName,
        currentPhase
      );
      
      console.log(`📝 [CheckResultHandler] Tracked ${this.checkType} action: ${characterName} - ${actionName}`);
    } catch (error) {
      console.error('[CheckResultHandler] Failed to track player action:', error);
      // Don't fail the whole resolution if tracking fails
    }
  }

  /**
   * Calculate basic state changes from modifiers
   * (Fallback if controller doesn't provide display data)
   */
  private calculateBasicStateChanges(modifiers: any[]): Record<string, any> {
    const stateChanges: Record<string, any> = {};

    if (!modifiers || !Array.isArray(modifiers)) {
      return stateChanges;
    }

    for (const modifier of modifiers) {
      const resource = modifier.resource;
      const value = modifier.value;

      if (resource && typeof value === 'number') {
        stateChanges[resource] = value;
      }
    }

    return stateChanges;
  }
}

/**
 * Factory function for creating a CheckResultHandler instance
 */
export function createCheckResultHandler(
  checkType: 'event' | 'incident' | 'action',
  controller: any
): CheckResultHandler {
  return new CheckResultHandler(checkType, controller);
}
