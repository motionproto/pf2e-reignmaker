<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomData, setResource, markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/kingdomActor';
   import Button from '../components/baseComponents/Button.svelte';
   import { tick } from 'svelte';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // Import clean architecture components
   import { createResourcePhaseController } from '../../../controllers/ResourcePhaseController';
   import type { ResourcePhaseController, ResourcePhaseDisplayData } from '../../../controllers/ResourcePhaseController';
   
   // Controller instance
   let resourceController: ResourcePhaseController;
   
   // UI State only
   let isCollecting = false;
   let displayData: ResourcePhaseDisplayData | null = null;
   
   // Resource icons and colors - this is presentation configuration, belongs in component
   const resourceConfig: Record<string, { icon: string; color: string }> = {
      food: { icon: 'fa-wheat-awn', color: 'var(--color-brown-light)' },
      lumber: { icon: 'fa-tree', color: 'var(--color-green)' },
      stone: { icon: 'fa-cube', color: 'var(--color-gray-500)' },
      ore: { icon: 'fa-mountain', color: 'var(--color-blue)' },
      gold: { icon: 'fa-coins', color: 'var(--color-amber-light)' }
   };
   
   // Edit state management
   let editingResource: string | null = null;
   let editValue: number = 0;
   let editInputElement: HTMLInputElement | undefined;
   
   async function startEditing(resource: string) {
      editingResource = resource;
      editValue = currentResources.get(resource) || 0;
      await tick();
      if (editInputElement) {
         editInputElement.focus();
         editInputElement.select();
      }
   }
   
   function saveEdit() {
      if (editingResource) {
         setResource(editingResource, Math.max(0, Math.floor(editValue)));
         editingResource = null;
      }
   }
   
   function cancelEdit() {
      editingResource = null;
      editValue = 0;
   }
   
   function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
         saveEdit();
      } else if (e.key === 'Escape') {
         cancelEdit();
      }
   }
   
   // Reactive: Get all display data from controller in one call
   $: if (resourceController && $kingdomData) {
      displayData = resourceController.getDisplayData($kingdomData);
   }
   
   // Extract commonly used values from display data for template convenience
   $: collectCompleted = displayData?.collectionCompleted || isPhaseStepCompleted('resources-collect');
   $: currentResources = displayData?.currentResources || new Map();
   $: totalProduction = displayData?.totalProduction || new Map();
   $: worksiteDetails = displayData?.worksiteDetails || [];
   $: potentialGoldIncome = displayData?.potentialGoldIncome || 0;
   $: fedSettlementsCount = displayData?.fedSettlementsCount || 0;
   $: unfedSettlementsCount = displayData?.unfedSettlementsCount || 0;
   $: settlementCount = displayData?.settlementCount || 0;
   $: lastCollectionResult = displayData?.lastCollectionResult || null;
   $: phaseSummary = displayData?.phaseSummary || null;
   
   // Initialize controller on mount
   onMount(() => {
      resourceController = createResourcePhaseController();
   });
   
   // Clean up on destroy
   onDestroy(() => {
      if (resourceController) {
         resourceController.resetState();
      }
   });
   
   // Handle resource collection using controller and commands
   async function handleCollectResources() {
      if (!resourceController || isCollecting) return;
      
      isCollecting = true;
      
      try {
         // Use controller to collect resources - it handles everything
         const result = await resourceController.collectResources(
            $kingdomData,
            $kingdomData.currentTurn || 1
         );
         
         if (result.success && result.result) {
            // Log for transparency
            console.log('Resources collected:', {
               hexProduction: Object.fromEntries(result.result.hexProduction),
               goldIncome: result.result.goldIncome,
               totalCollected: Object.fromEntries(result.result.totalCollected),
               fedSettlements: result.result.fedSettlementsCount,
               unfedSettlements: result.result.unfedSettlementsCount
            });
            
            // Mark step as completed - this is a UI concern
            markPhaseStepCompleted('resources-collect');
            
            // Update display data after successful collection
            displayData = resourceController.getDisplayData($kingdomData);
         } else {
            console.error('Failed to collect resources:', result.error);
            // TODO: Show user-friendly error message
         }
      } catch (error) {
         console.error('Error collecting resources:', error);
         // TODO: Show user-friendly error message
      } finally {
         isCollecting = false;
      }
   }
</script>

