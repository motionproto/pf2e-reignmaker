<script lang="ts">
   import { kingdomState, resolveModifier } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import { PlayerActionsData, type PlayerAction } from '../../../models/PlayerActions';
   import ActionCard from '../../kingdom/components/ActionCard.svelte';
   import { getPlayerCharacters, getCurrentUserCharacter, initializeRollResultHandler, performKingdomSkillCheck } from '../../../api/foundry-actors';
   import { onMount, onDestroy, tick } from 'svelte';
   import type { KingdomModifier } from '../../../models/Modifiers';
   
   // Track expanded actions and resolved actions
   let expandedActions = new Set<string>();
   let resolvedActions: Map<string, { 
      outcome: string, 
      actorName: string, 
      skillName?: string,
      stateChanges?: Record<string, any>
   }> = new Map();
   let actionsUsed = 0;
   const MAX_ACTIONS = 4;
   
   // Player character selection
   let playerCharacters: any[] = [];
   let selectedCharacter: any = null;
   let selectedCharacterId: string = '';
   
   // Modifier resolution
   let selectedModifierId: string = '';
   let resolvableModifiers: KingdomModifier[] = [];
   $: resolvableModifiers = ($kingdomState.modifiers || []).filter(m => m.resolution && m.resolution.skills && m.resolution.skills.length > 0);
   
   // Categories with their icons and descriptions
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
   
   // Get actions for each category
   function getActionsByCategory(categoryId: string): PlayerAction[] {
      return PlayerActionsData.getActionsByCategory(categoryId);
   }
   
   // Toggle action expansion - only one can be open at a time
   function toggleAction(actionId: string) {
      if (expandedActions.has(actionId)) {
         // If clicking the same action, close it
         expandedActions.clear();
      } else {
         // Clear all expanded actions and open only this one
         expandedActions.clear();
         expandedActions.add(actionId);
      }
      // Force reactivity by creating a new Set
      expandedActions = new Set(expandedActions);
   }
   
   // Check if an action is expanded
   function isExpanded(actionId: string): boolean {
      return expandedActions.has(actionId);
   }
   
   // Parse action outcome text to extract state changes
   function parseActionOutcome(action: PlayerAction, outcome: string): Record<string, any> {
      const changes: Record<string, any> = {};
      const effect = action[outcome as keyof PlayerAction] as any;
      
      if (!effect || !effect.description) return changes;
      
      const description = effect.description.toLowerCase();
      
      // Parse unrest changes
      if (description.includes('reduce unrest')) {
         const match = description.match(/reduce unrest by (\d+)/);
         if (match) {
            changes.unrest = -parseInt(match[1]);
         }
      } else if (description.includes('+1 unrest')) {
         changes.unrest = 1;
      } else if (description.includes('+2 unrest')) {
         changes.unrest = 2;
      } else if (description.includes('+1d4 unrest')) {
         changes.unrest = Math.floor(Math.random() * 4) + 1;
      } else if (description.includes('gain 1 unrest')) {
         changes.unrest = 1;
      } else if (description.includes('gain 1 current unrest')) {
         changes.unrest = 1;
      }
      
      // Parse gold changes
      if (description.includes('gain') && description.includes('gold')) {
         const match = description.match(/gain (\d+) gold/);
         if (match) {
            changes.gold = parseInt(match[1]);
         } else if (description.includes('gain double')) {
            changes.gold = 'double amount';
         }
      } else if (description.includes('lose') && description.includes('gold')) {
         const match = description.match(/lose (\d+) gold/);
         if (match) {
            changes.gold = -parseInt(match[1]);
         }
      } else if (description.includes('→ 1 gold')) {
         changes.gold = 1;
      } else if (description.includes('→ 2 gold')) {
         changes.gold = 2;
      }
      
      // Parse resource changes
      if (description.includes('gain') && description.includes('resource')) {
         const match = description.match(/gain (\d+) resource/);
         if (match) {
            changes.resources = parseInt(match[1]);
         }
      }
      
      // Parse fame changes
      if (description.includes('-1 fame')) {
         changes.fame = -1;
      } else if (description.includes('+1 fame')) {
         changes.fame = 1;
      }
      
      // Parse structure changes
      if (description.includes('+1 structure')) {
         changes.structuresBuilt = 1;
      } else if (description.includes('build structures for half cost')) {
         changes.structureCostReduction = '50%';
      } else if (description.includes('build 1 structure')) {
         changes.structuresBuilt = 1;
      }
      
      // Parse hex claiming
      if (description.includes('claim') && description.includes('hex')) {
         const match = description.match(/claim.*?(\d+).*?hex/);
         if (match) {
            changes.hexesClaimed = parseInt(match[1]);
         } else if (description.includes('claim targeted hexes')) {
            changes.hexesClaimed = 'varies by proficiency';
         } else if (description.includes('+1 extra hex')) {
            changes.hexesClaimed = '+1 extra';
         }
      }
      
      // Parse road building
      if (description.includes('build roads')) {
         if (description.includes('+1 hex')) {
            changes.roadsBuilt = '+1 hex';
         } else {
            changes.roadsBuilt = 'standard';
         }
      }
      
      // Parse army-related changes
      if (description.includes('recruit')) {
         changes.armyRecruited = true;
      }
      
      // Parse imprisonment changes
      if (description.includes('imprisoned unrest')) {
         const match = description.match(/convert (\d+) unrest to imprisoned/);
         if (match) {
            changes.unrest = -parseInt(match[1]);
            changes.imprisonedUnrest = parseInt(match[1]);
         } else if (description.includes('remove all imprisoned unrest')) {
            changes.imprisonedUnrestRemoved = 'all';
         } else if (description.includes('remove 1d4 imprisoned unrest')) {
            changes.imprisonedUnrestRemoved = '1d4';
         }
      }
      
      // Special outcomes
      if (effect.modifiers) {
         // If the action has specific modifiers, add them
         Object.assign(changes, effect.modifiers);
      }
      
      return changes;
   }
   
   // Handle action resolution from roll result
   async function onActionResolved(actionId: string, outcome: string, actorName: string, checkType?: string, skillName?: string) {
      console.log(`ActionsPhase: onActionResolved called`, { actionId, outcome, actorName, checkType, skillName });
      
      // Only handle action type checks
      if (checkType && checkType !== 'action') {
         console.log(`ActionsPhase: Skipping non-action check type: ${checkType}`);
         return;
      }
      
      // Check if already resolved to prevent duplicate processing
      if (resolvedActions.has(actionId)) {
         console.log(`ActionsPhase: Action ${actionId} already resolved, skipping`);
         return;
      }
      
      // Find the action to parse its outcome
      const action = PlayerActionsData.getAllActions().find(a => a.id === actionId);
      let stateChanges: Record<string, any> = {};
      
      if (action) {
         stateChanges = parseActionOutcome(action, outcome);
         console.log(`Parsed state changes for ${actionId}:`, stateChanges);
      }
      
      // Create new Map to trigger Svelte reactivity
      const newResolvedActions = new Map(resolvedActions);
      newResolvedActions.set(actionId, { 
         outcome, 
         actorName, 
         skillName: skillName || '',
         stateChanges
      });
      resolvedActions = newResolvedActions;
      actionsUsed++;
      
      // Force Svelte to update
      await tick();
      
      console.log(`ActionsPhase: Action resolved successfully`, { 
         actionId, 
         outcome, 
         skillName,
         stateChanges,
         resolvedActions: Array.from(resolvedActions.entries()) 
      });
   }
   
   // Check if an action has been resolved
   function isActionResolved(actionId: string): boolean {
      return resolvedActions.has(actionId);
   }
   
   // Get resolution info for an action
   function getActionResolution(actionId: string) {
      return resolvedActions.get(actionId);
   }
   
   // Check if action is available based on kingdom state
   function isActionAvailable(action: PlayerAction): boolean {
      // Check specific action requirements
      if (action.id === 'arrest-dissidents') {
         // Needs a justice structure with capacity
         // For now, return true as a placeholder
         return true;
      }
      
      if (action.id === 'execute-pardon-prisoners') {
         // Needs imprisoned unrest
         return $kingdomState.imprisonedUnrest > 0;
      }
      
      if (action.id === 'resolve-event') {
         // Needs resolvable modifiers
         return resolvableModifiers.length > 0;
      }
      
      if (action.cost) {
         // Check if kingdom has resources for the cost
         for (const [resource, amount] of action.cost.entries()) {
            const current = $kingdomState.resources.get(resource) || 0;
            if (current < amount) {
               return false;
            }
         }
      }
      
      return true;
   }
   
   // Handle modifier selection for Resolve Event action
   function handleModifierSelection(actionId: string) {
      if (actionId === 'resolve-event' && selectedModifierId) {
         const modifier = resolvableModifiers.find(m => m.id === selectedModifierId);
         if (modifier && modifier.resolution) {
            // Return the modifier's skills and DC for the action card
            return {
               skills: modifier.resolution.skills,
               dc: modifier.resolution.dc || 16,
               modifierName: modifier.name,
               modifierId: modifier.id
            };
         }
      }
      return null;
   }
   
   // Resolve a modifier after successful skill check
   async function resolveSelectedModifier(outcome: string, skill: string) {
      if (selectedModifierId) {
         const modifier = resolvableModifiers.find(m => m.id === selectedModifierId);
         if (modifier) {
            // Calculate roll result based on outcome
            let rollResult = 10; // Base
            const dc = modifier.resolution?.dc || 16;
            
            switch(outcome) {
               case 'criticalSuccess':
                  rollResult = dc + 10;
                  break;
               case 'success':
                  rollResult = dc + 1;
                  break;
               case 'failure':
                  rollResult = dc - 1;
                  break;
               case 'criticalFailure':
                  rollResult = 1;
                  break;
            }
            
            const result = resolveModifier(selectedModifierId, skill, rollResult);
            
            // If successfully resolved, clear the selection
            if (result.removed) {
               selectedModifierId = '';
            }
            
            return result;
         }
      }
      return null;
   }
   
   // Format outcome text
   function formatOutcome(outcome: any): string {
      if (!outcome) return '—';
      return outcome.description || '—';
   }
   
   // Initialize the global roll result handler
   initializeRollResultHandler();
   
   // Listen for kingdom roll completion events
   function handleRollComplete(event: CustomEvent) {
      const { checkId, outcome, actorName, checkType, skillName } = event.detail;
      
      // Only handle action type checks
      if (checkType === 'action') {
         onActionResolved(checkId, outcome, actorName, checkType, skillName);
      }
   }
   
   // Set up event listener when component mounts
   onMount(() => {
      window.addEventListener('kingdomRollComplete', handleRollComplete as EventListener);
      
      // Load player characters
      playerCharacters = getPlayerCharacters();
      
      // Only use the dropdown if the user has an assigned character
      const currentUserChar = getCurrentUserCharacter();
      if (currentUserChar) {
         // Only set the dropdown if the user actually has this character assigned
         selectedCharacter = currentUserChar;
         selectedCharacterId = currentUserChar.id;
      } else {
         // Clear the dropdown selection if user has no assigned character
         selectedCharacter = null;
         selectedCharacterId = '';
      }
   });
   
   // Clean up event listener when component unmounts
   onDestroy(() => {
      window.removeEventListener('kingdomRollComplete', handleRollComplete as EventListener);
   });
   
   // Update selected character when ID changes
   $: if (selectedCharacterId) {
      const player = playerCharacters.find(p => p.character?.id === selectedCharacterId);
      selectedCharacter = player?.character || null;
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
                  {#key `${action.id}-${resolvedActions.has(action.id) ? 'resolved' : 'pending'}-${resolvedActions.get(action.id)?.outcome || 'none'}`}
                     <div class="action-wrapper">
                        <!-- Show modifier selection for Resolve Event action -->
                        {#if action.id === 'resolve-event' && expandedActions.has(action.id) && !isActionResolved(action.id)}
                           <div class="modifier-selection">
                              <label for="modifier-select">Select Event to Resolve:</label>
                              <select 
                                 id="modifier-select"
                                 bind:value={selectedModifierId}
                                 class="modifier-dropdown"
                              >
                                 <option value="">Choose an ongoing event...</option>
                                 {#each resolvableModifiers as modifier}
                                    <option value={modifier.id}>
                                       {modifier.name} 
                                       {#if modifier.severity}
                                          ({modifier.severity})
                                       {/if}
                                    </option>
                                 {/each}
                              </select>
                              
                              {#if selectedModifierId}
                                 {@const selectedModifier = resolvableModifiers.find(m => m.id === selectedModifierId)}
                                 {#if selectedModifier}
                                    <div class="modifier-details">
                                       <p class="modifier-description">{selectedModifier.description}</p>
                                       {#if selectedModifier.effects}
                                          <div class="modifier-effects">
                                             <strong>Current Effects:</strong>
                                             {#if selectedModifier.effects.gold} Gold: {selectedModifier.effects.gold}/turn{/if}
                                             {#if selectedModifier.effects.food} Food: {selectedModifier.effects.food}/turn{/if}
                                             {#if selectedModifier.effects.unrest} Unrest: {selectedModifier.effects.unrest}/turn{/if}
                                          </div>
                                       {/if}
                                       {#if selectedModifier.resolution}
                                          <div class="resolution-info">
                                             <strong>Resolution:</strong>
                                             Skills: {selectedModifier.resolution.skills?.join(', ') || 'Any'}
                                             {#if selectedModifier.resolution.dc}
                                                (DC {selectedModifier.resolution.dc})
                                             {/if}
                                          </div>
                                       {/if}
                                    </div>
                                 {/if}
                              {/if}
                           </div>
                        {/if}
                        
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
                              // Update the dropdown when a character is selected via dialog
                              selectedCharacter = e.detail.character;
                              selectedCharacterId = e.detail.character?.id || '';
                           }}
                           on:reset={(e) => {
                              // Reset the action - remove from resolved and decrement counter
                              const actionId = e.detail.actionId;
                              if (resolvedActions.has(actionId)) {
                                 const newResolvedActions = new Map(resolvedActions);
                                 newResolvedActions.delete(actionId);
                                 resolvedActions = newResolvedActions;
                                 actionsUsed = Math.max(0, actionsUsed - 1);
                              }
                              
                              // Clear modifier selection if resetting resolve-event
                              if (actionId === 'resolve-event') {
                                 selectedModifierId = '';
                              }
                           }}
                           on:resolved={async (e) => {
                              // Handle modifier resolution for resolve-event action
                              if (action.id === 'resolve-event' && selectedModifierId) {
                                 const result = await resolveSelectedModifier(e.detail.outcome, e.detail.skill);
                                 if (result) {
                                    console.log('Modifier resolution result:', result);
                                 }
                              }
                           }}
                        />
                     </div>
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
   
   .action-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
   }
   
   .modifier-selection {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 15px;
      
      label {
         display: block;
         margin-bottom: 8px;
         color: var(--text-primary);
         font-weight: 600;
      }
      
      .modifier-dropdown {
         width: 100%;
         padding: 8px 12px;
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-sm);
         color: var(--text-primary);
         font-size: var(--type-body-size);
         margin-bottom: 12px;
         
         &:hover:not(:disabled) {
            border-color: var(--border-strong);
         }
         
         &:focus {
            outline: none;
            border-color: var(--color-amber);
            box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
         }
      }
   }
   
   .modifier-details {
      margin-top: 12px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--color-amber);
      
      .modifier-description {
         margin: 0 0 8px 0;
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: 1.5;
      }
      
      .modifier-effects {
         margin: 8px 0;
         padding: 8px;
         background: rgba(239, 68, 68, 0.1);
         border-radius: var(--radius-sm);
         color: var(--text-primary);
         font-size: var(--font-sm);
         
         strong {
            color: var(--color-amber);
            margin-right: 8px;
         }
      }
      
      .resolution-info {
         margin-top: 8px;
         padding: 8px;
         background: rgba(34, 197, 94, 0.1);
         border-radius: var(--radius-sm);
         color: var(--text-primary);
         font-size: var(--font-sm);
         
         strong {
            color: var(--color-green);
            margin-right: 8px;
         }
      }
   }
</style>
