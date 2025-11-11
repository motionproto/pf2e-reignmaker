/**
 * GameCommandsService - Unified interface for applying game outcomes
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

import { updateKingdom, getKingdomActor } from '../stores/KingdomStore';
import type { ResourceType } from '../types/events';
import type { EventModifier } from '../types/modifiers';
import { isStaticModifier, isDiceModifier, isChoiceModifier } from '../types/modifiers';
import { createModifierService } from './ModifierService';
import type { ActionLogEntry } from '../models/TurnState';
import type { TurnPhase } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';
import { structuresService } from './structures';
import { structureTargetingService } from './structures/targeting';
import { eventStructureTargetingConfigs } from '../data-compiled/event-structure-targeting';
import { StructureCondition } from '../models/Settlement';
import { PLAYER_KINGDOM } from '../types/ownership';
import type { SpecialEffect } from '../types/special-effects';
import { parseLegacyEffect } from '../types/special-effects';

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
    specialEffects: SpecialEffect[];
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
    async applyNumericModifiers(
      modifiers: Array<{ resource: ResourceType; value: number }>,
      outcome?: OutcomeDegree
    ): Promise<ApplyOutcomeResult> {

      const result: ApplyOutcomeResult = {
        success: true,
        applied: {
          resources: [],
          specialEffects: []
        }
      };
      
      try {
        // Apply critical success fame bonus (applies to all rolls)
        if (outcome === 'criticalSuccess') {
          await this.applyFameChange(1, 'Critical Success Bonus', result);
          result.applied.specialEffects.push(parseLegacyEffect('critical_success_fame'));
        }
        
        // Step 1: Accumulate modifiers by resource type
        const accumulated = new Map<ResourceType, number>();
        for (const { resource, value } of modifiers) {
          const current = accumulated.get(resource) || 0;
          accumulated.set(resource, current + value);
        }

        // Step 2: Pre-detect shortfalls for standard resources
        const shortfallResources: ResourceType[] = [];
        const actor = getKingdomActor();
        const kingdom = actor?.getKingdomData();
        
        if (kingdom?.resources) {
          for (const [resource, value] of accumulated) {
            // Only check standard resources (not unrest, fame, imprisonedUnrest)
            if (resource !== 'unrest' && resource !== 'fame' && resource !== 'imprisonedUnrest') {
              const currentValue = kingdom.resources[resource] || 0;
              const targetValue = currentValue + value;
              if (value < 0 && targetValue < 0) {
                shortfallResources.push(resource);

              }
            }
          }
        }
        
        // Step 3: Apply each accumulated resource change (skip individual shortfall checks)
        for (const [resource, value] of accumulated) {
          await this.applyResourceChange(resource, value, 'Applied', result, true);
        }
        
        // Step 4: Apply accumulated shortfall penalty as one unrest change
        if (shortfallResources.length > 0) {
          const totalUnrestPenalty = shortfallResources.length;
          logger.warn(`  ⚠️ Total shortfalls: ${shortfallResources.length} resources (${shortfallResources.join(', ')})`);
          logger.warn(`  ⚠️ Accumulated unrest penalty: +${totalUnrestPenalty}`);
          
          await this.applyUnrestChange(totalUnrestPenalty, 'Resource shortfall', result);
          result.applied.specialEffects.push(...shortfallResources.map(r => parseLegacyEffect(`shortage_penalty:${r}`)));
        }

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

        kingdom.turnState.actionLog.push(entry);

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
     */
    async applyOutcome(params: ApplyOutcomeParams): Promise<ApplyOutcomeResult> {

      const result: ApplyOutcomeResult = {
        success: true,
        applied: {
          resources: [],
          specialEffects: []
        }
      };

      try {
        // Apply critical success fame bonus (applies to all rolls)
        if (params.outcome === 'criticalSuccess') {
          await this.applyFameChange(1, 'Critical Success Bonus', result);
          result.applied.specialEffects.push(parseLegacyEffect('critical_success_fame'));
        }

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
        
        // Check if this is a special effect (not a standard resource)
        const specialEffectTypes = ['damage_structure', 'destroy_structure', 'claim_hex'];
        if (specialEffectTypes.includes(modifier.resource as string)) {
          // Special effects always apply immediately, regardless of duration
          await this.applySpecialEffect(modifier.resource as string, params, result);
          return;
        }
        
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
        
        // Check for pre-rolled value
        let numericValue: number;
        if (params.preRolledValues && params.preRolledValues.has(modifierIndex)) {
          numericValue = params.preRolledValues.get(modifierIndex)!;

        } else if (params.preRolledValues && params.preRolledValues.has(`state:${modifier.resource}`)) {
          numericValue = params.preRolledValues.get(`state:${modifier.resource}`)!;

        } else {
          // Roll the dice
          numericValue = this.evaluateDiceFormula(modifier.formula);
          if (modifier.negative) {
            numericValue = -numericValue;
          }
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
     * Evaluate dice formula (simple implementation for now)
     * TODO: Integrate with Foundry VTT's dice roller
     */
    evaluateDiceFormula(formula: string): number {
      // For now, just parse simple dice formulas like "1d4" or return 0
      const match = formula.match(/^(\d+)d(\d+)$/);
      if (match) {
        const [, numDice, diceSides] = match.map(Number);
        // Roll the dice (simple random)
        let total = 0;
        for (let i = 0; i < numDice; i++) {
          total += Math.floor(Math.random() * diceSides) + 1;
        }

        return total;
      }
      // If it's not a dice formula, try parsing as a number
      const num = parseInt(formula, 10);
      return isNaN(num) ? 0 : num;
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
        kingdom.resources[resource] = newValue;

      });

      // Apply shortfall penalty per Kingdom Rules (only if not skipped)
      if (hasShortfall && !skipShortfallCheck) {
        logger.warn(`  ⚠️ Shortfall detected for ${resource}: gained +1 unrest`);
        await this.applyUnrestChange(1, `${modifierName} (shortage)`, result);
        result.applied.specialEffects.push(parseLegacyEffect(`shortage_penalty:${resource}`));
      }

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

      });

      result.applied.resources.push({ resource: 'fame', value });
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
        result.applied.specialEffects.push(parseLegacyEffect('imprisoned_unrest_overflow'));
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
      result.applied.specialEffects.push(parseLegacyEffect('imprisoned_unrest_applied'));

      // Handle overflow if any
      if (overflow > 0) {
        logger.warn(`  ⚠️ Prison capacity exceeded by ${overflow} - converting to regular unrest`);
        await this.applyUnrestChange(overflow, `${modifierName} (overflow)`, result);
        result.applied.specialEffects.push(parseLegacyEffect('imprisoned_unrest_overflow'));
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
     * Handle special effects (structure damage, imprisoned unrest, etc.)
     * 
     * These are effects that don't fit the standard resource model.
     */
    async applySpecialEffect(
      effectType: string,
      params: ApplyOutcomeParams,
      result: ApplyOutcomeResult
    ): Promise<void> {

      switch (effectType) {
        case 'damage_structure':
          await this.damageStructure(params, result);
          break;
        case 'destroy_structure':
          await this.destroyStructure(params, result);
          break;
        case 'claim_hex':
          await this.claimHex(params, result);
          break;
        default:
          logger.warn(`⚠️ [GameCommands] Unknown special effect type: ${effectType}`);
      }
    },

    /**
     * Damage a random structure in a settlement
     */
    async damageStructure(params: ApplyOutcomeParams, result: ApplyOutcomeResult): Promise<void> {
      logger.info(`[GameCommands] Attempting to damage structure for event: ${params.sourceId}`);
      
      // Get targeting config for this event
      const config = eventStructureTargetingConfigs[params.sourceId];
      if (!config) {
        logger.warn(`[GameCommands] No targeting config found for event: ${params.sourceId}`);
        return;
      }

      // Select a structure to damage
      const target = structureTargetingService.selectStructureForDamage(config);
      if (!target) {
        logger.warn(`[GameCommands] No eligible structures found to damage`);
        return;
      }

      // Apply damage to the structure
      await updateKingdom(kingdom => {
        const settlement = kingdom.settlements.find(s => s.id === target.settlement.id);
        if (!settlement) {
          logger.error(`[GameCommands] Settlement not found: ${target.settlement.id}`);
          return;
        }

        // Initialize structureConditions if needed
        if (!settlement.structureConditions) {
          settlement.structureConditions = {};
        }

      // Mark structure as damaged
      settlement.structureConditions[target.structure.id] = StructureCondition.DAMAGED;
      logger.info(`[GameCommands] Damaged structure: ${target.structure.name} in ${settlement.name}`);
    });
    
    // Recalculate settlement and kingdom capacities (handles imprisoned unrest + food excess)
    const { settlementService } = await import('./settlements');
    await settlementService.recalculateAfterStructureChange(target.settlement.id);

    // Log to chat
      const message = `<p><strong>Structure Damaged:</strong> ${target.structure.name} in ${target.settlement.name} has been damaged and provides no bonuses until repaired.</p>`;
      ChatMessage.create({
        content: message,
        speaker: { alias: 'Kingdom Management' }
      });

      result.applied.specialEffects.push(parseLegacyEffect(`structure_damaged:${target.structure.id}:${target.settlement.id}`));
    },

    /**
     * Destroy a random structure in a settlement
     */
    async destroyStructure(params: ApplyOutcomeParams, result: ApplyOutcomeResult): Promise<void> {
      logger.info(`[GameCommands] Attempting to destroy structure for event: ${params.sourceId}`);
      
      // Get targeting config for this event
      const config = eventStructureTargetingConfigs[params.sourceId];
      if (!config) {
        logger.warn(`[GameCommands] No targeting config found for event: ${params.sourceId}`);
        return;
      }

      // Select a structure to destroy
      const target = structureTargetingService.selectStructureForDamage(config);
      if (!target) {
        logger.warn(`[GameCommands] No eligible structures found to destroy`);
        return;
      }

      // Apply destruction based on tier
      let message = '';
      
      if (target.structure.tier === 1) {
        // Tier 1 structures are removed entirely
        await updateKingdom(kingdom => {
          const settlement = kingdom.settlements.find(s => s.id === target.settlement.id);
          if (!settlement) {
            logger.error(`[GameCommands] Settlement not found: ${target.settlement.id}`);
            return;
          }

          // Remove structure from settlement
          settlement.structureIds = settlement.structureIds.filter(id => id !== target.structure.id);
          
          // Remove from structureConditions if present
          if (settlement.structureConditions) {
            delete settlement.structureConditions[target.structure.id];
          }

          logger.info(`[GameCommands] Destroyed tier 1 structure: ${target.structure.name} in ${settlement.name}`);
        });

        message = `<p><strong>Structure Destroyed:</strong> ${target.structure.name} in ${target.settlement.name} has been completely destroyed and removed.</p>`;
        
      } else {
        // Tier 2+ structures downgrade to previous tier (damaged)
        const previousTierId = target.structure.upgradeFrom;
        if (!previousTierId) {
          logger.error(`[GameCommands] Cannot downgrade structure - no upgradeFrom found: ${target.structure.id}`);
          return;
        }

        const previousStructure = structuresService.getStructure(previousTierId);
        if (!previousStructure) {
          logger.error(`[GameCommands] Previous tier structure not found: ${previousTierId}`);
          return;
        }

        await updateKingdom(kingdom => {
          const settlement = kingdom.settlements.find(s => s.id === target.settlement.id);
          if (!settlement) {
            logger.error(`[GameCommands] Settlement not found: ${target.settlement.id}`);
            return;
          }

          // Remove current tier structure
          settlement.structureIds = settlement.structureIds.filter(id => id !== target.structure.id);
          
          // Add previous tier structure
          settlement.structureIds.push(previousTierId);
          
          // Initialize structureConditions if needed
          if (!settlement.structureConditions) {
            settlement.structureConditions = {};
          }
          
          // Mark previous tier as damaged
          settlement.structureConditions[previousTierId] = StructureCondition.DAMAGED;
          
          // Remove current tier from structureConditions if present
          delete settlement.structureConditions[target.structure.id];

          logger.info(`[GameCommands] Destroyed tier ${target.structure.tier} structure: ${target.structure.name}, downgraded to ${previousStructure.name} (damaged) in ${settlement.name}`);
        });

        message = `<p><strong>Structure Destroyed:</strong> ${target.structure.name} in ${target.settlement.name} has been destroyed, downgrading to ${previousStructure.name} (damaged).</p>`;
      }
      
      // Recalculate settlement and kingdom capacities (handles imprisoned unrest + food excess)
      const { settlementService } = await import('./settlements');
      await settlementService.recalculateAfterStructureChange(target.settlement.id);

      // Log to chat
      ChatMessage.create({
        content: message,
        speaker: { alias: 'Kingdom Management' }
      });

      result.applied.specialEffects.push(parseLegacyEffect(`structure_destroyed:${target.structure.id}:${target.settlement.id}`));
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
          resources: [],
          specialEffects: []
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
        result.applied.specialEffects.push(parseLegacyEffect('imprisoned_unrest_allocated'));

        return result;

      } catch (error) {
        logger.error(`❌ [GameCommands] Failed to allocate imprisoned unrest:`, error);
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        return result;
      }
    },

    /**
     * Claim hexes for the kingdom (interactive selection)
     */
    async claimHex(params: ApplyOutcomeParams, result: ApplyOutcomeResult): Promise<void> {
      logger.info(`[GameCommands] Initiating hex claim for event: ${params.sourceId}`);
      
      // Import hex selector service and validator
      const { hexSelectorService } = await import('../services/hex-selector');
      const { validateClaimHex } = await import('../actions/claim-hexes/claimHexValidator');
      
      // Get number of hexes to claim from first modifier with claim_hex resource
      const claimModifier = params.modifiers.find(m => (m as any).resource === 'claim_hex');
      const hexCount = claimModifier ? (claimModifier as any).value : 1;
      
      logger.info(`[GameCommands] Requesting selection of ${hexCount} hex(es)`);
      
      // Call hex selector with claim validation
      const selectedHexes = await hexSelectorService.selectHexes({
        title: `Claim ${hexCount} Hex${hexCount !== 1 ? 'es' : ''} (${params.sourceName})`,
        count: hexCount,
        colorType: 'claim',
        validationFn: validateClaimHex,
        allowToggle: true
      });
      
      // Check if user cancelled
      if (!selectedHexes) {
        logger.info(`[GameCommands] Hex selection cancelled by user`);
        return;
      }
      
      logger.info(`[GameCommands] User selected hexes:`, selectedHexes);
      
      // Apply claims to kingdom data
      await updateKingdom(kingdom => {
        for (const hexId of selectedHexes) {
          const hex = kingdom.hexes.find(h => h.id === hexId);
          if (hex) {
            hex.claimedBy = PLAYER_KINGDOM;
            logger.info(`[GameCommands] Claimed hex: ${hexId}`);
          } else {
            logger.warn(`[GameCommands] Hex not found in kingdom data: ${hexId}`);
          }
        }
      });
      
      // Log to chat
      const hexList = selectedHexes.join(', ');
      const message = `<p><strong>Territory Claimed:</strong> ${hexCount} hex${hexCount !== 1 ? 'es' : ''} claimed (${hexList})</p>`;
      ChatMessage.create({
        content: message,
        speaker: { alias: 'Kingdom Management' }
      });
      
      result.applied.specialEffects.push(parseLegacyEffect(`hex_claimed:${hexCount}:${hexList}`));
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
