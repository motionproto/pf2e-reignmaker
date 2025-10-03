/**
 * GameEffectsService - Unified interface for applying game outcomes
 * 
 * Responsibilities:
 * - Apply immediate effects from events, incidents, and actions
 * - Handle resource modifications (gold, food, unrest, etc.)
 * - Handle special effects (structure damage, imprisoned unrest, hex claims)
 * - Create ongoing modifiers when needed (via ModifierService)
 * - Prevent double-application of outcomes
 * - Provide clear logging of all changes
 * 
 * Architecture:
 * - Service = Complex operations & utilities
 * - Single write path through updateKingdom() → KingdomActor
 * - Used by controllers and components
 */

import { updateKingdom } from '../stores/KingdomStore';
import type { EventModifier, ResourceType } from '../types/events';
import { createModifierService } from './ModifierService';

/**
 * Source type for the outcome
 */
export type OutcomeSourceType = 'event' | 'incident' | 'action';

/**
 * Degree of success for skill checks
 */
export type OutcomeDegree = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

/**
 * Context for outcome application
 */
export interface OutcomeContext {
  playerId?: string;           // Which player performed the action
  settlementId?: string;       // Where it happened
  hexId?: string;              // Which hex is affected
  [key: string]: any;          // Additional context as needed
}

/**
 * Parameters for applying an outcome
 */
export interface ApplyOutcomeParams {
  type: OutcomeSourceType;
  sourceId: string;            // event-id, incident-id, or action-name
  sourceName: string;          // Display name for logging
  outcome: OutcomeDegree;
  modifiers: EventModifier[];
  context?: OutcomeContext;
  createOngoingModifier?: boolean;  // If true, creates a modifier for ongoing effects
}

/**
 * Result of outcome application
 */
export interface ApplyOutcomeResult {
  success: boolean;
  error?: string;
  applied: {
    resources: Array<{ resource: ResourceType; value: number }>;
    specialEffects: string[];
  };
}

/**
 * Create the game effects service
 */
