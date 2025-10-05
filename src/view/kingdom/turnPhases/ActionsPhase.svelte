<script lang="ts">
  import { kingdomData, currentTurn, updateKingdom, getKingdomActor } from "../../../stores/KingdomStore";
  import { 
    spendPlayerAction,
    resetPlayerAction,
    getPlayerAction
  } from "../../../stores/KingdomStore";
  import { TurnPhase } from "../../../actors/KingdomActor";
  import { PlayerActionsData } from "../../../models/PlayerActions";
  import CheckCard from "../../kingdom/components/CheckCard/CheckCard.svelte";
  import PlayerActionTracker from "../../kingdom/components/PlayerActionTracker.svelte";
  import ActionConfirmDialog from "../../kingdom/components/ActionConfirmDialog.svelte";
  import BuildStructureDialog from "../../kingdom/components/BuildStructureDialog/BuildStructureDialog.svelte";
  import OtherPlayersActions from "../../kingdom/components/OtherPlayersActions.svelte";
  import {
    getPlayerCharacters,
    getCurrentUserCharacter,
    initializeRollResultHandler,
    performKingdomActionRoll,
    getKingdomActionDC,
    showCharacterSelectionDialog
  } from "../../../services/pf2e";
  import { onMount, onDestroy, tick } from "svelte";

  // Props
  export let isViewingCurrentPhase: boolean = true;

  // Import controller instead of services/commands directly
  import { createActionPhaseController } from '../../../controllers/ActionPhaseController';

  // Initialize controller
  let controller: any = null;

  // UI State (not business logic)
  let expandedActions = new Set<string>();
  let selectedCharacterId: string = "";
  let playerCharacters: any[] = [];
  let selectedCharacter: any = null;
  let showActionConfirm: boolean = false;
  let pendingSkillExecution: { event: CustomEvent, action: any } | null = null;
  let showBuildStructureDialog: boolean = false;

  // Simple action resolution tracking
  let resolvedActions = new Map<string, any>();
  $: actionsUsed = Object.values($kingdomData.playerActions || {}).filter((pa: any) => pa.actionSpent).length;
  const MAX_ACTIONS = 4;
  
  // Force UI update when resolvedActions changes
  $: resolvedActionsSize = resolvedActions.size;
  
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
    const action = PlayerActionsData.getAllActions().find(
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
    
    // Also store locally for UI reactivity (until we have proper reactive controller)
    resolvedActions.set(action.id, {
      outcome: outcomeType,
      actorName,
      skillName,
      stateChanges: Object.fromEntries(stateChanges)
    });
    resolvedActions = resolvedActions; // Trigger reactivity

    // Force Svelte to update
    await tick();
  }

  // Apply the actual state changes when user confirms the resolution
  async function applyActionEffects(actionId: string) {
    const action = PlayerActionsData.getAllActions().find(
      (a) => a.id === actionId
    );
    if (!action) {
      return;
    }

    const resolution = resolvedActions.get(actionId);
    if (!resolution) {
      return;
    }

    // Use the controller to execute the action (now uses GameEffectsService)
    const result = await controller.executeAction(
      action,
      resolution.outcome,
      $kingdomData,
      $currentTurn || 1,
      undefined, // preRolledValues - not used for now (actions don't have dice rolls in UI yet)
      resolution.actorName,
      resolution.skillName,
      currentUserId || undefined
    );

    if (!result.success) {
      // Show error to user about requirements not being met
      ui.notifications?.warn(`${action.name} requirements not met: ${result.error}`);
    } else {
      // Show success notification with applied effects
      const effectsMsg = result.applied?.resources
        .map((r: any) => `${r.value > 0 ? '+' : ''}${r.value} ${r.resource}`)
        .join(', ');
      if (effectsMsg) {
        ui.notifications?.info(`${action.name}: ${effectsMsg}`);
      }
    }
  }

  // Reset an action
  async function resetAction(actionId: string, skipPlayerActionReset: boolean = false) {
    // Use the controller to reset the action
    await controller.resetAction(actionId, $kingdomData as any, currentUserId || undefined);

    // Also reset the player action in gameState (unless it's a reroll)
    if (!skipPlayerActionReset) {
      const game = (window as any).game;
      if (game?.user?.id) {
        resetPlayerAction(game.user.id);
      }
    }
  }

  // Listen for roll completion events
  function handleRollComplete(event: CustomEvent) {
    const { checkId, outcome, actorName, checkType, skillName, proficiencyRank } = event.detail;

    if (checkType === "action") {
      onActionResolved(checkId, outcome, actorName, checkType, skillName, proficiencyRank);
    }
  }

  // Component lifecycle
  onMount(async () => {
    // Initialize controller
    controller = await createActionPhaseController();
    
    // Initialize the phase (this auto-completes immediately to allow players to skip actions)
    await controller.startPhase();
    console.log('[ActionsPhase] Phase initialized with controller');
    
    // Store current user ID
    const game = (window as any).game;
    currentUserId = game?.user?.id || null;
    console.log('[ActionsPhase] Initialized with currentUserId:', currentUserId, 'userName:', game?.user?.name);
    
    window.addEventListener(
      "kingdomRollComplete",
      handleRollComplete as EventListener
    );
    initializeRollResultHandler();

    // Load player characters
    playerCharacters = getPlayerCharacters();

    // Set current user character
    const currentUserChar = getCurrentUserCharacter();
    if (currentUserChar) {
      selectedCharacter = currentUserChar;
      selectedCharacterId = currentUserChar.id;
    }

    // Wait for store initialization before accessing player data
    console.log('[ActionsPhase] Component mounted, waiting for store initialization...');
  });

  onDestroy(() => {
    window.removeEventListener(
      "kingdomRollComplete",
      handleRollComplete as EventListener
    );
    
    // Reset controller state for next phase
    if (controller) {
      controller.resetState();
    }
  });

  // Update selected character when ID changes
  $: if (selectedCharacterId) {
    const player = playerCharacters.find(
      (p) => p.character?.id === selectedCharacterId
    );
    selectedCharacter = player?.character || null;
  }

  // Helper functions delegating to controller
  function getActionsByCategory(categoryId: string) {
    return PlayerActionsData.getActionsByCategory(categoryId);
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
  
  // Check if any player has resolved this action
  function isActionResolvedByAnyHelper(actionId: string): boolean {
    // Use local resolvedActions data instead of controller
    return resolvedActions.has(actionId);
  }

  function getActionResolutionHelper(actionId: string) {
    // Use local resolvedActions data instead of controller
    const resolution = resolvedActions.get(actionId);
    if (!resolution) return undefined;
    
    // Return the resolution directly since it's already in the correct format
    return resolution;
  }

  // Handle skill execution from CheckCard (decoupled from component)
  async function handleExecuteSkill(event: CustomEvent, action: any) {
    // Special handling for build-structure action
    if (action.id === 'build-structure') {
      // Show the build structure dialog instead of rolling
      showBuildStructureDialog = true;
      return;
    }
    
    // Check if ANY player has already performed an action (kingdom has used actions)
    if (actionsUsed > 0 && !resolvedActions.has(action.id)) {
      // At least one action has been performed - show confirmation dialog
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
    
    // Spend the player's action when they start a roll (not when it completes)
    const game = (window as any).game;
    if (game?.user?.id && !resolvedActions.has(action.id)) {
            // Ensure player exists before spending
            let playerAction = getPlayerAction(game.user.id);
            if (!playerAction) {
               // Initialize just this player if not found - delegate to store
               // Note: This would be handled by the KingdomStore initialization
               console.warn('[ActionsPhase] Player action not found for user:', game.user.id);
            }
      
      const success = spendPlayerAction(game.user.id, TurnPhase.ACTIONS);
      
      // Manually update actionsUsed since reactive statement isn't updating immediately
      actionsUsed = Object.values($kingdomData.playerActions || {}).filter((pa: any) => pa.actionSpent).length;
    }
    
    // Get character for roll - prioritize assigned character
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      // Fallback - show character selection dialog
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
    
    // For rerolls, use the player's assigned character
    let actingCharacter = getCurrentUserCharacter();
    
    if (!actingCharacter) {
      // Fallback - show character selection dialog
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
      // User confirmed they want to use another action - execute (action will be spent in executeSkillAction)
      executeSkillAction(event, action);
      pendingSkillExecution = null;
    }
  }
  
  function handleActionCancel() {
    pendingSkillExecution = null;
  }
  
  // Handle canceling an action result
  function handleActionResultCancel(actionId: string) {
    // Reset the action without applying effects
    resolvedActions.delete(actionId);
    resolvedActions = resolvedActions; // Trigger reactivity
    
    // Restore the player's action since they're canceling
    const game = (window as any).game;
    if (game?.user?.id) {
      resetPlayerAction(game.user.id);
    }
  }
  
  // Handle when a structure is successfully queued
  function handleStructureQueued(event: CustomEvent) {
    const { structureId, settlementId, project } = event.detail;
    
    // Mark the build-structure action as used for this player
    const game = (window as any).game;
    if (game?.user?.id) {
      spendPlayerAction(game.user.id, TurnPhase.ACTIONS);
      actionsUsed = Object.values($kingdomData.playerActions || {}).filter((pa: any) => pa.actionSpent).length;
    }
    
    // Show success notification
    ui.notifications?.info(`Structure queued successfully!`);
  }

</script>

<div class="actions-phase">
  <!-- Player Action Tracker -->
  <PlayerActionTracker compact={false} />
  
  <!-- Fixed Header with action counter and character selection -->
  <div class="actions-header-fixed">
    <div class="actions-header">
      <div class="actions-title">
        <i class="fas fa-users"></i>
        <span>Perform Kingdom Actions</span>
      </div>

      <!-- Character Selection -->
      <div class="character-selection">
        <label for="character-select">Acting Character:</label>
        <select
          id="character-select"
          bind:value={selectedCharacterId}
          class="character-dropdown"
          disabled={playerCharacters.length === 0}
        >
          {#if playerCharacters.length === 0}
            <option value="">No characters available</option>
          {:else}
            <option value="">Select a character...</option>
            {#each playerCharacters as player}
              {#if player.character}
                <option value={player.character.id}>
                  {player.character.name} ({player.userName})
                </option>
              {/if}
            {/each}
          {/if}
        </select>
      </div>

      <div class="actions-counter">
        <span class="counter-text">Kingdom Actions Taken:</span>
        <div class="counter-dots">
          {#each Array(MAX_ACTIONS) as _, i}
            <span class="action-dot {i < actionsUsed ? 'used' : ''}"></span>
          {/each}
        </div>
        <span class="counter-remaining">{actionsUsed} / {MAX_ACTIONS}</span>
      </div>
    </div>
  </div>

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
              {@const isResolved = isActionResolvedHelper(action.id)}
              {@const isResolvedByAny = isActionResolvedByAnyHelper(action.id)}
              {@const resolution = isResolved ? getActionResolutionHelper(action.id) : undefined}
              {@const otherPlayersResolutions = controller ? controller.getAllPlayersResolutions(action.id).filter(r => r.playerId !== currentUserId) : []}
              {@const isAvailable = isActionAvailable(action)}
              {@const missingRequirements = !isAvailable ? getMissingRequirements(action) : []}
              {#key `${action.id}-${resolvedActionsSize}`}
                <CheckCard
                  id={action.id}
                  name={action.name}
                  description={action.description}
                  brief={action.brief || ''}
                  skills={action.skills}
                  outcomes={[
                    {
                      type: 'criticalSuccess',
                      description: action.criticalSuccess?.description || action.success?.description || '—'
                    },
                    {
                      type: 'success',
                      description: action.success?.description || '—'
                    },
                    {
                      type: 'failure',
                      description: action.failure?.description || '—'
                    },
                    {
                      type: 'criticalFailure',
                      description: action.criticalFailure?.description || '—'
                    }
                  ]}
                  checkType="action"
                  special={action.special}
                  cost={action.cost}
                  expanded={expandedActions.has(action.id)}
                  available={isAvailable}
                  {missingRequirements}
                  resolved={isResolved}
                  {resolution}
                  canPerformMore={actionsUsed < MAX_ACTIONS && !isResolved}
                  currentFame={$kingdomData?.fame || 0}
                  showFameReroll={true}
                  resolvedBadgeText="Resolved"
                  primaryButtonLabel="OK"
                  skillSectionTitle="Choose Skill:"
                  on:toggle={() => toggleAction(action.id)}
                  on:executeSkill={(e) => handleExecuteSkill(e, action)}
                  on:rerollWithFame={(e) => handleRerollWithFame(e, action)}
                  on:primaryAction={(e) => {
                    // Apply the effects and clear the resolved state
                    applyActionEffects(e.detail.checkId);
                    // Clear the resolved state so other players can use this action
                    resolvedActions.delete(e.detail.checkId);
                    resolvedActions = resolvedActions; // Trigger reactivity
                    // Collapse the card
                    toggleAction('');
                  }}
                  on:cancel={(e) => handleActionResultCancel(e.detail.checkId)}
                />
                {#if otherPlayersResolutions.length > 0}
                  <OtherPlayersActions resolutions={otherPlayersResolutions} compact={true} />
                {/if}
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

  .character-selection {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 200px;

    label {
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.5;
      white-space: nowrap;
    }

    .character-dropdown {
      flex: 1;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--font-md);

      &:hover:not(:disabled) {
        border-color: var(--border-strong);
      }

      &:focus {
        outline: none;
        border-color: var(--color-amber);
        box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .actions-counter {
    display: flex;
    align-items: center;
    gap: 12px;

    .counter-text {
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.5;
    }

    .counter-dots {
      display: flex;
      gap: 8px;
    }

    .action-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--border-default);
      transition: all 0.3s ease;

      &.used {
        background: var(--color-amber);
        border-color: var(--color-amber);
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
      }
    }

    .counter-remaining {
      color: var(--text-primary);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
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
