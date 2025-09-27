<script lang="ts">
  import { kingdomState } from "../../../stores/kingdom";
  import { gameState } from "../../../stores/gameState";
  import { PlayerActionsData } from "../../../models/PlayerActions";
  import ActionCard from "../../kingdom/components/ActionCard.svelte";
  import {
    getPlayerCharacters,
    getCurrentUserCharacter,
    initializeRollResultHandler,
  } from "../../../api/foundry-actors";
  import { onMount, onDestroy, tick } from "svelte";

  // Import our clean architecture components
  import { createActionPhaseController } from "../../../controllers";
  import { commandExecutor, ExecuteActionCommand } from "../../../commands";
  import type { CommandContext } from "../../../commands";
  import { actionExecutionService } from "../../../services/domain";

  // Initialize controller
  const controller = createActionPhaseController();

  // UI State (not business logic)
  let expandedActions = new Set<string>();
  let selectedCharacterId: string = "";
  let playerCharacters: any[] = [];
  let selectedCharacter: any = null;

  // Use controller state
  $: controllerState = controller.getState();
  $: actionsUsed = controllerState.actionsUsed;
  $: resolvedActions = controllerState.resolvedActions;
  const MAX_ACTIONS = 4;

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
    skillName?: string
  ) {
    // Only handle action type checks
    if (checkType && checkType !== "action") {
      return;
    }

    // Check if already resolved
    if (controller.isActionResolved(actionId)) {
      return;
    }

    // Find the action
    const action = PlayerActionsData.getAllActions().find(
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
    
    const resolution = controller.resolveAction(
      action,
      outcomeType,
      actorName,
      skillName
    );

    // Then try to execute the command for state changes
    const context: CommandContext = {
      kingdomState: $kingdomState,
      currentTurn: $gameState.currentTurn,
      currentPhase: "Phase V: Actions",
    };

    const command = new ExecuteActionCommand(action, outcomeType);
    const result = await commandExecutor.execute(command, context);

    if (!result.success) {
      // Show error to user about requirements not being met
      ui.notifications?.warn(`${action.name} rolled successfully but requirements not met: ${result.error}`);
    }

    // Force Svelte update
    await tick();
    // Force reassignment to trigger reactivity
    controllerState = { ...controller.getState() };
    // Also force re-evaluation of the actions
    actionsUsed = controllerState.actionsUsed;
    resolvedActions = new Map(controllerState.resolvedActions);
  }

  // Reset an action using controller
  async function resetAction(actionId: string) {
    // Use controller method to properly reset action
    controller.resetAction(actionId);

    // Check if we need to undo the command
    if (commandExecutor.canUndo()) {
      const history = commandExecutor.getHistory();
      const lastCommand = history[history.length - 1];

      // Check if the last command was for this action
      const lastCommandName = lastCommand.getName ? lastCommand.getName() : "";
      if (lastCommandName.includes(actionId)) {
        await commandExecutor.undo();
      }
    }

    // Force update
    controllerState = controller.getState();
  }

  // Listen for roll completion events
  function handleRollComplete(event: CustomEvent) {
    const { checkId, outcome, actorName, checkType, skillName } = event.detail;

    if (checkType === "action") {
      onActionResolved(checkId, outcome, actorName, checkType, skillName);
    }
  }

  // Component lifecycle
  onMount(() => {
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

    // Controller doesn't need initialization, it uses the store directly
  });

  onDestroy(() => {
    window.removeEventListener(
      "kingdomRollComplete",
      handleRollComplete as EventListener
    );
    controller.resetState();
  });

  // Update selected character when ID changes
  $: if (selectedCharacterId) {
    const player = playerCharacters.find(
      (p) => p.character?.id === selectedCharacterId
    );
    selectedCharacter = player?.character || null;
  }

  // Helper functions using controller
  function getActionsByCategory(categoryId: string) {
    return PlayerActionsData.getActionsByCategory(categoryId);
  }

  function isActionAvailable(action: any): boolean {
    // Check resource costs directly
    if (action.cost) {
      for (const [resource, amount] of action.cost.entries()) {
        const available = $kingdomState.resources.get(resource) || 0;
        if (available < amount) {
          return false;
        }
      }
    }

    // Check special requirements
    if (
      action.id === "execute-pardon-prisoners" &&
      $kingdomState.imprisonedUnrest <= 0
    ) {
      return false;
    }

    return true;
  }

  function isActionResolved(actionId: string): boolean {
    return controller.isActionResolved(actionId);
  }

  function getActionResolution(actionId: string) {
    const resolution = controller.getActionResolution(actionId);
    if (!resolution) return undefined;
    
    // Convert Map to plain object for the component
    const stateChangesObj: Record<string, any> = {};
    if (resolution.stateChanges) {
      resolution.stateChanges.forEach((value, key) => {
        stateChangesObj[key] = value;
      });
    }
    
    const formattedResolution = {
      outcome: resolution.outcome,
      actorName: resolution.actorName,
      skillName: resolution.skillName,  
      stateChanges: stateChangesObj
    };
    
    return formattedResolution;
  }
</script>

<div class="actions-phase">
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
        <span class="counter-text">Actions Taken:</span>
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
              {@const isResolved = resolvedActions.has(action.id)}
              {@const resolution = isResolved ? getActionResolution(action.id) : undefined}
              {#key `${action.id}-${actionsUsed}-${isResolved}`}
                <ActionCard
                  {action}
                  expanded={expandedActions.has(action.id)}
                  available={isActionAvailable(action)}
                  resolved={isResolved}
                  {resolution}
                  character={null}
                  canPerformMore={actionsUsed < MAX_ACTIONS && !isResolved}
                  on:toggle={() => toggleAction(action.id)}
                  on:characterSelected={(e) => {
                    selectedCharacter = e.detail.character;
                    selectedCharacterId = e.detail.character?.id || "";
                  }}
                  on:reset={(e) => {
                    resetAction(e.detail.actionId);
                  }}
                />
              {/key}
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

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
    font-size: var(--type-heading-2-size);
    font-weight: var(--type-heading-2-weight);
    line-height: var(--type-heading-2-line);
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
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
      white-space: nowrap;
    }

    .character-dropdown {
      flex: 1;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--type-body-size);

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
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
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
      font-size: var(--type-body-size);
      font-weight: var(--type-weight-semibold);
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
      font-size: var(--type-heading-1-size);
      font-weight: var(--type-heading-1-weight);
      line-height: var(--type-heading-1-line);
      color: var(--color-amber);
    }

    .category-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
    }
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