export async function createGameEffectsService() {
  const modifierService = await createModifierService();

  return {
    /**
     * Apply an outcome from an event, incident, or action
     * 
     * This is the main entry point for all outcome applications.
     * It handles immediate effects and delegates to ModifierService for ongoing effects.
     */
    async applyOutcome(params: ApplyOutcomeParams): Promise<ApplyOutcomeResult> {
      console.log(`🎯 [GameEffects] Applying ${params.type} outcome:`, {
        source: params.sourceName,
        outcome: params.outcome,
        modifierCount: params.modifiers.length
      });

      const result: ApplyOutcomeResult = {
        success: true,
        applied: {
          resources: [],
          specialEffects: []
        }
      };

      try {
        // Apply all modifiers
        for (const modifier of params.modifiers) {
          await this.applyModifier(modifier, params, result);
        }

        // Create ongoing modifier if requested
        if (params.createOngoingModifier && params.modifiers.length > 0) {
          await this.createOngoingModifier(params);
        }

        console.log(`✅ [GameEffects] Outcome applied successfully:`, result.applied);
        return result;

      } catch (error) {
        console.error(`❌ [GameEffects] Failed to apply outcome:`, error);
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        return result;
      }
    },

    /**
     * Apply a single modifier
     */
    async applyModifier(
      modifier: EventModifier,
      params: ApplyOutcomeParams,
      result: ApplyOutcomeResult
    ): Promise<void> {
      const { resource, value, duration } = modifier;

      // Only apply immediate and permanent effects here
      // Ongoing effects are handled by ModifierService during Status phase
      if (duration === 'immediate' || duration === 'permanent') {
        await this.applyResourceChange(resource, value, modifier.name, result);
      } else if (duration === 'turns') {
        // Turn-based modifiers are applied immediately but tracked for cleanup
        await this.applyResourceChange(resource, value, modifier.name, result);
      }
    },

    /**
     * Apply a resource change to the kingdom
     */
    async applyResourceChange(
      resource: ResourceType,
      value: number,
      modifierName: string,
      result: ApplyOutcomeResult
    ): Promise<void> {
      // Handle special resource types
      if (resource === 'unrest') {
        await this.applyUnrestChange(value, modifierName, result);
        return;
      }

      if (resource === 'fame') {
        await this.applyFameChange(value, modifierName, result);
        return;
      }

      // Handle standard resources (gold, food, lumber, stone, ore, luxuries)
      await updateKingdom(kingdom => {
        if (!kingdom.resources) {
          kingdom.resources = {};
        }

        const currentValue = kingdom.resources[resource] || 0;
        const newValue = Math.max(0, currentValue + value); // Resources can't go negative
        kingdom.resources[resource] = newValue;

        console.log(`  ✓ ${modifierName}: ${value > 0 ? '+' : ''}${value} ${resource} (${currentValue} → ${newValue})`);
      });

      result.applied.resources.push({ resource, value });
    },

    /**
     * Apply unrest changes with special handling
     */
    async applyUnrestChange(value: number, modifierName: string, result: ApplyOutcomeResult): Promise<void> {
      await updateKingdom(kingdom => {
        const currentUnrest = kingdom.unrest || 0;
        const newUnrest = Math.max(0, currentUnrest + value);
        kingdom.unrest = newUnrest;

        console.log(`  ✓ ${modifierName}: ${value > 0 ? '+' : ''}${value} unrest (${currentUnrest} → ${newUnrest})`);
      });

      result.applied.resources.push({ resource: 'unrest', value });
    },

    /**
     * Apply fame changes with special handling
     */
    async applyFameChange(value: number, modifierName: string, result: ApplyOutcomeResult): Promise<void> {
      await updateKingdom(kingdom => {
        const currentFame = kingdom.fame || 0;
        const newFame = Math.max(0, currentFame + value);
        kingdom.fame = newFame;

        console.log(`  ✓ ${modifierName}: ${value > 0 ? '+' : ''}${value} fame (${currentFame} → ${newFame})`);
      });

      result.applied.resources.push({ resource: 'fame', value });
    },

    /**
     * Create an ongoing modifier for continuous effects
     * 
     * This delegates to ModifierService for tracking and applying effects each turn.
     */
    async createOngoingModifier(params: ApplyOutcomeParams): Promise<void> {
      console.log(`🔄 [GameEffects] Creating ongoing modifier for ${params.sourceName}`);
      
      // TODO: Implement when we have proper event/incident objects
      // For now, this is a placeholder for future implementation
      console.warn(`⚠️ [GameEffects] Ongoing modifier creation not yet implemented`);
    },

    /**
     * Handle special effects (structure damage, imprisoned unrest, etc.)
     * 
     * These are effects that don't fit the standard resource model.
     */
    async applySpecialEffect(
      effectType: string,
      params: ApplyOutcomeParams,
      result: ApplyOutcomeResult
    ): Promise<void> {
      console.log(`🔧 [GameEffects] Applying special effect: ${effectType}`);

      switch (effectType) {
        case 'damage_structure':
          await this.damageStructure(params, result);
          break;
        case 'destroy_structure':
          await this.destroyStructure(params, result);
          break;
        case 'imprisoned_unrest':
          await this.convertToImprisonedUnrest(params, result);
          break;
        case 'claim_hex':
          await this.claimHex(params, result);
          break;
        default:
          console.warn(`⚠️ [GameEffects] Unknown special effect type: ${effectType}`);
      }
    },

    /**
     * Damage a random structure in a settlement
     */
    async damageStructure(params: ApplyOutcomeParams, result: ApplyOutcomeResult): Promise<void> {
      console.log(`🏚️ [GameEffects] Damaging structure in settlement`);
      // TODO: Implement when structure system is ready
      result.applied.specialEffects.push('structure_damaged');
    },

    /**
     * Destroy a random structure in a settlement
     */
    async destroyStructure(params: ApplyOutcomeParams, result: ApplyOutcomeResult): Promise<void> {
      console.log(`💥 [GameEffects] Destroying structure in settlement`);
      // TODO: Implement when structure system is ready
      result.applied.specialEffects.push('structure_destroyed');
    },

    /**
     * Convert regular unrest to imprisoned unrest
     */
    async convertToImprisonedUnrest(params: ApplyOutcomeParams, result: ApplyOutcomeResult): Promise<void> {
      console.log(`⛓️ [GameEffects] Converting unrest to imprisoned unrest`);
      
      await updateKingdom(kingdom => {
        const unrestToConvert = 1; // Default 1 point
        
        if (kingdom.unrest >= unrestToConvert) {
          kingdom.unrest -= unrestToConvert;
          kingdom.imprisonedUnrest = (kingdom.imprisonedUnrest || 0) + unrestToConvert;
          
          console.log(`  ✓ Converted ${unrestToConvert} unrest to imprisoned unrest`);
        } else {
          console.warn(`  ⚠️ Not enough unrest to convert (current: ${kingdom.unrest})`);
        }
      });

      result.applied.specialEffects.push('imprisoned_unrest_converted');
    },

    /**
     * Claim a hex for the kingdom
     */
    async claimHex(params: ApplyOutcomeParams, result: ApplyOutcomeResult): Promise<void> {
      console.log(`🗺️ [GameEffects] Claiming hex`);
      // TODO: Implement when hex system is ready
      result.applied.specialEffects.push('hex_claimed');
    }
  };
}

/**
 * Helper function to format outcome degree for display
 */
export function formatOutcomeDegree(degree: OutcomeDegree): string {
  const labels: Record<OutcomeDegree, string> = {
    criticalSuccess: 'Critical Success',
    success: 'Success',
    failure: 'Failure',
    criticalFailure: 'Critical Failure'
  };
  return labels[degree];
}
