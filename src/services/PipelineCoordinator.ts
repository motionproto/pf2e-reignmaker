/**
 * PipelineCoordinator.ts
 *
 * Central coordinator for ALL action execution.
 * Orchestrates the complete 9-step pipeline with persistent context.
 *
 * Replaces the fragmented approach where steps were called from
 * 5+ different locations in ActionsPhase.svelte.
 */

import type { PipelineContext, StepResult, SerializablePipelineContext } from '../types/PipelineContext';
import type { CheckPipeline, OutcomeType, KingdomSkill } from '../types/CheckPipeline';
import type { ActorContext } from '../types/CheckContext';
import { createPipelineContext, log, getPipeline, getKingdom, getOutcome, toSerializableContext, fromSerializableContext } from '../types/PipelineContext';
import { getKingdomActor } from '../stores/KingdomStore';
import { getCurrentUserCharacter } from './pf2e';
import { unifiedCheckHandler } from './UnifiedCheckHandler';
import { createOutcomePreviewService } from './OutcomePreviewService';

/**
 * PF2e native callback type for skill rolls
 * Called when roll completes with outcome data
 */
type CheckRollCallback = (
  roll: any,
  outcome: string | null | undefined,
  message: any,
  event: Event | null
) => Promise<void> | void;

/**
 * Pipeline Coordinator
 * 
 * Single entry point for all action execution.
 * Manages the complete lifecycle of an action from initiation to completion.
 */
export class PipelineCoordinator {
  // Pending contexts waiting for user confirmation (Step 6)
  private pendingContexts = new Map<string, PipelineContext>();
  
  // Check instance service
  private checkInstanceService: any;
  private servicesInitialized: Promise<void>;

  constructor() {
    console.log('🔧 [PipelineCoordinator] Initializing');
    this.servicesInitialized = this.initializeServices();
  }

  /**
   * Initialize required services
   */
  private async initializeServices(): Promise<void> {
    this.checkInstanceService = await createOutcomePreviewService();
    console.log('✅ [PipelineCoordinator] Services initialized');
  }
  
  /**
   * Ensure services are initialized before use
   */
  private async ensureServices(): Promise<void> {
    await this.servicesInitialized;
  }

  /**
   * Persist pipeline context to kingdom data for recovery after page reload
   */
  private async persistContext(ctx: PipelineContext): Promise<void> {
    if (!ctx.instanceId) return;

    const actor = getKingdomActor();
    if (!actor) return;

    const serialized = toSerializableContext(ctx);

    await actor.updateKingdomData((kingdom: any) => {
      if (!kingdom.turnState) return;
      if (!kingdom.turnState.activePipelineContexts) {
        kingdom.turnState.activePipelineContexts = {};
      }
      kingdom.turnState.activePipelineContexts[ctx.instanceId!] = serialized;
    });

    console.log(`💾 [PipelineCoordinator] Persisted context for ${ctx.instanceId}`);
  }

  /**
   * Recover pipeline context from kingdom data
   */
  private recoverContext(instanceId: string): PipelineContext | null {
    const actor = getKingdomActor();
    if (!actor) return null;

    const kingdom = actor.getKingdomData();
    const serialized = kingdom.turnState?.activePipelineContexts?.[instanceId];

    if (!serialized) {
      console.log(`⚠️ [PipelineCoordinator] No persisted context found for ${instanceId}`);
      return null;
    }

    const recovered = fromSerializableContext(serialized, kingdom);
    console.log(`🔄 [PipelineCoordinator] Recovered context from kingdom data for ${instanceId}`);

    return recovered;
  }

  /**
   * Remove persisted context from kingdom data
   */
  private async removePersistedContext(instanceId: string): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    await actor.updateKingdomData((kingdom: any) => {
      if (kingdom.turnState?.activePipelineContexts?.[instanceId]) {
        delete kingdom.turnState.activePipelineContexts[instanceId];
      }
    });

