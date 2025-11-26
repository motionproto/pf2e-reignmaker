<script lang="ts">
  import { kingdomData, currentTurn, getKingdomActor } from "../../../stores/KingdomStore";
  import { TurnPhase, type KingdomData } from "../../../actors/KingdomActor";
  import { createGameCommandsService } from '../../../services/GameCommandsService';
  import { createOutcomePreviewService } from '../../../services/OutcomePreviewService';
  import { actionLoader } from "../../../controllers/actions/pipeline-loader";
  import ActionDialogManager from "./components/ActionDialogManager.svelte";
  import ActionCategorySection from "./components/ActionCategorySection.svelte";
  import { getAidResult } from '../../../controllers/shared/AidSystemHelpers';
  import {
    getCurrentUserCharacter,
    showCharacterSelectionDialog
  } from "../../../services/pf2e";
  import { onMount, onDestroy, tick } from "svelte";
  import { logger } from '../../../utils/Logger';

  // Props
  export let isViewingCurrentPhase: boolean = true;

  // Hide untrained skills state (now managed by parent TurnTab.svelte)
  export let hideUntrainedSkills: boolean = true;
  export let onToggleUntrained: ((value: boolean) => void) | undefined = undefined;

  // Import controller
  import { createActionPhaseController } from '../../../controllers/ActionPhaseController';
  import { ACTION_CATEGORIES } from './action-categories-config';

  // Initialize controller and services
  let controller: any = null;
  let gameCommandsService: any = null;
  let checkInstanceService: any = null;
  let pipelineCoordinator: any = null;

  // UI State (not business logic)
  let expandedActions = new Set<string>();
  
  // Aid Another state - still actively used
  let showAidSelectionDialog: boolean = false;
  let pendingAidAction: { id: string; name: string } | null = null;

  // REACTIVE DERIVATION: Auto-derive from pendingOutcomes (Single Source of Truth)
  // Map<actionId, instanceId> - coordinator-managed instances only
  // Include both 'pending' (before roll) and 'resolved' (after storeOutcome) to show outcome UI
  $: currentActionInstances = ($kingdomData.pendingOutcomes || [])
    .filter(i => i.checkType === 'action' && (i.status === 'pending' || i.status === 'resolved'))
    .reduce((map, instance) => {
      map.set(instance.checkId, instance.previewId);
      return map;
    }, new Map<string, string>());
  
  // Count of players who have acted (from actionLog)
  $: actionsUsed = ($kingdomData.turnState?.actionLog || []).filter((entry: any) => 
    entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS
  ).length;
  
  // Force UI update when active aids change
  $: activeAidsCount = $kingdomData?.turnState?.actionsPhase?.activeAids?.length || 0;
  
  // Create a reactive key that changes when army data OR party level OR deployed armies change
  // This forces action requirement checks to re-run when armies, party level, or deployment status are modified
  // Party level is synced on mount, so stored value should be current
  $: armyDataKey = $kingdomData ? 
    `${$kingdomData.partyLevel || 1}|${$kingdomData.armies?.map(a => `${a.id}:${a.level}`).join(',') || ''}|deployed:${($kingdomData.turnState?.actionsPhase?.deployedArmyIds || []).join(',')}` : '';
  
  // Create a reactive key that changes when resources change
  // This forces action requirement checks to re-run when gold, lumber, ore, etc. change
  $: resourcesKey = $kingdomData?.resources ? 
    `${$kingdomData.resources.gold || 0}|${$kingdomData.resources.lumber || 0}|${$kingdomData.resources.ore || 0}|${$kingdomData.resources.food || 0}` : '';
  
  // Track current user ID
  let currentUserId: string | null = null;

  // UI helper - toggle action expansion
  async function toggleAction(actionId: string) {
    if (expandedActions.has(actionId)) {
      expandedActions.clear();
    } else {
      expandedActions.clear();
      expandedActions.add(actionId);
      
      // ✅ CLEANUP: Clear any stale instances for this action when opening
      // This prevents old test results from showing up
      const actor = getKingdomActor();
      if (actor && checkInstanceService) {
        const kingdom = actor.getKingdomData();
        const oldInstances = (kingdom.pendingOutcomes || []).filter(
          (i: any) => i.checkType === 'action' && i.checkId === actionId
        );
        
        if (oldInstances.length > 0) {
          console.log(`🧹 [ActionsPhase] Clearing ${oldInstances.length} stale instance(s) for ${actionId}`);
          for (const instance of oldInstances) {
            await checkInstanceService.clearInstance(instance.previewId);
          }
        }
      }
    }
    expandedActions = new Set(expandedActions);
  }

  // Apply the actual state changes when user confirms the resolution
  // NEW ARCHITECTURE: Receives ResolutionData from OutcomeDisplay via primary event
  async function applyActionEffects(event: CustomEvent) {
    const { checkId: actionId, resolution: resolutionData } = event.detail;
    console.log('🎬 [ActionsPhase] applyActionEffects called for:', actionId);
    console.log('🎬 [ActionsPhase] Resolution data:', resolutionData);

    const action = actionLoader.getAllActions().find(
      (a) => a.id === actionId
    );
    if (!action) {
      console.error('❌ [applyActionEffects] Action not found:', actionId);
      logger.error('❌ [applyActionEffects] Action not found:', actionId);
      return;
    }
    console.log('🎬 [ActionsPhase] Found action:', action.name);

    // Get instance from storage
    const instanceId = currentActionInstances.get(actionId);
    console.log('🎬 [ActionsPhase] Looking for instance ID:', instanceId);
    if (!instanceId) {
      console.error('❌ [applyActionEffects] No instance found for action:', actionId);
      logger.error('❌ [applyActionEffects] No instance found for action:', actionId);
      return;
    }
    
    const instance = $kingdomData.pendingOutcomes?.find(i => i.previewId === instanceId);
    console.log('🎬 [ActionsPhase] Found instance:', instance);
    if (!instance?.appliedOutcome) {
      console.error('❌ [applyActionEffects] Instance has no outcome:', instanceId);
      logger.error('❌ [applyActionEffects] Instance has no outcome:', instanceId);
      return;
    }
    console.log('🎬 [ActionsPhase] Instance has outcome:', instance.appliedOutcome.outcome);

    // ✅ All actions use PipelineCoordinator
    if (instance.checkType === 'action' && pipelineCoordinator) {
      console.log('🚀 [ActionsPhase] Coordinator-managed action, calling confirmApply()');
      console.log('🚀 [ActionsPhase] Passing resolution data:', resolutionData);
      pipelineCoordinator.confirmApply(instanceId, resolutionData);
      return; // Coordinator handles Steps 7-9
    }

    // EXECUTE PENDING COMMITS (prepare/commit pattern)
    // This executes game commands like giveActorGold that were prepared earlier
    // Retrieve from client-side storage (functions can't be serialized in actor flags)
    const { commitStorage } = await import('../../../utils/CommitStorage');
    const pendingCommits = commitStorage.get(instanceId);
    
    if (pendingCommits && pendingCommits.length > 0) {
      console.log(`🎬 [ActionsPhase] Executing ${pendingCommits.length} pending commit(s)`);
      try {
        for (const commit of pendingCommits) {
          await commit();
        }
        console.log('✅ [ActionsPhase] All pending commits executed successfully');
        
        // Remove commits from storage after successful execution
        commitStorage.remove(instanceId);
      } catch (error) {
        console.error('❌ [ActionsPhase] Failed to execute pending commits:', error);
        logger.error('❌ [ActionsPhase] Failed to execute pending commits:', error);
        return;
      }
    }

    // Apply action via controller
    console.log('🎬 [ActionsPhase] About to call controller.resolveAction with:', {
      actionId,
      instanceId,
      outcome: instance.appliedOutcome.outcome,
      actorName: instance.appliedOutcome.actorName
    });
    const result = await controller.resolveAction(
      actionId,
      instance.appliedOutcome.outcome,
      resolutionData,
      instance.appliedOutcome.actorName,
      instance.appliedOutcome.skillName || '',
      currentUserId || undefined,
      instanceId
    );
    console.log('🎬 [ActionsPhase] controller.resolveAction returned:', result);

    if (!result.success) {
      return; // Don't track failed actions
    }
    
    // Centralized action tracking - applies to ALL actions
    if (gameCommandsService && currentUserId) {
      await gameCommandsService.trackPlayerAction(
        currentUserId,
        (window as any).game?.user?.name,
        instance.appliedOutcome.actorName,
        actionId,
        TurnPhase.ACTIONS
      );
    }
    
    // Clear instance to reset card to initial state (actions can be performed again)
    if (checkInstanceService) {
      await checkInstanceService.clearInstance(instanceId);
      currentActionInstances.delete(actionId);
      currentActionInstances = currentActionInstances;  // Trigger reactivity
    }
    
    // Force UI update
    await tick();
  }
  

  // Component lifecycle
  onMount(async () => {
    console.log('🔵 [ActionsPhase] Component mounting...');
    
    // ✅ Sync party level when component mounts (ensures requirements check has current level)
    const { getHighestPartyLevel } = await import('../../../hooks/partyLevelHooks');
    const actor = getKingdomActor();
    if (actor) {
      const currentPartyLevel = getHighestPartyLevel();
      const kingdom = actor.getKingdomData();
      if (kingdom && kingdom.partyLevel !== currentPartyLevel) {
        console.log(`🎯 [ActionsPhase] Syncing party level on mount: ${kingdom.partyLevel} → ${currentPartyLevel}`);
        await actor.updateKingdomData((k: any) => {
          k.partyLevel = currentPartyLevel;
        });
      }
    }
    
    // Initialize controller and services
    controller = await createActionPhaseController();
    gameCommandsService = await createGameCommandsService();
    checkInstanceService = await createOutcomePreviewService();
    
    // Initialize PipelineCoordinator
    const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
    pipelineCoordinator = await getPipelineCoordinator();
    console.log('✅ [ActionsPhase] PipelineCoordinator initialized');
    
    // Initialize the phase (this auto-completes immediately to allow players to skip actions)
    await controller.startPhase();

    // Store current user ID
    const game = (window as any).game;
    currentUserId = game?.user?.id || null;
  });

  onDestroy(() => {
    console.log('🔴 [ActionsPhase] Component unmounting');
  });

  // Helper functions delegating to controller
  function getActionsByCategory(categoryId: string) {
    return actionLoader.getActionsByCategory(categoryId);
  }

  function isActionAvailable(action: any): boolean {
    // Delegate to controller for business logic
    if (!controller) return false;
    return controller.canPerformAction(action, $kingdomData as any);
  }
  
  function getMissingRequirements(action: any): string[] {
    // Delegate to controller for business logic
    if (!controller) return [];
    
    const requirements = controller.getActionRequirements(action, $kingdomData as any);
    const missing: string[] = [];
    
    // Add general reason if present
    if (!requirements.met && requirements.reason) {
      missing.push(requirements.reason);
    }
    
    // Add specific missing resources
    if (requirements.missingResources) {
      requirements.missingResources.forEach((amount: any, resource: any) => {
        const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
        missing.push(`${amount} more ${resourceName}`);
      });
    }
    
    return missing;
  }

  // Handle skill execution from CheckCard (decoupled from component)
  // ALL actions use PipelineCoordinator - no legacy code paths
  async function handleExecuteSkill(event: CustomEvent, action: any) {
    const { skill } = event.detail;
    
    // 🚀 CONTINUOUS PIPELINE: Execute all 9 steps (pauses internally at Step 6)
    if (!pipelineCoordinator) {
      throw new Error('PipelineCoordinator not initialized');
    }
    
    console.log(`🚀 [ActionsPhase] Using PipelineCoordinator for ${action.id}`);
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        console.log('⚠️ [ActionsPhase] User cancelled character selection');
        return;
      }
    }
    
    // Execute complete pipeline (Steps 1-9, pauses at Step 6 for user confirmation)
    try {
      await pipelineCoordinator.executePipeline(action.id, {
        actor: {
          selectedSkill: skill,
          fullActor: actingCharacter,
          actorName: actingCharacter.name,
          actorId: actingCharacter.id,
          level: actingCharacter.level || 1,
          proficiencyRank: 0 // TODO: Get from actor
        }
      });
      
      console.log(`✅ [ActionsPhase] Pipeline complete for ${action.id}`);
    } catch (error: any) {
      // Handle user cancellation gracefully (not an error)
      if (error.message === 'Action cancelled by user') {
        console.log(`⏭️ [ActionsPhase] User cancelled ${action.id}`);
        return;
      }
      
      // Show user-friendly error notification
      const ui = (globalThis as any).ui;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Show notification for requirements errors (these should be caught earlier, but show here as fallback)
      if (errorMessage.includes('All armies have already moved') || 
          errorMessage.includes('No armies available') ||
          errorMessage.includes('Insufficient resources')) {
        ui?.notifications?.warn(errorMessage);
      } else {
        ui?.notifications?.error(`Failed to execute ${action.name}: ${errorMessage}`);
      }
      
      console.error(`❌ [ActionsPhase] Pipeline failed for ${action.id}:`, error);
      // Don't re-throw - error has been shown to user
    }
    
    // Clear aid modifiers for this action
    const actor = getKingdomActor();
    if (actor) {
      await actor.updateKingdomData((kingdom: KingdomData) => {
        if (kingdom.turnState?.actionsPhase?.activeAids) {
          kingdom.turnState.actionsPhase.activeAids = 
            kingdom.turnState.actionsPhase.activeAids.filter(
              (aid: any) => aid.targetActionId !== action.id
            );
        }
      });
    }
  }
  
  // Handle performReroll from OutcomeDisplay (via BaseCheckCard)
  async function handlePerformReroll(event: CustomEvent, action: any) {
    const { skill, previousFame } = event.detail;

    // Clear instance for this action
    const instanceId = currentActionInstances.get(action.id);
    if (instanceId && checkInstanceService) {
      await checkInstanceService.clearInstance(instanceId);
      currentActionInstances.delete(action.id);
      currentActionInstances = currentActionInstances;  // Trigger reactivity
    }
    
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get character for reroll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      // Show character selection dialog
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        // Restore fame if user cancelled
        const { restoreFameAfterFailedReroll } = await import('../../../controllers/shared/RerollHelpers');
        if (previousFame !== undefined) {
          await restoreFameAfterFailedReroll(previousFame);
        }
        return;
      }
    }
    
    // 🔄 ALL actions use PipelineCoordinator
    if (!pipelineCoordinator) {
      throw new Error('PipelineCoordinator not initialized');
    }
    
    console.log(`🔄 [ActionsPhase] Reroll for action, re-executing pipeline for ${action.id}`);
    
    try {
      // Re-execute complete pipeline (Steps 1-9, pauses at Step 6 for user confirmation)
      await pipelineCoordinator.executePipeline(action.id, {
        actor: {
          selectedSkill: skill,
          fullActor: actingCharacter,
          actorName: actingCharacter.name,
          actorId: actingCharacter.id,
          level: actingCharacter.level || 1,
          proficiencyRank: 0 // TODO: Get from actor
        }
      });
      
      console.log(`✅ [ActionsPhase] Pipeline reroll complete for ${action.id}`);
      
    } catch (error) {
      console.error(`❌ [ActionsPhase] PipelineCoordinator reroll failed for ${action.id}:`, error);
      // Restore fame if the roll failed
      const { restoreFameAfterFailedReroll } = await import('../../../controllers/shared/RerollHelpers');
      if (previousFame !== undefined) {
        await restoreFameAfterFailedReroll(previousFame);
      }
    }
  }
  
  // Handle canceling an action result
  async function handleActionResultCancel(actionId: string) {
    // Clear instance for this action
    const instanceId = currentActionInstances.get(actionId);
    if (instanceId && checkInstanceService) {
      await checkInstanceService.clearInstance(instanceId);
      currentActionInstances.delete(actionId);
      currentActionInstances = currentActionInstances;  // Trigger reactivity
    }
    
    // Note: Canceling doesn't add to actionLog, so player can still act
  }
  
  // ============================================
  // Aid Another Feature (still actively used)
  // ============================================
  
  // Handle Aid Another button click - check if player has acted, then open skill selection dialog
  function handleAid(event: CustomEvent) {
    const { checkId, checkName } = event.detail;

    // Check if THIS PLAYER has already acted - show confirmation dialog
    // READ from reactive store (Single Source of Truth) - use actionLog
    const game = (window as any).game;
    const actionLog = $kingdomData.turnState?.actionLog || [];
    // Check if this player has any action entries (actions or events, not incidents)
    const hasPlayerActed = actionLog.some((entry: any) => 
      entry.playerId === game?.user?.id && 
      (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
    );

    if (hasPlayerActed) {
      // Note: Aid Another still allowed even if player has acted
      // Regular action confirmation is now handled by BaseCheckCard
    }
    
    // No warning needed - proceed directly to skill selection
    pendingAidAction = { id: checkId, name: checkName };
    showAidSelectionDialog = true;
  }
  
  // Handle aid dialog confirmation - skill has been selected
  async function handleAidConfirm(event: CustomEvent) {
    if (!pendingAidAction) return;
    
    const { skill } = event.detail;
    showAidSelectionDialog = false;

    console.log('[Aid Debug] Executing aid for:', {
      targetActionId: pendingAidAction.id,
      targetActionName: pendingAidAction.name,
      skill
    });

    // Execute aid via pipeline coordinator
    await executeAidRoll(skill, pendingAidAction.id, pendingAidAction.name);
    pendingAidAction = null;
  }
  
  // Handle aid dialog cancellation
  function handleAidCancel() {
    showAidSelectionDialog = false;
    pendingAidAction = null;
  }
  
  // Execute aid roll - use pipeline coordinator for proper outcome display
  async function executeAidRoll(skill: string, targetActionId: string, targetActionName: string) {
    if (!pipelineCoordinator) {
      logger.error('[executeAidRoll] Pipeline coordinator not initialized');
      return;
    }
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        return; // User cancelled
      }
    }

    try {
      console.log('[Aid Debug] Executing aid for:', {
        targetActionId,
        targetActionName,
        skill,
        usingCheckId: targetActionId
      });

      // Execute aid-another pipeline but use TARGET action ID as checkId
      // This makes the instance appear on the target action's card
      await pipelineCoordinator.executePipeline('aid-another', {
        actor: {
          actorId: actingCharacter.uuid,
          actorName: actingCharacter.name,
          selectedSkill: skill,
          level: actingCharacter.level || 1,
          proficiencyRank: actingCharacter.skills?.[skill.toLowerCase()]?.rank || 0
        },
        metadata: {
          checkId: targetActionId,  // Override checkId to target action
          targetActionId,
          targetActionName,
          checkType: 'action' // Could also support 'event' if needed
        }
      });
    } catch (error) {
      logger.error('[executeAidRoll] Error executing aid pipeline:', error);
    }
  }
  
  // Get aid result for an action - read from kingdom state
  function getAidResultForAction(actionId: string): { outcome: string; bonus: number; characterName: string } | null {
    const result = getAidResult(actionId, 'action');
    console.log('[Aid Debug] getAidResultForAction called:', {
      actionId,
      result,
      activeAids: $kingdomData?.turnState?.actionsPhase?.activeAids
    });
    return result;
  }

