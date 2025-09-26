<script lang="ts">
   import { onMount } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState, markPhaseStepCompleted, isPhaseStepCompleted, canOperatePhase } from '../../../stores/gameState';
   import { TurnPhase } from '../../../models/KingdomState';
   
   // Import clean architecture components
   import { createStatusPhaseController } from '../../../controllers/StatusPhaseController';
   import type { StatusPhaseController } from '../../../controllers/StatusPhaseController';
   import { UpdateResourcesCommand } from '../../../commands/impl/UpdateResourcesCommand';
   import { commandExecutor } from '../../../commands/base/CommandExecutor';
   import type { CommandContext } from '../../../commands/base/Command';
   
   // Import UI components
   import Button from '../components/baseComponents/Button.svelte';
   
   // Controller instance
   let statusController: StatusPhaseController;
   
   // Constants
   const MAX_FAME = 3;
   
   // UI State only - no business logic
   let processingFame = false;
   let processingModifiers = false;
   
   // Reactive UI state
   $: gainFameCompleted = isPhaseStepCompleted('gain-fame');
   $: applyModifiersCompleted = isPhaseStepCompleted('apply-modifiers');
   $: canOperate = canOperatePhase(TurnPhase.PHASE_I);
   $: fameAtMax = $kingdomState.fame >= MAX_FAME;
   $: hasModifiers = $kingdomState.modifiers && $kingdomState.modifiers.length > 0;
   
   // Initialize controller on mount
   onMount(() => {
      statusController = createStatusPhaseController();
   });
   
   // Gain fame using controller and command pattern
   async function gainFame() {
      if (!canOperate || !statusController) {
         console.warn('Cannot operate Status Phase - previous phases not complete or controller not ready');
         return;
      }
      
      processingFame = true;
      
      try {
         // Create command context
         const context: CommandContext = {
            kingdomState: get(kingdomState),
            currentTurn: $gameState.currentTurn || 1,
            currentPhase: 'Phase I: Kingdom Status'
         };
         
         // Standard fame gain (1 per turn, max 3)
         if ($kingdomState.fame < MAX_FAME) {
            const command = new UpdateResourcesCommand([{
               resource: 'fame',
               amount: 1,
               operation: 'add'
            }]);
            
            const result = await commandExecutor.execute(command, context);
            
            if (result.success) {
               markPhaseStepCompleted('gain-fame');
            } else {
               console.error('Failed to gain fame:', result.error);
            }
         } else {
            // Fame is at max, just mark as complete
            markPhaseStepCompleted('gain-fame');
         }
         
         // Check for milestones using controller
         const milestones = statusController.checkMilestones($kingdomState);
         if (milestones.length > 0) {
            // Apply milestone fame gains
            for (const milestone of milestones) {
               if (milestone.fameGained > 0 && $kingdomState.fame < MAX_FAME) {
                  const milestoneCommand = new UpdateResourcesCommand([{
                     resource: 'fame',
                     amount: milestone.fameGained,
                     operation: 'add'
                  }]);
                  
                  await commandExecutor.execute(milestoneCommand, context);
               }
            }
         }
      } finally {
         processingFame = false;
      }
   }
   
   // Apply ongoing modifiers using controller and command pattern
   async function applyOngoingModifiers() {
      if (!canOperate || !statusController) {
         console.warn('Cannot operate Status Phase - previous phases not complete or controller not ready');
         return;
      }
      
      processingModifiers = true;
      
      try {
         // Create command context
         const context: CommandContext = {
            kingdomState: get(kingdomState),
            currentTurn: $gameState.currentTurn || 1,
            currentPhase: 'Phase I: Kingdom Status'
         };
         
         // Process modifiers using controller
         const result = await statusController.processModifiers(
            $kingdomState,
            $gameState.currentTurn || 1
         );
         
         if (result.success && result.changes.size > 0) {
            // Apply each change through commands
            for (const [resource, amount] of result.changes) {
               const command = new UpdateResourcesCommand([{
                  resource,
                  amount,
                  operation: amount >= 0 ? 'add' : 'subtract'
               }]);
               
               await commandExecutor.execute(command, context);
            }
         }
         
         // Expire old modifiers
         statusController.expireModifiers($kingdomState, $gameState.currentTurn || 1);
         
         markPhaseStepCompleted('apply-modifiers');
      } finally {
         processingModifiers = false;
      }
   }
   
   // Get controller state for display
   $: controllerState = statusController?.getState();
   $: phaseSummary = statusController?.getPhaseSummary();
</script>

