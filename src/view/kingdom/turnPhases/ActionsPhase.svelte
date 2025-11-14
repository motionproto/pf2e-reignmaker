<script lang="ts">
  import { kingdomData, currentTurn, getKingdomActor } from "../../../stores/KingdomStore";
  import { TurnPhase, type KingdomData } from "../../../actors/KingdomActor";
  import { createGameCommandsService } from '../../../services/GameCommandsService';
  import { createCheckInstanceService } from '../../../services/CheckInstanceService';
  import { actionLoader } from "../../../controllers/actions/action-loader";
  import ActionDialogManager from "./components/ActionDialogManager.svelte";
  import ActionCategorySection from "./components/ActionCategorySection.svelte";
  import { createAidManager, type AidManager } from '../../../controllers/shared/AidSystemHelpers';
  import { executeActionRoll, createExecutionContext } from '../../../controllers/actions/ActionExecutionHelpers';
  import {
    getCurrentUserCharacter,
    initializeRollResultHandler,
    performKingdomActionRoll,
    showCharacterSelectionDialog
  } from "../../../services/pf2e";
  import { onMount, onDestroy, tick } from "svelte";
  import { logger } from '../../../utils/Logger';

  // Props
  export let isViewingCurrentPhase: boolean = true;

  // Hide untrained skills state (persisted per-user in localStorage)
  const STORAGE_KEY = 'pf2e-reignmaker-hide-untrained-skills';
  export let hideUntrainedSkills: boolean = true;
  export let onToggleUntrained: ((value: boolean) => void) | undefined = undefined;

  // Save preference to localStorage when changed internally
  function handleToggleUntrainedInternal(value: boolean) {
    hideUntrainedSkills = value;
    localStorage.setItem(STORAGE_KEY, String(value));
    onToggleUntrained?.(value);
  }

  // Import controller
  import { createActionPhaseController } from '../../../controllers/ActionPhaseController';
  import { createCustomActionHandlers, type CustomActionHandlers } from '../../../controllers/actions/action-handlers-config';
  import { ACTION_CATEGORIES } from './action-categories-config';
  import { createActionCheckInstance, updateCheckInstanceOutcome, type PendingActionsState } from '../../../controllers/actions/CheckInstanceHelpers';

  // Initialize controller and services
  let controller: any = null;
  let gameCommandsService: any = null;
  let checkInstanceService: any = null;
  let aidManager: AidManager | null = null;

  // UI State (not business logic)
  let expandedActions = new Set<string>();
  let showBuildStructureDialog: boolean = false;
  let showRepairStructureDialog: boolean = false;
  let showUpgradeSettlementSelectionDialog: boolean = false;
  let showFactionSelectionDialog: boolean = false;
  let showInfiltrationDialog: boolean = false;
  let showRequestEconomicAidDialog: boolean = false;
  let showRequestMilitaryAidDialog: boolean = false;
  let showAidSelectionDialog: boolean = false;
  let showSettlementSelectionDialog: boolean = false;
  let showExecuteOrPardonSettlementDialog: boolean = false;
  let showTrainArmyDialog: boolean = false;
  let showDisbandArmyDialog: boolean = false;
  let showOutfitArmyDialog: boolean = false;
  let showRecruitArmyDialog: boolean = false;
  let pendingAidAction: { id: string; name: string } | null = null;
  let pendingBuildAction: { skill: string; structureId?: string; settlementId?: string } | null = null;
  let pendingRepairAction: { skill: string; structureId?: string; settlementId?: string } | null = null;
  let pendingUpgradeAction: { skill: string; settlementId?: string } | null = null;
  let pendingDiplomaticAction: { skill: string; factionId?: string; factionName?: string } | null = null;
  let pendingInfiltrationAction: { skill: string; factionId?: string; factionName?: string } | null = null;
  let pendingRequestEconomicAidAction: { skill: string; factionId?: string; factionName?: string } | null = null;
  let pendingRequestMilitaryAidAction: { skill: string; factionId?: string; factionName?: string } | null = null;
  let pendingStipendAction: { skill: string; settlementId?: string } | null = null;
  let pendingExecuteOrPardonAction: { skill: string; settlementId?: string } | null = null;
  let pendingTrainArmyAction: { skill: string; armyId?: string } | null = null;
  let pendingDisbandArmyAction: { skill: string; armyId?: string } | null = null;
  let pendingOutfitArmyAction: { skill: string; armyId?: string } | null = null;
  let pendingRecruitArmyAction: { skill: string; armyId?: string } | null = null;
  let pendingDeployArmyAction: { skill: string; armyId?: string } | null = null;

  // Track action ID to current instance ID mapping for this player
  // Map<actionId, instanceId> - one active instance per action per player
  let currentActionInstances = new Map<string, string>();
  
  // Count of players who have acted (from actionLog)
  $: actionsUsed = ($kingdomData.turnState?.actionLog || []).filter((entry: any) => 
    entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS
  ).length;
  
  // Force UI update when active aids change
  $: activeAidsCount = $kingdomData?.turnState?.actionsPhase?.activeAids?.length || 0;
  
  // Create a reactive key that changes when army data OR party level changes
  // This forces action requirement checks to re-run when armies or party level are modified
  $: armyDataKey = $kingdomData ? 
    `${$kingdomData.partyLevel || 1}|${$kingdomData.armies?.map(a => `${a.id}:${a.level}`).join(',') || ''}` : '';
  
  // Create a reactive key that changes when resources change
  // This forces action requirement checks to re-run when gold, lumber, ore, etc. change
  $: resourcesKey = $kingdomData?.resources ? 
    `${$kingdomData.resources.gold || 0}|${$kingdomData.resources.lumber || 0}|${$kingdomData.resources.ore || 0}|${$kingdomData.resources.food || 0}` : '';
  
  // Removed: completionsByAction - now using actionLog directly in CompletionNotifications
  
  // Track current user ID
  let currentUserId: string | null = null;

  // Custom Action Registry - initialized after state setters are available
  let CUSTOM_ACTION_HANDLERS: CustomActionHandlers;
  
  // Initialize custom action handlers with component state setters
  $: CUSTOM_ACTION_HANDLERS = createCustomActionHandlers({
    setShowBuildStructureDialog: (show) => { showBuildStructureDialog = show; },
    setShowRepairStructureDialog: (show) => { showRepairStructureDialog = show; },
    setShowUpgradeSettlementDialog: (show) => { showUpgradeSettlementSelectionDialog = show; },
    setShowFactionSelectionDialog: (show) => { showFactionSelectionDialog = show; },
    setShowInfiltrationDialog: (show) => { showInfiltrationDialog = show; },
    setShowRequestEconomicAidDialog: (show) => { showRequestEconomicAidDialog = show; },
    setShowRequestMilitaryAidDialog: (show) => { showRequestMilitaryAidDialog = show; },
    setShowSettlementSelectionDialog: (show) => { showSettlementSelectionDialog = show; },
    setShowExecuteOrPardonSettlementDialog: (show) => { showExecuteOrPardonSettlementDialog = show; },
    setShowTrainArmyDialog: (show) => { showTrainArmyDialog = show; },
    setShowDisbandArmyDialog: (show) => { showDisbandArmyDialog = show; },
    setShowOutfitArmyDialog: (show) => { showOutfitArmyDialog = show; },
    setShowRecruitArmyDialog: (show) => { showRecruitArmyDialog = show; },
    handleArmyDeployment: handleArmyDeployment,
    setPendingBuildAction: (action) => { pendingBuildAction = action; },
    setPendingRepairAction: (action) => { pendingRepairAction = action; },
    setPendingUpgradeAction: (action) => { pendingUpgradeAction = action; },
    setPendingDiplomaticAction: (action) => { pendingDiplomaticAction = action; },
    setPendingInfiltrationAction: (action) => { pendingInfiltrationAction = action; },
    setPendingRequestEconomicAidAction: (action) => { pendingRequestEconomicAidAction = action; },
    setPendingRequestMilitaryAidAction: (action) => { pendingRequestMilitaryAidAction = action; },
    setPendingStipendAction: (action) => { pendingStipendAction = action; },
    setPendingExecuteOrPardonAction: (action) => { pendingExecuteOrPardonAction = action; },
    setPendingTrainArmyAction: (action) => { pendingTrainArmyAction = action; },
    setPendingDisbandArmyAction: (action) => { pendingDisbandArmyAction = action; },
    setPendingOutfitArmyAction: (action) => { pendingOutfitArmyAction = action; },
    setPendingRecruitArmyAction: (action) => { pendingRecruitArmyAction = action; },
    setPendingDeployArmyAction: (action) => { pendingDeployArmyAction = action; }
  });

  // UI helper - toggle action expansion
  function toggleAction(actionId: string) {
    if (expandedActions.has(actionId)) {
      expandedActions.clear();
    } else {
      expandedActions.clear();
      expandedActions.add(actionId);
    }
    expandedActions = new Set(expandedActions);
  }

  // Use controller to handle action resolution properly
  async function onActionResolved(
    actionId: string,
    outcome: string,
    actorName: string,
    checkType?: string,
    skillName?: string,
    proficiencyRank?: number,
    rollBreakdown?: any
  ) {
    // Only handle action type checks
    if (checkType && checkType !== "action") {
      return;
    }

    // Check if already resolved by current player
    const existingInstanceId = currentActionInstances.get(actionId);
    if (existingInstanceId) {
      return;
    }

    // Find the action
    const action = actionLoader.getAllActions().find(
      (a) => a.id === actionId
    );
    if (!action) {
      return;
    }
    
    // Make sure the action is expanded FIRST
    if (!expandedActions.has(actionId)) {
      expandedActions.clear();
      expandedActions.add(actionId);
      expandedActions = new Set(expandedActions);
    }
    
    // Create check instance using helper (handles all placeholder replacement, metadata, etc.)
    const pendingActions: PendingActionsState = {
      pendingBuildAction,
      pendingRepairAction,
      pendingUpgradeAction,
      pendingDiplomaticAction,
      pendingInfiltrationAction: pendingInfiltrationAction as any
    };
    
    console.log('🎯 [ActionsPhase] About to create check instance for:', actionId);
    try {
      const instanceId = await createActionCheckInstance({
        actionId,
        action,
        outcome,
        actorName,
        skillName,
        rollBreakdown,
        currentTurn: $currentTurn,
        pendingActions,
        controller
      });
      console.log('✅ [ActionsPhase] Created instance with ID:', instanceId);
    
      // Track instanceId for this action
      currentActionInstances.set(actionId, instanceId);
      currentActionInstances = currentActionInstances;  // Trigger reactivity

      // Force Svelte to update
      await tick();
    } catch (error) {
      console.error('❌ [ActionsPhase] Failed to create check instance:', error);
      ui.notifications?.error(`Failed to create action result: ${error}`);
    }
  }

  // Removed: Old resetAction call - instances are now managed via CheckInstanceService

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
    
    const instance = $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId);
    console.log('🎬 [ActionsPhase] Found instance:', instance);
    if (!instance?.appliedOutcome) {
      console.error('❌ [applyActionEffects] Instance has no outcome:', instanceId);
      logger.error('❌ [applyActionEffects] Instance has no outcome:', instanceId);
      return;
    }
    console.log('🎬 [ActionsPhase] Instance has outcome:', instance.appliedOutcome.outcome);

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
        ui.notifications?.error(`Failed to apply action effects: ${error}`);
        return;
      }
    }

    // Prepare resolution data with custom component data if needed
    const finalResolutionData = { ...resolutionData };
    
    // Add custom data for actions that need it
    if (actionId === 'build-structure' && pendingBuildAction) {
      finalResolutionData.customComponentData = {
        structureId: pendingBuildAction.structureId,
        settlementId: pendingBuildAction.settlementId
      };
    } else if (actionId === 'upgrade-settlement' && pendingUpgradeAction) {
      finalResolutionData.customComponentData = {
        settlementId: pendingUpgradeAction.settlementId
      };
    }
    
    // Apply action via controller - handles both standard and custom resolutions
    console.log('🎬 [ActionsPhase] About to call controller.resolveAction with:', {
      actionId,
      instanceId,
      outcome: instance.appliedOutcome.outcome,
      actorName: instance.appliedOutcome.actorName
    });
    const result = await controller.resolveAction(
      actionId,
      instance.appliedOutcome.outcome,
      finalResolutionData,
      instance.appliedOutcome.actorName,
      instance.appliedOutcome.skillName || '',
      currentUserId || undefined,
      instanceId  // Pass instanceId to look up metadata
    );
    console.log('🎬 [ActionsPhase] controller.resolveAction returned:', result);

    if (!result.success) {
      // Show error to user about requirements not being met
      ui.notifications?.warn(`${action.name} requirements not met: ${result.error}`);
      return; // Don't track failed actions
    }
    
    // Show success notification with applied effects (if any resources were changed)
    // Skip for actions with custom notifications OR prepare/commit pattern (they handle their own)
    const { hasCustomImplementation } = await import('../../../controllers/actions/implementations');
    const hasCustom = hasCustomImplementation(actionId);
    const suppressNotification = ['disband-army']; // Actions using prepare/commit with animations
    if (!hasCustom && !suppressNotification.includes(actionId) && result.applied?.resources && result.applied.resources.length > 0) {
      const effectsMsg = result.applied.resources
        .map((r: any) => `${r.value > 0 ? '+' : ''}${r.value} ${r.resource}`)
        .join(', ');
      if (effectsMsg) {
        ui.notifications?.info(`${action.name}: ${effectsMsg}`);
      }
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
  

  // Deduplication tracking for roll events
  const processedRolls = new Set<string>();
  const DEDUPLICATION_TIMEOUT = 2000; // 2 seconds
  
  // Listen for roll completion events
  async function handleRollComplete(event: CustomEvent) {
    const { checkId, outcome, actorName, checkType, skillName, proficiencyRank, rollBreakdown } = event.detail;

    if (checkType === "action") {
      // DEDUPLICATION: Create a unique key for this roll
      const rollKey = `${checkId}-${outcome}-${actorName}-${rollBreakdown?.d20Result || 0}-${rollBreakdown?.total || 0}`;
      
      // Check if we've already processed this exact roll
      if (processedRolls.has(rollKey)) {
        console.log('⚠️ [ActionsPhase] Duplicate roll event detected, skipping:', rollKey);
        return;
      }
      
      // Mark as processed
      processedRolls.add(rollKey);
      
      // Clean up after timeout
      setTimeout(() => {
        processedRolls.delete(rollKey);
      }, DEDUPLICATION_TIMEOUT);
      
      console.log('✅ [ActionsPhase] Processing roll event:', rollKey);
      
      await onActionResolved(checkId, outcome, actorName, checkType, skillName, proficiencyRank, rollBreakdown);
      
      // Clear aid modifiers for this specific action after roll completes
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdomData((kingdom: KingdomData) => {
          if (kingdom.turnState?.actionsPhase?.activeAids) {
            const beforeCount = kingdom.turnState.actionsPhase.activeAids.length;
            kingdom.turnState.actionsPhase.activeAids = 
              kingdom.turnState.actionsPhase.activeAids.filter(
                (aid: any) => aid.targetActionId !== checkId
              );
            const afterCount = kingdom.turnState.actionsPhase.activeAids.length;
            
            if (beforeCount > afterCount) {

            }
          }
        });
      }
    }
  }

  // Component lifecycle
  onMount(async () => {
    console.log('🔵 [ActionsPhase] Component mounting...');
    
    // Load preference from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      hideUntrainedSkills = stored === 'true';
      onToggleUntrained?.(hideUntrainedSkills);
    }
    
    // Initialize controller and service
    controller = await createActionPhaseController();
    gameCommandsService = await createGameCommandsService();
    checkInstanceService = await createCheckInstanceService();
    
    // Initialize aid manager
    aidManager = createAidManager({
      checkType: 'action',
      getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
      gameCommandsService
    });
    
    // Initialize the phase (this auto-completes immediately to allow players to skip actions)
    await controller.startPhase();

    // Store current user ID
    const game = (window as any).game;
    currentUserId = game?.user?.id || null;

    console.log('🔵 [ActionsPhase] Adding event listener for kingdomRollComplete');
    window.addEventListener(
      "kingdomRollComplete",
      handleRollComplete as any
    );
    
    // Initialize roll result handler (has built-in guard against multiple registrations)
    initializeRollResultHandler();

    // Wait for store initialization before accessing player data

  });

  onDestroy(() => {
    console.log('🔴 [ActionsPhase] Component unmounting, removing event listener');
    window.removeEventListener(
      "kingdomRollComplete",
      handleRollComplete as any
    );
    
    // Cleanup aid manager
    if (aidManager) {
      aidManager.cleanup();
    }
    
    // Clear deduplication set
    processedRolls.clear();
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
  async function handleExecuteSkill(event: CustomEvent, action: any) {
    // Check custom action registry for pre-dialog requirements
    const customHandler = CUSTOM_ACTION_HANDLERS?.[action.id];
    
    if (customHandler && customHandler.requiresPreDialog === true) {
      // Custom action requires pre-roll dialog (e.g., structure selection)
      const { skill } = event.detail;
      customHandler.storePending(skill);
      customHandler.showDialog();
      return;
    }
    
    // Standard action - proceed with skill execution
    await executeSkillAction(event, action);
  }
  
  // Separated skill execution logic
  async function executeSkillAction(event: CustomEvent, action: any) {
    const { skill, checkId, checkName } = event.detail;
    
    // Note: Action spending is now handled by GameCommandsService.trackPlayerAction()
    // which adds an entry to actionLog when the roll completes
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      // Show character selection dialog
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        return; // User cancelled selection
      }
    }
    
    try {
      // Get DC based on character's level using controller
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      
      // Perform the roll with the selected character
      await performKingdomActionRoll(
        actingCharacter,
        skill,
        dc,
        checkName,
        checkId,
        {
          criticalSuccess: action.criticalSuccess,
          success: action.success,
          failure: action.failure,
          criticalFailure: action.criticalFailure
        }
      );
    } catch (error) {
      logger.error("Error executing skill:", error);
      ui.notifications?.error(`Failed to perform action: ${error}`);
    }
  }

  // Handle debug outcome change
  async function handleDebugOutcomeChange(event: CustomEvent, action: any) {
    const { outcome: newOutcome } = event.detail;

    // Get instance
    const instanceId = currentActionInstances.get(action.id);
    if (!instanceId) return;
    
    const instance = $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId);
    if (!instance) return;
    
    // Update instance using helper (handles placeholder replacement)
    const pendingActions: PendingActionsState = {
      pendingBuildAction,
      pendingRepairAction,
      pendingUpgradeAction,
      pendingDiplomaticAction,
      pendingInfiltrationAction: pendingInfiltrationAction as any
    };
    
    await updateCheckInstanceOutcome({
      instanceId,
      actionId: action.id,
      action,
      newOutcome,
      instance,
      pendingActions,
      controller
    });
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
    
    // Trigger new roll
    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      
      await performKingdomActionRoll(
        actingCharacter,
        skill,
        dc,
        action.name,
        action.id,
        {
          criticalSuccess: action.criticalSuccess,
          success: action.success,
          failure: action.failure,
          criticalFailure: action.criticalFailure
        }
      );
    } catch (error) {
      logger.error("Error during reroll:", error);
      // Restore fame if the roll failed
      const { restoreFameAfterFailedReroll } = await import('../../../controllers/shared/RerollHelpers');
      if (previousFame !== undefined) {
        await restoreFameAfterFailedReroll(previousFame);
      }
      ui.notifications?.error(`Failed to reroll: ${error}`);
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
  
  // Handle when a structure is selected (not built yet - just closes dialog)
  async function handleStructureQueued(event: CustomEvent) {
    const { structureId, settlementId } = event.detail;
    
    // Store structure selection
    if (pendingBuildAction) {
      pendingBuildAction.structureId = structureId;
      pendingBuildAction.settlementId = settlementId;
      
      // Close dialog
      showBuildStructureDialog = false;
      
      // Now trigger the skill roll with the selected structure context
      await executeBuildStructureRoll(pendingBuildAction);
    }
  }
  
  // Execute the build structure skill roll - using ActionExecutionHelpers
  async function executeBuildStructureRoll(buildAction: { skill: string; structureId?: string; settlementId?: string }) {
    await executeActionRoll(
      createExecutionContext('build-structure', buildAction.skill, {
        structureId: buildAction.structureId,
        settlementId: buildAction.settlementId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { pendingBuildAction = null; }
      }
    );
  }
  
  // Handle when a repair structure is selected
  async function handleRepairStructureSelected(event: CustomEvent) {
    const { structureId, settlementId } = event.detail;
    
    // Store structure selection
    if (pendingRepairAction) {
      pendingRepairAction.structureId = structureId;
      pendingRepairAction.settlementId = settlementId;
      
      // Close dialog
      showRepairStructureDialog = false;
      
      // Now trigger the skill roll with the selected structure context
      await executeRepairStructureRoll(pendingRepairAction);
    }
  }
  
  // Handle when a settlement is selected for upgrade
  async function handleUpgradeSettlementSelected(event: CustomEvent) {
    const { settlementId } = event.detail;
    
    // Store settlement selection
    if (pendingUpgradeAction) {
      pendingUpgradeAction.settlementId = settlementId;
      
      // Get settlement name for metadata
      const actor = getKingdomActor();
      if (actor) {
        const kingdom = actor.getKingdomData();
        const settlement = kingdom?.settlements.find((s: any) => s.id === settlementId);
        if (settlement) {
          (pendingUpgradeAction as any).settlementName = settlement.name;
        }
      }
      
      // Close dialog
      showUpgradeSettlementSelectionDialog = false;
      
      // Now trigger the skill roll with the selected settlement context
      await executeUpgradeSettlementRoll(pendingUpgradeAction);
    }
  }
  
  // Handle when a faction is selected for diplomatic relations
  async function handleFactionSelected(event: CustomEvent) {
    const { factionId, factionName } = event.detail;
    console.log('🎯 [ActionsPhase] handleFactionSelected received:', { factionId, factionName });
    
    if (pendingDiplomaticAction) {
      pendingDiplomaticAction.factionId = factionId;
      pendingDiplomaticAction.factionName = factionName;
      console.log('🎯 [ActionsPhase] Updated pendingDiplomaticAction:', pendingDiplomaticAction);
      
      // Close dialog
      showFactionSelectionDialog = false;
      
      // Now trigger the skill roll with the selected faction context
      await executeEstablishDiplomaticRelationsRoll(pendingDiplomaticAction);
    } else {
      console.warn('⚠️ [ActionsPhase] No pendingDiplomaticAction when faction selected');
    }
  }
  
  // Handle when a faction is selected for infiltration
  async function handleInfiltrationFactionSelected(event: CustomEvent) {
    const { factionId, factionName } = event.detail;
    console.log('🕵️ [ActionsPhase] handleInfiltrationFactionSelected received:', { factionId, factionName });
    
    if (pendingInfiltrationAction) {
      pendingInfiltrationAction.factionId = factionId;
      pendingInfiltrationAction.factionName = factionName;
      console.log('🕵️ [ActionsPhase] Updated pendingInfiltrationAction:', pendingInfiltrationAction);
      
      // Close dialog
      showInfiltrationDialog = false;
      
      // Store in global state for OutcomeDisplay to access
      (globalThis as any).__pendingInfiltrationFactionName = factionName;
      
      // Now trigger the skill roll with the selected faction context
      await executeInfiltrationRoll(pendingInfiltrationAction);
    } else {
      console.warn('⚠️ [ActionsPhase] No pendingInfiltrationAction when faction selected');
    }
  }
  
  // Handle infiltration dialog cancel
  function handleInfiltrationCancel() {
    pendingInfiltrationAction = null;
    delete (globalThis as any).__pendingInfiltrationFactionName;
  }
  
  // Handle when a faction is selected for economic aid request
  async function handleEconomicAidFactionSelected(event: CustomEvent) {
    const { factionId, factionName } = event.detail;
    
    if (pendingRequestEconomicAidAction) {
      pendingRequestEconomicAidAction.factionId = factionId;
      pendingRequestEconomicAidAction.factionName = factionName;
      
      // Close dialog
      showRequestEconomicAidDialog = false;
      
      // Store in global state for action-resolver
      (globalThis as any).__pendingEconomicAidFaction = factionId;
      (globalThis as any).__pendingEconomicAidFactionName = factionName;
      
      // Now trigger the skill roll with the selected faction context
      await executeRequestEconomicAidRoll(pendingRequestEconomicAidAction);
    }
  }
  
  // Handle when a faction is selected for military aid request
  async function handleMilitaryAidFactionSelected(event: CustomEvent) {
    const { factionId, factionName } = event.detail;
    
    if (pendingRequestMilitaryAidAction) {
      pendingRequestMilitaryAidAction.factionId = factionId;
      pendingRequestMilitaryAidAction.factionName = factionName;
      
      // Close dialog
      showRequestMilitaryAidDialog = false;
      
      // Store in global state for action-resolver (uses same global var as economic aid)
      (globalThis as any).__pendingEconomicAidFaction = factionId;
      (globalThis as any).__pendingEconomicAidFactionName = factionName;
      
      // Now trigger the skill roll with the selected faction context
      await executeRequestMilitaryAidRoll(pendingRequestMilitaryAidAction);
    }
  }
  
  // Handle when a settlement is selected for collect stipend
  async function handleSettlementSelected(event: CustomEvent) {
    const { settlementId } = event.detail;
    
    if (pendingStipendAction) {
      pendingStipendAction.settlementId = settlementId;
      showSettlementSelectionDialog = false;
      
      // Store in global state for action-resolver to access
      (globalThis as any).__pendingStipendSettlement = settlementId;
      
      await executeStipendRoll(pendingStipendAction);
    }
  }
  
  // Handle when a settlement is selected for execute or pardon prisoners
  async function handleExecuteOrPardonSettlementSelected(event: CustomEvent) {
    const { settlementId } = event.detail;
    
    if (pendingExecuteOrPardonAction) {
      pendingExecuteOrPardonAction.settlementId = settlementId;
      showExecuteOrPardonSettlementDialog = false;
      
      // Store in global state for action-resolver to access
      (globalThis as any).__pendingExecuteOrPardonSettlement = settlementId;
      
      await executeExecuteOrPardonRoll(pendingExecuteOrPardonAction);
    }
  }
  
  // Execute collect stipend skill roll - using ActionExecutionHelpers
  async function executeStipendRoll(stipendAction: { skill: string; settlementId?: string }) {
    await executeActionRoll(
      createExecutionContext('collect-stipend', stipendAction.skill, {
        settlementId: stipendAction.settlementId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingStipendAction = null;
          delete (globalThis as any).__pendingStipendSettlement;
        }
      }
    );
  }
  
  // Execute execute or pardon prisoners skill roll - using ActionExecutionHelpers
  async function executeExecuteOrPardonRoll(executeOrPardonAction: { skill: string; settlementId?: string }) {
    await executeActionRoll(
      createExecutionContext('execute-or-pardon-prisoners', executeOrPardonAction.skill, {
        settlementId: executeOrPardonAction.settlementId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingExecuteOrPardonAction = null;
          delete (globalThis as any).__pendingExecuteOrPardonSettlement;
        }
      }
    );
  }
  
  // Handle when an army is selected for training
  async function handleArmySelectedForTraining(event: CustomEvent) {
    const { armyId } = event.detail;
    
    if (pendingTrainArmyAction) {
      pendingTrainArmyAction.armyId = armyId;
      showTrainArmyDialog = false;
      
      // Store in global state for action-resolver to access
      (globalThis as any).__pendingTrainArmyArmy = armyId;
      
      await executeTrainArmyRoll(pendingTrainArmyAction);
    }
  }
  
  // Handle when an army is selected for disbanding
  async function handleArmySelectedForDisbanding(event: CustomEvent) {
    const { armyId } = event.detail;
    
    if (pendingDisbandArmyAction) {
      pendingDisbandArmyAction.armyId = armyId;
      showDisbandArmyDialog = false;
      
      // Store in global state for action-resolver to access
      (globalThis as any).__pendingDisbandArmyArmy = armyId;
      
      await executeDisbandArmyRoll(pendingDisbandArmyAction);
    }
  }
  
  // Handle when an army is selected for outfitting
  async function handleArmySelectedForOutfitting(event: CustomEvent) {
    const { armyId } = event.detail;
    
    if (pendingOutfitArmyAction) {
      pendingOutfitArmyAction.armyId = armyId;
      showOutfitArmyDialog = false;
      
      // Store in global state for action-resolver to access
      (globalThis as any).__pendingOutfitArmyArmy = armyId;
      
      await executeOutfitArmyRoll(pendingOutfitArmyAction);
    }
  }
  
  // Handle when an army is recruited (dialog confirms)
  async function handleArmyRecruited(event: CustomEvent) {
    const { name, settlementId, armyType } = event.detail;
    console.log('🎯 [ActionsPhase] handleArmyRecruited called with:', { name, settlementId, armyType });
    
    if (pendingRecruitArmyAction) {
      showRecruitArmyDialog = false;
      
      // Store in global state for action-resolver to access
      (globalThis as any).__pendingRecruitArmy = {
        name,
        settlementId,
        armyType
      };
      console.log('📦 [ActionsPhase] Set globalThis.__pendingRecruitArmy:', (globalThis as any).__pendingRecruitArmy);
      
      await executeRecruitArmyRoll(pendingRecruitArmyAction);
    } else {
      console.warn('⚠️ [ActionsPhase] No pendingRecruitArmyAction when dialog confirmed');
    }
  }
  
  // Handle army deployment (uses ArmyDeploymentPanel service, not a dialog)
  async function handleArmyDeployment(skill: string) {
    try {
      // Import the deployment panel service
      const { armyDeploymentPanel } = await import('../../../services/army/ArmyDeploymentPanel');
      
      // Create callback that triggers the roll
      const onRollTrigger = async (skill: string, armyId: string, path: string[]) => {
        // Store data for action-resolver to access
        (globalThis as any).__pendingDeployArmy = {
          armyId,
          path
        };
        
        // Store in pending action
        if (pendingDeployArmyAction) {
          pendingDeployArmyAction.armyId = armyId;
        }
        
        // Trigger the Foundry roll dialog
        await executeDeployArmyRoll({ skill, armyId });
      };
      
      // Open the deployment panel (shows floating UI on map)
      // Panel will handle: selection -> roll -> result display -> animation -> cleanup
      const result = await armyDeploymentPanel.selectArmyAndPlotPath(skill, onRollTrigger);
      
      if (!result) {
        // User cancelled
        pendingDeployArmyAction = null;
        delete (globalThis as any).__pendingDeployArmy;
        
        // Clear check instance if any
        const instanceId = currentActionInstances.get('deploy-army');
        if (instanceId && checkInstanceService) {
          await checkInstanceService.clearInstance(instanceId);
          currentActionInstances.delete('deploy-army');
          currentActionInstances = currentActionInstances;
        }
        return;
      }
      
      // At this point, everything is complete (roll, animation, etc.)
      // Clear check instance to reset Deploy Army action card to default state
      const instanceId = currentActionInstances.get('deploy-army');
      if (instanceId && checkInstanceService) {
        await checkInstanceService.clearInstance(instanceId);
        currentActionInstances.delete('deploy-army');
        currentActionInstances = currentActionInstances;
      }
      
      // Clean up pending state
      pendingDeployArmyAction = null;
      delete (globalThis as any).__pendingDeployArmy;
      
      // Force UI update
      await tick();
      
    } catch (error) {
      logger.error('[handleArmyDeployment] Error:', error);
      ui.notifications?.error(`Failed to deploy army: ${error}`);
      pendingDeployArmyAction = null;
      delete (globalThis as any).__pendingDeployArmy;
    }
  }
  
  // Execute deploy army skill roll - using ActionExecutionHelpers
  async function executeDeployArmyRoll(deployArmyAction: { skill: string; armyId?: string }) {
    await executeActionRoll(
      createExecutionContext('deploy-army', deployArmyAction.skill, {
        armyId: deployArmyAction.armyId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingDeployArmyAction = null;
          delete (globalThis as any).__pendingDeployArmy;
        }
      }
    );
  }
  
  // Execute train army skill roll - using ActionExecutionHelpers
  async function executeTrainArmyRoll(trainArmyAction: { skill: string; armyId?: string }) {
    await executeActionRoll(
      createExecutionContext('train-army', trainArmyAction.skill, {
        armyId: trainArmyAction.armyId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingTrainArmyAction = null;
          delete (globalThis as any).__pendingTrainArmyArmy;
        }
      }
    );
  }
  
  // Execute disband army skill roll - using ActionExecutionHelpers
  async function executeDisbandArmyRoll(disbandArmyAction: { skill: string; armyId?: string }) {
    await executeActionRoll(
      createExecutionContext('disband-army', disbandArmyAction.skill, {
        armyId: disbandArmyAction.armyId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingDisbandArmyAction = null;
          delete (globalThis as any).__pendingDisbandArmyArmy;
        }
      }
    );
  }
  
  // Execute outfit army skill roll - using ActionExecutionHelpers
  async function executeOutfitArmyRoll(outfitArmyAction: { skill: string; armyId?: string }) {
    await executeActionRoll(
      createExecutionContext('outfit-army', outfitArmyAction.skill, {
        armyId: outfitArmyAction.armyId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingOutfitArmyAction = null;
          delete (globalThis as any).__pendingOutfitArmyArmy;
        }
      }
    );
  }
  
  // Execute recruit army skill roll - using ActionExecutionHelpers
  async function executeRecruitArmyRoll(recruitArmyAction: { skill: string }) {
    console.log('🎲 [ActionsPhase] executeRecruitArmyRoll starting with skill:', recruitArmyAction.skill);
    await executeActionRoll(
      createExecutionContext('recruit-unit', recruitArmyAction.skill, {}),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          console.log('❌ [ActionsPhase] Recruit army roll cancelled');
          pendingRecruitArmyAction = null;
          delete (globalThis as any).__pendingRecruitArmy;
        }
      }
    );
    console.log('✅ [ActionsPhase] executeRecruitArmyRoll completed');
  }
  
  // Execute the repair structure skill roll - using ActionExecutionHelpers
  async function executeRepairStructureRoll(repairAction: { skill: string; structureId?: string; settlementId?: string }) {
    await executeActionRoll(
      createExecutionContext('repair-structure', repairAction.skill, {
        structureId: repairAction.structureId,
        settlementId: repairAction.settlementId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { pendingRepairAction = null; }
      }
    );
  }
  
  // Execute the upgrade settlement skill roll - using ActionExecutionHelpers
  async function executeUpgradeSettlementRoll(upgradeAction: { skill: string; settlementId?: string }) {
    await executeActionRoll(
      createExecutionContext('upgrade-settlement', upgradeAction.skill, {
        settlementId: upgradeAction.settlementId
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { pendingUpgradeAction = null; }
      }
    );
  }
  
  // Execute the establish diplomatic relations skill roll - using ActionExecutionHelpers
  async function executeEstablishDiplomaticRelationsRoll(diplomaticAction: { skill: string; factionId?: string; factionName?: string }) {
    await executeActionRoll(
      createExecutionContext('dimplomatic-mission', diplomaticAction.skill, {
        factionId: diplomaticAction.factionId,
        factionName: diplomaticAction.factionName
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { pendingDiplomaticAction = null; }
      }
    );
  }
  
  // Execute the infiltration skill roll - using ActionExecutionHelpers
  async function executeInfiltrationRoll(infiltrationAction: { skill: string; factionId?: string; factionName?: string }) {
    await executeActionRoll(
      createExecutionContext('infiltration', infiltrationAction.skill, {
        factionId: infiltrationAction.factionId,
        factionName: infiltrationAction.factionName
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingInfiltrationAction = null;
          delete (globalThis as any).__pendingInfiltrationFactionName;
        }
      }
    );
  }
  
  // Execute the request economic aid skill roll - using ActionExecutionHelpers
  async function executeRequestEconomicAidRoll(aidAction: { skill: string; factionId?: string; factionName?: string }) {
    await executeActionRoll(
      createExecutionContext('request-economic-aid', aidAction.skill, {
        factionId: aidAction.factionId,
        factionName: aidAction.factionName
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingRequestEconomicAidAction = null;
          delete (globalThis as any).__pendingEconomicAidFaction;
          delete (globalThis as any).__pendingEconomicAidFactionName;
        }
      }
    );
  }
  
  // Execute the request military aid skill roll - using ActionExecutionHelpers
  async function executeRequestMilitaryAidRoll(aidAction: { skill: string; factionId?: string; factionName?: string }) {
    await executeActionRoll(
      createExecutionContext('request-military-aid', aidAction.skill, {
        factionId: aidAction.factionId,
        factionName: aidAction.factionName
      }),
      {
        getDC: (characterLevel: number) => controller.getActionDC(characterLevel),
        onRollCancel: () => { 
          pendingRequestMilitaryAidAction = null;
          delete (globalThis as any).__pendingEconomicAidFaction;
          delete (globalThis as any).__pendingEconomicAidFactionName;
        }
      }
    );
  }
  
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

    // Proceed with aid roll (action tracking already checked in handleAid)
    await executeAidRoll(skill, pendingAidAction.id, pendingAidAction.name);
    pendingAidAction = null;
  }
  
  // Handle aid dialog cancellation
  function handleAidCancel() {
    showAidSelectionDialog = false;
    pendingAidAction = null;
  }
  
  // Execute aid roll - delegate to aid manager
  async function executeAidRoll(skill: string, targetActionId: string, targetActionName: string) {
    if (!aidManager) {
      logger.error('[executeAidRoll] Aid manager not initialized');
      return;
    }
    
    await aidManager.executeAidRoll(skill, targetActionId, targetActionName);
  }
  
  // Get aid result for an action - delegate to aid manager
  function getAidResultForAction(actionId: string): { outcome: string; bonus: number } | null {
    if (!aidManager) return null;
    return aidManager.getAidResult(actionId);
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
        activeCheckInstances={$kingdomData.activeCheckInstances || []}
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
        on:debugOutcomeChange={(e) => handleDebugOutcomeChange(e.detail.event, e.detail.action)}
        on:aid={handleAid}
        on:primary={applyActionEffects}
        on:cancel={(e) => handleActionResultCancel(e.detail.actionId)}
      />
    {/each}
  </div>
</div>

<!-- Dialog Manager - handles all dialogs -->
<ActionDialogManager
  bind:showBuildStructureDialog
  bind:showRepairStructureDialog
  bind:showUpgradeSettlementSelectionDialog
  bind:showFactionSelectionDialog
  bind:showInfiltrationDialog
  bind:showRequestEconomicAidDialog
  bind:showRequestMilitaryAidDialog
  bind:showAidSelectionDialog
  bind:showSettlementSelectionDialog
  bind:showExecuteOrPardonSettlementDialog
  bind:showTrainArmyDialog
  bind:showDisbandArmyDialog
  bind:showOutfitArmyDialog
  bind:showRecruitArmyDialog
  {pendingAidAction}
  on:structureQueued={handleStructureQueued}
  on:repairStructureSelected={handleRepairStructureSelected}
  on:upgradeSettlementSelected={handleUpgradeSettlementSelected}
  on:factionSelected={handleFactionSelected}
  on:infiltrationFactionSelected={handleInfiltrationFactionSelected}
  on:economicAidFactionSelected={handleEconomicAidFactionSelected}
  on:militaryAidFactionSelected={handleMilitaryAidFactionSelected}
  on:settlementSelected={handleSettlementSelected}
  on:executeOrPardonSettlementSelected={handleExecuteOrPardonSettlementSelected}
  on:armySelectedForTraining={handleArmySelectedForTraining}
  on:armySelectedForDisbanding={handleArmySelectedForDisbanding}
  on:armySelectedForOutfitting={handleArmySelectedForOutfitting}
  on:armyRecruited={handleArmyRecruited}
  on:aidConfirm={handleAidConfirm}
  on:aidCancel={handleAidCancel}
  on:upgradeCancel={() => { pendingUpgradeAction = null; }}
  on:factionCancel={() => { pendingDiplomaticAction = null; }}
  on:infiltrationCancel={handleInfiltrationCancel}
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
