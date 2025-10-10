<script lang="ts">
  import { kingdomData, currentTurn, updateKingdom, getKingdomActor } from "../../../stores/KingdomStore";
  import { TurnPhase } from "../../../actors/KingdomActor";
  import { createGameEffectsService } from '../../../services/GameEffectsService';
  import { actionLoader } from "../../../controllers/actions/action-loader";
  import BaseCheckCard from "../components/BaseCheckCard.svelte";
  import ActionConfirmDialog from "../../kingdom/components/ActionConfirmDialog.svelte";
  import AidSelectionDialog from "../../kingdom/components/AidSelectionDialog.svelte";
  import BuildStructureDialog from "../../kingdom/components/BuildStructureDialog/BuildStructureDialog.svelte";
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

  // Initialize controller and service
  let controller: any = null;
  let gameEffectsService: any = null;

  // UI State (not business logic)
  let expandedActions = new Set<string>();
  let showActionConfirm: boolean = false;
  let pendingSkillExecution: { event: CustomEvent, action: any } | null = null;
  let showBuildStructureDialog: boolean = false;
  let showAidSelectionDialog: boolean = false;
  let pendingAidAction: { id: string; name: string } | null = null;

  // Track current player's resolution (temporary until confirmed)
  let resolvedActions = new Map<string, any>();
  
  // Count of players who have acted (from actionLog)
  $: actionsUsed = ($kingdomData.turnState?.actionLog || []).filter((entry: any) => 
    entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS
  ).length;
  
  // Force UI update when resolvedActions changes
  $: resolvedActionsSize = resolvedActions.size;
  
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
    if (resolvedActions.has(actionId)) {
      return;
    }

    // Find the action
    const action = actionLoader.getAllActions().find(
      (a) => a.id === actionId
    );
    if (!action) {
      return;
    }

    // NOTE: We don't spend the action here anymore - it's spent when the user initially clicks the skill

    // Always mark the action as resolved to show the roll result
    const outcomeType = outcome as
      | "success"
      | "criticalSuccess"
      | "failure"
      | "criticalFailure";
    
    // Get modifiers from the action for preview
    const modifiers = controller.getActionModifiers(action, outcomeType);
    
    // Convert modifiers to stateChanges format for preview display
    const stateChanges = new Map<string, any>();
    modifiers.forEach((mod: any) => {
      stateChanges.set(mod.resource, mod.value);
    });
    
    // Special handling for Aid Another action - calculate actual bonus
    if (action.id === 'aid-another' && stateChanges.get('meta')) {
      const meta = stateChanges.get('meta');
      if (meta.aidBonus === 'proficiency' || meta.aidBonus === 'proficiency+reroll') {
        // Calculate actual bonus based on proficiency rank
        // PF2e ranks: 0=untrained, 1=trained, 2=expert, 3=master, 4=legendary
        let bonus = 1; // Default to +1 for untrained
        if (proficiencyRank !== undefined) {
          if (proficiencyRank >= 1 && proficiencyRank <= 2) {
            bonus = 2; // Trained/Expert = +2
          } else if (proficiencyRank === 3) {
            bonus = 3; // Master = +3
          } else if (proficiencyRank >= 4) {
            bonus = 4; // Legendary = +4
          }
        }
        
        // Update the meta with calculated bonus
        const updatedMeta = {
          aidBonus: bonus,
          rerollOnFailure: meta.aidBonus === 'proficiency+reroll' || meta.rerollOnFailure
        };
        stateChanges.set('meta', updatedMeta);
      }
    }
    
    // Make sure the action is expanded FIRST
    // This ensures the card is already expanded when the resolution is displayed
    if (!expandedActions.has(actionId)) {
      expandedActions.clear();
      expandedActions.add(actionId);
      expandedActions = new Set(expandedActions);
    }
    
    // Store resolution in controller (proper business logic location)
    console.log('[ActionsPhase] Resolving action for player:', currentUserId, 'action:', action.id);
    const resolution = {
      actionId: action.id,
      outcome: outcomeType,
      actorName,
      skillName,
      timestamp: new Date(),
      playerId: currentUserId || undefined,
      stateChanges
    };
    
    controller.storeResolution(resolution);
    
    // Store temporary resolution for current player (shows the OK/Cancel dialog)
    // IMPORTANT: Include modifiers array for OutcomeDisplay to generate ResolutionData
    resolvedActions.set(action.id, {
      outcome: outcomeType,
      actorName,
      skillName,
      stateChanges: Object.fromEntries(stateChanges),
      modifiers: modifiers  // Pass modifiers so OutcomeDisplay can generate ResolutionData
    });
    resolvedActions = resolvedActions; // Trigger reactivity

    // Force Svelte to update
    await tick();
  }

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

    const resolution = resolvedActions.get(actionId);
    if (!resolution) {
      console.error('❌ [applyActionEffects] Resolution not found for action:', actionId);
      return;
    }

    // NEW ARCHITECTURE: Use controller.resolveAction() with ResolutionData
    const result = await controller.resolveAction(
      actionId,
      resolution.outcome,
      resolutionData,
      resolution.actorName,
      resolution.skillName,
      currentUserId || undefined
    );
    
    console.log('📊 [applyActionEffects] Result:', result);

    if (!result.success) {
      // Show error to user about requirements not being met
      ui.notifications?.warn(`${action.name} requirements not met: ${result.error}`);
    } else {
      // Show success notification with applied effects (if any resources were changed)
      if (result.applied?.resources && result.applied.resources.length > 0) {
        const effectsMsg = result.applied.resources
          .map((r: any) => `${r.value > 0 ? '+' : ''}${r.value} ${r.resource}`)
          .join(', ');
        if (effectsMsg) {
          ui.notifications?.info(`${action.name}: ${effectsMsg}`);
        }
      }
      
      // Note: Completion tracking is now handled by actionLog via GameEffectsService.trackPlayerAction()
    }
  }

  // Reset an action
  async function resetAction(actionId: string, skipPlayerActionReset: boolean = false) {
    // Use the controller to reset the action
    await controller.resetAction(actionId, $kingdomData as any, currentUserId || undefined);

    // Note: Player action resets are handled via actionLog
    // When a player rerolls, they don't add another actionLog entry
  }

  // Listen for roll completion events
  async function handleRollComplete(event: CustomEvent) {
    const { checkId, outcome, actorName, checkType, skillName, proficiencyRank } = event.detail;

    if (checkType === "action") {
      await onActionResolved(checkId, outcome, actorName, checkType, skillName, proficiencyRank);
      
      // Clear aid modifiers for this specific action after roll completes
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdom((kingdom) => {
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
    gameEffectsService = await createGameEffectsService();
    
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
    
    // Reset controller state for next phase
    if (controller) {
      controller.resetState();
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

  function isActionResolvedHelper(actionId: string): boolean {
    // Delegate to controller for business logic
    if (!controller) return false;
    return controller.isActionResolved(actionId, currentUserId || undefined);
  }
  
  // Check if current player has a pending resolution for this action
  function isActionResolvedByCurrentPlayer(actionId: string): boolean {
    return resolvedActions.has(actionId);
  }

  function getCurrentPlayerResolution(actionId: string) {
    return resolvedActions.get(actionId);
  }
  
  // Removed: getActionCompletions - completions now handled by CompletionNotifications component

  // Handle skill execution from CheckCard (decoupled from component)
  async function handleExecuteSkill(event: CustomEvent, action: any) {
    // Special handling for build-structure action
    if (action.id === 'build-structure') {
      // Show the build structure dialog instead of rolling
      showBuildStructureDialog = true;
      return;
    }
    
    // Check if THIS PLAYER has already performed an action
    // READ from reactive store (Single Source of Truth) - use actionLog
    const game = (window as any).game;
    const actionLog = $kingdomData.turnState?.actionLog || [];
    // Check if this player has any action entries (actions or events, not incidents)
    const hasPlayerActed = actionLog.some((entry: any) => 
      entry.playerId === game?.user?.id && 
      (entry.phase === TurnPhase.ACTIONS || entry.phase === TurnPhase.EVENTS)
    );
    
    console.log('[ActionsPhase] Action tracking check:', {
      userId: game?.user?.id,
      actionLogEntries: actionLog.filter((e: any) => e.playerId === game?.user?.id).length,
      hasPlayerActed,
      resolvedForThisAction: resolvedActions.has(action.id),
      actionId: action.id
    });
    
    if (hasPlayerActed && !resolvedActions.has(action.id)) {
      // This player has already performed an action - show confirmation dialog
      console.log('[ActionsPhase] Player has already acted - showing confirmation dialog');
      pendingSkillExecution = { event, action };
      showActionConfirm = true;
      return;
    }
    
    // Proceed with the skill execution and spend the action
    await executeSkillAction(event, action);
  }
  
  // Separated skill execution logic
  async function executeSkillAction(event: CustomEvent, action: any) {
    const { skill, checkId, checkName } = event.detail;
    
    // Note: Action spending is now handled by GameEffectsService.trackPlayerAction()
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

  // Handle fame reroll from CheckCard (decoupled from component)
  async function handleRerollWithFame(event: CustomEvent, action: any) {
    const { checkId, skill } = event.detail;
    
    // Check fame and get character
    const currentFame = $kingdomData?.fame || 0;
    if (currentFame <= 0) {
      ui.notifications?.warn("Not enough fame to reroll");
      return;
    }
    
    // Get character for reroll
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      // Show character selection dialog
      actingCharacter = await showCharacterSelectionDialog();
      if (!actingCharacter) {
        return; // User cancelled selection
      }
    }
    
    // Deduct fame and reset action for reroll  
    const actor = getKingdomActor();
    if (actor) {
      await actor.updateKingdom((kingdom) => {
        kingdom.fame = currentFame - 1;
      });
    }
    
    // Reset the action (skip player action reset for reroll)
    await resetAction(checkId, true);
    
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Trigger new roll
    try {
      const characterLevel = actingCharacter.level || 1;
      const dc = controller.getActionDC(characterLevel);
      
      await performKingdomActionRoll(
        actingCharacter,
        skill,
        dc,
        action.name,
        checkId,
        {
          criticalSuccess: action.criticalSuccess,
          success: action.success,
          failure: action.failure,
          criticalFailure: action.criticalFailure
        }
      );
    } catch (error) {
      console.error("Error rerolling with fame:", error);
      // Restore fame if the roll failed
      const actor = getKingdomActor();
      if (actor) {
        await actor.updateKingdom((kingdom) => {
          kingdom.fame = currentFame;
        });
      }
      ui.notifications?.error(`Failed to reroll: ${error}`);
    }
  }
  
  // Handle confirmation dialog results
  function handleActionConfirm() {
    if (pendingSkillExecution) {
      const { event, action } = pendingSkillExecution;
      
      // Check if this is an aid action confirmation (happens before skill selection)
      if (action.id === 'aid-pending' && pendingAidAction) {
        // User confirmed - now show the skill selection dialog
        showAidSelectionDialog = true;
        pendingSkillExecution = null;
        return;
      }
      
      // Regular action - execute (action will be spent in executeSkillAction)
      executeSkillAction(event, action);
      pendingSkillExecution = null;
    }
  }
  
  function handleActionCancel() {
    // If canceling aid confirmation, also clear the pending aid action
    if (pendingSkillExecution?.action?.id === 'aid-pending') {
      pendingAidAction = null;
    }
    pendingSkillExecution = null;
  }
  
  // Handle canceling an action result
  function handleActionResultCancel(actionId: string) {
    // Reset the action without applying effects (no completion added yet)
    resolvedActions.delete(actionId);
    resolvedActions = resolvedActions; // Trigger reactivity
    
    // Note: Canceling doesn't add to actionLog, so player can still act
  }
  
  // Handle when a structure is successfully queued
  async function handleStructureQueued(event: CustomEvent) {
    const { structureId, settlementId, project } = event.detail;
    
    // Track the build-structure action in actionLog
    const game = (window as any).game;
    if (game?.user?.id && gameEffectsService) {
      const actingCharacter = getCurrentUserCharacter();
      await gameEffectsService.trackPlayerAction(
        game.user.id,
        game.user.name,
        actingCharacter?.name || 'Unknown',
        'build-structure',
        TurnPhase.ACTIONS
      );
    }
    
    // Show success notification
    ui.notifications?.info(`Structure queued successfully!`);
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
      console.log('[ActionsPhase] Player has already acted - showing confirmation dialog before skill selection');
      // Store pending aid action so we can open skill selection after confirmation
      pendingAidAction = { id: checkId, name: checkName };
      // Create a fake event to pass to the confirmation handler
      pendingSkillExecution = {
        event: new CustomEvent('aid', { detail: { checkId, checkName } }),
        action: { id: `aid-pending`, name: `Aid Another: ${checkName}` }
      };
      showActionConfirm = true;
      return;
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
    
    // Note: Aid action spending is handled by GameEffectsService.trackPlayerAction()
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
          
          // Calculate bonus based on outcome and proficiency
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
          }
          
          console.log('[ActionsPhase] Aid stored for', targetActionId, '- outcome:', outcome, 'bonus:', bonus);
          
          // Store aid in turnState (shared state - all players will see this)
          // Store ALL aid attempts, not just successful ones (bonus > 0)
          const actor = getKingdomActor();
          if (actor) {
            await actor.updateKingdom((kingdom) => {
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
            if (gameEffectsService) {
              await gameEffectsService.trackPlayerAction(
                game.user.id,
                game.user.name,
                actorName,
                `aid-${targetActionId}-${outcome}`,
                TurnPhase.ACTIONS
              );
            }
            
            if (bonus > 0) {
              ui.notifications?.info(`You are now aiding ${targetActionName} with a +${bonus} bonus${grantKeepHigher ? ' and keep higher roll' : ''}!`);
            } else {
              ui.notifications?.warn(`Your aid attempt for ${targetActionName} failed.`);
            }
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
  
  // Get other players' resolutions for an action (helper to avoid inline type annotation)
  function getOtherPlayersResolutions(actionId: string): any[] {
    if (!controller) return [];
    return controller.getAllPlayersResolutions(actionId).filter((r: any) => r.playerId !== currentUserId);
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
              {@const isResolved = isActionResolvedByCurrentPlayer(action.id)}
              {@const resolution = isResolved ? getCurrentPlayerResolution(action.id) : undefined}
              {@const isAvailable = isActionAvailable(action)}
              {@const missingRequirements = !isAvailable && controller ? getMissingRequirements(action) : []}
              {#key `${action.id}-${resolvedActionsSize}-${activeAidsCount}-${controller ? 'ready' : 'loading'}`}
                <BaseCheckCard
                  id={action.id}
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
                  primaryButtonLabel="OK"
                  skillSectionTitle="Choose Skill:"
                  isViewingCurrentPhase={isViewingCurrentPhase}
                  on:toggle={() => toggleAction(action.id)}
                  on:executeSkill={(e) => handleExecuteSkill(e, action)}
                  on:reroll={(e) => handleRerollWithFame(e, action)}
                  on:aid={handleAid}
                  on:primary={(e) => {
                    // Apply the effects using new ResolutionData architecture
                    applyActionEffects(e);
                    // Clear the current player's resolved state
                    resolvedActions.delete(e.detail.checkId);
                    resolvedActions = resolvedActions; // Trigger reactivity
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

<!-- Action Confirmation Dialog -->
<ActionConfirmDialog
  bind:show={showActionConfirm}
  on:confirm={handleActionConfirm}
  on:cancel={handleActionCancel}
/>

<!-- Build Structure Dialog -->
<BuildStructureDialog
  bind:show={showBuildStructureDialog}
  on:structureQueued={handleStructureQueued}
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
