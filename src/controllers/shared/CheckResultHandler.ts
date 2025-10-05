/**
 * CheckResultHandler - Manages check result display and application
 * 
 * Bridges between the CheckHandler and phase-specific controllers
 * to handle result display data and application logic
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import type { OutcomeResolutionData } from '../../view/kingdom/components/OutcomeDisplay/logic/OutcomeResolutionService';

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
}

export class CheckResultHandler {
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
   */
  async applyResolution(
    item: any,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    resolutionData: OutcomeResolutionData
  ): Promise<ResolutionResult> {
    console.log(`✅ [CheckResultHandler] Applying ${this.checkType} resolution - ${outcome}`);

    try {
      if (this.checkType === 'event') {
        return await this.controller.applyEventOutcome(
          item,
          outcome,
          get(kingdomData),
          get(kingdomData).currentTurn || 1,
          resolutionData.diceRolls
        );
      } else if (this.checkType === 'incident') {
        // Map detailed outcome to simple for incident resolution
        const simplifiedOutcome = this.controller.mapDetailedOutcomeToSimple?.(outcome) || outcome;
        
        return await this.controller.resolveIncident(
          item.id,
          simplifiedOutcome,
          resolutionData.diceRolls
        );
      } else if (this.checkType === 'action') {
        // Player actions might have different application method
        if (this.controller.applyActionResult) {
          return await this.controller.applyActionResult(
            item,
            outcome,
            resolutionData
          );
        }
        // Fallback
        return { success: true };
      }

      return { success: false, error: `Unknown check type: ${this.checkType}` };
    } catch (error) {
      console.error(`❌ [CheckResultHandler] Error applying ${this.checkType} resolution:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