<div class="resources-phase">
   
   <!-- Resource Dashboard -->
   <div class="resource-dashboard">
      {#each Object.entries(resourceConfig) as [resource, config]}
         <!-- svelte-ignore a11y-click-events-have-key-events -->
         <!-- svelte-ignore a11y-no-static-element-interactions -->
         <div 
            class="resource-card" 
            class:editing={editingResource === resource}
            style="--resource-color: {config.color};"
            on:click={() => startEditing(resource)}
         >
            <i class="fas {config.icon} resource-icon" style="color: {config.color};"></i>
            <div class="resource-info">
               {#if editingResource === resource}
                  <input
                     bind:this={editInputElement}
                     type="number"
                     bind:value={editValue}
                     on:keydown={handleKeydown}
                     on:click|stopPropagation
                     class="resource-edit-input"
                     min="0"
                  />
                  <div class="edit-buttons">
                     <button 
                        class="save-btn" 
                        on:click|stopPropagation={saveEdit} 
                        aria-label="Save"
                        title="Save"
                     >
                        <i class="fas fa-check"></i>
                     </button>
                     <button 
                        class="cancel-btn" 
                        on:click|stopPropagation={cancelEdit} 
                        aria-label="Cancel"
                        title="Cancel"
                     >
                        <i class="fas fa-times"></i>
                     </button>
                  </div>
               {:else}
                  <div class="resource-value">{currentResources.get(resource) || 0}</div>
                  <div class="resource-label">{resource}</div>
               {/if}
            </div>
         </div>
      {/each}
   </div>
   
   <!-- Collect Resources Button -->
   <div class="collect-button-container">
   <Button 
      variant="secondary"
      on:click={handleCollectResources} 
      disabled={!isViewingCurrentPhase || collectCompleted || isCollecting}
      icon={collectCompleted ? "fas fa-check" : isCollecting ? "fas fa-spinner fa-spin" : "fas fa-hand-holding-usd"}
      iconPosition="left"
   >
      {#if collectCompleted}
         Resources Collected
      {:else if isCollecting}
         Collecting...
      {:else}
         Collect Resources
      {/if}
</Button>
   </div>
   
   <!-- Phase Steps -->
   <div class="phase-steps-container">
      
      <!-- Step 1: Collect Resources and Revenue -->
      <div class="phase-step" class:completed={collectCompleted}>
         <!-- Resource Production -->
         {#if totalProduction.size > 0}
            {@const productionList = Object.keys(resourceConfig)
               .filter(resource => (totalProduction.get(resource) || 0) > 0)
               .map(resource => ({resource, amount: totalProduction.get(resource)}))}
            <div class="production-summary">
               <div class="production-header">
                  <span class="production-title">Resource Production This Turn:</span>
                  <span class="production-total">
                     {#each productionList as item, i}
                        {#if i > 0} | {/if}
                        <span style="color: {resourceConfig[item.resource]?.color || 'var(--text-primary)'}">
                           +{item.amount} {item.resource.charAt(0).toUpperCase() + item.resource.slice(1)}
                        </span>
                     {/each}
                  </span>
               </div>
               
               {#if worksiteDetails.length > 0}
                  <details class="worksite-details">
                     <summary>View Worksite Details</summary>
                     <ul class="worksite-list">
                        {#each worksiteDetails as worksite}
                           <li class="worksite-item">
                              <span>{worksite.hexName} ({worksite.terrain})</span>
                              <span class="worksite-production">
                                 {#each Array.from(worksite.production.entries()) as [resource, amount], i}
                                    {#if i > 0}, {/if}
                                    {amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                                 {/each}
                              </span>
                           </li>
                        {/each}
                     </ul>
                  </details>
               {/if}
            </div>
         {:else}
            <div class="no-production">
               No worksites currently producing resources
            </div>
         {/if}
         
         <!-- Gold Income from Settlements -->
         {#if settlementCount > 0}
            <div class="gold-income-summary">
               <div class="income-header">
                  <i class="fas fa-coins" style="color: var(--color-amber-light);"></i>
                  <span class="income-title">Settlement Gold Income:</span>
                  {#if potentialGoldIncome > 0}
                     <span class="income-amount" style="color: var(--color-amber-light);">
                        +{potentialGoldIncome} Gold
                     </span>
                  {:else}
                     <span class="income-amount" style="color: var(--text-tertiary);">
                        No gold income
                     </span>
                  {/if}
               </div>
               
               {#if unfedSettlementsCount > 0}
                  <div class="income-note warning">
                     <i class="fas fa-exclamation-triangle"></i>
                     {unfedSettlementsCount} settlement{unfedSettlementsCount > 1 ? 's' : ''} not generating gold (unfed last turn)
                  </div>
               {:else if fedSettlementsCount > 0}
                  <div class="income-note success">
                     <i class="fas fa-check-circle"></i>
                     All settlements were fed last turn and generate gold
                  </div>
               {/if}
            </div>
         {/if}
         
         <!-- Summary of what controller has collected this phase -->
         {#if phaseSummary && collectCompleted}
            <div class="phase-summary">
               <div class="summary-title">Phase Summary:</div>
               <div class="summary-details">
                  <span>Hex Production: {phaseSummary.hexProduction.size} resource types</span>
                  <span>Gold Income: {phaseSummary.goldIncome} gold</span>
                  <span>Total Resources: {phaseSummary.totalCollected.size} types collected</span>
               </div>
            </div>
         {/if}
      </div>
      
   </div>
</div>

<style lang="scss">
   .resources-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .resource-dashboard {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
   }
   
   .resource-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      outline: 2px solid transparent;
      outline-offset: 2px;
      transition: all 0.2s ease;
      position: relative;
      
      &:hover:not(.editing) {
         outline-color: var(--resource-color);
         background: rgba(0, 0, 0, 0.3);
      }
      
      &.editing {
         outline-width: 3px;
         outline-color: var(--resource-color);
         background: linear-gradient(135deg, 
            rgba(0, 0, 0, 0.3),
            color-mix(in srgb, var(--resource-color) 10%, transparent)
         );
      }
      
      .resource-icon {
         font-size: 1.5rem;
      }
      
      .resource-info {
         display: flex;
         flex-direction: column;
         min-width: 80px;
      }
      
      .resource-value {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-bold);
         color: var(--text-primary);
      }
      
      .resource-label {
         font-size: var(--font-sm);
         color: var(--text-tertiary);
         text-transform: capitalize;
      }
      
      .resource-edit-input {
         width: 80px;
         padding: 0.25rem 0.5rem;
         border: 2px solid var(--resource-color);
         border-radius: 0.25rem;
         background: var(--bg-surface);
         color: var(--text-primary);
         font-size: var(--font-xl);
         font-weight: var(--font-weight-bold);
         text-align: center;
         
         &:focus {
            outline: none;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--resource-color) 20%, transparent);
         }
      }
      
      /* Remove number input arrows for cleaner look */
      .resource-edit-input::-webkit-inner-spin-button,
      .resource-edit-input::-webkit-outer-spin-button {
         -webkit-appearance: none;
         margin: 0;
      }
      
      .resource-edit-input[type="number"] {
         -moz-appearance: textfield;
      }
      
      .edit-buttons {
         display: flex;
         gap: 0.25rem;
         margin-top: 0.25rem;
      }
      
      .save-btn,
      .cancel-btn {
         flex: 1;
         padding: 0.25rem;
         border: 1px solid var(--border-default);
         background: var(--bg-surface);
         border-radius: 0.25rem;
         display: flex;
         align-items: center;
         justify-content: center;
         cursor: pointer;
         transition: all var(--transition-fast);
         color: var(--text-primary);
         font-size: 0.75rem;
         
         i {
            font-size: 0.75rem;
         }
      }
      
      .save-btn:hover {
         background: var(--color-success);
         border-color: var(--color-success);
         color: white;
      }
      
      .cancel-btn:hover {
         background: var(--color-danger);
         border-color: var(--color-danger);
         color: white;
      }
      
      .save-btn:active,
      .cancel-btn:active {
         transform: scale(0.95);
      }
   }
   
   .phase-steps-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
   }
   
   .phase-step {
      position: relative;
      background: rgba(0, 0, 0, 0.05);
      padding: 20px;
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
      
      h4 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--font-xl);  /* 20px */
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
      }
   }
   
   .phase-step-complete {
      position: absolute;
      top: 15px;
      right: 15px;
      color: var(--color-green);
      font-size: 20px;
   }
   
   .production-summary {
      margin: 15px 0;
      padding: 15px;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      
      .production-header {
         display: flex;
         justify-content: space-between;
         align-items: center;
         margin-bottom: 10px;
         flex-wrap: wrap;
         gap: 10px;
      }
      
      .production-title {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.5;
         color: var(--text-primary);
      }
      
      .production-total {
         font-size: var(--font-2xl);  /* 18px */
         font-weight: var(--font-weight-semibold);
         color: var(--color-green);
      }
   }
   
   .worksite-details {
      margin-top: 10px;
      
      summary {
         cursor: pointer;
         color: var(--text-tertiary);
         font-size: var(--font-lg);
         
         &:hover {
            color: var(--text-secondary);
         }
      }
   }
   
   .worksite-list {
      margin: 10px 0 0 0;
      padding: 0;
      list-style: none;
   }
   
   .worksite-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      margin-bottom: 5px;
      font-size: var(--font-m);
      color: var(--text-secondary);
      
      .worksite-production {
         color: var(--text-primary);
      }
   }
   
   .no-production {
      padding: 15px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      text-align: center;
      color: var(--text-tertiary);
      font-style: italic;
   }
   
   .gold-income-summary {
      margin: 15px 0;
      padding: 15px;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      
      .income-header {
         display: flex;
         align-items: center;
         gap: 10px;
         margin-bottom: 10px;
         
         i {
            font-size: 20px;
         }
      }
      
      .income-title {
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.5;
         color: var(--text-primary);
         flex: 1;
      }
      
      .income-amount {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
      }
   }
   
   .income-note {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: var(--font-m);
      
      &.warning {
         background: rgba(245, 158, 11, 0.1);
         color: var(--color-amber-light);
         border: 1px solid var(--color-amber);
         
         i {
            font-size: 14px;
         }
      }
      
      &.success {
         background: rgba(34, 197, 94, 0.1);
         color: var(--color-green-light);
         border: 1px solid var(--color-green);
         
         i {
            font-size: 14px;
         }
      }
   }
   
   .collect-button-container {
      display: flex;
      justify-content: center;
      padding: 0;
   }
   
   .phase-summary {
      margin-top: 15px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      .summary-title {
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
         margin-bottom: 8px;
      }
      
      .summary-details {
         display: flex;
         gap: 15px;
         flex-wrap: wrap;
         font-size: var(--font-sm);
         color: var(--text-secondary);
         
         span {
            display: flex;
            align-items: center;
            gap: 5px;
         }
      }
   }
</style>
