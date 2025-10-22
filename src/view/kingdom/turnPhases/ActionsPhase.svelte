<script lang="ts">
  import { kingdomData, currentTurn, updateKingdom, getKingdomActor } from "../../../stores/KingdomStore";
  import { TurnPhase } from "../../../actors/KingdomActor";
  import { createGameCommandsService } from '../../../services/GameCommandsService';
  import { createCheckInstanceService } from '../../../services/CheckInstanceService';
  import { actionLoader } from "../../../controllers/actions/action-loader";
  import BaseCheckCard from "../components/BaseCheckCard.svelte";
  import AidSelectionDialog from "../../kingdom/components/AidSelectionDialog.svelte";
  import BuildStructureDialog from "../../kingdom/components/BuildStructureDialog/BuildStructureDialog.svelte";
  import RepairStructureDialog from "../../../actions/repair-structure/RepairStructureDialog.svelte";
  import UpgradeSettlementSelectionDialog from "../../../actions/upgrade-settlement/UpgradeSettlementSelectionDialog.svelte";
  import FactionSelectionDialog from "../../../actions/establish-diplomatic-relations/FactionSelectionDialog.svelte";
  import OtherPlayersActions from "../../kingdom/components/OtherPlayersActions.svelte";
  import {
    getPlayerCharacters,
    getCurrentUserCharacter,
    initializeRollResultHandler,
    performKingdomActionRoll,
    showCharacterSelectionDialog
  } from "../../../services/pf2e";
  import { onMount, onDestroy, tick } from "svelte";

  // Props
  export let isViewingCurrentPhase: boolean = true;

  // Import controller
  import { createActionPhaseController } from '../../../controllers/ActionPhaseController';
  import { getCustomResolutionComponent } from '../../../controllers/actions/implementations';

  // Initialize controller and services
  let controller: any = null;
  let gameCommandsService: any = null;
  let checkInstanceService: any = null;

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
    }
  };

  // UI State (not business logic)
  let expandedActions = new Set<string>();
  let showBuildStructureDialog: boolean = false;
  let showRepairStructureDialog: boolean = false;
  let showUpgradeSettlementSelectionDialog: boolean = false;
  let showFactionSelectionDialog: boolean = false;
  let showAidSelectionDialog: boolean = false;
  let pendingAidAction: { id: string; name: string } | null = null;
  let pendingBuildAction: { skill: string; structureId?: string; settlementId?: string } | null = null;
  let pendingRepairAction: { skill: string; structureId?: string; settlementId?: string } | null = null;
  let pendingUpgradeAction: { skill: string; settlementId?: string } | null = null;
  let pendingDiplomaticAction: { skill: string; factionId?: string; factionName?: string } | null = null;

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
      id: "economic-actions",
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
    proficiencyRank?: number
  ) {
    // Only handle action type checks
    if (checkType && checkType !== "action") {
      return;
    }

    // Check if already resolved by current player
    const existingInstanceId = currentActionInstances.get(actionId);
    if (existingInstanceId) {
      console.log('⏭️ [ActionsPhase] Action already has instance, skipping:', actionId);
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
      console.log('🏰 [ActionsPhase] Upgrade settlement - checking for placeholder replacement');
      console.log('   effectMessage:', effectMessage);
      console.log('   pendingUpgradeAction:', pendingUpgradeAction);
      console.log('   contains {Settlement}?', effectMessage.includes('{Settlement}'));
      
      if (effectMessage.includes('{Settlement}')) {
        if (pendingUpgradeAction?.settlementId) {
          const actor = getKingdomActor();
          if (actor) {
            const kingdom = actor.getKingdomData();
            const settlement = kingdom?.settlements.find(s => s.id === pendingUpgradeAction!.settlementId);
            
            console.log('   Found settlement:', settlement?.name);
            
            if (settlement) {
              effectMessage = effectMessage.replace(/{Settlement}/g, settlement.name);
              console.log('   Replaced! New message:', effectMessage);
            } else {
              console.warn('   ⚠️ Settlement not found, using generic');
              effectMessage = effectMessage.replace(/{Settlement}/g, 'settlement');
            }
          } else {
            console.warn('   ⚠️ No actor, using generic');
            effectMessage = effectMessage.replace(/{Settlement}/g, 'settlement');
          }
        } else {
          console.warn('   ⚠️ No settlementId in pendingUpgradeAction, using generic');
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
        const settlement = kingdom?.settlements.find(s => s.id === pendingUpgradeAction!.settlementId);
        
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
          
          console.log(`💰 [ActionsPhase] Added upgrade cost modifier: -${actualCost} gold (${outcomeType})`);
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
      effectMessage
    );
    
    // Track instanceId for this action
    currentActionInstances.set(actionId, instanceId);
    currentActionInstances = currentActionInstances;  // Trigger reactivity
    console.log(`✅ [ActionsPhase] Created instance ${instanceId} for action ${actionId}`);

    // Force Svelte to update
    await tick();
  }

  // Removed: Old resetAction call - instances are now managed via CheckInstanceService

  // Apply the actual state changes when user confirms the resolution
  // NEW ARCHITECTURE: Receives ResolutionData from OutcomeDisplay via primary event
  async function applyActionEffects(event: CustomEvent) {
    const { checkId: actionId, resolution: resolutionData } = event.detail;
    
    console.log('🔵 [applyActionEffects] Called for action:', actionId);
    console.log('📋 [applyActionEffects] ResolutionData:', resolutionData);
    
    const action = actionLoader.getAllActions().find(
      (a) => a.id === actionId
    );
    if (!action) {
      console.error('❌ [applyActionEffects] Action not found:', actionId);
      return;
    }

    // Get instance from storage
    const instanceId = currentActionInstances.get(actionId);
    if (!instanceId) {
      console.error('❌ [applyActionEffects] No instance found for action:', actionId);
      return;
    }
    
    const instance = $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId);
    if (!instance?.appliedOutcome) {
      console.error('❌ [applyActionEffects] Instance has no outcome:', instanceId);
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
      console.log(`✅ [ActionsPhase] Stored outcome and marked applied for instance: ${instanceId}`);
    }

    // First, apply modifiers via controller for ALL actions (including build-structure)
    const result = await controller.resolveAction(
      actionId,
      instance.appliedOutcome.outcome,
      resolutionData,
      instance.appliedOutcome.actorName,
      instance.appliedOutcome.skillName || '',
      currentUserId || undefined
    );
    
    console.log('📊 [applyActionEffects] Result:', result);

    if (!result.success) {
      // Show error to user about requirements not being met
      ui.notifications?.warn(`${action.name} requirements not met: ${result.error}`);
      return; // Don't track failed actions
    }
    
    // Then, special post-resolution handling for actions with pre-roll selection
    if (actionId === 'build-structure' && pendingBuildAction) {
      const outcome = instance.appliedOutcome.outcome;
      if (outcome === 'success' || outcome === 'criticalSuccess') {
        await handleBuildStructureCompletion(outcome, instance.appliedOutcome.actorName);
      }
      // For failure/criticalFailure, modifiers have already been applied above
    } else if (actionId === 'upgrade-settlement' && pendingUpgradeAction) {
      const outcome = instance.appliedOutcome.outcome;
      if (outcome === 'success' || outcome === 'criticalSuccess') {
        await handleUpgradeSettlementCompletion(outcome, instance.appliedOutcome.actorName);
      }
      // For failure/criticalFailure, modifiers have already been applied above
    }
    
    // Show success notification with applied effects (if any resources were changed)
    // Skip for actions with custom completion notifications
    const hasCustomNotification = actionId === 'upgrade-settlement' || actionId === 'build-structure';
    if (!hasCustomNotification && result.applied?.resources && result.applied.resources.length > 0) {
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
      console.log(`📝 [applyActionEffects] Tracked action: ${actionId} for player: ${currentUserId}`);
    }
    
    // Clear instance to reset card to initial state (actions can be performed again)
    if (checkInstanceService) {
      await checkInstanceService.clearInstance(instanceId);
      currentActionInstances.delete(actionId);
      currentActionInstances = currentActionInstances;  // Trigger reactivity
      console.log(`🧹 [ActionsPhase] Cleared instance ${instanceId} after applying effects`);
    }
    
    // Force UI update
    await tick();
  }
  
  // Handle upgrade settlement completion after roll
  async function handleUpgradeSettlementCompletion(outcome: string, actorName: string) {
    if (!pendingUpgradeAction?.settlementId) {
      ui.notifications?.error('Settlement upgrade data missing');
      pendingUpgradeAction = null;
      return;
    }
    
    const actor = getKingdomActor();
    if (!actor) {
      ui.notifications?.error('No kingdom actor available');
      pendingUpgradeAction = null;
      return;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      ui.notifications?.error('No kingdom data available');
      pendingUpgradeAction = null;
      return;
    }
    
    const settlement = kingdom.settlements.find(s => s.id === pendingUpgradeAction!.settlementId);
    if (!settlement) {
      ui.notifications?.error('Settlement not found');
      pendingUpgradeAction = null;
      return;
    }
    
    const currentLevel = settlement.level;
    const newLevel = currentLevel + 1;
    const fullCost = newLevel;
    
    // Calculate actual cost based on outcome
    const isCriticalSuccess = outcome === 'criticalSuccess';
    const actualCost = isCriticalSuccess ? Math.ceil(fullCost / 2) : fullCost;
    
    console.log('💰 [UpgradeSettlement] Cost calculation:', {
      currentLevel,
      newLevel,
      fullCost,
      isCriticalSuccess,
      actualCost
    });
    
    // Deduct gold cost
    try {
      await updateKingdom(k => {
        if (k.resources.gold >= actualCost) {
          k.resources.gold -= actualCost;
        } else {
          throw new Error(`Insufficient gold: need ${actualCost}, have ${k.resources.gold}`);
        }
      });
      
      console.log(`✅ [UpgradeSettlement] Deducted ${actualCost} gold`);
      
      // Upgrade settlement level (handles automatic tier transitions)
      const { settlementService } = await import('../../../services/settlements');
      await settlementService.updateSettlementLevel(pendingUpgradeAction.settlementId, newLevel);
      
      // Get updated settlement for message
      const updatedKingdom = actor.getKingdomData();
      const updatedSettlement = updatedKingdom?.settlements.find(s => s.id === pendingUpgradeAction!.settlementId);
      
      if (updatedSettlement) {
        // Check if tier changed
        const tierChanged = updatedSettlement.tier !== settlement.tier;
        
        const message = tierChanged
          ? `${updatedSettlement.name} upgraded to level ${newLevel} and became a ${updatedSettlement.tier}!`
          : `${updatedSettlement.name} upgraded to level ${newLevel}`;
        
        if (isCriticalSuccess) {
          ui.notifications?.info(`🎉 Critical Success! ${message} (50% off gold cost)`);
        } else {
          ui.notifications?.info(`✅ ${message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ [UpgradeSettlement] Error:', error);
      ui.notifications?.error(error instanceof Error ? error.message : 'Failed to upgrade settlement');
    }
    
    // Clear pending upgrade action
    pendingUpgradeAction = null;
  }
  
  // Handle build structure completion after roll
  async function handleBuildStructureCompletion(outcome: string, actorName: string) {
    if (!pendingBuildAction?.structureId || !pendingBuildAction?.settlementId) {
      ui.notifications?.error('Build structure data missing');
      pendingBuildAction = null;
      return;
    }
    
    const { structuresService } = await import('../../../services/structures');
    const structure = structuresService.getStructure(pendingBuildAction.structureId);
    
    if (!structure) {
      ui.notifications?.error('Structure not found');
      pendingBuildAction = null;
      return;
    }
    
    const game = (window as any).game;
    
    // Only build on success or critical success
    if (outcome === 'success' || outcome === 'criticalSuccess') {
      const { createBuildStructureController } = await import('../../../controllers/BuildStructureController');
      const buildController = await createBuildStructureController();
      
      // Add to build queue
      const result = await buildController.addToBuildQueue(
        pendingBuildAction.structureId,
        pendingBuildAction.settlementId
      );
      
      if (result.success && result.project) {
        // Calculate cost modifier (50% off for critical success)
        const costModifier = outcome === 'criticalSuccess' ? 0.5 : 1.0;
        
        // Apply cost modifier to project if critical success
        if (costModifier !== 1.0) {
          const actor = getKingdomActor();
          if (actor) {
            await actor.updateKingdomData((kingdom) => {
              const project = kingdom.buildQueue?.find(p => p.id === result.project!.id);
              if (project && project.totalCost) {
                // Work with plain objects (already converted by BuildQueueService)
                const totalCostObj = project.totalCost as any;
                const remainingCostObj = project.remainingCost as any;
                
                // Update totalCost with reduced amounts (rounded up)
                for (const [resource, amount] of Object.entries(totalCostObj)) {
                  totalCostObj[resource] = Math.ceil((amount as number) * costModifier);
                }
                
                // Also update remainingCost to match
                if (remainingCostObj) {
                  for (const [resource, amount] of Object.entries(remainingCostObj)) {
                    remainingCostObj[resource] = Math.ceil((amount as number) * costModifier);
                  }
                }
                
                console.log(`💰 [BuildStructure] Critical success! Costs reduced to 50%:`, totalCostObj);
              }
            });
          }
        }
        
        // Show appropriate success message
        if (outcome === 'criticalSuccess') {
          ui.notifications?.info(`🎉 Critical Success! ${structure.name} added to build queue at half cost!`);
        } else {
          ui.notifications?.info(`✅ ${structure.name} added to build queue!`);
        }
        
        ui.notifications?.info(`Pay for construction during the Upkeep phase.`);
      } else {
        ui.notifications?.error(result.error || 'Failed to start construction');
      }
    }
    // For failure/criticalFailure, modifiers (like unrest) are already applied via controller.resolveAction()
    // No need for additional notification - the generic resource change notification handles it
    
    // Clear pending build action
    pendingBuildAction = null;
  }


  // Listen for roll completion events
  async function handleRollComplete(event: CustomEvent) {
    const { checkId, outcome, actorName, checkType, skillName, proficiencyRank } = event.detail;

    if (checkType === "action") {
      await onActionResolved(checkId, outcome, actorName, checkType, skillName, proficiencyRank);
      
      // Clear aid modifiers for this specific action after roll completes
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdomData((kingdom) => {
          if (kingdom.turnState?.actionsPhase?.activeAids) {
            const beforeCount = kingdom.turnState.actionsPhase.activeAids.length;
            kingdom.turnState.actionsPhase.activeAids = 
              kingdom.turnState.actionsPhase.activeAids.filter(
                aid => aid.targetActionId !== checkId
              );
            const afterCount = kingdom.turnState.actionsPhase.activeAids.length;
            
            if (beforeCount > afterCount) {
              console.log(`🧹 [ActionsPhase] Cleared ${beforeCount - afterCount} aid(s) for action: ${checkId}`);
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
    
    // Initialize the phase (this auto-completes immediately to allow players to skip actions)
    await controller.startPhase();
    console.log('[ActionsPhase] Phase initialized with controller');
    
    // Store current user ID
    const game = (window as any).game;
    currentUserId = game?.user?.id || null;
    console.log('[ActionsPhase] Initialized with currentUserId:', currentUserId, 'userName:', game?.user?.name);
    
    window.addEventListener(
      "kingdomRollComplete",
      handleRollComplete as any
    );
    initializeRollResultHandler();

    // Wait for store initialization before accessing player data
    console.log('[ActionsPhase] Component mounted, waiting for store initialization...');
  });

  onDestroy(() => {
    window.removeEventListener(
      "kingdomRollComplete",
      handleRollComplete as any
    );
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
      console.error("Error executing skill:", error);
      ui.notifications?.error(`Failed to perform action: ${error}`);
    }
  }

  // Handle debug outcome change
  async function handleDebugOutcomeChange(event: CustomEvent, action: any) {
    const { outcome: newOutcome } = event.detail;
    
    console.log(`🐛 [ActionsPhase] Debug outcome changed to: ${newOutcome} for action: ${action.id}`);
    
    // Get instance
    const instanceId = currentActionInstances.get(action.id);
    if (!instanceId) return;
    
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
      $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId)?.appliedOutcome?.actorName || '',
      $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId)?.appliedOutcome?.skillName || '',
      customEffect || ''
    );
    
    console.log(`✅ [ActionsPhase] Updated instance ${instanceId} with new outcome: ${newOutcome}`);
  }
  
  // Handle performReroll from OutcomeDisplay (via BaseCheckCard)
  async function handlePerformReroll(event: CustomEvent, action: any) {
    const { skill, previousFame } = event.detail;
    
    console.log(`🔁 [ActionsPhase] Performing reroll with skill: ${skill}`);
    
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
      console.error("Error during reroll:", error);
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
  
  // Execute the build structure skill roll
  async function executeBuildStructureRoll(buildAction: { skill: string; structureId?: string; settlementId?: string }) {
    if (!buildAction.structureId || !buildAction.settlementId) {
      ui.notifications?.warn('Please select a structure to build');
      return;
    }
    
    const game = (window as any).game;
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        // User cancelled - reset pending action
        pendingBuildAction = null;
        return;
      }
    }
    
    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      
      const action = actionLoader.getAllActions().find(a => a.id === 'build-structure');
      if (!action) return;
      
      // Perform the roll
      await performKingdomActionRoll(
        actingCharacter,
        buildAction.skill,
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
      
      // The roll completion will be handled by handleRollComplete
      // which will trigger onActionResolved with the outcome
    } catch (error) {
      console.error("Error executing build structure roll:", error);
      ui.notifications?.error(`Failed to perform action: ${error}`);
      pendingBuildAction = null;
    }
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
        const settlement = kingdom?.settlements.find(s => s.id === settlementId);
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
  
  // Execute the repair structure skill roll
  async function executeRepairStructureRoll(repairAction: { skill: string; structureId?: string; settlementId?: string }) {
    if (!repairAction.structureId || !repairAction.settlementId) {
      ui.notifications?.warn('Please select a structure to repair');
      return;
    }
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        // User cancelled - reset pending action
        pendingRepairAction = null;
        return;
      }
    }
    
    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      
      const action = actionLoader.getAllActions().find(a => a.id === 'repair-structure');
      if (!action) return;
      
      // Perform the roll
      await performKingdomActionRoll(
        actingCharacter,
        repairAction.skill,
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
      
      // The roll completion will be handled by handleRollComplete
      // which will trigger onActionResolved with the outcome
    } catch (error) {
      console.error("Error executing repair structure roll:", error);
      ui.notifications?.error(`Failed to perform action: ${error}`);
      pendingRepairAction = null;
    }
  }
  
  // Execute the upgrade settlement skill roll
  async function executeUpgradeSettlementRoll(upgradeAction: { skill: string; settlementId?: string }) {
    if (!upgradeAction.settlementId) {
      ui.notifications?.warn('Please select a settlement to upgrade');
      return;
    }
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        // User cancelled - reset pending action
        pendingUpgradeAction = null;
        return;
      }
    }
    
    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      
      const action = actionLoader.getAllActions().find(a => a.id === 'upgrade-settlement');
      if (!action) return;
      
      // Perform the roll
      await performKingdomActionRoll(
        actingCharacter,
        upgradeAction.skill,
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
      
      // The roll completion will be handled by handleRollComplete
      // which will trigger onActionResolved with the outcome
    } catch (error) {
      console.error("Error executing upgrade settlement roll:", error);
      ui.notifications?.error(`Failed to perform action: ${error}`);
      pendingUpgradeAction = null;
    }
  }
  
  // Execute the establish diplomatic relations skill roll
  async function executeEstablishDiplomaticRelationsRoll(diplomaticAction: { skill: string; factionId?: string; factionName?: string }) {
    if (!diplomaticAction.factionId) {
      ui.notifications?.warn('Please select a faction');
      return;
    }
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        // User cancelled - reset pending action
        pendingDiplomaticAction = null;
        return;
      }
    }
    
    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      
      const action = actionLoader.getAllActions().find(a => a.id === 'dimplomatic-mission');
      if (!action) return;
      
      // Perform the roll
      await performKingdomActionRoll(
        actingCharacter,
        diplomaticAction.skill,
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
      
      // The roll completion will be handled by handleRollComplete
      // which will trigger onActionResolved with the outcome
    } catch (error) {
      console.error("Error executing establish diplomatic relations roll:", error);
      ui.notifications?.error(`Failed to perform action: ${error}`);
      pendingDiplomaticAction = null;
    }
  }
  
  // Handle Aid Another button click - check if player has acted, then open skill selection dialog
  function handleAid(event: CustomEvent) {
    const { checkId, checkName } = event.detail;
    
    console.log('[ActionsPhase] Aid Another clicked:', { checkId, checkName });
    
    // Check if THIS PLAYER has already acted - show confirmation dialog
    // READ from reactive store (Single Source of Truth) - use actionLog
    const game = (window as any).game;
    const actionLog = $kingdomData.turnState?.actionLog || [];
    // Check if this player has any action entries (actions or events, not incidents)
    const hasPlayerActed = actionLog.some((entry: any) => 
      entry.playerId === game?.user?.id && 
      (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
    );
    
    console.log('[ActionsPhase] Aid action tracking check (before skill selection):', {
      userId: game?.user?.id,
      actionLogEntries: actionLog.filter((e: any) => e.playerId === game?.user?.id).length,
      hasPlayerActed
    });
    
    if (hasPlayerActed) {
      console.log('[ActionsPhase] Player has already acted - aid is special case, allowing');
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
    
    console.log('[ActionsPhase] Aid skill selected:', skill);
    
    // Proceed with aid roll (action tracking already checked in handleAid)
    await executeAidRoll(skill, pendingAidAction.id, pendingAidAction.name);
    pendingAidAction = null;
  }
  
  // Handle aid dialog cancellation
  function handleAidCancel() {
    showAidSelectionDialog = false;
    pendingAidAction = null;
  }
  
  // Execute aid roll
  async function executeAidRoll(skill: string, targetActionId: string, targetActionName: string) {
    const game = (window as any).game;
    
    // Note: Aid action spending is handled by GameCommandsService.trackPlayerAction()
    // after the roll completes (see aidRollListener below)
    
    // Get character for roll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        return; // User cancelled
      }
    }
    
    // Declare aidRollListener outside try block so it can be referenced in catch
    let aidRollListener: ((e: any) => Promise<void>) | null = null;
    
    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      const skillSlug = skill.toLowerCase();
      const skillData = actingCharacter.skills?.[skillSlug];
      const proficiencyRank = skillData?.rank || 0;
      
      // Listen for the roll completion BEFORE starting the roll
      aidRollListener = async (e: any) => {
        const { checkId, outcome, actorName } = e.detail;
        
        console.log('[ActionsPhase] kingdomRollComplete received:', checkId, 'Looking for:', `aid-${targetActionId}`);
        
        if (checkId === `aid-${targetActionId}`) {
          window.removeEventListener('kingdomRollComplete', aidRollListener as any);
          
          // Calculate bonus based on outcome and proficiency (including penalty for critical failure)
          let bonus = 0;
          let grantKeepHigher = false;
          
          if (outcome === 'criticalSuccess') {
            bonus = 4;
            grantKeepHigher = true;
          } else if (outcome === 'success') {
            // Calculate based on proficiency
            if (proficiencyRank === 0) bonus = 1; // Untrained
            else if (proficiencyRank <= 2) bonus = 2; // Trained/Expert
            else if (proficiencyRank === 3) bonus = 3; // Master
            else bonus = 4; // Legendary
          } else if (outcome === 'criticalFailure') {
            bonus = -1;  // PF2e rules: critical failure imposes a -1 penalty
          }
          // outcome === 'failure' stays at 0 (no effect)
          
          console.log('[ActionsPhase] Aid stored for', targetActionId, '- outcome:', outcome, 'bonus:', bonus);
          
          // Store aids that have any effect (bonus or penalty)
          if (bonus !== 0) {
            const actor = getKingdomActor();
            if (actor) {
              await actor.updateKingdomData((kingdom) => {
              if (!kingdom.turnState) return;
              if (!kingdom.turnState.actionsPhase.activeAids) {
                kingdom.turnState.actionsPhase.activeAids = [];
              }
              
              kingdom.turnState.actionsPhase.activeAids.push({
                playerId: game.user.id,
                playerName: game.user.name,
                characterName: actorName,
                targetActionId,
                skillUsed: skill,
                outcome: outcome as any,
                bonus,
                grantKeepHigher,
                timestamp: Date.now()
              });
              });
              
              // Track the aid check in the action log
              if (gameCommandsService) {
                await gameCommandsService.trackPlayerAction(
                  game.user.id,
                  game.user.name,
                  actorName,
                  `aid-${targetActionId}-${outcome}`,
                  TurnPhase.ACTIONS
                );
              }
              
              const bonusText = bonus > 0 ? `+${bonus}` : `${bonus}`;
              ui.notifications?.info(`You are now aiding ${targetActionName} with a ${bonusText} ${bonus > 0 ? 'bonus' : 'penalty'}${grantKeepHigher ? ' and keep higher roll' : ''}!`);
            }
          } else {
            // Failed aid (no bonus/penalty) - track action but don't store (allows retry)
            if (gameCommandsService) {
              await gameCommandsService.trackPlayerAction(
                game.user.id,
                game.user.name,
                actorName,
                `aid-${targetActionId}-${outcome}`,
                TurnPhase.ACTIONS
              );
            }
            
            ui.notifications?.warn(`Your aid attempt for ${targetActionName} failed. You can try again with a different skill.`);
          }
        }
      };
      
      window.addEventListener('kingdomRollComplete', aidRollListener);
      
      // Perform the roll - pass targetActionId so modifiers can be applied
      await performKingdomActionRoll(
        actingCharacter,
        skill,
        dc,
        `Aid Another: ${targetActionName}`,
        `aid-${targetActionId}`,
        {
          criticalSuccess: { description: 'You provide exceptional aid (+4 bonus and keep higher roll)' },
          success: { description: 'You provide helpful aid (bonus based on proficiency)' },
          failure: { description: 'Your aid has no effect' },
          criticalFailure: { description: 'Your aid has no effect' }
        },
        targetActionId  // Pass the target action ID so aid modifiers are applied to the correct action
      );
      
    } catch (error) {
      // Clean up listener on error
      if (aidRollListener) {
        window.removeEventListener('kingdomRollComplete', aidRollListener as any);
      }
      console.error('Error performing aid roll:', error);
      ui.notifications?.error(`Failed to perform aid: ${error}`);
    }
  }
  
  
  // Get aid result for an action from shared kingdom state
  function getAidResultForAction(actionId: string): { outcome: string; bonus: number } | null {
    const activeAids = $kingdomData?.turnState?.actionsPhase?.activeAids;
    if (!activeAids || activeAids.length === 0) return null;
    
    // Find the most recent aid for this action
    const aidsForAction = activeAids.filter((aid: any) => aid.targetActionId === actionId);
    if (aidsForAction.length === 0) return null;
    
    // Return the most recent aid (highest timestamp)
    const mostRecentAid = aidsForAction.reduce((latest: any, current: any) => 
      current.timestamp > latest.timestamp ? current : latest
    );
    
    return {
      outcome: mostRecentAid.outcome,
      bonus: mostRecentAid.bonus
    };
  }

</script>

<div class="actions-phase">

  <!-- Scrollable content area -->
  <div class="actions-content">
    <!-- Category sections -->
    {#each categoryConfig as category}
      {@const actions = getActionsByCategory(category.id)}
      {#if actions.length > 0}
        <div class="action-category">
          <div class="category-header">
            <i class="fas {category.icon} category-icon"></i>
            <div class="category-info">
              <h3 class="category-name">{category.name}</h3>
              <p class="category-description">{category.description}</p>
            </div>
          </div>

          <div class="actions-list">
            {#each actions as action (action.id)}
              {@const instanceId = currentActionInstances.get(action.id)}
              {@const checkInstance = instanceId ? $kingdomData.activeCheckInstances?.find(i => i.instanceId === instanceId) : null}
              {@const isResolved = !!(checkInstance && checkInstance.status !== 'pending')}
              {@const resolution = checkInstance?.appliedOutcome ? {
                outcome: checkInstance.appliedOutcome.outcome,
                actorName: checkInstance.appliedOutcome.actorName,
                skillName: checkInstance.appliedOutcome.skillName || '',
                modifiers: checkInstance.appliedOutcome.modifiers || [],
                effect: checkInstance.appliedOutcome.effect || '',
                effectsApplied: checkInstance.appliedOutcome.effectsApplied || false
              } : undefined}
              {@const customComponent = (resolution && controller) ? getCustomResolutionComponent(action.id, resolution.outcome) : null}
              {@const isAvailable = isActionAvailable(action)}
              {@const missingRequirements = !isAvailable && controller ? getMissingRequirements(action) : []}
              {#key `${action.id}-${currentActionInstances.size}-${activeAidsCount}-${controller ? 'ready' : 'loading'}-${$kingdomData.unrest}-${$kingdomData.imprisonedUnrest}-${($kingdomData.resources?.resourcePoints || 0)}-${($kingdomData.resources?.gold || 0)}-${($kingdomData.armies?.length || 0)}-${($kingdomData.settlements?.length || 0)}`}
                <BaseCheckCard
                  id={action.id}
                  checkInstance={checkInstance || null}
                  customResolutionComponent={customComponent}
                  name={action.name}
                  description={action.description}
                  brief={action.brief || ''}
                  skills={action.skills}
                  outcomes={[
                    {
                      type: 'criticalSuccess',
                      description: action.criticalSuccess?.description || action.success?.description || '—',
                      modifiers: action.criticalSuccess?.modifiers || []
                    },
                    {
                      type: 'success',
                      description: action.success?.description || '—',
                      modifiers: action.success?.modifiers || []
                    },
                    {
                      type: 'failure',
                      description: action.failure?.description || '—',
                      modifiers: action.failure?.modifiers || []
                    },
                    {
                      type: 'criticalFailure',
                      description: action.criticalFailure?.description || '—',
                      modifiers: action.criticalFailure?.modifiers || []
                    }
                  ]}
                  checkType="action"
                  expandable={true}
                  showCompletions={true}
                  showAvailability={true}
                  showSpecial={true}
                  showIgnoreButton={false}
                  special={action.special}
                  cost={action.cost}
                  expanded={expandedActions.has(action.id)}
                  available={isAvailable}
                  {missingRequirements}
                  resolved={isResolved}
                  {resolution}
                  canPerformMore={actionsUsed < 4 && !isResolved}
                  currentFame={$kingdomData?.fame || 0}
                  showFameReroll={true}
                  showAidButton={true}
                  aidResult={getAidResultForAction(action.id)}
                  resolvedBadgeText="Resolved"
                  primaryButtonLabel="Apply Result"
                  skillSectionTitle="Choose Skill:"
                  isViewingCurrentPhase={isViewingCurrentPhase}
                  on:toggle={() => toggleAction(action.id)}
                  on:executeSkill={(e) => handleExecuteSkill(e, action)}
                  on:performReroll={(e) => handlePerformReroll(e, action)}
                  on:debugOutcomeChanged={(e) => handleDebugOutcomeChange(e, action)}
                  on:aid={handleAid}
                  on:primary={(e) => {
                    // Apply the effects using new ResolutionData architecture
                    applyActionEffects(e);
                    // Keep the card expanded to show completion notifications
                  }}
                  on:cancel={(e) => handleActionResultCancel(e.detail.checkId)}
                />
              {/key}
            {/each}
          </div>
        </div>
      {/if}
    {/each}

  </div>
</div>

<!-- Build Structure Dialog -->
<BuildStructureDialog
  bind:show={showBuildStructureDialog}
  on:structureQueued={handleStructureQueued}
/>

<!-- Repair Structure Dialog -->
<RepairStructureDialog
  bind:show={showRepairStructureDialog}
  on:structureSelected={handleRepairStructureSelected}
/>

<!-- Upgrade Settlement Selection Dialog -->
<UpgradeSettlementSelectionDialog
  bind:show={showUpgradeSettlementSelectionDialog}
  on:confirm={handleUpgradeSettlementSelected}
  on:cancel={() => { pendingUpgradeAction = null; }}
/>

<!-- Faction Selection Dialog -->
<FactionSelectionDialog
  bind:show={showFactionSelectionDialog}
  on:confirm={handleFactionSelected}
  on:cancel={() => { pendingDiplomaticAction = null; }}
/>

<!-- Aid Selection Dialog -->
<AidSelectionDialog
  bind:show={showAidSelectionDialog}
  actionName={pendingAidAction?.name || ''}
  on:confirm={handleAidConfirm}
  on:cancel={handleAidCancel}
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

  .action-category {
    background: var(--color-gray-900);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-accent-75);
    padding: 20px;
  }

  .category-header {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
    align-items: start;

    .category-icon {
      font-size: 32px;
      color: var(--color-amber);
      margin-top: 3px;
    }

    .category-info {
      flex: 1;
    }

    .category-name {
      margin: 0 0 5px 0;
      font-size: var(--font-3xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      color: var(--color-amber);
    }

    .category-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.5;
    }
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

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
