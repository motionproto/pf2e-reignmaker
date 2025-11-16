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
import { getCurrentUserCharacter, performKingdomActionRoll } from './pf2e';
import { unifiedCheckHandler } from './UnifiedCheckHandler';
import { createCheckInstanceService } from './CheckInstanceService';

/**
 * Pipeline Coordinator
 * 
 * Single entry point for all action execution.
 * Manages the complete lifecycle of an action from initiation to completion.
 */
export class PipelineCoordinator {
  // Pending contexts waiting for user confirmation (Step 6)
  private pendingContexts = new Map<string, PipelineContext>();
  
  // Pre-roll contexts waiting for roll completion (Steps 1-3 complete, waiting for Step 4)
  private preRollContexts = new Map<string, PipelineContext>();
  
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
    this.checkInstanceService = await createCheckInstanceService();
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
    // Initialize context
    const context = this.initializeContext(actionId, initialContext);
    
    log(context, 0, 'initialize', `Starting pipeline for ${actionId}`);
    
    try {
      // Execute all 9 steps sequentially
      await this.step1_checkRequirements(context);
      await this.step2_preRollInteractions(context);
      await this.step3_executeRoll(context);
      await this.step4_createCheckInstance(context);
      await this.step5_calculatePreview(context);
      await this.step6_waitForUserConfirmation(context);
      await this.step7_postApplyInteractions(context);
      await this.step8_executeAction(context);
      await this.step9_cleanup(context);
      
      log(context, 0, 'complete', `Pipeline completed successfully`);
      console.log('✅ [PipelineCoordinator] Pipeline execution complete:', {
        actionId: context.actionId,
        outcome: context.rollData?.outcome,
        steps: context.logs.length
      });
      
      return context;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(context, 0, 'error', `Pipeline failed: ${errorMessage}`, error);
      console.error('❌ [PipelineCoordinator] Pipeline execution failed:', error);
      
      // Rollback any partial changes
      await this.rollback(context);
      
      throw error;
    }
  }

  /**
   * Execute pipeline pre-roll phase (Steps 1-3)
   * 
   * Executes requirements check, pre-roll interactions, and initiates roll.
   * Stores context for continuation when roll completes.
   * 
   * @param actionId - Action/event/incident ID
   * @param initialContext - Initial context data
   * @returns Partial context after pre-roll phase
   */
  async executePipelinePreRoll(
    actionId: string,
    initialContext: Partial<PipelineContext>
  ): Promise<PipelineContext> {
    // Initialize context
    const context = this.initializeContext(actionId, initialContext);
    
    log(context, 0, 'initialize', `Starting pre-roll phase for ${actionId}`);
    
    // Store context BEFORE executing roll (to handle race condition)
    // The roll event can fire before step3 returns, so we need the context ready
    const contextKey = `${actionId}:${context.userId}`;
    this.preRollContexts.set(contextKey, context);
    console.log(`🔑 [PipelineCoordinator] Context stored with key: ${contextKey}`);
    
    try {
      // Execute Steps 1-3
      await this.step1_checkRequirements(context);
      await this.step2_preRollInteractions(context);
      await this.step3_executeRoll(context);
      
      log(context, 0, 'preRoll', `Pre-roll phase complete, awaiting roll result`);
      console.log('✅ [PipelineCoordinator] Pre-roll phase complete:', {
        actionId: context.actionId,
        userId: context.userId,
        contextKey
      });
      
      return context;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(context, 0, 'error', `Pre-roll phase failed: ${errorMessage}`, error);
      console.error('❌ [PipelineCoordinator] Pre-roll phase failed:', error);
      throw error;
    }
  }

  /**
   * Continue pipeline from roll complete (Steps 4-9)
   * 
   * Retrieves stored context, updates with roll data, and executes Steps 4-9.
   * Pauses internally at Step 6 for user confirmation via callback pattern.
   * 
   * @param actionId - Action/event/incident ID
   * @param userId - User who initiated the action
   * @param rollData - Roll outcome data from event
   */
  async continueFromRollComplete(
    actionId: string,
    userId: string,
    rollData: {
      outcome: OutcomeType;
      actorName: string;
      actorId?: string;
      actorLevel?: number;
      proficiencyRank?: number;
      skillName?: string;
      rollBreakdown?: any;
    }
  ): Promise<void> {
    const contextKey = `${actionId}:${userId}`;
    const context = this.preRollContexts.get(contextKey);
    
    if (!context) {
      console.error(`[PipelineCoordinator] No pre-roll context for ${contextKey}`);
      return;
    }
    
    log(context, 0, 'postRoll', `Continuing pipeline after roll complete`);
    
    try {
      // Update context with roll data
      context.rollData = {
        ...context.rollData!,
        outcome: rollData.outcome,
        rollBreakdown: rollData.rollBreakdown
      };
      
      // Update actor context if provided
      if (rollData.actorId) {
        context.actor = {
          ...context.actor!,
          actorId: rollData.actorId,
          actorName: rollData.actorName,
          level: rollData.actorLevel || context.actor?.level || 1,
          proficiencyRank: rollData.proficiencyRank || context.actor?.proficiencyRank || 0,
          selectedSkill: rollData.skillName || context.actor?.selectedSkill || ''
        };
      }
      
      // Refresh kingdom data (may have changed since pre-roll)
      const actor = getKingdomActor();
      context.kingdom = actor?.getKingdomData();
      
      log(context, 0, 'postRoll', `Roll data updated, executing Steps 4-9`);
      
      // Remove from pre-roll contexts (we're now executing post-roll)
      this.preRollContexts.delete(contextKey);
      
      // Execute Steps 4-5 (create instance and calculate preview)
      await this.step4_createCheckInstance(context);
      await this.step5_calculatePreview(context);
      
      // Step 6: Wait for user confirmation (INTERNAL PAUSE via callback)
      await this.step6_waitForUserConfirmation(context);
      
      // Steps 7-9: Continue after user clicks "Apply Result"
      // (step6 promise resolves when confirmApply() is called)
      await this.step7_postApplyInteractions(context);
      await this.step8_executeAction(context);
      await this.step9_cleanup(context);
      
      log(context, 0, 'complete', `Pipeline completed successfully`);
      console.log('✅ [PipelineCoordinator] Pipeline execution complete:', {
        actionId: context.actionId,
        outcome: context.rollData?.outcome,
        steps: context.logs.length
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(context, 0, 'error', `Post-roll phase failed: ${errorMessage}`, error);
      console.error('❌ [PipelineCoordinator] Post-roll phase failed:', error);
      
      // Rollback any partial changes
      await this.rollback(context);
      
      // Remove from pre-roll contexts if still there
      this.preRollContexts.delete(contextKey);
      
      throw error;
    }
  }

  /**
   * Confirm user clicked "Apply Result" - resolves Step 6 callback
   * 
   * Called from OutcomeDisplay when user clicks "Apply Result"
   */
  confirmApply(instanceId: string): void {
    const context = this.pendingContexts.get(instanceId);
    
    if (!context) {
      console.error(`[PipelineCoordinator] No pending context for instance: ${instanceId}`);
      return;
    }
    
    log(context, 6, 'confirm', 'User confirmed outcome, continuing to Steps 7-9');
    console.log(`▶️ [PipelineCoordinator] User confirmed, resolving Step 6 callback`);
    
    // Mark as confirmed
    context.userConfirmed = true;
    
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
    
    // Get skill (from actor context or first skill in pipeline)
    const skillName = (ctx.actor?.selectedSkill || pipeline.skills[0].skill) as KingdomSkill;
    
    // Calculate DC based on character level
    const characterLevel = actingCharacter.level || 1;
    const dc = this.calculateDC(characterLevel, pipeline);
    
    log(ctx, 3, 'executeRoll', `Rolling ${skillName} vs DC ${dc}`, { characterLevel, dc });
    
    // Call PF2e roll and CAPTURE the native return value
    const rollResult = await performKingdomActionRoll(
      actingCharacter,
      skillName,
      dc,
      pipeline.name,
      ctx.actionId,
      pipeline.outcomes
    );
    
    if (!rollResult) {
      throw new Error('Roll was cancelled or failed');
    }
    
    // Parse outcome immediately from roll result
    const { pf2eRollService } = await import('./pf2e');
    const outcome = pf2eRollService.parseRollOutcome(rollResult, dc) as OutcomeType;
    
    // Extract roll breakdown
    const d20Result = rollResult.dice[0]?.results[0]?.result || 0;
    const rollBreakdown = {
      d20Result,
      total: rollResult.total,
      dc,
      modifiers: [] // TODO: Extract from roll if needed
    };
    
    // Store complete roll data in context
    ctx.rollData = {
      skill: skillName,
      dc,
      roll: rollResult,
      outcome,
      rollBreakdown
    };
    
    log(ctx, 3, 'executeRoll', `Roll complete: ${outcome} (total: ${rollResult.total} vs DC ${dc})`);
  }

  /**
   * Step 4: Create Check Instance
   * 
   * Create visual check instance card in UI
   * ALWAYS RUNS
   * 
   * Stores instance in kingdom.activeCheckInstances
   * 
   * NOTE: This step uses the existing CheckInstanceHelpers since
   * check instance creation is complex and well-tested.
   */
  private async step4_createCheckInstance(ctx: PipelineContext): Promise<void> {
    log(ctx, 4, 'createCheckInstance', 'Creating check instance');
    
    const pipeline = await getPipeline(ctx);
    const outcome = ctx.rollData?.outcome || 'success';
    
    // Import CheckInstanceHelpers
    const { createActionCheckInstance } = await import('../controllers/actions/CheckInstanceHelpers');
    
    // Import action loader to get action definition
    const { actionLoader } = await import('../controllers/actions/action-loader');
    const action = actionLoader.getAllActions().find(a => a.id === ctx.actionId);
    
    if (!action) {
      throw new Error(`Action not found: ${ctx.actionId}`);
    }
    
    // Get current turn
    const { currentTurn } = await import('../stores/KingdomStore');
    const { get } = await import('svelte/store');
    const turn = get(currentTurn) || 1;
    
    // Build pending actions state from metadata
    // This is needed for placeholder replacement in CheckInstanceHelpers
    const pendingActions = {
      pendingBuildAction: ctx.metadata.structureId ? {
        skill: ctx.actor?.selectedSkill || '',
        structureId: ctx.metadata.structureId as string,
        settlementId: ctx.metadata.settlementId as string
      } : null,
      pendingRepairAction: ctx.metadata.structureId ? {
        skill: ctx.actor?.selectedSkill || '',
        structureId: ctx.metadata.structureId as string,
        settlementId: ctx.metadata.settlementId as string
      } : null,
      pendingUpgradeAction: ctx.metadata.settlementId ? {
        skill: ctx.actor?.selectedSkill || '',
        settlementId: ctx.metadata.settlementId as string
      } : null,
      pendingDiplomaticAction: ctx.metadata.factionId ? {
        skill: ctx.actor?.selectedSkill || '',
        factionId: ctx.metadata.factionId as string,
        factionName: ctx.metadata.factionName as string
      } : null,
      pendingInfiltrationAction: ctx.metadata.factionId ? {
        skill: ctx.actor?.selectedSkill || '',
        factionId: ctx.metadata.factionId as string,
        factionName: ctx.metadata.factionName as string
      } : null,
      pendingStipendAction: ctx.metadata.settlementId ? {
        skill: ctx.actor?.selectedSkill || '',
        settlementId: ctx.metadata.settlementId as string
      } : null
    };
    
    // Create controller mock with required methods
    const controller = {
      getActionModifiers: (action: any, outcome: string) => {
        // Get modifiers from action outcome
        const outcomeData = (action as any).effects?.[outcome] || action[outcome];
        return outcomeData?.modifiers || [];
      }
    };
    
    // Create check instance
    const instanceId = await createActionCheckInstance({
      actionId: ctx.actionId,
      action,
      outcome,
      actorName: ctx.actor?.actorName || 'Unknown',
      actorId: ctx.actor?.actorId,
      actorLevel: ctx.actor?.level,
      proficiencyRank: ctx.actor?.proficiencyRank,
      skillName: ctx.actor?.selectedSkill,
      rollBreakdown: ctx.rollData?.rollBreakdown,
      currentTurn: turn,
      pendingActions,
      controller
    });
    
    // Store instance ID in context
    ctx.instanceId = instanceId;
    
    // Mark instance as coordinator-managed
    const actor = getKingdomActor();
    if (actor) {
      await actor.updateKingdomData((kingdom: any) => {
        const instance = kingdom.activeCheckInstances?.find((i: any) => i.instanceId === instanceId);
        if (instance) {
          instance.usePipelineCoordinator = true;
        }
      });
    }
    
    log(ctx, 4, 'createCheckInstance', `Check instance created: ${instanceId} (coordinator-managed)`);
  }

  /**
   * Step 5: Calculate Preview
   * 
   * Calculate what will happen when action is applied
   * OPTIONAL - only runs if pipeline has preview.calculate
   * 
   * Shows resource changes, entity operations, warnings
   */
  private async step5_calculatePreview(ctx: PipelineContext): Promise<void> {
    log(ctx, 5, 'calculatePreview', 'Calculating preview');
    
    const pipeline = await getPipeline(ctx);
    
    // Check if preview is provided by interaction (map selection)
    if (pipeline.preview.providedByInteraction) {
      log(ctx, 5, 'calculatePreview', 'Preview provided by interaction, skipping calculation');
      return;
    }
    
    // Check if preview calculation is defined
    if (!pipeline.preview.calculate) {
      log(ctx, 5, 'calculatePreview', 'No preview calculation defined, skipping');
      return;
    }
    
    // Build check context for preview calculation
    const checkContext = {
      check: pipeline,
      outcome: ctx.rollData?.outcome || 'success',
      kingdom: ctx.kingdom,
      actor: ctx.actor,
      resolutionData: ctx.resolutionData,
      metadata: ctx.metadata,
      instanceId: ctx.instanceId
    };
    
    // Calculate preview
    const preview = await unifiedCheckHandler.calculatePreview(ctx.actionId, checkContext);
    
    // Store preview in context
    ctx.preview = preview;
    
    log(ctx, 5, 'calculatePreview', 'Preview calculated', preview);
  }

  /**
   * Step 6: Wait for User Confirmation
   * 
   * Pause execution until user clicks "Apply Result" in OutcomeDisplay
   * ALWAYS RUNS
   * 
   * Uses pause/resume pattern with promises
   */
  private async step6_waitForUserConfirmation(ctx: PipelineContext): Promise<void> {
    log(ctx, 6, 'waitForUserConfirmation', 'Pausing for user confirmation');
    
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
    
    // Merge resolution data into context
    ctx.resolutionData = {
      ...ctx.resolutionData,
      ...resolutionData
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
    
    // Build check context for execution
    const checkContext = {
      check: pipeline,
      outcome: ctx.rollData?.outcome || 'success',
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
      ctx.preview || { resources: [], specialEffects: [] }
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
    
    // DELETE check instance completely (not just clear)
    if (ctx.instanceId) {
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdomData((kingdom: any) => {
          if (kingdom.activeCheckInstances) {
            kingdom.activeCheckInstances = kingdom.activeCheckInstances.filter(
              (i: any) => i.instanceId !== ctx.instanceId
            );
          }
        });
        log(ctx, 9, 'cleanup', `Deleted check instance: ${ctx.instanceId}`);
      }
      
      // Remove from pending contexts
      this.pendingContexts.delete(ctx.instanceId);
    }
    
    // TODO: Track player action in actionLog (via GameCommandsService)
    
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