</script>

<div class="actions-phase">

  <!-- Scrollable content area -->
  <div class="actions-content">
    <!-- Category sections - using ActionCategorySection component -->
    {#each ACTION_CATEGORIES as category}
      {@const actions = getActionsByCategory(category.id)}
      <ActionCategorySection
        {category}
        {actions}
        {currentActionInstances}
        activeCheckInstances={$kingdomData.pendingOutcomes || []}
        {expandedActions}
        {controller}
        {activeAidsCount}
        {armyDataKey}
        {resourcesKey}
        {isViewingCurrentPhase}
        {actionsUsed}
        currentFame={$kingdomData?.fame || 0}
        {getAidResultForAction}
        {isActionAvailable}
        {getMissingRequirements}
        {hideUntrainedSkills}
        on:toggle={(e) => toggleAction(e.detail.actionId)}
        on:executeSkill={(e) => handleExecuteSkill(e.detail.event, e.detail.action)}
        on:performReroll={(e) => handlePerformReroll(e.detail.event, e.detail.action)}
        on:aid={handleAid}
        on:primary={applyActionEffects}
        on:cancel={(e) => handleActionResultCancel(e.detail.actionId)}
      />
    {/each}
  </div>
</div>

<!-- Dialog Manager - only Aid Selection Dialog is still used -->
<ActionDialogManager
  bind:showAidSelectionDialog
  {pendingAidAction}
  on:aidConfirm={handleAidConfirm}
  on:aidCancel={handleAidCancel}
/>

<style lang="scss">
  .actions-phase {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }

  .actions-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-32);
    padding-right: var(--space-4);
  }
</style>
