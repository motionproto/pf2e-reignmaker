/**
 * GameCommandsService - Unified interface for applying game outcomes
 * 
 * Responsibilities:
 * - Apply immediate effects from events, incidents, and actions
 * - Handle resource modifications (gold, food, unrest, etc.)
 * - Create ongoing modifiers when needed (via ModifierService)
 * - Prevent double-application of outcomes
 * - Provide clear logging of all changes
 * 
 * Note: Structure damage/destroy and hex claims are handled via the game commands
 * system (see gameCommands/ handlers), not as resource modifiers.
 * 
 * Architecture:
 * - Service = Complex operations & utilities
 * - Single write path through updateKingdom() → KingdomActor
 * - Used by controllers and components
 */

import { updateKingdom, getKingdomActor } from '../stores/KingdomStore';
import type { ResourceType } from '../types/events';
import type { EventModifier } from '../types/modifiers';
import { isStaticModifier, isDiceModifier, isChoiceModifier } from '../types/modifiers';
import { createModifierService } from './ModifierService';
import type { ActionLogEntry } from '../models/TurnState';
import type { TurnPhase } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';
import { structuresService } from './structures';

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
  preRolledValues?: Map<number | string, number>;  // Pre-rolled dice values from UI (index → value OR "state:resource" → value)
}

/**
 * Result of outcome application
 */
export interface ApplyOutcomeResult {
  success: boolean;
  error?: string;
  applied: {
    resources: Array<{ resource: ResourceType; value: number }>;
  };
}

/**
 * Create the game effects service
 */