<div class="status-phase">
   <div class="phase-steps">
      <div class="phase-step fame-step" class:completed={gainFameCompleted}>
         <!-- Centered Fame Display -->
         <div class="fame-container">
            <div class="fame-stars-display">
               <div class="fame-stars">
                  {#each Array(MAX_FAME) as _, i}
                     <i 
                        class="{i < $kingdomState.fame ? 'fas' : 'far'} fa-star star-icon" 
                        class:filled={i < $kingdomState.fame}
                     ></i>
                  {/each}
               </div>
               <p class="fame-count">Fame: {$kingdomState.fame} / {MAX_FAME}</p>
            </div>
            
            <Button
               variant="secondary"
               on:click={gainFame}
               disabled={gainFameCompleted || processingFame || !canOperate}
               icon={gainFameCompleted ? 'fas fa-check' : (processingFame ? 'fas fa-spinner fa-spin' : 'fas fa-star')}
               tooltip={!canOperate ? 'Complete previous phases first' : undefined}
            >
               {#if gainFameCompleted}
                  Fame Gained
               {:else if processingFame}
                  Processing...
               {:else if fameAtMax}
                  Fame at Maximum
               {:else if !canOperate}
                  Complete Previous Phases
               {:else}
                  Gain 1 Fame
               {/if}
            </Button>
            
            <p class="step-description">
               {#if fameAtMax}
                  Your kingdom has achieved maximum fame!
               {:else}
                  Your kingdom gains 1 Fame point this turn.
               {/if}
            </p>
            
            {#if phaseSummary?.milestonesAchieved && phaseSummary.milestonesAchieved.length > 0}
               <div class="milestones-achieved">
                  <h5>Milestones Achieved:</h5>
                  <ul>
                     {#each phaseSummary.milestonesAchieved as milestone}
                        <li>{milestone}</li>
                     {/each}
                  </ul>
               </div>
            {/if}
         </div>
      </div>
      
      <div class="phase-step" class:completed={applyModifiersCompleted || (!hasModifiers && gainFameCompleted)}>
         <Button
            variant="secondary"
            on:click={applyOngoingModifiers}
            disabled={applyModifiersCompleted || processingModifiers || !canOperate || !hasModifiers}
            icon={applyModifiersCompleted && hasModifiers ? 'fas fa-check' : (!hasModifiers ? 'fas fa-ban' : (processingModifiers ? 'fas fa-spinner fa-spin' : 'fas fa-magic'))}
            tooltip={!canOperate ? 'Complete previous phases first' : !hasModifiers ? 'No modifiers exist to apply' : undefined}
         >
            {#if applyModifiersCompleted && hasModifiers}
               Modifiers Applied
            {:else if processingModifiers}
               Processing...
            {:else if !hasModifiers}
               No Modifiers (Skipped)
            {:else if !canOperate}
               Complete Previous Phases
            {:else}
               Apply Ongoing Modifiers
            {/if}
         </Button>
         <p class="step-description">
            {#if !hasModifiers}
               No ongoing modifiers to apply this turn.
            {:else}
               Apply all ongoing effects and reduce their duration.
            {/if}
         </p>
         
         {#if $kingdomState.modifiers && $kingdomState.modifiers.length > 0}
            <div class="modifiers-list">
               <h5>Active Modifiers:</h5>
               <ul>
                  {#each $kingdomState.modifiers as modifier}
                     <li class="modifier-item">
                        <strong>{modifier.name}</strong>
                        {#if modifier.description}
                           <span class="modifier-description">: {modifier.description}</span>
                        {/if}
                        {#if typeof modifier.duration === 'number' && modifier.duration > 0}
                           <span class="modifier-duration">({modifier.duration} turns remaining)</span>
                        {:else if modifier.duration === 'until-resolved'}
                           <span class="modifier-duration">(Until Resolved)</span>
                        {:else if modifier.duration === 'permanent'}
                           <span class="modifier-duration">(Permanent)</span>
                        {/if}
                     </li>
                  {/each}
               </ul>
            </div>
         {/if}
      </div>
   </div>
   
   <div class="phase-summary">
      <h4>Phase Summary:</h4>
      <p>Current Fame: {$kingdomState.fame} / {MAX_FAME}</p>
      <p>Active Modifiers: {$kingdomState.modifiers ? $kingdomState.modifiers.length : 0}</p>
      {#if $kingdomState.modifiers && $kingdomState.modifiers.length > 0}
         <p class="modifier-count">
            {$kingdomState.modifiers.filter(m => typeof m.duration === 'number').length} temporary, 
            {$kingdomState.modifiers.filter(m => m.duration === 'permanent').length} permanent,
            {$kingdomState.modifiers.filter(m => m.duration === 'until-resolved').length} until resolved
         </p>
      {/if}
      {#if phaseSummary && phaseSummary.modifiersApplied > 0}
         <p class="modifiers-applied">
            Applied {phaseSummary.modifiersApplied} modifier effects this turn
         </p>
      {/if}
   </div>
</div>

<style lang="scss">
   /* Styles remain exactly the same as original */
   .fame-step {
      text-align: center;
   }
   
   .fame-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
   }
   
   .fame-stars-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 15px 25px;
      background: linear-gradient(135deg, 
         rgba(15, 15, 17, 0.4), 
         rgba(24, 24, 27, 0.3));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
   }
   
   .fame-stars {
      display: flex;
      gap: 12px;
      justify-content: center;
      align-items: center;
   }
   
   .star-icon {
      font-size: 48px;
      transition: all 0.3s ease;
      color: var(--color-gray-600);
      
      &.filled {
         color: var(--color-amber-light);
         text-shadow: 
            0 0 20px rgba(251, 191, 36, 0.4),
            0 2px 4px rgba(0, 0, 0, 0.3);
         transform: scale(1.05);
         
         &:hover {
            transform: scale(1.1) rotate(5deg);
         }
      }
      
      &:not(.filled) {
         opacity: 0.3;
         
         &:hover {
            opacity: 0.5;
            transform: scale(1.05);
         }
      }
   }
   
   .fame-count {
      margin: 0;
      color: var(--color-amber-light);
      font-size: var(--type-label-size);
      font-weight: var(--type-label-weight);
      line-height: var(--type-label-line);
      letter-spacing: var(--type-label-spacing);
      text-transform: uppercase;
   }
   
   .phase-steps {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 20px;
   }
   
   .phase-step {
      background: rgba(0, 0, 0, 0.05);
      padding: 15px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      transition: all 0.2s ease;
      
      &.completed {
         background: rgba(34, 197, 94, 0.1);
         border-color: var(--color-green-border);
      }
      
      &:hover:not(.completed) {
         background: rgba(0, 0, 0, 0.08);
         border-color: var(--border-default);
      }
   }
   
   .step-description {
      margin: 10px 0 0 0;
      color: var(--text-tertiary);
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
   }
   
   .milestones-achieved {
      margin-top: 15px;
      padding: 12px;
      background: rgba(34, 197, 94, 0.1);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-green);
      
      h5 {
         margin: 0 0 8px 0;
         color: var(--color-green);
         font-size: var(--type-heading-3-size);
         font-weight: var(--type-heading-3-weight);
         line-height: var(--type-heading-3-line);
      }
      
      ul {
         margin: 0;
         padding-left: 20px;
         list-style-type: none;
      }
      
      li {
         color: var(--color-green-light);
         position: relative;
         
         &::before {
            content: "✓";
            position: absolute;
            left: -15px;
            color: var(--color-green);
         }
      }
   }
   
   .modifiers-list {
      margin-top: 15px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-amber);
      
      h5 {
         margin: 0 0 8px 0;
         color: var(--color-amber-light);
         font-size: var(--type-heading-3-size);
         font-weight: var(--type-heading-3-weight);
         line-height: var(--type-heading-3-line);
      }
      
      ul {
         margin: 0;
         padding-left: 20px;
         list-style-type: none;
      }
   }
   
   .modifier-item {
      margin: 6px 0;
      color: var(--text-secondary);
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
      position: relative;
      
      &::before {
         content: "▸";
         position: absolute;
         left: -15px;
         color: var(--color-amber);
      }
      
      strong {
         color: var(--text-primary);
         font-weight: 600;
      }
      
      .modifier-description {
         color: var(--text-secondary);
      }
      
      .modifier-duration {
         color: var(--color-amber);
         font-size: var(--font-xs);
         margin-left: 4px;
         font-style: italic;
      }
   }
   
   .phase-summary {
      background: linear-gradient(135deg,
         rgba(var(--color-gray-850), 0.5),
         rgba(var(--color-gray-800), 0.3));
      padding: 15px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      h4 {
         margin: 0 0 10px 0;
         color: var(--text-primary);
         font-size: var(--type-heading-2-size);
         font-weight: var(--type-heading-2-weight);
         line-height: var(--type-heading-2-line);
      }
      
      p {
         margin: 5px 0;
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
         
         &.modifier-count,
         &.modifiers-applied {
            font-size: var(--type-body-size);
            color: var(--text-tertiary);
            font-style: italic;
         }
      }
   }
</style>
