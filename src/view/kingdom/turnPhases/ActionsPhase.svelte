<script lang="ts">
  import { kingdomData, currentTurn, updateKingdom, getKingdomActor } from "../../../stores/KingdomStore";
  import { TurnPhase, type KingdomData } from "../../../actors/KingdomActor";
  import { createGameCommandsService } from '../../../services/GameCommandsService';
  import { createCheckInstanceService } from '../../../services/CheckInstanceService';
  import { actionLoader } from "../../../controllers/actions/action-loader";
  import BaseCheckCard from "../components/BaseCheckCard.svelte";
  import ActionDialogManager from "./components/ActionDialogManager.svelte";
  import ActionCategorySection from "./components/ActionCategorySection.svelte";
  import { createAidManager, type AidManager } from '../../../controllers/shared/AidSystemHelpers';
  import { executeActionRoll, createExecutionContext } from '../../../controllers/actions/ActionExecutionHelpers';
  import {
    getPlayerCharacters,
    getCurrentUserCharacter,
    initializeRollResultHandler,
    performKingdomActionRoll,
    showCharacterSelectionDialog
  } from "../../../services/pf2e";
  import { onMount, onDestroy, tick } from "svelte";
  import { logger } from '../../../utils/Logger';

  // Props
  export let isViewingCurrentPhase: boolean = true;

  // Import controller
  import { createActionPhaseController } from '../../../controllers/ActionPhaseController';
  import { getCustomResolutionComponent } from '../../../controllers/actions/implementations';

  // Initialize controller and services
  let controller: any = null;
  let gameCommandsService: any = null;
  let checkInstanceService: any = null;
  let aidManager: AidManager | null = null;

  // Custom Action Registry - Declarative pattern for actions requiring pre-roll dialogs
  const CUSTOM_ACTION_HANDLERS = {
    'build-structure': {
      requiresPreDialog: true,
      showDialog: () => { showBuildStructureDialog = true; },
      storePending: (skill: string) => { pendingBuildAction = { skill }; }
    },
    'repair-structure': {
      requiresPreDialog: true,
      showDialog: () => { showRepairStructureDialog = true; },
      storePending: (skill: string) => { pendingRepairAction = { skill }; }
    },
    'upgrade-settlement': {
      requiresPreDialog: true,
      showDialog: () => { showUpgradeSettlementSelectionDialog = true; },
      storePending: (skill: string) => { pendingUpgradeAction = { skill }; }
    },
    'dimplomatic-mission': {
      requiresPreDialog: true,
      showDialog: () => { showFactionSelectionDialog = true; },
      storePending: (skill: string) => { pendingDiplomaticAction = { skill }; }
    },
    'collect-stipend': {
      requiresPreDialog: true,
      showDialog: () => { showSettlementSelectionDialog = true; },
      storePending: (skill: string) => { pendingStipendAction = { skill }; }
    }
  };

  // UI State (not business logic)
  let expandedActions = new Set<string>();
  let showBuildStructureDialog: boolean = false;
  let showRepairStructureDialog: boolean = false;
  let showUpgradeSettlementSelectionDialog: boolean = false;
  let showFactionSelectionDialog: boolean = false;
  let showAidSelectionDialog: boolean = false;
  let showSettlementSelectionDialog: boolean = false;
  let pendingAidAction: { id: string; name: string } | null = null;
  let pendingBuildAction: { skill: string; structureId?: string; settlementId?: string } | null = null;
  let pendingRepairAction: { skill: string; structureId?: string; settlementId?: string } | null = null;
  let pendingUpgradeAction: { skill: string; settlementId?: string } | null = null;
  let pendingDiplomaticAction: { skill: string; factionId?: string; factionName?: string } | null = null;
  let pendingStipendAction: { skill: string; settlementId?: string } | null = null;

  // Track action ID to current instance ID mapping for this player
  // Map<actionId, instanceId> - one active instance per action per player
  let currentActionInstances = new Map<string, string>();
  
  // Count of players who have acted (from actionLog)
  $: actionsUsed = ($kingdomData.turnState?.actionLog || []).filter((entry: any) => 
    entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS
  ).length;
  
  // Check if current player has already acted (for all BaseCheckCards)
  $: hasPlayerActed = ($kingdomData.turnState?.actionLog || []).some((entry: any) => {
    const game = (window as any).game;
    return entry.playerId === game?.user?.id && 
      (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS);
  });
  
  // Force UI update when active aids change
  $: activeAidsCount = $kingdomData?.turnState?.actionsPhase?.activeAids?.length || 0;
  
  // Removed: completionsByAction - now using actionLog directly in CompletionNotifications
  
  // Track current user ID
  let currentUserId: string | null = null;

  // Categories configuration (UI concern, stays here)
  const categoryConfig = [
    {
      id: "uphold-stability",
      name: "Uphold Stability",
      icon: "fa-shield-alt",
      description:
        "Maintain the kingdom's cohesion by resolving crises and quelling unrest.",
    },
    {
      id: "military-operations",
      name: "Military Operations",
      icon: "fa-chess-knight",
      description: "War must be waged with steel and strategy.",
    },
    {
      id: "expand-borders",
      name: "Expand the Borders",
      icon: "fa-map-marked-alt",
      description: "Seize new territory to grow your influence and resources.",
    },
    {
      id: "urban-planning",
      name: "Urban Planning",
      icon: "fa-city",
      description: "Your people need places to live, work, trade, and worship.",
    },
    {
      id: "foreign-affairs",
      name: "Foreign Affairs",
      icon: "fa-handshake",
      description: "No kingdom stands alone.",
    },
    {
      id: "economic-resources",
      name: "Economic Actions",
      icon: "fa-coins",
      description: "Manage trade and personal wealth.",
    },
  ];

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

    // Always mark the action as resolved to show the roll result
    const outcomeType = outcome as
      | "success"
      | "criticalSuccess"
      | "failure"
      | "criticalFailure";
    
    // Get modifiers from the action for preview
    const modifiers = controller.getActionModifiers(action, outcomeType);
    
    // Make sure the action is expanded FIRST
    if (!expandedActions.has(actionId)) {
      expandedActions.clear();
      expandedActions.add(actionId);
      expandedActions = new Set(expandedActions);
    }
    
    // Create check instance for this action
    if (!checkInstanceService) {
      checkInstanceService = await createCheckInstanceService();
    }
    
    // Get base outcome description (handle both nested and top-level)
    const outcomeData = (action as any).effects?.[outcomeType] || action[outcomeType];
    let effectMessage = outcomeData?.description || 'Action completed';
    
    // Special handling for build-structure to replace {structure} placeholder
    if (action.id === 'build-structure' && effectMessage.includes('{structure}')) {
      if (pendingBuildAction?.structureId) {
        const { structuresService } = await import('../../../services/structures');
        const structure = structuresService.getStructure(pendingBuildAction.structureId);
        
        if (structure) {
          effectMessage = effectMessage.replace(/{structure}/g, structure.name);
        } else {
          // Structure not found - use generic replacement
          effectMessage = effectMessage.replace(/{structure}/g, 'structure');
        }
      } else {
        // No structure ID yet - use generic replacement
        effectMessage = effectMessage.replace(/{structure}/g, 'structure');
      }
    }
    
    // Special handling for repair-structure to replace {structure} placeholder
    if (action.id === 'repair-structure' && effectMessage.includes('{structure}')) {
      if (pendingRepairAction?.structureId) {
        const { structuresService } = await import('../../../services/structures');
        const structure = structuresService.getStructure(pendingRepairAction.structureId);
        
        if (structure) {
          effectMessage = effectMessage.replace(/{structure}/g, structure.name);
        } else {
          // Structure not found - use generic replacement
          effectMessage = effectMessage.replace(/{structure}/g, 'structure');
        }
      } else {
        // No structure ID yet - use generic replacement
        effectMessage = effectMessage.replace(/{structure}/g, 'structure');
      }
    }
    
    // Special handling for upgrade-settlement to replace {Settlement} placeholder
    if (action.id === 'upgrade-settlement') {


      if (effectMessage.includes('{Settlement}')) {
        if (pendingUpgradeAction?.settlementId) {
          const actor = getKingdomActor();
          if (actor) {
            const kingdom = actor.getKingdomData();
            const settlement = kingdom?.settlements.find((s: any) => s.id === pendingUpgradeAction!.settlementId);

            if (settlement) {
              effectMessage = effectMessage.replace(/{Settlement}/g, settlement.name);

            } else {
              logger.warn('   ⚠️ Settlement not found, using generic');
              effectMessage = effectMessage.replace(/{Settlement}/g, 'settlement');
            }
          } else {
            logger.warn('   ⚠️ No actor, using generic');
            effectMessage = effectMessage.replace(/{Settlement}/g, 'settlement');
          }
        } else {
          logger.warn('   ⚠️ No settlementId in pendingUpgradeAction, using generic');
          effectMessage = effectMessage.replace(/{Settlement}/g, 'settlement');
        }
      }
    }
    
    // Store action metadata if needed
    let metadata = undefined;
    if (actionId === 'repair-structure' && pendingRepairAction) {
      metadata = { 
        structureId: pendingRepairAction.structureId,
        settlementId: pendingRepairAction.settlementId
      };
    } else if (actionId === 'upgrade-settlement' && pendingUpgradeAction) {
      metadata = {
        settlementId: pendingUpgradeAction.settlementId
      };
    }
    
    const instanceId = await checkInstanceService.createInstance(
      'action',
      actionId,
      action,
      $currentTurn,
      metadata
    );
    
    // Build preliminary resolution data with dynamic modifiers
    let preliminaryModifiers = modifiers.map((m: any) => ({ resource: m.resource, value: m.value }));
    
    // Special handling for upgrade-settlement: inject cost modifier
    if (actionId === 'upgrade-settlement' && pendingUpgradeAction?.settlementId) {
      const actor = getKingdomActor();
      if (actor && pendingUpgradeAction) {
        const kingdom = actor.getKingdomData();
        const settlement = kingdom?.settlements.find((s: any) => s.id === pendingUpgradeAction!.settlementId);
        
        if (settlement) {
          const newLevel = settlement.level + 1;
          const fullCost = newLevel;
          const isCriticalSuccess = outcomeType === 'criticalSuccess';
          
          // Calculate cost based on outcome
          let actualCost = fullCost;
          if (outcomeType === 'success') {
            actualCost = fullCost;
          } else if (outcomeType === 'criticalSuccess') {
            actualCost = Math.ceil(fullCost / 2);
          } else if (outcomeType === 'failure') {
            actualCost = Math.ceil(fullCost / 2);
          } else if (outcomeType === 'criticalFailure') {
            actualCost = fullCost;
          }
          
          // Add cost modifier
          preliminaryModifiers.push({
            resource: 'gold',
            value: -actualCost
          });

        }
      }
    }
    
    const preliminaryResolutionData = {
      numericModifiers: preliminaryModifiers,
      manualEffects: [],
      complexActions: []
    };
    
    await checkInstanceService.storeOutcome(
      instanceId,
      outcomeType,
      preliminaryResolutionData,
      actorName,
      skillName || '',
      effectMessage,
      rollBreakdown  // Pass rollBreakdown from the roll result
    );
    
    // Track instanceId for this action
    currentActionInstances.set(actionId, instanceId);
    currentActionInstances = currentActionInstances;  // Trigger reactivity

    // Force Svelte to update
    await tick();
  }

  // Removed: Old resetAction call - instances are now managed via CheckInstanceService

  // Apply the actual state changes when user confirms the resolution
  // NEW ARCHITECTURE: Receives ResolutionData from OutcomeDisplay via primary event
  async function applyActionEffects(event: CustomEvent) {
    const { checkId: actionId, resolution: resolutionData } = event.detail;


    const action = actionLoader.getAllActions().find(
      (a) => a.id === actionId
    );
    if (!action) {
      logger.error('❌ [applyActionEffects] Action not found:', actionId);
      return;
    }

    // Get instance from storage
    const instanceId = currentActionInstances.get(actionId);
    if (!instanceId) {
      logger.error('❌ [applyActionEffects] No instance found for action:', actionId);
      return;
    }
    
    const instance = $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId);
    if (!instance?.appliedOutcome) {
      logger.error('❌ [applyActionEffects] Instance has no outcome:', instanceId);
      return;
    }

    // Update instance with final resolution data and mark as applied
    if (checkInstanceService) {
      await checkInstanceService.storeOutcome(
        instanceId,
        instance.appliedOutcome.outcome,
        resolutionData,
        instance.appliedOutcome.actorName,
        instance.appliedOutcome.skillName || '',
        instance.appliedOutcome.effect
      );
      await checkInstanceService.markApplied(instanceId);

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
    const result = await controller.resolveAction(
      actionId,
      instance.appliedOutcome.outcome,
      finalResolutionData,
      instance.appliedOutcome.actorName,
      instance.appliedOutcome.skillName || '',
      currentUserId || undefined
    );

    if (!result.success) {
      // Show error to user about requirements not being met
      ui.notifications?.warn(`${action.name} requirements not met: ${result.error}`);
      return; // Don't track failed actions
    }
    
    // Show success notification with applied effects (if any resources were changed)
    // Skip for actions with custom notifications (they handle their own)
    const { hasCustomImplementation } = await import('../../../controllers/actions/implementations');
    const hasCustom = hasCustomImplementation(actionId);
    if (!hasCustom && result.applied?.resources && result.applied.resources.length > 0) {
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
  

  // Listen for roll completion events
  async function handleRollComplete(event: CustomEvent) {
    const { checkId, outcome, actorName, checkType, skillName, proficiencyRank, rollBreakdown } = event.detail;

    if (checkType === "action") {
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
    // Initialize controller and service
    controller = await createActionPhaseController();
    gameCommandsService = await createGameCommandsService();
    
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

    window.addEventListener(
      "kingdomRollComplete",
      handleRollComplete as any
    );
    initializeRollResultHandler();

    // Wait for store initialization before accessing player data

  });

  onDestroy(() => {
    window.removeEventListener(
      "kingdomRollComplete",
      handleRollComplete as any
    );
    
    // Cleanup aid manager
    if (aidManager) {
      aidManager.cleanup();
    }
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

  
  // Check if current player has a pending resolution for this action
  function isActionResolvedByCurrentPlayer(actionId: string): boolean {
    const instanceId = currentActionInstances.get(actionId);
    if (!instanceId) return false;
    const instance = $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId);
    return instance && instance.status !== 'pending';
  }

  function getCurrentPlayerResolution(actionId: string) {
    const instanceId = currentActionInstances.get(actionId);
    if (!instanceId) return null;
    const instance = $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId);
    if (!instance?.appliedOutcome) return null;
    
    // Convert instance appliedOutcome to resolution format for UI
    return {
      outcome: instance.appliedOutcome.outcome,
      actorName: instance.appliedOutcome.actorName,
      skillName: instance.appliedOutcome.skillName,
      modifiers: instance.appliedOutcome.modifiers,
      effect: instance.appliedOutcome.effect
    };
  }
  
  // Removed: getActionCompletions - completions now handled by CompletionNotifications component

  // Handle skill execution from CheckCard (decoupled from component)
  async function handleExecuteSkill(event: CustomEvent, action: any) {
    // Check custom action registry for pre-dialog requirements
    const customHandler = CUSTOM_ACTION_HANDLERS[action.id as keyof typeof CUSTOM_ACTION_HANDLERS];
    
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
    
    // Get modifiers for the new outcome
    const modifiers = controller.getActionModifiers(action, newOutcome);
    
    // Regenerate custom effect if needed (for actions with dynamic messages)
    let customEffect: string | undefined = undefined;
    if (action.id === 'build-structure' && pendingBuildAction?.structureId) {
      const { structuresService } = await import('../../../services/structures');
      const structure = structuresService.getStructure(pendingBuildAction.structureId);
      
      if (structure) {
        const outcomeData = action[newOutcome];
        if (outcomeData?.description) {
          customEffect = outcomeData.description.replace(/{structure}/g, structure.name);
        }
      }
    }
    
    // Update instance with new outcome
    const resolutionData = {
      numericModifiers: modifiers.map((m: any) => ({ resource: m.resource, value: m.value })),
      manualEffects: [],
      complexActions: []
    };
    
    await checkInstanceService.storeOutcome(
      instanceId,
      newOutcome,
      resolutionData,
      instance.appliedOutcome?.actorName || 'Unknown',
      instance.appliedOutcome?.skillName || '',
      customEffect || (action[newOutcome] as any)?.description || 'Action completed',
      instance.appliedOutcome?.rollBreakdown  // Preserve existing rollBreakdown
    );

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
    
    // Store faction selection
    if (pendingDiplomaticAction) {
      pendingDiplomaticAction.factionId = factionId;
      pendingDiplomaticAction.factionName = factionName;
      
      // Close dialog
      showFactionSelectionDialog = false;
      
      // Now trigger the skill roll with the selected faction context
      await executeEstablishDiplomaticRelationsRoll(pendingDiplomaticAction);
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
    {#each categoryConfig as category}
      {@const actions = getActionsByCategory(category.id)}
      <ActionCategorySection
        {category}
        {actions}
        {currentActionInstances}
        activeCheckInstances={$kingdomData.activeCheckInstances || []}
        {expandedActions}
        {controller}
        {activeAidsCount}
        {isViewingCurrentPhase}
        {actionsUsed}
        currentFame={$kingdomData?.fame || 0}
        {getAidResultForAction}
        {isActionAvailable}
        {getMissingRequirements}
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

<!-- Dialog Manager - handles all 6 dialogs -->
<ActionDialogManager
  bind:showBuildStructureDialog
  bind:showRepairStructureDialog
  bind:showUpgradeSettlementSelectionDialog
  bind:showFactionSelectionDialog
  bind:showAidSelectionDialog
  bind:showSettlementSelectionDialog
  {pendingAidAction}
  on:structureQueued={handleStructureQueued}
  on:repairStructureSelected={handleRepairStructureSelected}
  on:upgradeSettlementSelected={handleUpgradeSettlementSelected}
  on:factionSelected={handleFactionSelected}
  on:settlementSelected={handleSettlementSelected}
  on:aidConfirm={handleAidConfirm}
  on:aidCancel={handleAidCancel}
  on:upgradeCancel={() => { pendingUpgradeAction = null; }}
  on:factionCancel={() => { pendingDiplomaticAction = null; }}
/>

<style lang="scss">
  .actions-phase {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }

  .actions-header-fixed {
    flex-shrink: 0; // Don't shrink - stays at top while content scrolls
    z-index: 10;
    background: var(--color-gray-900);
    border-bottom: 1px solid var(--border-medium);
  }

  .actions-header {
    background: linear-gradient(
      135deg,
      rgba(31, 31, 35, 0.6),
      rgba(15, 15, 17, 0.4)
    );
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: 1px solid var(--border-medium);
    padding-top: .5rem;
    padding-bottom: .5rem;
    padding-left: 1rem;
    padding-right: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 15px;
  }

  .actions-content {
    flex: 1;
    overflow-y: auto; // Make this section scrollable
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 20px;
    padding-right: 5px; // Add some padding for scrollbar
  }

  .actions-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    line-height: 1.3;
    color: var(--text-primary);

    i {
      color: var(--color-amber);
    }
  }

  /* Category styles moved to ActionCategorySection component */

  .phase-completion {
    background: linear-gradient(135deg,
      rgba(31, 31, 35, 0.6),
      rgba(15, 15, 17, 0.4));
    border-radius: var(--radius-md);
    border: 1px solid var(--border-medium);
    padding: 20px;
    margin-top: 20px;
    text-align: center;
  }

  .completion-header h3 {
    margin: 0 0 10px 0;
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }

  .completion-header p {
    margin: 0 0 20px 0;
    color: var(--text-secondary);
    font-size: var(--font-md);
  }

  .complete-phase-btn {
    background: var(--color-green);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;

    &:hover {
      background: var(--color-green-dark);
      transform: translateY(-1px);
    }

    i {
      font-size: 16px;
    }
  }
</style>
