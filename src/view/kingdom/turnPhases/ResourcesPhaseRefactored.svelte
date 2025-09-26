<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomState, totalProduction } from '../../../stores/kingdom';
   import { markPhaseStepCompleted, isPhaseStepCompleted, gameState } from '../../../stores/gameState';
   import Button from '../components/baseComponents/Button.svelte';
   
   // Import clean architecture components
   import { createResourcePhaseController } from '../../../controllers/ResourcePhaseController';
   import type { ResourcePhaseController, ResourceCollectionSummary } from '../../../controllers/ResourcePhaseController';
   import type { ResourceCollectionResult } from '../../../services/economics';
   
   // Controller instance
   let resourceController: ResourcePhaseController;
   
   // UI State only - no business logic
   let collectCompleted = false;
   let lastCollectionResult: ResourceCollectionResult | null = null;
   let isCollecting = false;
   
   // Resource icons and colors - this is presentation configuration, belongs in component
   const resourceConfig: Record<string, { icon: string; color: string }> = {
      food: { icon: 'fa-wheat-awn', color: 'var(--color-brown-light)' },
      lumber: { icon: 'fa-tree', color: 'var(--color-green)' },
      stone: { icon: 'fa-cube', color: 'var(--color-gray-500)' },
      ore: { icon: 'fa-mountain', color: 'var(--color-blue)' },
      gold: { icon: 'fa-coins', color: 'var(--color-amber-light)' }
   };
   
   // Reactive UI state
   $: collectCompleted = isPhaseStepCompleted('resources-collect');
   
   // Calculate potential collection through controller
   $: potentialCollection = resourceController 
      ? resourceController.calculatePotentialCollection($kingdomState)
      : null;
   
   // Extract display values
   $: potentialGoldIncome = potentialCollection?.goldIncome || 0;
   $: fedSettlementsCount = potentialCollection?.fedSettlementsCount || 0;
   $: unfedSettlementsCount = potentialCollection?.unfedSettlementsCount || 0;
   
   // Initialize controller on mount
   onMount(() => {
      resourceController = createResourcePhaseController();
      
      // If resources were already collected, get the result from controller
      if (collectCompleted) {
         lastCollectionResult = resourceController.getLastCollectionResult();
      }
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
            $kingdomState,
            $gameState.currentTurn || 1
         );
         
         if (result.success && result.result) {
            // Store result for display
            lastCollectionResult = result.result;
            
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
   
   // Get worksite details from controller for display
   $: worksiteDetails = resourceController && potentialCollection
      ? resourceController.getWorksiteDetails($kingdomState.hexes)
      : [];
   
   // Get controller state for display
   $: controllerState = resourceController?.getState();
   $: phaseSummary = resourceController?.getPhaseSummary();
</script>

<div class="resources-phase">
   
   <!-- Resource Dashboard -->
   <div class="resource-dashboard">
      {#each Object.entries(resourceConfig) as [resource, config]}
         <div class="resource-card">
            <i class="fas {config.icon} resource-icon" style="color: {config.color};"></i>
            <div class="resource-info">
               <div class="resource-value">{$kingdomState.resources.get(resource) || 0}</div>
               <div class="resource-label">{resource}</div>
            </div>
         </div>
      {/each}
   </div>
   
   <!-- Collect Resources Button -->
   <div class="collect-button-container">
      <Button 
         variant="secondary"
         on:click={handleCollectResources} 
         disabled={collectCompleted || isCollecting}
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
   
   <!-- Show what was collected after clicking the button -->
   {#if collectCompleted && lastCollectionResult}
      <div class="collection-results">
         <h4>Resources Collected This Turn:</h4>
         <div class="collected-items">
            {#each Array.from(lastCollectionResult.totalCollected.entries()) as [resource, amount]}
               {#if amount > 0}
                  <div class="collected-item">
                     <i class="fas {resourceConfig[resource]?.icon}" style="color: {resourceConfig[resource]?.color};"></i>
                     <span class="collected-amount">+{amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}</span>
                  </div>
               {/if}
            {/each}
         </div>
      </div>
   {/if}
   
   <!-- Phase Step -->
   <div class="phase-steps-container">
      
      <!-- Step 1: Collect Resources and Revenue -->
      <div class="phase-step" class:completed={collectCompleted}>
         {#if collectCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Collect Resources and Revenue</h4>
         
         <!-- Resource Production -->
         {#if Object.keys($totalProduction).length > 0}
            <div class="production-summary">
               <div class="production-header">
                  <span class="production-title">Resource Production This Turn:</span>
                  <span class="production-total">
                     {#each Object.entries($totalProduction) as [resource, amount], i}
                        {#if i > 0} | {/if}
                        <span style="color: {resourceConfig[resource]?.color || 'var(--text-primary)'}">
                           +{amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
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
         {#if $kingdomState.settlements.length > 0}
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
      
      .resource-icon {
         font-size: 1.5rem;
      }
      
      .resource-info {
         display: flex;
         flex-direction: column;
      }
      
      .resource-value {
         font-size: 1.25rem;
         font-weight: bold;
         color: var(--text-primary);
      }
      
      .resource-label {
         font-size: 0.875rem;
         color: var(--text-tertiary);
         text-transform: capitalize;
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
         font-size: var(--type-heading-2-size);
         font-weight: var(--type-heading-2-weight);
         line-height: var(--type-heading-2-line);
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
         font-size: var(--type-body-size);
         font-weight: var(--type-weight-semibold);
         line-height: var(--type-body-line);
         color: var(--text-secondary);
      }
      
      .production-total {
         font-weight: 600;
         color: var(--color-green);
      }
   }
   
   .worksite-details {
      margin-top: 10px;
      
      summary {
         cursor: pointer;
         color: var(--text-tertiary);
         font-size: var(--font-sm);
         
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
      font-size: var(--font-sm);
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
         font-size: var(--type-body-size);
         font-weight: var(--type-weight-semibold);
         line-height: var(--type-body-line);
         color: var(--text-secondary);
         flex: 1;
      }
      
      .income-amount {
         font-size: var(--type-body-size);
         font-weight: var(--type-weight-semibold);
      }
   }
   
   .income-note {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      
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
   
   .collection-results {
      background: linear-gradient(135deg, 
         rgba(34, 197, 94, 0.15),
         rgba(24, 24, 27, 0.3));
      padding: 20px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-green-border);
      text-align: center;
      
      h4 {
         margin: 0 0 15px 0;
         color: var(--text-primary);
         font-size: var(--type-heading-2-size);
         font-weight: var(--type-heading-2-weight);
      }
   }
   
   .collected-items {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
   }
   
   .collected-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      i {
         font-size: 20px;
      }
      
      .collected-amount {
         color: var(--text-primary);
         font-size: var(--font-md);
         font-weight: 600;
      }
   }
   
   .phase-summary {
      margin-top: 15px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      .summary-title {
         font-weight: 600;
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
