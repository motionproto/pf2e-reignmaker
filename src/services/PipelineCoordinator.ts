/**
 * PipelineCoordinator.ts
 *
 * Central coordinator for ALL action execution.
 * Orchestrates the complete 9-step pipeline with persistent context.
 *
 * Replaces the fragmented approach where steps were called from
 * 5+ different locations in ActionsPhase.svelte.
 */

import type { PipelineContext, StepResult } from '../types/PipelineContext';
import type { CheckPipeline, OutcomeType, KingdomSkill } from '../types/CheckPipeline';
import type { ActorContext } from '../types/CheckContext';
import { createPipelineContext, log, getPipeline, getKingdom, getOutcome } from '../types/PipelineContext';
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

  constructor() {
    console.log('🔧 [PipelineCoordinator] Initializing');
    this.initializeServices();
  }

  /**
   * Initialize required services
   */
  private async initializeServices(): Promise<void> {
    this.checkInstanceService = await createOutcomePreviewService();
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
    // Clean up any old instances for this action before starting new pipeline
    await this.cleanupOldInstances(actionId);
    
    // Initialize context
    const context = this.initializeContext(actionId, initialContext);
    
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
   * Confirm user clicked "Apply Result" - resolves Step 6 callback
   * 
   * Called from OutcomeDisplay when user clicks "Apply Result"
   * 
   * @param instanceId - Check instance ID
   * @param resolutionData - Resolution data from OutcomeDisplay (includes customComponentData)
   */
  confirmApply(instanceId: string, resolutionData?: any): void {
    const context = this.pendingContexts.get(instanceId);
    
    if (!context) {
      console.error(`[PipelineCoordinator] No pending context for instance: ${instanceId}`);
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
    
    // Resolve the callback (continues execution to Step 7)
    if (context._resumeCallback) {
      context._resumeCallback();
    } else {
      console.error('[PipelineCoordinator] No resume callback found in context');
    }
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
    const metadata = await unifiedCheckHandler.executePreRollInteractions(
      ctx.actionId,
      ctx.kingdom
    );
    
    // Store metadata in context
    ctx.metadata = { ...ctx.metadata, ...metadata };
    
    log(ctx, 2, 'preRollInteractions', 'Pre-roll interactions complete', metadata);
  }

  /**
   * Step 3: Execute Roll
   * 
   * Execute the PF2e skill check roll and capture result
   * ALWAYS RUNS
   * 
   * Uses native PF2e roll API - no event waiting required!
   */
  private async step3_executeRoll(ctx: PipelineContext): Promise<void> {
    log(ctx, 3, 'executeRoll', 'Executing skill check');
    
    const pipeline = await getPipeline(ctx);
    
    // Get actor (character performing the check)
    let actingCharacter = ctx.actor?.fullActor || getCurrentUserCharacter();
    
    if (!actingCharacter) {
      throw new Error('No character available for roll');
    }
    
    // ✅ CRITICAL FIX: Populate actor context with character name
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
    
    // Get skill (from actor context or first skill in pipeline)
    const skillName = (ctx.actor?.selectedSkill || pipeline.skills[0].skill) as KingdomSkill;
    
    // Calculate DC based on party level (with character level fallback)
    // IMPORTANT: Use ctx.actor.level if available (from reroll context), otherwise fallback to actor object
    const characterLevel = ctx.actor?.level || actingCharacter.level || 1;
    
    // Import getPartyLevel and getLevelBasedDC helpers
    const { getPartyLevel, getLevelBasedDC } = await import('../pipelines/shared/ActionHelpers');
    
    // Get party level, falling back to character level if no party
    const effectiveLevel = getPartyLevel(characterLevel);
    const dc = getLevelBasedDC(effectiveLevel);
    
    // Store DC in context immediately so it's available throughout the pipeline
    ctx.rollData = {
      ...(ctx.rollData || {}),
      dc
    } as any;
    
    log(ctx, 3, 'executeRoll', `Rolling ${skillName} vs DC ${dc}`, { characterLevel, effectiveLevel, dc });
    
    // CREATE CALLBACK that resumes pipeline
    const callback: CheckRollCallback = async (roll, outcome, message, event) => {
      console.log('✅ [Callback] Roll complete:', { outcome, total: roll.total });
      
      // Extract modifiers from PF2e message flags (NOT the roll object!)
      // Per PF2e source (check.ts line 399): modifiers stored in message.flags.pf2e.modifiers
      const modifiers = (message as any)?.flags?.pf2e?.modifiers || [];
      
      console.log('🎲 [PipelineCoordinator] Extracted modifiers from message.flags.pf2e.modifiers:', modifiers.length);
      
      // Log detailed modifier info
      if (modifiers.length > 0) {
        modifiers.forEach((mod: any, idx: number) => {
          console.log(`  Modifier ${idx}:`, {
            label: mod.label,
            modifier: mod.modifier,
            enabled: mod.enabled,
            slug: mod.slug,
            type: mod.type
          });
        });
      } else {
        console.log('ℹ️ [PipelineCoordinator] No modifiers in this roll (expected for rolls without modifiers)');
      }
      
      // Update context with roll data (merge with existing DC if present)
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
          dc: existingDC,  // Include DC in rollBreakdown for OutcomeDisplay
          modifiers: modifiers.map((mod: any) => ({
            label: mod.label || '',
            modifier: mod.modifier || 0,
            enabled: mod.enabled ?? true,
            ignored: mod.ignored ?? false
          }))
        }
      };
      
      console.log('📊 [PipelineCoordinator] Stored rollBreakdown with modifiers:', ctx.rollData.rollBreakdown?.modifiers);
      
      // Resume pipeline at Step 4
      await this.resumeAfterRoll(ctx);
    };
    
    // Call PF2eSkillService with callback (delegates to skill.roll internally)
    const { pf2eSkillService } = await import('./pf2e/PF2eSkillService');
    
    await pf2eSkillService.performKingdomSkillCheck(
      skillName,      // skill name
      'action',       // check type
      pipeline.name,  // check name
      ctx.actionId,   // check ID
      undefined,      // checkEffects (optional)
      ctx.actionId,   // actionId for aids
      callback        // ← Pass callback
    );
    
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
    
    // Create check instance with minimal data (Step 4 only)
    const instanceId = await createActionOutcomePreview({
      actionId: ctx.actionId,
      action: pipeline,
      outcome,
      actorName: ctx.actor?.actorName || 'Unknown',
      actorId: ctx.actor?.actorId,
      actorLevel: ctx.actor?.level,
      proficiencyRank: ctx.actor?.proficiencyRank,
      skillName: ctx.actor?.selectedSkill,
      rollBreakdown: ctx.rollData?.rollBreakdown || undefined,
      currentTurn: turn,
      metadata: ctx.metadata
    });
    
    // Store instance ID in context
    ctx.instanceId = instanceId;
    
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
            customResolutionProps = interaction.componentProps || {};
            console.log(`✅ [PipelineCoordinator] Extracted custom component name: ${customComponentName}`);
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
        const instance = outcomePreviewService.getInstance(instanceId, kingdom);
        
        if (instance?.appliedOutcome) {
          // Update instance with custom component NAME (string for registry lookup)
          await outcomePreviewService.storeOutcome(
            instanceId,
            outcome,
            {
              numericModifiers: (instance.appliedOutcome.modifiers || []) as any,
              manualEffects: instance.appliedOutcome.manualEffects || [],
              specialEffects: instance.appliedOutcome.specialEffects || [],
              complexActions: [],
              customComponentData: null
            },
            instance.appliedOutcome.actorName,
            instance.appliedOutcome.skillName,
            instance.appliedOutcome.effect,
            instance.appliedOutcome.rollBreakdown,
            instance.appliedOutcome.specialEffects,
            customComponentName,  // Pass component NAME (string)
            customResolutionProps  // Pass custom props
          );
          
          console.log(`✅ [PipelineCoordinator] Updated instance with custom component name: ${customComponentName}`);
        }
      }
    }
    
    log(ctx, 4, 'createCheckInstance', `Check instance created: ${instanceId}`);
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
    
    log(ctx, 5, 'calculatePreview', `Converted ${modifiers.length} JSON modifiers to ${modifierBadges.length} badges`);
    
    // ✅ STEP 5B: Call custom preview.calculate if defined (OPTIONAL)
    let customPreview: any = { resources: [], outcomeBadges: [] };
    
    if (pipeline.preview.calculate) {
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
    
    // ✅ STEP 5C: Merge JSON badges + custom badges
    const preview = {
      resources: customPreview.resources || [],
      specialEffects: customPreview.specialEffects || [],
      outcomeBadges: [
        ...modifierBadges,  // JSON modifiers (ALWAYS)
        ...(customPreview.outcomeBadges || [])  // Custom badges (OPTIONAL)
      ]
    };
    
    // Store preview in context
    ctx.preview = preview;
    
    // Format preview to special effects for display
    const formattedPreview = unifiedCheckHandler.formatPreview(ctx.actionId, preview);
    
    // Update instance with special effects AND outcome badges
    if (ctx.instanceId) {
      const actor = getKingdomActor();
      if (actor) {
        console.log('🔧 [PipelineCoordinator] Updating instance with preview data:', {
          instanceId: ctx.instanceId,
          formattedPreviewCount: formattedPreview.length,
          outcomeBadgesCount: preview.outcomeBadges?.length || 0,
          outcomeBadges: preview.outcomeBadges
        });
        
        await actor.updateKingdomData((kingdom: any) => {
          const instance = kingdom.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
          if (instance?.appliedOutcome) {
            console.log('🔧 [PipelineCoordinator] Found instance, updating...');
            
            // Preserve both specialEffects and outcomeBadges
            if (formattedPreview.length > 0) {
              instance.appliedOutcome.specialEffects = formattedPreview;
              console.log('✅ [PipelineCoordinator] Updated specialEffects');
            }
            if (preview.outcomeBadges && preview.outcomeBadges.length > 0) {
              instance.appliedOutcome.outcomeBadges = preview.outcomeBadges;
              console.log('✅ [PipelineCoordinator] Updated outcomeBadges:', instance.appliedOutcome.outcomeBadges);
            }
          } else {
            console.warn('⚠️ [PipelineCoordinator] Instance or appliedOutcome not found');
          }
        });
      }
    }
    
    log(ctx, 5, 'calculatePreview', 'Preview calculated and stored', { 
      preview, 
      formattedCount: formattedPreview.length,
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
    
    // Store context in pending map
    this.pendingContexts.set(ctx.instanceId, ctx);
    
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
    
    // ✅ GLOBAL: Apply +1 fame for all critical successes (Kingdom Rule)
    if (ctx.rollData && outcome === 'criticalSuccess') {
      const { createGameCommandsService } = await import('./GameCommandsService');
      const gameCommandsService = await createGameCommandsService();
      
      const tempResult = {
        success: true,
        applied: { resources: [], specialEffects: [] }
      };
      
      await gameCommandsService.applyFameChange(1, 'Critical Success Bonus', tempResult);
      console.log('✅ [PipelineCoordinator] Applied +1 fame for critical success');
      log(ctx, 8, 'executeAction', 'Applied +1 fame for critical success');
    }
    
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
    
    // Execute via UnifiedCheckHandler
    await unifiedCheckHandler.executeCheck(
      ctx.actionId,
      checkContext,
      ctx.preview || { resources: [], outcomeBadges: [] }
    );
    
    // Store execution result
    ctx.executionResult = {
      success: true,
      message: 'Action executed successfully'
    };
    
    log(ctx, 8, 'executeAction', 'Action executed successfully');
  }

  /**
   * Step 9: Cleanup
   * 
   * Clean up temporary state, delete instances, track action
   * ALWAYS RUNS
   */
  private async step9_cleanup(ctx: PipelineContext): Promise<void> {
    log(ctx, 9, 'cleanup', 'Cleaning up');
    
    // TRACK ACTION in actionLog (so player can't perform unlimited actions)
    const game = (window as any).game;
    const userId = ctx.userId || game?.user?.id;
    const userName = game?.user?.name;
    const actorName = ctx.actor?.actorName || 'Unknown';
    
    if (userId && userName) {
      const { createGameCommandsService } = await import('./GameCommandsService');
      const { TurnPhase } = await import('../actors/KingdomActor');
      const gameCommandsService = await createGameCommandsService();
      
      await gameCommandsService.trackPlayerAction(
        userId,
        userName,
        actorName,
        ctx.actionId,
        TurnPhase.ACTIONS
      );
      
      log(ctx, 9, 'cleanup', `Tracked action for user ${userName}`);
    }
    
    // DELETE check instance completely from pendingOutcomes
    if (ctx.instanceId && this.checkInstanceService) {
      await this.checkInstanceService.clearInstance(ctx.instanceId);
      log(ctx, 9, 'cleanup', `Deleted check instance: ${ctx.instanceId}`);
      
      // Remove from pending contexts
      this.pendingContexts.delete(ctx.instanceId);
    }
    
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
   * Clean up old instances for an action
   * Called before starting a new pipeline to prevent stale data
   */
  private async cleanupOldInstances(actionId: string): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;
    
    const kingdom = actor.getKingdomData();
    const oldInstances = (kingdom.pendingOutcomes || []).filter(
      (i: any) => i.checkType === 'action' && i.checkId === actionId
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
