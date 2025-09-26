<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState } from '../../../stores/gameState';
   import { PlayerActionsData } from '../../../models/PlayerActions';
   import ActionCard from '../../kingdom/components/ActionCard.svelte';
   import { getPlayerCharacters, getCurrentUserCharacter, initializeRollResultHandler } from '../../../api/foundry-actors';
   import { onMount, onDestroy, tick } from 'svelte';
   
   // Import our clean architecture components
   import { createActionPhaseController } from '../../../controllers';
   import { commandExecutor, ExecuteActionCommand } from '../../../commands';
   import type { CommandContext } from '../../../commands';
   import { actionExecutionService } from '../../../services/domain';
   
   // Initialize controller
   const controller = createActionPhaseController();
   
   // UI State (not business logic)
   let expandedActions = new Set<string>();
   let selectedCharacterId: string = '';
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
         id: 'uphold-stability',
         name: 'Uphold Stability',
         icon: 'fa-shield-alt',
         description: "Maintain the kingdom's cohesion by resolving crises and quelling unrest."
      },
      {
         id: 'military-operations',
         name: 'Military Operations',
         icon: 'fa-chess-knight',
         description: 'War must be waged with steel and strategy.'
      },
      {
         id: 'expand-borders',
         name: 'Expand the Borders',
         icon: 'fa-map-marked-alt',
         description: 'Seize new territory to grow your influence and resources.'
      },
      {
         id: 'urban-planning',
         name: 'Urban Planning',
         icon: 'fa-city',
         description: 'Your people need places to live, work, trade, and worship.'
      },
      {
         id: 'foreign-affairs',
         name: 'Foreign Affairs',
         icon: 'fa-handshake',
         description: 'No kingdom stands alone.'
      },
      {
         id: 'economic-actions',
         name: 'Economic Actions',
         icon: 'fa-coins',
         description: 'Manage trade and personal wealth.'
      }
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
   async function onActionResolved(actionId: string, outcome: string, actorName: string, checkType?: string, skillName?: string) {
      console.log(`ActionsPhaseRefactored: onActionResolved`, { actionId, outcome, actorName, checkType, skillName });
      
      // Only handle action type checks
      if (checkType && checkType !== 'action') {
         console.log(`ActionsPhaseRefactored: Skipping non-action check type: ${checkType}`);
         return;
      }
      
      // Check if already resolved
      if (controller.isActionResolved(actionId)) {
         console.log(`ActionsPhaseRefactored: Action ${actionId} already resolved`);
         return;
      }
      
      // Find the action
      const action = PlayerActionsData.getAllActions().find(a => a.id === actionId);
      if (!action) {
         console.warn(`ActionsPhaseRefactored: Action ${actionId} not found`);
         return;
      }
      
      // Use controller to resolve the action (proper way)
      const resolution = controller.resolveAction(
         action,
         outcome as 'success' | 'criticalSuccess' | 'failure' | 'criticalFailure',
         actorName,
         skillName
      );
      
      if (resolution) {
         // Create command context
         const context: CommandContext = {
            kingdomState: $kingdomState,
            currentTurn: $gameState.currentTurn,
            currentPhase: 'Phase V: Actions'
         };
         
         // Create and execute command for state changes
         const outcomeType = outcome as 'success' | 'criticalSuccess' | 'failure' | 'criticalFailure';
         const command = new ExecuteActionCommand(action, outcomeType);
         const result = await commandExecutor.execute(command, context);
         
         if (!result.success) {
            console.error('Failed to execute action command:', result.error);
         }
      }
      
      // Force Svelte update
      await tick();
      controllerState = controller.getState();
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
         const lastCommandName = lastCommand.getName ? lastCommand.getName() : '';
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
      
      if (checkType === 'action') {
         onActionResolved(checkId, outcome, actorName, checkType, skillName);
      }
   }
   
   // Component lifecycle
   onMount(() => {
      window.addEventListener('kingdomRollComplete', handleRollComplete as EventListener);
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
      window.removeEventListener('kingdomRollComplete', handleRollComplete as EventListener);
      controller.resetState();
   });
   
   // Update selected character when ID changes
   $: if (selectedCharacterId) {
      const player = playerCharacters.find(p => p.character?.id === selectedCharacterId);
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
      if (action.id === 'execute-pardon-prisoners' && $kingdomState.imprisonedUnrest <= 0) {
         return false;
      }
      
      return true;
   }
   
   function isActionResolved(actionId: string): boolean {
      return controller.isActionResolved(actionId);
   }
   
   function getActionResolution(actionId: string) {
      return controller.getActionResolution(actionId);
   }
</script>

<div class="actions-phase">
   <!-- Header with action counter and character selection -->
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
                  {#key `${action.id}-${isActionResolved(action.id) ? 'resolved' : 'pending'}-${getActionResolution(action.id)?.outcome || 'none'}`}
                     <ActionCard 
                        {action}
                        expanded={expandedActions.has(action.id)}
                        available={isActionAvailable(action)}
                        resolved={isActionResolved(action.id)}
                        resolution={getActionResolution(action.id)}
                        character={null}
                        canPerformMore={actionsUsed < MAX_ACTIONS && !isActionResolved(action.id)}
                        on:toggle={() => toggleAction(action.id)}
                        on:characterSelected={(e) => {
                           selectedCharacter = e.detail.character;
                           selectedCharacterId = e.detail.character?.id || '';
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

<style lang="scss">
   .actions-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .actions-header {
      background: linear-gradient(135deg,
         rgba(31, 31, 35, 0.6),
         rgba(15, 15, 17, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
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