export async function createGameCommandsService() {
  const modifierService = await createModifierService();

  return {
    /**
     * NEW ARCHITECTURE: Apply numeric modifiers directly
     * Simpler than applyOutcome - just applies final numeric values
     * 
     * ACCUMULATION: Modifiers are accumulated by resource type before applying
     * This ensures floating numbers show totals (e.g., "+4 unrest" instead of four "+1 unrest")
     * 
     * @param modifiers - Array of resource changes to apply
     * @param outcome - Outcome degree (for automatic fame bonus on critical success)
     */
    /**
     * Apply numeric modifiers to kingdom resources
     * 
     * Handles resource accumulation, shortfall detection, and application.
     * Does NOT apply fame bonus - that's handled by UnifiedCheckHandler as a check outcome rule.
     * 
     * @param modifiers - Array of resource modifiers to apply
     * @param outcome - Outcome degree (no longer used for fame)
     */
    async applyNumericModifiers(
      modifiers: Array<{ resource: ResourceType; value: number }>,
      outcome?: OutcomeDegree
    ): Promise<ApplyOutcomeResult> {
      logger.info(`📊 [GameCommands] applyNumericModifiers called with ${modifiers.length} modifier(s):`, modifiers);

      const result: ApplyOutcomeResult = {
        success: true,
        applied: {
          resources: []
        }
      };
      
      try {
        
        // Step 1: Accumulate modifiers by resource type
        const accumulated = new Map<ResourceType, number>();
        for (const { resource, value } of modifiers) {
          const current = accumulated.get(resource) || 0;
          accumulated.set(resource, current + value);
        }
        logger.info(`📊 [GameCommands] Accumulated modifiers:`, Array.from(accumulated.entries()));

        // Step 2: Pre-detect shortfalls for standard resources
        const shortfallResources: ResourceType[] = [];
        const actor = getKingdomActor();
        const kingdom = actor?.getKingdomData();
        
        if (kingdom?.resources) {
          logger.info(`📊 [GameCommands] Current kingdom resources:`, kingdom.resources);
          for (const [resource, value] of accumulated) {
            // Only check standard resources (not unrest, fame, imprisonedUnrest)
            if (resource !== 'unrest' && resource !== 'fame' && resource !== 'imprisonedUnrest') {
              const currentValue = kingdom.resources[resource] || 0;
              const targetValue = currentValue + value;
              logger.info(`📊 [GameCommands] Checking ${resource}: current=${currentValue}, change=${value}, target=${targetValue}`);
              if (value < 0 && targetValue < 0) {
                shortfallResources.push(resource);
                logger.warn(`  ⚠️ Shortfall detected for ${resource}!`);
              }
            }
          }
        } else {
          logger.warn(`⚠️ [GameCommands] No kingdom resources found - skipping shortfall detection`);
        }
        
        logger.info(`📊 [GameCommands] Shortfall resources:`, shortfallResources);
        
        // Step 3: Apply each accumulated resource change (skip individual shortfall checks)
        for (const [resource, value] of accumulated) {
          logger.info(`📊 [GameCommands] Applying ${resource}: ${value}`);
          await this.applyResourceChange(resource, value, 'Applied', result, true);
        }
        
        // Step 4: NO LONGER APPLY SHORTFALL PENALTY HERE
        // The shortfall penalty is now pre-calculated in ResolutionDataBuilder
        // and included in the numericModifiers array, so it's already been applied in Step 3
        if (shortfallResources.length > 0) {
          logger.info(`  ℹ️ [GameCommands] Shortfalls detected (${shortfallResources.length}), but penalties already included in numericModifiers`);
          logger.info(`  ℹ️ [GameCommands] Shortfall resources: ${shortfallResources.join(', ')}`);
          // NOTE: The unrest penalty was already added by ResolutionDataBuilder, so we don't add it again
        }

        logger.info(`📊 [GameCommands] Final result:`, result);
        return result;
      } catch (error) {
        logger.error(`❌ [GameCommands] Failed to apply modifiers:`, error);
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        return result;
      }
    },

    /**
     * Track a player action in the turn's action log
     * 
     * This should be called whenever a player performs an action (events or actions, NOT incidents).
     */
    async trackPlayerAction(
      playerId: string,
      playerName: string,
      characterName: string,
      actionName: string,  // Format: "event_id-outcome" or "action_id-outcome"
      phase: TurnPhase
    ): Promise<void> {
      const actor = getKingdomActor();
      if (!actor) {
        logger.warn('[GameCommands] Cannot track action - no kingdom actor');
        return;
      }

      await actor.updateKingdomData((kingdom: any) => {
        if (!kingdom.turnState) {
          logger.warn('[GameCommands] Cannot track action - no turnState');
          return;
        }
        
        if (!kingdom.turnState.actionLog) {
          kingdom.turnState.actionLog = [];
        }

        const entry: ActionLogEntry = {
          playerId,
          playerName,
          characterName,
          actionName,
          phase,
          timestamp: Date.now()
        };

        // ✅ Immutable: Reassign array to trigger Svelte reactivity
        kingdom.turnState.actionLog = [...kingdom.turnState.actionLog, entry];

      });
    },

    /**
     * Get the number of actions a player has performed this turn
     */
    getPlayerActionCount(playerId: string): number {
      const actor = getKingdomActor();
      const kingdom = actor?.getKingdomData();
      
      if (!kingdom?.turnState?.actionLog) {
        return 0;
      }

      return kingdom.turnState.actionLog.filter(
        (entry: any) => entry.playerId === playerId
      ).length;
    },

    /**
     * Apply an outcome from an event, incident, or action
     * 
     * This is the main entry point for all outcome applications.
     * It handles immediate effects and delegates to ModifierService for ongoing effects.
     * 
     * Note: Fame bonus is NOT applied here - it's handled by UnifiedCheckHandler
     * as a check outcome rule.
     */
    async applyOutcome(params: ApplyOutcomeParams): Promise<ApplyOutcomeResult> {

      const result: ApplyOutcomeResult = {
        success: true,
        applied: {
          resources: []
        }
      };

      try {
        // Apply all modifiers with their indices
        for (let i = 0; i < params.modifiers.length; i++) {
          await this.applyModifier(params.modifiers[i], params, result, i);
        }

        // Create ongoing modifier if requested
        if (params.createOngoingModifier && params.modifiers.length > 0) {
          await this.createOngoingModifier(params);
        }

        return result;

      } catch (error) {
        logger.error(`❌ [GameCommands] Failed to apply outcome:`, error);
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        return result;
      }
    },

    /**
     * Apply a single modifier
     * 
     * Application rules:
     * - immediate: Apply once, right now
     * - permanent: Only applied during Status phase (structures only)
     * - turns: Apply immediately + track for continued application each turn
     * - ongoing: Apply immediately + track for continued application each turn
     */
    async applyModifier(
      modifier: EventModifier,
      params: ApplyOutcomeParams,
      result: ApplyOutcomeResult,
      modifierIndex: number
    ): Promise<void> {
      // Handle different modifier types with type guards
      if (isStaticModifier(modifier)) {
        // Static modifier: { type: 'static', resource, value, duration? }
        const modifierLabel = `${params.sourceName} (${params.outcome})`;
        
        // Skip ongoing modifiers for standard resources (applied during Status phase)
        if (modifier.duration === 'ongoing') {
          logger.info(`  ℹ️ Skipping 'ongoing' modifier for '${modifier.resource}' (applied during Status phase)`);
          return;
        }
        
        await this.applyResourceChange(modifier.resource, modifier.value, modifierLabel, result);
        
      } else if (isDiceModifier(modifier)) {
        // Dice modifier: { type: 'dice', resource, formula, negative?, duration? }
        
        // Skip UI-only modifiers (handled by game commands)
        // "imprisoned" is not a valid ResourceType - it's a pseudo-resource for UI display only
        if ((modifier.resource as string) === 'imprisoned') {
          logger.info(`  ℹ️ Skipping UI-only dice modifier for '${modifier.resource}' (handled by game command)`);
          return;
        }
        
        const modifierLabel = `${params.sourceName} (${params.outcome})`;
        
        // ✅ ONLY APPLY PRE-ROLLED VALUES - Never roll here
        let numericValue: number | undefined;
        if (params.preRolledValues && params.preRolledValues.has(modifierIndex)) {
          numericValue = params.preRolledValues.get(modifierIndex)!;
        } else if (params.preRolledValues && params.preRolledValues.has(`state:${modifier.resource}`)) {
          numericValue = params.preRolledValues.get(`state:${modifier.resource}`)!;
        }
        
        // If no pre-rolled value exists, this is a data error - dice should be rolled in UI
        if (numericValue === undefined) {
          logger.error(`❌ [GameCommands] Dice modifier has no pre-rolled value! Modifier index: ${modifierIndex}, resource: ${modifier.resource}, formula: ${modifier.formula}`);
          logger.error(`❌ [GameCommands] Dice MUST be rolled in OutcomeDisplay before calling applyOutcome()`);
          throw new Error(`Dice modifier "${modifier.resource}" has no pre-rolled value - dice must be rolled in UI before applying`);
        }
        
        await this.applyResourceChange(modifier.resource, numericValue, modifierLabel, result);
        
      } else if (isChoiceModifier(modifier)) {
        // Choice modifier: { type: 'choice', resources[], value, duration? }
        // This should have been resolved by OutcomeDisplay before calling
        logger.warn(`⚠️ [GameCommands] Choice modifier not resolved! This should have been handled by UI.`);
        
      } else {
        logger.warn(`⚠️ [GameCommands] Unknown modifier type:`, modifier);
      }
      
      // Note: Ongoing/turn-based modifiers are also added to activeModifiers
      // by the controller (not here) for continued tracking and application
    },


    /**
     * Apply a resource change to the kingdom
     * 
     * @param skipShortfallCheck - If true, skip automatic +1 unrest per shortfall (used when caller handles accumulation)
     */
    async applyResourceChange(
      resource: ResourceType,
      value: number,
      modifierName: string,
      result: ApplyOutcomeResult,
      skipShortfallCheck: boolean = false
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

      if (resource === 'imprisonedUnrest') {
        await this.applyImprisonedUnrestChange(value, modifierName, result);
        return;
      }

      if (resource === 'leadershipPenalty') {
        await this.applyLeadershipPenalty(value, modifierName, result);
        return;
      }

      // Handle standard resources (gold, food, lumber, stone, ore)
      let hasShortfall = false;
      
      await updateKingdom(kingdom => {
        if (!kingdom.resources) {
          kingdom.resources = {};
        }

        const currentValue = kingdom.resources[resource] || 0;
        const targetValue = currentValue + value;
        
        // Detect shortfall (trying to spend more than we have)
        if (value < 0 && targetValue < 0) {
          hasShortfall = true;
        }
        
        const newValue = Math.max(0, targetValue); // Resources can't go negative
        // ✅ Immutable: Reassign object to trigger Svelte reactivity
        kingdom.resources = { ...kingdom.resources, [resource]: newValue };

      });

      // Apply shortfall penalty per Kingdom Rules (only if not skipped)
      if (hasShortfall && !skipShortfallCheck) {
        logger.warn(`  ⚠️ Shortfall detected for ${resource}: gained +1 unrest`);
        await this.applyUnrestChange(1, `${modifierName} (shortage)`, result);
      }

      result.applied.resources.push({ resource, value });
    },

    /**
     * Apply unrest changes with special handling
     *
     * Special rule: If reducing unrest below 0 (kingdom already at peace),
     * award 1d3 gold per point of unrest that would have been reduced.
     * This is the opposite of the shortfall penalty for resources.
     */
    async applyUnrestChange(value: number, modifierName: string, result: ApplyOutcomeResult): Promise<void> {
      logger.info(`📊 [GameCommands] applyUnrestChange called: value=${value}, modifierName="${modifierName}"`);

      let excessReduction = 0;

      await updateKingdom(kingdom => {
        const currentUnrest = kingdom.unrest || 0;
        const targetUnrest = currentUnrest + value;

        // Check if we're trying to reduce unrest below 0
        if (value < 0 && targetUnrest < 0) {
          excessReduction = Math.abs(targetUnrest); // How much "wasted" reduction
          logger.info(`📊 [GameCommands] Excess unrest reduction detected: ${excessReduction} points`);
        }

        const newUnrest = Math.max(0, targetUnrest);
        logger.info(`📊 [GameCommands] Unrest change: ${currentUnrest} → ${newUnrest} (${value >= 0 ? '+' : ''}${value})`);
        kingdom.unrest = newUnrest;
      });

      result.applied.resources.push({ resource: 'unrest', value });

      // Award gold bonus for excess unrest reduction (kingdom at peace bonus)
      if (excessReduction > 0) {
        // Roll 1d3 gold per point of excess reduction
        let totalGoldBonus = 0;
        for (let i = 0; i < excessReduction; i++) {
          const roll = new Roll('1d3');
          await roll.evaluate({ async: true });
          totalGoldBonus += roll.total || 1;
        }

        logger.info(`📊 [GameCommands] Kingdom at peace bonus: +${totalGoldBonus} gold (${excessReduction} × 1d3)`);

        // Apply the gold bonus
        await this.applyResourceChange('gold', totalGoldBonus, `${modifierName} (peace dividend)`, result, true);

        // Show floating number and chat message
        ChatMessage.create({
          content: `<p><strong>Kingdom at Peace:</strong> Your people's contentment yields a peace dividend of <strong>+${totalGoldBonus} Gold</strong> (${excessReduction} × 1d3).</p>`,
          speaker: ChatMessage.getSpeaker()
        });
      }
    },

    /**
     * Apply fame changes with special handling
     */
    async applyFameChange(value: number, modifierName: string, result: ApplyOutcomeResult): Promise<void> {
      await updateKingdom(kingdom => {
        const currentFame = kingdom.fame || 0;
        const newFame = Math.max(0, currentFame + value);
        kingdom.fame = newFame;

      });

      result.applied.resources.push({ resource: 'fame', value });
    },

    /**
     * Apply leadership penalty (turn-scoped check penalty)
     */
    async applyLeadershipPenalty(value: number, modifierName: string, result: ApplyOutcomeResult): Promise<void> {
      await updateKingdom(kingdom => {
        const currentPenalty = kingdom.leadershipPenalty || 0;
        const newPenalty = currentPenalty + value;
        kingdom.leadershipPenalty = newPenalty;
        logger.info(`  📊 Leadership penalty: ${currentPenalty} → ${newPenalty} (${value >= 0 ? '+' : ''}${value})`);
      });

      result.applied.resources.push({ resource: 'leadershipPenalty', value });
    },

    /**
     * Apply imprisoned unrest changes with special handling
     * 
     * This auto-allocates imprisoned unrest to settlements with available capacity.
     * If no capacity exists, it converts to regular unrest instead.
     */
    async applyImprisonedUnrestChange(value: number, modifierName: string, result: ApplyOutcomeResult): Promise<void> {
      if (value <= 0) {
        logger.warn(`  ⚠️ Cannot apply negative imprisoned unrest`);
        return;
      }

      const actor = getKingdomActor();
      const kingdom = actor?.getKingdomData();
      
      if (!kingdom) {
        logger.error(`  ❌ No kingdom actor found`);
        return;
      }

      // Calculate total available capacity across all settlements
      let totalCapacity = 0;
      const settlementCapacities: Array<{ id: string; name: string; available: number }> = [];

      for (const settlement of kingdom.settlements) {
        const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
        const currentImprisoned = settlement.imprisonedUnrest || 0;
        const available = capacity - currentImprisoned;
        
        if (available > 0) {
          totalCapacity += available;
          settlementCapacities.push({
            id: settlement.id,
            name: settlement.name,
            available
          });
        }
      }

      if (totalCapacity === 0) {
        // No capacity - convert to regular unrest
        logger.warn(`  ⚠️ No prison capacity available - converting ${value} imprisoned unrest to regular unrest`);
        await this.applyUnrestChange(value, `${modifierName} (no prisons)`, result);
        return;
      }

      // Allocate what we can to prisons
      const amountToImprison = Math.min(value, totalCapacity);
      const overflow = value - amountToImprison;

      await updateKingdom(kingdom => {
        let remaining = amountToImprison;
        
        // Allocate to settlements in order until we run out
        for (const { id, name, available } of settlementCapacities) {
          if (remaining <= 0) break;
          
          const settlement = kingdom.settlements.find(s => s.id === id);
          if (!settlement) continue;

          const toAllocate = Math.min(remaining, available);
          const currentImprisoned = settlement.imprisonedUnrest || 0;
          settlement.imprisonedUnrest = currentImprisoned + toAllocate;

          remaining -= toAllocate;
        }
      });

      result.applied.resources.push({ resource: 'imprisonedUnrest', value: amountToImprison });

      // Handle overflow if any
      if (overflow > 0) {
        logger.warn(`  ⚠️ Prison capacity exceeded by ${overflow} - converting to regular unrest`);
        await this.applyUnrestChange(overflow, `${modifierName} (overflow)`, result);
      }
    },

    /**
     * Create an ongoing modifier for ongoing effects
     * 
     * This delegates to ModifierService for tracking and applying effects each turn.
     */
    async createOngoingModifier(params: ApplyOutcomeParams): Promise<void> {

      // TODO: Implement when we have proper event/incident objects
      // For now, this is a placeholder for future implementation
      logger.warn(`⚠️ [GameCommands] Ongoing modifier creation not yet implemented`);
    },

    /**
     * Allocate imprisoned unrest to settlements with justice structures
     * 
     * @param allocations - Map of settlementId → amount to store
     * @returns ApplyOutcomeResult with applied changes
     */
    async allocateImprisonedUnrest(
      allocations: Record<string, number>
    ): Promise<ApplyOutcomeResult> {

      const result: ApplyOutcomeResult = {
        success: true,
        applied: {
          resources: []
        }
      };

      try {
        // Calculate total to allocate
        const totalToAllocate = Object.values(allocations).reduce((sum, val) => sum + val, 0);
        
        if (totalToAllocate === 0) {
          logger.warn(`  ⚠️ No unrest allocated`);
          return result;
        }

        // Validate and apply allocations
        await updateKingdom(kingdom => {
          // Check if we have enough unrest
          if (kingdom.unrest < totalToAllocate) {
            throw new Error(`Not enough unrest to allocate (current: ${kingdom.unrest}, requested: ${totalToAllocate})`);
          }

          // Validate and apply each allocation
          for (const [settlementId, amount] of Object.entries(allocations)) {
            if (amount <= 0) continue;

            const settlement = kingdom.settlements.find(s => s.id === settlementId);
            if (!settlement) {
              throw new Error(`Settlement not found: ${settlementId}`);
            }

            // Calculate capacity using structuresService
            const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
            const currentImprisoned = settlement.imprisonedUnrest || 0;
            const availableSpace = capacity - currentImprisoned;

            if (amount > availableSpace) {
              throw new Error(`Settlement ${settlement.name} doesn't have enough capacity (available: ${availableSpace}, requested: ${amount})`);
            }

            // Apply allocation
            settlement.imprisonedUnrest = currentImprisoned + amount;

          }

          // Reduce kingdom unrest by total allocated
          kingdom.unrest -= totalToAllocate;

        });

        // Record in result
        result.applied.resources.push({ resource: 'unrest', value: -totalToAllocate });

        return result;

      } catch (error) {
        logger.error(`❌ [GameCommands] Failed to allocate imprisoned unrest:`, error);
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        return result;
      }
    },

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
