<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import { PlayerActionsData, type PlayerAction } from '../../../models/PlayerActions';
   import ActionCard from '../../kingdom/components/ActionCard.svelte';
   import { onMount } from 'svelte';
   
   // Track expanded actions and selected actions
   let expandedActions = new Set<string>();
   let selectedActions: Map<string, { action: PlayerAction, skill: string }> = new Map();
   let actionsUsed = 0;
   const MAX_ACTIONS = 4;
   
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
   
   // Toggle action expansion
   function toggleAction(actionId: string) {
      if (expandedActions.has(actionId)) {
         expandedActions.delete(actionId);
      } else {
         expandedActions.add(actionId);
      }
      expandedActions = expandedActions; // Trigger reactivity
   }
   
   // Check if an action is expanded
   function isExpanded(actionId: string): boolean {
      return expandedActions.has(actionId);
   }
   
   // Select a skill for an action
   function selectSkill(action: PlayerAction, skill: string) {
      if (actionsUsed >= MAX_ACTIONS) {
         return; // Cannot select more actions
      }
      
      const key = `${action.id}-${skill}`;
      if (selectedActions.has(key)) {
         // Deselect
         selectedActions.delete(key);
         actionsUsed--;
      } else {
         // Select
         selectedActions.set(key, { action, skill });
         actionsUsed++;
      }
      selectedActions = selectedActions; // Trigger reactivity
   }
   
   // Check if a skill is selected
   function isSkillSelected(actionId: string, skill: string): boolean {
      return selectedActions.has(`${actionId}-${skill}`);
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
   
   // Format outcome text
   function formatOutcome(outcome: any): string {
      if (!outcome) return '—';
      return outcome.description || '—';
   }
   
   onMount(() => {
      // Any initialization if needed
   });
</script>

<div class="actions-phase">
   <!-- Header with action counter -->
   <div class="actions-header">
      <div class="actions-title">
         <i class="fas fa-users"></i>
         <span>Perform Kingdom Actions</span>
      </div>
      <div class="actions-counter">
         <span class="counter-text">PC Actions:</span>
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
               {#each actions as action}
                  {@const expanded = isExpanded(action.id)}
                  {@const available = isActionAvailable(action)}
                  {@const selectedSkills = new Set(
                     Array.from(selectedActions.entries())
                        .filter(([key, value]) => value.action.id === action.id)
                        .map(([key, value]) => value.skill)
                  )}
                  
                  <ActionCard 
                     {action}
                     {expanded}
                     {available}
                     {selectedSkills}
                     canSelectMore={actionsUsed < MAX_ACTIONS}
                     on:toggle={() => toggleAction(action.id)}
                     on:selectSkill={(e) => selectSkill(action, e.detail.skill)}
                  />
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
      font-size: var(--font-xl);
      font-weight: 600;
      color: var(--text-primary);
      
      i {
         color: var(--color-amber);
      }
   }
   
   .actions-counter {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .counter-text {
         color: var(--text-secondary);
         font-size: var(--font-md);
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
         font-weight: 600;
         font-size: var(--font-md);
      }
   }
   
   .action-category {
      background: rgba(0, 0, 0, 0.05);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      padding: 20px;
   }
   
   .category-header {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      align-items: start;
      
      .category-icon {
         font-size: 24px;
         color: var(--color-amber);
         margin-top: 3px;
      }
      
      .category-info {
         flex: 1;
      }
      
      .category-name {
         margin: 0 0 5px 0;
         font-size: var(--font-lg);
         font-weight: 600;
         color: var(--text-primary);
      }
      
      .category-description {
         margin: 0;
         color: var(--text-secondary);
         font-size: var(--font-sm);
         font-style: italic;
      }
   }
   
   .actions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
   }
</style>