    console.log(`🗑️ [PipelineCoordinator] Removed persisted context for ${instanceId}`);
  }

  /**
   * Main entry point - Execute complete pipeline
   * 
   * @param actionId - Action/event/incident ID
   * @param initialContext - Initial context data (actor, metadata, etc.)
   * @returns Complete pipeline context with all step results
   */
  async executePipeline(
    actionId: string,
    initialContext: Partial<PipelineContext>
  ): Promise<PipelineContext> {
    // Use custom checkId if provided in metadata (for aid-another)
    // Otherwise use actionId (normal behavior)
    const checkId = (initialContext.metadata as any)?.checkId || actionId;
    
    // Clean up any old instances for this action before starting new pipeline
    const checkType = initialContext.checkType || 'action';
    await this.cleanupOldInstances(checkId, checkType);
    
    // Initialize context
    const context = this.initializeContext(actionId, initialContext);
    
    // ✅ CRITICAL: Generate instanceId IMMEDIATELY for modifier isolation
    // Each execution (deploy-army #1, #2, #3) gets a unique instanceId
    // Format: T<turn>-<action-name>-<unique-string> (e.g., "T5-deploy-army-abc123def456")
    // Including turn number enables turn-aware validation for reroll modifier retrieval
    const currentTurn = getKingdomActor()?.getKingdomData()?.currentTurn || 0;
    const kingdom = getKingdomActor()?.getKingdomData();
    
    // ✅ REUSE existing instanceId for events if one exists in turnState
    // EventPhaseController creates an instanceId when an event triggers (d20 check).
    // We should reuse that ID for the skill roll so EventsPhase.currentEventInstance can find the outcome.
    // Note: Incidents don't use this pattern - they match by being first in pendingOutcomes
    let existingInstanceId: string | null = null;
    
    if (checkType === 'event' && kingdom?.turnState?.eventsPhase?.eventId === actionId) {
      existingInstanceId = kingdom.turnState.eventsPhase.eventInstanceId;
    }
    
    if (existingInstanceId) {
      context.instanceId = existingInstanceId;
      console.log(`🆔 [PipelineCoordinator] Reusing existing instanceId: ${context.instanceId}`);
    } else {
      context.instanceId = `T${currentTurn}-${actionId}-${foundry.utils.randomID()}`;
      console.log(`🆔 [PipelineCoordinator] Generated new instanceId: ${context.instanceId} (turn ${currentTurn})`);
    }
    
    log(context, 0, 'initialize', `Starting pipeline for ${actionId}`);
    
    try {
      // Execute Steps 1-3
      await this.step1_checkRequirements(context);
      await this.step2_preRollInteractions(context);
      await this.step3_executeRoll(context); // Returns after setting up callback
      
      // Callback will resume with Steps 4-9
      return context;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle user cancellation gracefully (not an error)
      if (errorMessage === 'Action cancelled by user') {
        log(context, 0, 'cancelled', `User cancelled ${actionId}`);
        console.log(`⏭️ [PipelineCoordinator] User cancelled ${actionId}`);
        
        // Still rollback any partial changes
        await this.rollback(context);
        
        throw error; // Re-throw so caller knows it was cancelled
      }
      
      // Regular error handling
      log(context, 0, 'error', `Pipeline failed: ${errorMessage}`, error);
      console.error('❌ [PipelineCoordinator] Pipeline execution failed:', error);
      
      // Rollback any partial changes
      await this.rollback(context);
      
      throw error;
    }
  }

  /**
   * Resume pipeline after roll completes (Steps 4-9)
   * Called by the PF2e callback after roll is complete
   */
  private async resumeAfterRoll(ctx: PipelineContext): Promise<void> {
    try {
      await this.step4_createCheckInstance(ctx);
      await this.step5_calculatePreview(ctx);
      await this.step6_waitForUserConfirmation(ctx);
      await this.step7_postApplyInteractions(ctx);
      await this.step8_executeAction(ctx);
      await this.step9_cleanup(ctx);
      
      log(ctx, 0, 'complete', `Pipeline completed successfully`);
      console.log('✅ [PipelineCoordinator] Pipeline execution complete:', {
        actionId: ctx.actionId,
        outcome: ctx.rollData?.outcome,
        steps: ctx.logs.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(ctx, 0, 'error', `Post-roll phase failed: ${errorMessage}`, error);
      console.error('❌ [PipelineCoordinator] Post-roll phase failed:', error);
      
      // Rollback any partial changes
      await this.rollback(ctx);
      
      throw error;
    }
  }

  /**
   * Reroll from Step 3 (keep existing pipeline context)
   *
   * Called when user clicks "Reroll" button.
   * Rewinds to Step 3 and re-executes the roll with the SAME context.
   *
   * Recovery:
   * 1. In-memory pendingContexts (fast path, same session)
   * 2. Persisted kingdom.turnState.activePipelineContexts (survives page reload)
   *
   * @param instanceId - Pipeline instance ID
   */
  async rerollFromStep3(instanceId: string): Promise<void> {
    let context = this.pendingContexts.get(instanceId);

    if (!context) {
      // Recover from persisted kingdom data
      console.log(`🔄 [PipelineCoordinator] Context lost for ${instanceId}, recovering from kingdom data`);
      context = this.recoverContext(instanceId);

      if (context) {
        // Store recovered context in memory for future use
        this.pendingContexts.set(instanceId, context);
        console.log(`✅ [PipelineCoordinator] Recovered context from activePipelineContexts`);
      }
    }

    if (!context) {
      throw new Error(
        `[PipelineCoordinator] Cannot reroll: pipeline context not found for ${instanceId}. ` +
        `The action may have been completed or the session expired. Please re-initiate the action.`
      );
    }
    
    console.log(`🔄 [PipelineCoordinator] Rerolling from Step 3 (same pipeline context)`);
    console.log(`📦 [PipelineCoordinator] Context has resolutionData:`, !!context.resolutionData);
    log(context, 3, 'reroll', 'Rerolling from Step 3 with existing context');
    
    // ✅ EXPLICIT: Mark context as reroll (used by Step 3 to load modifiers)
    context.isReroll = true;
    
    // ✅ DON'T clear the instance here!
    // Clearing triggers Svelte reactivity which nulls the instance prop in OutcomeDisplay
    // before the new roll completes. Instead, step4_createCheckInstance will update
    // the existing instance in-place via createActionOutcomePreview().
    
    // Re-execute Step 3 with SAME context (modifiers AND resolutionData preserved)
    await this.step3_executeRoll(context);
    // Callback will resume at Step 4 with new roll data
  }

  /**
   * Confirm user clicked "Apply Result" - resolves Step 6 callback
   * 
   * Called from OutcomeDisplay when user clicks "Apply Result"
   * 
   * @param instanceId - Check instance ID
   * @param resolutionData - Resolution data from OutcomeDisplay (includes customComponentData)
   */
  async confirmApply(instanceId: string, resolutionData?: any): Promise<void> {
    let context = this.pendingContexts.get(instanceId);

    if (!context) {
      // Try to recover from persisted kingdom data first
      console.log(`🔄 [PipelineCoordinator] Context lost for confirmApply, attempting recovery`);
      context = this.recoverContext(instanceId);

      if (context) {
        this.pendingContexts.set(instanceId, context);
        console.log(`✅ [PipelineCoordinator] Recovered context from kingdom data for confirmApply`);
      }
    }

    if (!context) {
      console.warn(`[PipelineCoordinator] No pending context for instance: ${instanceId} - resuming from persisted preview`);

      // Context was lost (page reload or client sync) - execute from persisted preview
      await this.resumeFromPersistedPreview(instanceId, resolutionData);
      return;
    }
    
    log(context, 6, 'confirm', 'User confirmed outcome, continuing to Steps 7-9');
    console.log(`▶️ [PipelineCoordinator] User confirmed, resolving Step 6 callback`);
    console.log(`📦 [PipelineCoordinator] Resolution data:`, resolutionData);
    
    // Mark as confirmed
    context.userConfirmed = true;
    
    // ✅ STORE RESOLUTION DATA (includes customComponentData from custom components)
    if (resolutionData) {
      context.resolutionData = {
        ...context.resolutionData,
        ...resolutionData
      };
      
      console.log(`📦 [PipelineCoordinator] Stored resolution data in context:`, context.resolutionData);
    }
    
    // Persist resolution data to instance.resolutionState for reroll preservation and UI sync
    if (context.instanceId && resolutionData) {
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdomData((kingdom: any) => {
          const instance = kingdom.pendingOutcomes?.find((i: any) => i.previewId === context.instanceId);
          if (instance) {
            instance.resolutionState = {
              ...instance.resolutionState,
              selectedChoice: resolutionData.selectedChoice ?? instance.resolutionState?.selectedChoice,
              resolvedDice: { ...instance.resolutionState?.resolvedDice, ...resolutionData.resolvedDice },
              selectedResources: { ...instance.resolutionState?.selectedResources, ...resolutionData.selectedResources },
              customComponentData: resolutionData.customComponentData ?? instance.resolutionState?.customComponentData
            };

            console.log(`💾 [PipelineCoordinator] Persisted resolution data to instance.resolutionState`);
          }
        });
      }
    }

    // Update persisted context with the new resolution data
    await this.persistContext(context);

    // Resolve the callback (continues execution to Step 7)
    if (context._resumeCallback) {
      context._resumeCallback();
    } else {
      console.error('[PipelineCoordinator] No resume callback found in context');
    }
  }

  /**
   * Resume execution from persisted preview (edge case: context lost after turn boundary)
   *
   * Only called when both in-memory and activePipelineContexts are lost,
   * but the outcome preview is still visible. Executes Steps 7-9 directly.
   */
  private async resumeFromPersistedPreview(instanceId: string, resolutionData?: any): Promise<void> {
    console.log(`🔄 [PipelineCoordinator] Resuming from persisted preview: ${instanceId}`);

    await this.ensureServices();

    const actor = getKingdomActor();
    if (!actor) {
      throw new Error('[PipelineCoordinator] No kingdom actor found');
    }

    const kingdom = actor.getKingdomData();
    const instance = kingdom.pendingOutcomes?.find((i: any) => i.previewId === instanceId);

    if (!instance || !instance.appliedOutcome) {
      throw new Error(`[PipelineCoordinator] Instance or outcome not found: ${instanceId}`);
    }

    // Validate pipeline exists
    await getPipeline({ actionId: instance.checkId });

    // Build resolution data from instance.resolutionState (primary) merged with passed data
    const instanceResolutionState = instance.resolutionState || {};
    const mergedResolutionData = {
      diceRolls: {},
      choices: {},
      allocations: {},
      textInputs: {},
      compoundData: {},
      numericModifiers: [],
      manualEffects: [],
      customComponentData: instanceResolutionState.customComponentData || null,
      selectedChoice: instanceResolutionState.selectedChoice,
      resolvedDice: instanceResolutionState.resolvedDice || {},
      selectedResources: instanceResolutionState.selectedResources || {},
      ...resolutionData
    };

    // Reconstruct minimal context from persisted data
    const ctx: PipelineContext = {
      actionId: instance.checkId,
      checkType: instance.checkType as 'action' | 'event' | 'incident',
      userId: (window as any).game?.user?.id || 'unknown',
      kingdom,
      actor: instance.metadata?.actor,
      metadata: instance.metadata || {},
      resolutionData: mergedResolutionData,
      rollData: {
        outcome: instance.appliedOutcome.outcome as any,
        rollBreakdown: instance.appliedOutcome.rollBreakdown
      },
      instanceId,
      userConfirmed: true,
      logs: []
    };

    console.log(`🔄 [PipelineCoordinator] Executing Steps 7-9 from persisted preview`);

    await this.step7_postApplyInteractions(ctx);
    await this.step8_executeAction(ctx);
    await this.step9_cleanup(ctx);

    console.log(`✅ [PipelineCoordinator] Resumed execution complete`);
  }

  // ========================================
  // STEP IMPLEMENTATIONS
  // ========================================

  /**
   * Step 1: Check Requirements
   * 
   * Validates that action can be performed (resources, prerequisites, etc.)
   * OPTIONAL - only runs if pipeline defines requirements
   */
  private async step1_checkRequirements(ctx: PipelineContext): Promise<void> {
    log(ctx, 1, 'checkRequirements', 'Checking action requirements');
    
    const pipeline = await getPipeline(ctx);
    
    // Check if action has upfront costs
    if (pipeline.cost) {
      const kingdom = getKingdom(ctx);
      const missingResources: string[] = [];
      
      for (const [resource, amount] of Object.entries(pipeline.cost)) {
        if (amount && amount > 0) {
          const current = (kingdom.resources as any)[resource] || 0;
          if (current < amount) {
            missingResources.push(`${resource}: need ${amount}, have ${current}`);
          }
        }
      }
      
      if (missingResources.length > 0) {
        throw new Error(`Insufficient resources: ${missingResources.join(', ')}`);
      }
      
      log(ctx, 1, 'checkRequirements', `Resource requirements met`, pipeline.cost);
    }
    
    // TODO: Check other requirements (army count, settlement tier, etc.)
    
    log(ctx, 1, 'checkRequirements', 'Requirements check passed');
  }

  /**
   * Step 2: Pre-Roll Interactions
   * 
   * Execute dialogs/interactions BEFORE the skill check
   * OPTIONAL - only runs if pipeline has preRollInteractions
   * 
   * Examples: Select settlement, choose army, configure options
   * NEW: Handles skill filtering for choice-based interactions
   */
  private async step2_preRollInteractions(ctx: PipelineContext): Promise<void> {
    log(ctx, 2, 'preRollInteractions', 'Starting pre-roll interactions');
    
    const pipeline = await getPipeline(ctx);
    
    // Check if there are pre-roll interactions
    if (!pipeline.preRollInteractions || pipeline.preRollInteractions.length === 0) {
      log(ctx, 2, 'preRollInteractions', 'No pre-roll interactions, skipping');
      return;
    }
    
    // Execute pre-roll interactions via UnifiedCheckHandler
    // Pass existing context metadata (allows rerolls to skip interactions)
    const metadata = await unifiedCheckHandler.executePreRollInteractions(
      ctx.actionId,
      ctx.kingdom,
      ctx.metadata
    );
    
    // Store metadata in context
    ctx.metadata = { ...ctx.metadata, ...metadata };
    
    // NEW: Handle skill filtering for choice-based interactions
    // Check if any interaction has affectsSkills flag
    for (const interaction of pipeline.preRollInteractions) {
      if (interaction.type === 'choice' && interaction.affectsSkills && interaction.options) {
        // Get the selected choice from metadata
        const selectedChoice = metadata[interaction.id || 'approach'];
        
        if (selectedChoice) {
          // Find the matching option
          const selectedOption = interaction.options.find((o: any) => o.id === selectedChoice);
          
          if (selectedOption?.skills) {
            // Store filtered skills in metadata for use in Step 3
            metadata.availableSkills = selectedOption.skills;
            log(ctx, 2, 'preRollInteractions', `Skills filtered to: ${selectedOption.skills.join(', ')}`, {
              choice: selectedChoice,
              skills: selectedOption.skills
            });
          }
        }
      }
    }
    
    log(ctx, 2, 'preRollInteractions', 'Pre-roll interactions complete', metadata);
  }

  /**
   * Step 3: Execute Roll
   *
   * Execute the PF2e skill check roll and capture result
   * ALWAYS RUNS
   *
   * Uses modular services:
   * - KingdomModifierService for modifier collection
   * - RollStateService for reroll modifier persistence
   * - PF2eSkillService.executeSkillRoll() for pure PF2e integration
   */
  private async step3_executeRoll(ctx: PipelineContext): Promise<void> {
    log(ctx, 3, 'executeRoll', 'Executing skill check');

    const pipeline = await getPipeline(ctx);

    // Import services
    const { pf2eSkillService } = await import('./pf2e/PF2eSkillService');
    const { kingdomModifierService } = await import('./domain/KingdomModifierService');
    const { rollStateService } = await import('./roll/RollStateService');
    const { fromPF2eModifier } = await import('../types/RollModifier');
    const { showCharacterSelectionDialog } = await import('./pf2e/PF2eCharacterService');

    // Get actor (character performing the check)
    // Priority: fullActor reference > lookup by actorId > current user's character > character selection dialog
    let actingCharacter = ctx.actor?.fullActor;

    // If fullActor is missing but actorId exists, try to recover from Foundry's collection
    if (!actingCharacter && ctx.actor?.actorId) {
      const game = (window as any).game;
      actingCharacter = game?.actors?.get(ctx.actor.actorId);
      if (actingCharacter) {
        console.log(`🔄 [PipelineCoordinator] Recovered actor from actorId: ${ctx.actor.actorId} (${actingCharacter.name})`);
        // Update context with recovered actor
        ctx.actor.fullActor = actingCharacter;
      }
    }

    // Fallback to current user's character
    if (!actingCharacter) {
      actingCharacter = getCurrentUserCharacter();
      if (actingCharacter) {
        console.log(`🔄 [PipelineCoordinator] Using current user's character: ${actingCharacter.name}`);
      }
    }

    // Last resort: show character selection dialog
    if (!actingCharacter) {
      console.log(`⚠️ [PipelineCoordinator] No character found, showing selection dialog`);
      actingCharacter = await showCharacterSelectionDialog(
        'Select Character for Reroll',
        'No character found. Please select who will perform this roll:'
      );

      if (actingCharacter) {
        // Store in context for future use
        if (!ctx.actor) {
          ctx.actor = {} as ActorContext;
        }
        ctx.actor.fullActor = actingCharacter;
        ctx.actor.actorId = actingCharacter.id;
        ctx.actor.actorName = actingCharacter.name;
      }
    }

    if (!actingCharacter) {
      throw new Error('No character available for roll. Please ensure you have a character assigned.');
    }
    
    // Populate actor context with character info
    if (!ctx.actor) {
      ctx.actor = {} as ActorContext;
    }
    if (!ctx.actor.actorName) {
      ctx.actor.actorName = actingCharacter.name || 'Unknown';
    }
    if (!ctx.actor.actorId) {
      ctx.actor.actorId = actingCharacter.id;
    }
    if (!ctx.actor.fullActor) {
      ctx.actor.fullActor = actingCharacter;
    }
    
    // Get skill name (from actor context or first skill in pipeline)
    const skillName = (ctx.actor?.selectedSkill || pipeline.skills[0].skill) as KingdomSkill;
    const skillSlug = pf2eSkillService.getSkillSlug(skillName);
    let skill = actingCharacter?.skills?.[skillSlug];
    
    // Handle lore skill selection
    if (skillSlug === 'lore' && !skill) {
      const loreItems = actingCharacter?.itemTypes?.lore || [];
      const selectedLoreItem = await pf2eSkillService.showLoreSelectionDialog(loreItems);
      if (!selectedLoreItem) {
        throw new Error('Action cancelled by user');
      }
      skill = actingCharacter.skills?.[selectedLoreItem.slug];
    }
    
    if (!skill) {
      throw new Error(`Character ${actingCharacter.name} doesn't have skill '${skillName}'`);
    }
    
    // Calculate DC based on party level (with character level fallback)
    const characterLevel = ctx.actor?.level || actingCharacter.level || 1;
    const { getPartyLevel, getLevelBasedDC } = await import('../pipelines/shared/ActionHelpers');
    const effectiveLevel = getPartyLevel(characterLevel);
    const dc = getLevelBasedDC(effectiveLevel);
    
    // Store DC in context immediately
    ctx.rollData = { ...(ctx.rollData || {}), dc } as any;
    
    // Reroll detection
    const isReroll = ctx.isReroll || false;
    const currentTurn = ctx.kingdom?.currentTurn || 0;
    
    log(ctx, 3, 'executeRoll', `Rolling ${skillName} vs DC ${dc}`, { characterLevel, effectiveLevel, dc, isReroll });
    
    // ========================================
    // GET MODIFIERS FROM SERVICES
    // ========================================
    
    // 1. Get kingdom modifiers from KingdomModifierService
    const modifiers = kingdomModifierService.getModifiersForCheck({
      skillName,
      actionId: ctx.actionId,
      checkType: ctx.checkType,
      onlySettlementId: (ctx.metadata as any)?.onlySettlementId,
      enabledSettlement: (ctx.metadata as any)?.enabledSettlement,
      enabledStructure: (ctx.metadata as any)?.enabledStructure
    });
    
    console.log('🔍 [PipelineCoordinator] Kingdom modifiers from service:', modifiers.map(m => ({ 
      label: m.label, value: m.value, enabled: m.enabled, ignored: m.ignored 
    })));
    
    // 2. Handle reroll - restore modifiers from RollStateService
    if (isReroll && ctx.instanceId) {
      console.log(`🔄 [PipelineCoordinator] Reroll detected - loading stored modifiers for instance ${ctx.instanceId}`);
      
      const storedModifiers = await rollStateService.getRollModifiers(ctx.instanceId, currentTurn);
      
      if (storedModifiers && storedModifiers.length > 0) {
        console.log(`✅ [PipelineCoordinator] Found ${storedModifiers.length} stored modifiers`);
        
        // Track matched labels to avoid duplicates
        const matchedLabels = new Set<string>();
        
        // Enable existing modifiers that match stored modifiers
        for (const mod of modifiers) {
          const storedMod = storedModifiers.find(m => m.label === mod.label);
          if (storedMod) {
            mod.enabled = true;
            mod.ignored = false;
            matchedLabels.add(storedMod.label);
            console.log(`  ✅ Matched "${mod.label}"`);
          }
        }
        
        // Add unmatched stored modifiers (custom modifiers from previous roll)
        for (const storedMod of storedModifiers) {
          if (!matchedLabels.has(storedMod.label)) {
            modifiers.push({
              label: storedMod.label,
              value: storedMod.value,
              type: storedMod.type || 'circumstance',
              enabled: true,
              ignored: false
            });
            console.log(`  ✨ Added unmatched "${storedMod.label}" = ${storedMod.value}`);
          }
        }
      } else {
        console.warn(`⚠️ [PipelineCoordinator] No stored modifiers found for reroll`);
      }
    }
    
    // 3. Check for keep-higher aid
    const useKeepHigher = kingdomModifierService.hasKeepHigherAid(ctx.actionId, ctx.checkType);
    
    // ========================================
    // CREATE CALLBACK
    // ========================================
    
    const callback: CheckRollCallback = async (roll, outcome, message, event) => {
      console.log('✅ [Callback] Roll complete:', { outcome, total: roll.total, checkType: ctx.checkType, actionId: ctx.actionId });

      try {
        // Extract modifiers from PF2e message flags
        const allModifiers = (message as any)?.flags?.pf2e?.modifiers || [];
        
        // Filter: exclude ability and proficiency (recalculated by PF2e on reroll)
        const rollModifiers = allModifiers.filter((mod: any) => 
          mod.type !== 'ability' && mod.type !== 'proficiency'
        );
        
        console.log('🎲 [PipelineCoordinator] Extracted modifiers:', rollModifiers.length);
        
        // Store modifiers for reroll (only on initial roll)
        if (!isReroll && ctx.instanceId && rollModifiers.length > 0) {
          const rollModifiersForStorage = rollModifiers.map((mod: any) => fromPF2eModifier(mod));
          await rollStateService.storeRollModifiers(
            ctx.instanceId,
            currentTurn,
            ctx.actionId,
            rollModifiersForStorage
          );
          console.log(`💾 [PipelineCoordinator] Stored ${rollModifiersForStorage.length} modifiers for reroll`);
        }
        
        // Update context with roll data
        const d20Result = roll.dice[0]?.results[0]?.result || 0;
        const existingDC = ctx.rollData?.dc || dc;
        ctx.rollData = {
          skill: skillName,
          dc: existingDC,
          roll,
          outcome: (outcome ?? 'failure') as OutcomeType,
          rollBreakdown: {
            d20Result,
            total: roll.total,
            dc: existingDC,
            modifiers: rollModifiers.map((mod: any) => ({
              label: mod.label || '',
              modifier: mod.modifier || 0,
              type: mod.type || 'circumstance',
              enabled: mod.enabled ?? true,
              ignored: mod.ignored ?? false
            }))
          }
        };
        
        console.log('📊 [PipelineCoordinator] Stored rollBreakdown with modifiers:', ctx.rollData.rollBreakdown?.modifiers);
        
        // Dispatch kingdomRollComplete event for listeners
        const rollCompleteEvent = new CustomEvent('kingdomRollComplete', {
          detail: {
            checkId: ctx.actionId,
            checkType: ctx.checkType || 'action',
            outcome: ctx.rollData.outcome,
            actorName: ctx.actor?.actorName || 'Unknown',
            skillName: skillName,
            rollBreakdown: ctx.rollData.rollBreakdown
          }
        });
        window.dispatchEvent(rollCompleteEvent);
        
        // Resume pipeline at Step 4
        await this.resumeAfterRoll(ctx);
      } catch (callbackError) {
        console.error('❌ [PipelineCoordinator] Callback error:', callbackError);
        throw callbackError;
      }
    };
    
    // ========================================
    // CHECK FOR FORCED OUTCOME (DEBUG MODE)
    // ========================================
    
    const forcedOutcome = (ctx.metadata as any)?.forcedOutcome;
    if (forcedOutcome) {
      console.log('⚡ [PipelineCoordinator] Using forced outcome:', forcedOutcome);
      
      // Calculate a fake roll that would produce this outcome
      let fakeRollTotal: number;
      switch (forcedOutcome) {
        case 'criticalSuccess': fakeRollTotal = dc + 10; break;
        case 'success': fakeRollTotal = dc + 5; break;
        case 'failure': fakeRollTotal = dc - 5; break;
        case 'criticalFailure': fakeRollTotal = dc - 10; break;
        default: fakeRollTotal = dc;
      }
      
      // Create a fake roll object
      const fakeRoll = {
        total: fakeRollTotal,
        dice: [{ results: [{ result: 10 }] }]  // Neutral d20 (no nat 1/20)
      };
      
      // Call the callback directly with the forced outcome
      await callback(fakeRoll as any, forcedOutcome, null as any, null as any);
      
      log(ctx, 3, 'executeRoll', `Forced outcome applied: ${forcedOutcome} (fake roll: ${fakeRollTotal})`);
      return;  // Skip actual roll
    }
    
    // ========================================
    // EXECUTE ROLL VIA PF2eSkillService
    // ========================================
    
    const labelPrefix = ctx.checkType === 'action' ? 'Kingdom Action' : 
                       ctx.checkType === 'event' ? 'Kingdom Event' : 
                       'Kingdom Incident';
    
    await pf2eSkillService.executeSkillRoll({
      actor: actingCharacter,
      skill,
      dc,
      label: `${labelPrefix}: ${pipeline.name}`,
      modifiers,
      rollTwice: useKeepHigher ? 'keep-higher' : false,
      callback,
      extraRollOptions: [
        `${ctx.checkType}:kingdom`,
        `${ctx.checkType}:kingdom:${pipeline.name.toLowerCase().replace(/\s+/g, '-')}`
      ]
    });
    
    // Step 3 returns - callback will resume pipeline when roll completes
    log(ctx, 3, 'executeRoll', 'Roll initiated with callback');
  }

  /**
   * Step 4: Display Outcome
   * 
   * Create visual outcome preview card in UI
   * ALWAYS RUNS
   * 
   * Stores instance in kingdom.pendingOutcomes
   * 
   * Uses clean OutcomePreviewService.createActionOutcomePreview() - NO legacy dependencies
   */
  private async step4_createCheckInstance(ctx: PipelineContext): Promise<void> {
    log(ctx, 4, 'displayOutcome', 'Creating outcome preview');
    
    const pipeline = await getPipeline(ctx);
    const outcome = ctx.rollData?.outcome || 'success';
    
    // Import clean service (no legacy dependencies)
    const { createActionOutcomePreview } = await import('./OutcomePreviewService');
    
    // Get current turn
    const { currentTurn } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    const turn = get(currentTurn) || 1;
    
    // Use metadata.checkId if provided (for aid-another to display on target action card)
    // Otherwise use ctx.actionId (normal behavior)
    const checkId = (ctx.metadata as any).checkId || ctx.actionId;
    
    // ✅ CRITICAL: Use pipeline's instanceId (generated in Step 0), not a new one
    // This ensures the outcome card uses the SAME instanceId where modifiers are stored
    // createActionOutcomePreview returns instanceId, but we already have one from Step 0
    await createActionOutcomePreview({
      actionId: checkId,  // Use custom checkId if provided
      action: pipeline,
      outcome,
      actorName: ctx.actor?.actorName || 'Unknown',
      actorId: ctx.actor?.actorId,
      actorLevel: ctx.actor?.level,
      proficiencyRank: ctx.actor?.proficiencyRank,
      skillName: ctx.actor?.selectedSkill,
      rollBreakdown: ctx.rollData?.rollBreakdown || undefined,
      currentTurn: turn,
      metadata: ctx.metadata,
      instanceId: ctx.instanceId,  // ← Pass pipeline's instanceId
      checkType: pipeline.checkType as 'action' | 'incident' | 'event'  // ← Use pipeline's checkType
    });
    
    // instanceId already set in Step 0 - no need to update it
    
    // ✅ EXTRACT CUSTOM COMPONENT from postRollInteractions (for inline display in OutcomeDisplay)
    let customComponentName: string | null = null;
    let customResolutionProps: Record<string, any> = {};
    
    if (pipeline.postRollInteractions) {
      console.log(`🔍 [PipelineCoordinator] Checking postRollInteractions for custom component`);
      
      for (const interaction of pipeline.postRollInteractions) {
        // Check if this is a configuration interaction with a component
        if (interaction.type === 'configuration' && interaction.component) {
          // Build context for condition evaluation
          const conditionContext = {
            outcome,
            kingdom: ctx.kingdom,
            metadata: ctx.metadata
          };
          
          // Evaluate condition if defined
          const conditionMet = !interaction.condition || interaction.condition(conditionContext);
          console.log(`🔍 [PipelineCoordinator] Condition met for outcome ${outcome}?`, conditionMet);
          
          if (conditionMet) {
            // Extract component NAME from component class (for registry lookup)
            if (typeof interaction.component === 'string') {
              // Already a string (legacy support)
              customComponentName = interaction.component;
            } else {
              // Component class - extract name and strip Proxy wrapper if present (HMR)
              const rawName = interaction.component.name || 'Unknown';
              customComponentName = rawName.replace(/^Proxy<(.+)>$/, '$1');
            }
            customResolutionProps = {
              ...(interaction.componentProps || {}),
              componentId: interaction.id  // Store component ID for resolution data key
            };
            console.log(`✅ [PipelineCoordinator] Extracted custom component name: ${customComponentName}, ID: ${interaction.id}`);
            break;
          }
        }
      }
    }
    
    // If custom component found, update the instance with it
    if (customComponentName) {
      const outcomePreviewService = await createOutcomePreviewService();
      const actor = getKingdomActor();
      
      if (actor) {
        const kingdom = actor.getKingdomData();
        const instance = outcomePreviewService.getInstance(ctx.instanceId!, kingdom);
        
        if (instance?.appliedOutcome) {
          // Update instance with custom component NAME (string for registry lookup)
          await outcomePreviewService.storeOutcome(
            ctx.instanceId!,
            outcome,
            {
              numericModifiers: (instance.appliedOutcome.modifiers || []) as any,
              manualEffects: instance.appliedOutcome.manualEffects || [],
              complexActions: [],
              customComponentData: null
            },
            instance.appliedOutcome.actorName,
            instance.appliedOutcome.skillName,
            instance.appliedOutcome.effect,
            instance.appliedOutcome.rollBreakdown,
            customComponentName,  // Pass component NAME (string)
            customResolutionProps  // Pass custom props
          );
          
          console.log(`✅ [PipelineCoordinator] Updated instance with custom component name: ${customComponentName}`);
        }
      }
    }
    
    log(ctx, 4, 'createCheckInstance', `Check instance created: ${ctx.instanceId}`);
  }

  /**
   * Step 5: Outcome Interactions
   * 
   * Calculate what will happen when action is applied
   * AUTOMATIC: Converts JSON modifiers to badges
   * OPTIONAL: Calls pipeline.preview.calculate for custom badges
   * 
   * Shows resource changes, entity operations, warnings
   */
  private async step5_calculatePreview(ctx: PipelineContext): Promise<void> {
    log(ctx, 5, 'outcomeInteractions', 'Calculating preview for outcome interactions');
    
    const pipeline = await getPipeline(ctx);
    const outcome = ctx.rollData?.outcome || 'success';
    
    // ✅ STEP 5A: Auto-convert JSON modifiers to badges (ALWAYS)
    const { convertModifiersToBadges } = await import('../pipelines/shared/convertModifiersToBadges');
    const outcomeData = pipeline.outcomes?.[outcome];
    const modifiers = outcomeData?.modifiers || [];
    const modifierBadges = convertModifiersToBadges(modifiers, ctx.metadata);
    
    // ✅ STEP 5A.1: Extract static outcomeBadges from pipeline outcomes
    const staticBadges = outcomeData?.outcomeBadges || [];
    
    log(ctx, 5, 'calculatePreview', `Converted ${modifiers.length} JSON modifiers to ${modifierBadges.length} badges, found ${staticBadges.length} static badges`);
    
    // ✅ STEP 5B: Call custom preview.calculate if defined (OPTIONAL)
    let customPreview: any = { resources: [], outcomeBadges: [] };
    
    if (pipeline.preview?.calculate) {
      // Build check context for preview calculation
      const checkContext = {
        check: pipeline,
        outcome,
        kingdom: ctx.kingdom,
        actor: ctx.actor,
        resolutionData: ctx.resolutionData,
        metadata: ctx.metadata,
        instanceId: ctx.instanceId
      };
      
      // Calculate custom preview
      customPreview = await unifiedCheckHandler.calculatePreview(ctx.actionId, checkContext);
      log(ctx, 5, 'calculatePreview', `Custom preview returned ${customPreview.outcomeBadges?.length || 0} additional badges`);
    }
    
    // ✅ STEP 5C: Merge badges intelligently
    // Custom preview badges are always ADDED to modifier badges
    // Static badges are fallback (only used if no custom preview)
    
    // ✅ STEP 5C.1: Add "Ends Event" badge for ongoing events (only if outcome ends the event)
    const eventStatusBadges: any[] = [];
    if (ctx.checkType === 'event' && outcomeData && pipeline.outcomes) {
      // Check if this event has any ongoing outcomes
      const allOutcomes = [
        pipeline.outcomes.criticalSuccess,
        pipeline.outcomes.success,
        pipeline.outcomes.failure,
        pipeline.outcomes.criticalFailure
      ].filter(Boolean);
      const hasOngoingOutcome = allOutcomes.some((o: any) => o.endsEvent === false);
      
      // Only show "Ends Event" badge if event has ongoing outcomes AND this outcome ends it
      const endsEvent = outcomeData.endsEvent !== false;
      if (hasOngoingOutcome && endsEvent) {
        eventStatusBadges.push({
          icon: 'fa-check-circle',
          template: 'Ends Event',
          variant: 'positive'
        });
      }
    }
    
    // DIAGNOSTIC: Log badge sources before combining
    const customOrStaticBadges = customPreview.outcomeBadges && customPreview.outcomeBadges.length > 0
      ? customPreview.outcomeBadges
      : staticBadges;
    
    const combinedBadges = [
      ...modifierBadges,
      ...customOrStaticBadges,
      ...eventStatusBadges
    ];
    
    // Check for nulls and log their source
    const nullIndices = combinedBadges.map((b, i) => ({ index: i, isNull: b === null || b === undefined, badge: b }))
      .filter(item => item.isNull);
    if (nullIndices.length > 0) {
      console.error('🚨 [PipelineCoordinator] NULL BADGES DETECTED in preview:', {
        actionId: ctx.actionId,
        outcome: ctx.rollData?.outcome,
        modifierBadgesCount: modifierBadges.length,
        modifierBadgesNulls: modifierBadges.filter(b => b === null || b === undefined).length,
        customOrStaticBadgesCount: customOrStaticBadges.length,
        customOrStaticBadgesNulls: customOrStaticBadges.filter(b => b === null || b === undefined).length,
        eventStatusBadgesCount: eventStatusBadges.length,
        eventStatusBadgesNulls: eventStatusBadges.filter(b => b === null || b === undefined).length,
        usingCustomBadges: customPreview.outcomeBadges && customPreview.outcomeBadges.length > 0,
        nullIndices
      });
    }
    
    const preview = {
      resources: customPreview.resources || [],
      // Combine all badge sources and filter out any null/undefined values
      outcomeBadges: combinedBadges.filter(badge => badge !== null && badge !== undefined)
    };
    
    // Store preview in context
    ctx.preview = preview;
    
    // Update instance with outcome badges only
    if (ctx.instanceId) {
      const actor = getKingdomActor();
      if (actor) {
        console.log('🔧 [PipelineCoordinator] Updating instance with preview data:', {
          instanceId: ctx.instanceId,
          outcomeBadgesCount: preview.outcomeBadges?.length || 0,
          outcomeBadges: preview.outcomeBadges
        });
        
        await actor.updateKingdomData((kingdom: any) => {
          const instance = kingdom.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
          if (instance?.appliedOutcome) {
            console.log('🔧 [PipelineCoordinator] Found instance, updating...');
            
            if (preview.outcomeBadges && preview.outcomeBadges.length > 0) {
              // DIAGNOSTIC: Check for nulls before storing
              const nullsInPreview = preview.outcomeBadges.filter(b => b === null || b === undefined);
              if (nullsInPreview.length > 0) {
                console.error('🚨 [PipelineCoordinator] About to store badges with NULLS:', {
                  total: preview.outcomeBadges.length,
                  nullCount: nullsInPreview.length,
                  badges: preview.outcomeBadges
                });
              }
              instance.appliedOutcome.outcomeBadges = preview.outcomeBadges;
              console.log('✅ [PipelineCoordinator] Updated outcomeBadges:', instance.appliedOutcome.outcomeBadges);
            }
            
            // Update instance metadata with changes from preview.calculate()
            if (ctx.metadata && Object.keys(ctx.metadata).length > 0) {
              instance.metadata = { ...instance.metadata, ...ctx.metadata };
              console.log('✅ [PipelineCoordinator] Updated instance metadata:', ctx.metadata);
            }
          } else {
            console.warn('⚠️ [PipelineCoordinator] Instance or appliedOutcome not found');
          }
        });
      }
    }
    
    log(ctx, 5, 'calculatePreview', 'Preview calculated and stored', { 
      preview, 
      outcomeBadgesCount: preview.outcomeBadges?.length || 0
    });
  }

  /**
   * Step 6: Wait For Apply
   * 
   * Pause execution until user clicks "Apply Result" in OutcomeDisplay
   * ALWAYS RUNS
   * 
   * Uses pause/resume pattern with promises
   */
  private async step6_waitForUserConfirmation(ctx: PipelineContext): Promise<void> {
    log(ctx, 6, 'waitForApply', 'Pausing for user to apply result');

    if (!ctx.instanceId) {
      throw new Error('[PipelineCoordinator] Cannot wait for confirmation without instance ID');
    }

    // Store context in pending map (in-memory)
    this.pendingContexts.set(ctx.instanceId, ctx);

    // Persist context to kingdom data (survives page reload, syncs across clients)
    await this.persistContext(ctx);

    // Return promise that resolves when resumePipeline() is called
    return new Promise<void>((resolve) => {
      ctx._resumeCallback = resolve;
    });
  }

  /**
   * Step 7: Post-Apply Interactions
   * 
   * Execute interactions AFTER user clicks Apply
   * OPTIONAL - only runs if pipeline has postApplyInteractions
   * 
   * Examples: Select hexes on map, choose bonus type, allocate resources
   */
  private async step7_postApplyInteractions(ctx: PipelineContext): Promise<void> {
    log(ctx, 7, 'postApplyInteractions', 'Starting post-apply interactions');
    
    const pipeline = await getPipeline(ctx);
    
    // Check if there are post-apply interactions
    if (!pipeline.postApplyInteractions || pipeline.postApplyInteractions.length === 0) {
      log(ctx, 7, 'postApplyInteractions', 'No post-apply interactions, skipping');
      return;
    }
    
    if (!ctx.instanceId) {
      throw new Error('[PipelineCoordinator] Cannot execute post-apply interactions without instance ID');
    }
    
    // Execute post-apply interactions via UnifiedCheckHandler
    const outcome = getOutcome(ctx);
    const resolutionData = await unifiedCheckHandler.executePostApplyInteractions(
      ctx.instanceId,
      outcome
    );
    
    // ✅ FIX: Merge arrays properly instead of shallow merge
    // This prevents empty arrays from overwriting populated ones
    ctx.resolutionData = {
      ...ctx.resolutionData,
      ...resolutionData,
      // Preserve numericModifiers from Step 6 if Step 7 returns empty array
      numericModifiers: [
        ...(ctx.resolutionData.numericModifiers || []),
        ...(resolutionData.numericModifiers || [])
      ],
      // Preserve manualEffects from Step 6 if Step 7 returns empty array
      manualEffects: [
        ...(ctx.resolutionData.manualEffects || []),
        ...(resolutionData.manualEffects || [])
      ]
    };
    
    log(ctx, 7, 'postApplyInteractions', 'Post-apply interactions complete', resolutionData);
  }

  /**
   * Step 8: Execute Action
   *
   * Apply state changes (resources, entities, etc.)
   * ALWAYS RUNS
   *
   * Either uses pipeline.execute() or default behavior
   */
  private async step8_executeAction(ctx: PipelineContext): Promise<void> {
    log(ctx, 8, 'executeAction', 'Executing action');

    const pipeline = await getPipeline(ctx);
    const outcome = ctx.rollData?.outcome || 'success';

    // Build check context for execution
    const checkContext = {
      check: pipeline,
      outcome,
      kingdom: ctx.kingdom,
      actor: ctx.actor,
      resolutionData: ctx.resolutionData,
      metadata: ctx.metadata,
      instanceId: ctx.instanceId
    };

    // Execute via UnifiedCheckHandler (which handles fame bonus)
    await unifiedCheckHandler.executeCheck(
      ctx.actionId,
      checkContext,
      ctx.preview || { resources: [], outcomeBadges: [] }
    );

    // Track doctrine for events with strategic choices
    if (ctx.checkType === 'event' && pipeline.strategicChoice) {
      await this.trackEventDoctrine(ctx, pipeline);
    }

    // Track doctrine for actions based on selected skill
    if (ctx.checkType === 'action') {
      await this.trackActionDoctrine(ctx, pipeline);
    }

    // Store execution result
    ctx.executionResult = {
      success: true,
      message: 'Action executed successfully'
    };

    log(ctx, 8, 'executeAction', 'Action executed successfully');
  }

  /**
   * Track doctrine points when an event with a strategic choice is resolved
   *
   * Adds 5 points to the winning doctrine category (virtuous, practical, or ruthless)
   * based on the selected approach's personality weight.
   */
  private async trackEventDoctrine(ctx: PipelineContext, pipeline: CheckPipeline): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    // Get the selected approach from kingdom state
    const kingdom = actor.getKingdomData();
    const selectedApproach = kingdom?.turnState?.eventsPhase?.selectedApproach;

    if (!selectedApproach || !pipeline.strategicChoice?.options) {
      log(ctx, 8, 'trackDoctrine', 'No selected approach or strategic options found');
      return;
    }

    // Find the selected option
    const selectedOption = pipeline.strategicChoice.options.find(opt => opt.id === selectedApproach);

    if (!selectedOption?.personality) {
      log(ctx, 8, 'trackDoctrine', `No personality data for option: ${selectedApproach}`);
      return;
    }

    // Determine the primary doctrine category (highest weighted personality value)
    const personality = selectedOption.personality;
    let primaryDoctrine: 'virtuous' | 'practical' | 'ruthless' | null = null;
    let highestWeight = 0;

    if (personality.virtuous && personality.virtuous > highestWeight) {
      highestWeight = personality.virtuous;
      primaryDoctrine = 'virtuous';
    }
    if (personality.practical && personality.practical > highestWeight) {
      highestWeight = personality.practical;
      primaryDoctrine = 'practical';
    }
    if (personality.ruthless && personality.ruthless > highestWeight) {
      highestWeight = personality.ruthless;
      primaryDoctrine = 'ruthless';
    }

    if (!primaryDoctrine) {
      log(ctx, 8, 'trackDoctrine', 'No valid doctrine found in personality');
      return;
    }

    // Add 5 points to the primary doctrine category
    const DOCTRINE_POINTS = 5;

    await actor.updateKingdomData((k: any) => {
      // Initialize doctrine if not present
      if (!k.doctrine) {
        k.doctrine = { virtuous: 0, practical: 0, ruthless: 0 };
      }

      k.doctrine[primaryDoctrine!] = (k.doctrine[primaryDoctrine!] || 0) + DOCTRINE_POINTS;
    });

    console.log(`📜 [PipelineCoordinator] Doctrine updated: +${DOCTRINE_POINTS} ${primaryDoctrine} (event: ${ctx.actionId}, choice: ${selectedApproach})`);
    log(ctx, 8, 'trackDoctrine', `Added ${DOCTRINE_POINTS} points to ${primaryDoctrine} doctrine`);
  }

  /**
   * Track doctrine points when an action is completed
   *
   * Adds 1 point to the doctrine category of the selected skill.
   * Aid Another actions are excluded from doctrine tracking.
   */
  private async trackActionDoctrine(ctx: PipelineContext, pipeline: CheckPipeline): Promise<void> {
    // Exclude Aid Another from doctrine tracking
    if (ctx.actionId === 'aid-another') {
      return;
    }

    const actor = getKingdomActor();
    if (!actor) return;

    // Get the selected skill from context
    const selectedSkill = ctx.actor?.selectedSkill;
    if (!selectedSkill) {
      log(ctx, 8, 'trackActionDoctrine', 'No selected skill found');
      return;
    }

    // Use selectedDoctrine if passed directly (supports duplicate skills with different doctrines)
    // Fall back to looking up from pipeline for backwards compatibility
    let doctrine = ctx.actor?.selectedDoctrine;
    if (!doctrine) {
      const skillOption = pipeline.skills?.find(s => s.skill === selectedSkill);
      doctrine = skillOption?.doctrine;
    }

    if (!doctrine) {
      log(ctx, 8, 'trackActionDoctrine', `No doctrine for skill: ${selectedSkill}`);
      return;
    }
    const DOCTRINE_POINTS = 1;

    await actor.updateKingdomData((k: any) => {
      // Initialize doctrine if not present
      if (!k.doctrine) {
        k.doctrine = { virtuous: 0, practical: 0, ruthless: 0 };
      }

      k.doctrine[doctrine] = (k.doctrine[doctrine] || 0) + DOCTRINE_POINTS;
    });

    console.log(`📜 [PipelineCoordinator] Doctrine updated: +${DOCTRINE_POINTS} ${doctrine} (action: ${ctx.actionId}, skill: ${selectedSkill})`);
    log(ctx, 8, 'trackActionDoctrine', `Added ${DOCTRINE_POINTS} point to ${doctrine} doctrine`);
  }

  /**
   * Step 9: Cleanup
   *
   * Clean up temporary state, delete instances, track action
   * ALWAYS RUNS
   *
   * For incidents: Completes the RESOLVE_INCIDENT phase step
   * For events: Completes the RESOLVE_EVENT and APPLY_MODIFIERS phase steps
   */
  private async step9_cleanup(ctx: PipelineContext): Promise<void> {
    log(ctx, 9, 'cleanup', 'Cleaning up');
    
    // Ensure services are initialized
    await this.ensureServices();

    // Mark instance as applied BEFORE deletion (hides buttons in UI)
    if (ctx.instanceId && this.checkInstanceService) {
      await this.checkInstanceService.markApplied(ctx.instanceId);
      log(ctx, 9, 'cleanup', `Marked instance as applied: ${ctx.instanceId}`);
    }

    const { TurnPhase } = await import('../actors/KingdomActor');

    // Determine the correct TurnPhase based on checkType
    const turnPhase = ctx.checkType === 'incident' ? TurnPhase.UNREST :
                      ctx.checkType === 'event' ? TurnPhase.EVENTS :
                      TurnPhase.ACTIONS;

    // TRACK ACTION in actionLog (so player can't perform unlimited actions)
    // Note: Incidents don't consume player actions, they're separate checks
    // Events DO consume player actions (responding to an event uses your turn action)
    const game = (window as any).game;
    const userId = ctx.userId || game?.user?.id;
    const userName = game?.user?.name;
    const actorName = ctx.actor?.actorName || 'Unknown';

    if (userId && userName && (ctx.checkType === 'action' || ctx.checkType === 'event')) {
      const { createGameCommandsService } = await import('./GameCommandsService');
      const gameCommandsService = await createGameCommandsService();

      // Include outcome in action name for proper display in PlayerActionTracker
      // Format: "action-id-outcome" (e.g., "assassination-attempt-criticalFailure")
      const outcome = ctx.rollData?.outcome || 'unknown';
      const actionNameWithOutcome = `${ctx.actionId}-${outcome}`;

      await gameCommandsService.trackPlayerAction(
        userId,
        userName,
        actorName,
        actionNameWithOutcome,
        turnPhase
      );

      log(ctx, 9, 'cleanup', `Tracked ${ctx.checkType} for user ${userName}: ${actionNameWithOutcome}`);
    }

    // COMPLETE PHASE STEPS based on checkType
    if (ctx.checkType === 'incident') {
      // Complete the RESOLVE_INCIDENT step in UnrestPhase
      const { completePhaseStepByIndex } = await import('../controllers/shared/PhaseControllerHelpers');
      const { UnrestPhaseSteps } = await import('../controllers/shared/PhaseStepConstants');
      await completePhaseStepByIndex(UnrestPhaseSteps.RESOLVE_INCIDENT);
      log(ctx, 9, 'cleanup', 'Completed RESOLVE_INCIDENT phase step');
    } else if (ctx.checkType === 'event') {
      // Complete the RESOLVE_EVENT and APPLY_MODIFIERS steps in EventsPhase
      const { completePhaseStepByIndex } = await import('../controllers/shared/PhaseControllerHelpers');
      const { EventsPhaseSteps } = await import('../controllers/shared/PhaseStepConstants');
      await completePhaseStepByIndex(EventsPhaseSteps.RESOLVE_EVENT);
      await completePhaseStepByIndex(EventsPhaseSteps.APPLY_MODIFIERS);
      log(ctx, 9, 'cleanup', 'Completed RESOLVE_EVENT and APPLY_MODIFIERS phase steps');
    }

    // Remove from pending contexts (instance stays in pendingOutcomes until end of turn)
    // The card remains visible in "applied" state - cleaned up at end of turn
    if (ctx.instanceId) {
      this.pendingContexts.delete(ctx.instanceId);
      await this.removePersistedContext(ctx.instanceId);
      log(ctx, 9, 'cleanup', `Removed context for instance: ${ctx.instanceId} (card remains visible)`);
    }

    // Clear pipeline metadata storage to prevent memory leak
    const { pipelineMetadataStorage } = await import('./PipelineMetadataStorage');
    pipelineMetadataStorage.clear(ctx.actionId, ctx.userId);

    log(ctx, 9, 'cleanup', 'Cleanup complete');
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Initialize pipeline context
   */
  private initializeContext(
    actionId: string,
    initialData: Partial<PipelineContext>
  ): PipelineContext {
    // Get user ID
    const game = (window as any).game;
    const userId = initialData.userId || game?.user?.id || 'unknown';
    
    // Get kingdom data
    const actor = getKingdomActor();
    const kingdom = actor?.getKingdomData();
    
    // Create context
    const context = createPipelineContext(
      actionId,
      initialData.checkType || 'action',
      userId,
      {
        ...initialData,
        kingdom
      }
    );
    
    return context;
  }

  /**
   * Calculate DC based on character level and pipeline tier
   */
  private calculateDC(characterLevel: number, pipeline: CheckPipeline): number {
    // Use standard DC calculation
    const baseDC = 15;
    const levelAdjustment = Math.floor((characterLevel - 1) / 2);
    const tierAdjustment = (pipeline.tier || 1) - 1;
    
    return baseDC + levelAdjustment + tierAdjustment;
  }

  /**
   * Clean up old instances for an action/incident/event
   * Called before starting a new pipeline to prevent stale data
   */
  private async cleanupOldInstances(actionId: string, checkType: string = 'action'): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;

    const kingdom = actor.getKingdomData();
    const oldInstances = (kingdom.pendingOutcomes || []).filter(
      (i: any) => i.checkType === checkType && i.checkId === actionId
    );
    
    if (oldInstances.length > 0) {
      console.log(`🧹 [PipelineCoordinator] Cleaning up ${oldInstances.length} old instance(s) for ${actionId}`);
      
      for (const instance of oldInstances) {
        await this.checkInstanceService.clearInstance(instance.previewId);
        this.pendingContexts.delete(instance.previewId);
      }
    }
  }

  /**
   * Rollback partial changes on error
   */
  private async rollback(ctx: PipelineContext): Promise<void> {
    console.log('🔄 [PipelineCoordinator] Rolling back partial changes');
    
    // Clear check instance if created
    if (ctx.instanceId && this.checkInstanceService) {
      try {
        await this.checkInstanceService.clearInstance(ctx.instanceId);
        console.log(`✅ [PipelineCoordinator] Rolled back check instance: ${ctx.instanceId}`);
      } catch (error) {
        console.error('[PipelineCoordinator] Failed to rollback check instance:', error);
      }
    }
    
    // Remove from pending contexts
    if (ctx.instanceId) {
      this.pendingContexts.delete(ctx.instanceId);
    }
    
    // TODO: Restore deducted resources if any
    // TODO: Delete created entities if any
    
    console.log('✅ [PipelineCoordinator] Rollback complete');
  }
}

/**
 * Create pipeline coordinator instance
 */
export async function createPipelineCoordinator(): Promise<PipelineCoordinator> {
  return new PipelineCoordinator();
}

/**
 * Singleton instance (for global access)
 */
let coordinatorInstance: PipelineCoordinator | null = null;

export async function getPipelineCoordinator(): Promise<PipelineCoordinator> {
  if (!coordinatorInstance) {
    coordinatorInstance = await createPipelineCoordinator();
  }
  return coordinatorInstance;
}
