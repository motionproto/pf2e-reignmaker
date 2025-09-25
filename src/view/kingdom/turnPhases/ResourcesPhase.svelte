<script lang="ts">
   import { kingdomState, modifyResource, totalProduction } from '../../../stores/kingdom';
   import { markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import { economicsService, type ResourceCollectionResult } from '../../../services/economics';
   import { get } from 'svelte/store';
   import Button from '../components/baseComponents/Button.svelte';
   
   // Check if step is completed
   $: collectCompleted = isPhaseStepCompleted('resources-collect');
   
   // Resource icons and colors - this is presentation configuration, belongs in component
   const resourceConfig: Record<string, { icon: string; color: string }> = {
      food: { icon: 'fa-wheat-awn', color: 'var(--color-brown-light)' },
      lumber: { icon: 'fa-tree', color: 'var(--color-green)' },
      stone: { icon: 'fa-cube', color: 'var(--color-gray-500)' },
      ore: { icon: 'fa-mountain', color: 'var(--color-blue)' },
      gold: { icon: 'fa-coins', color: 'var(--color-amber-light)' }
   };
   
   // Store the last collection result for display purposes
   let lastCollectionResult: ResourceCollectionResult | null = null;
   
   // Use the economics service to calculate what would be collected this turn
   $: potentialCollection = economicsService.collectTurnResources({
      hexes: $kingdomState.hexes,
      settlements: $kingdomState.settlements,
      cachedProduction: $kingdomState.cachedProduction,
      cachedProductionByHex: $kingdomState.cachedProductionByHex
   });
   
   // Extract display values from the service result
   $: potentialGoldIncome = potentialCollection.goldIncome;
   $: fedSettlementsCount = potentialCollection.fedSettlementsCount;
   $: unfedSettlementsCount = potentialCollection.unfedSettlementsCount;
   
   function handleCollectResources() {
      try {
         const state = get(kingdomState);
         
         // Use the economics service to calculate resources to collect
         const collectionResult = economicsService.collectTurnResources({
            hexes: state.hexes,
            settlements: state.settlements,
            cachedProduction: state.cachedProduction,
            cachedProductionByHex: state.cachedProductionByHex
         });
         
         // Store result for display
         lastCollectionResult = collectionResult;
         
         // Log for debugging/transparency
         console.log('Collecting resources:', {
            hexProduction: Object.fromEntries(collectionResult.hexProduction),
            goldIncome: collectionResult.goldIncome,
            totalCollected: Object.fromEntries(collectionResult.totalCollected),
            fedSettlements: collectionResult.fedSettlementsCount,
            unfedSettlements: collectionResult.unfedSettlementsCount
         });
         
         // Apply all collected resources to the kingdom state
         collectionResult.totalCollected.forEach((amount, resource) => {
            if (amount > 0) {
               modifyResource(resource, amount);
            }
         });
         
         markPhaseStepCompleted('resources-collect');
      } catch (error) {
         console.error('Error collecting resources:', error);
         // TODO: Show user-friendly error message
      }
   }
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
   
   <!-- Collect Resources Button (moved here for better visibility) -->
   <div class="collect-button-container">
      <Button 
         variant="secondary"
         on:click={handleCollectResources} 
         disabled={collectCompleted}
         icon={collectCompleted ? "fas fa-check" : "fas fa-hand-holding-usd"}
         iconPosition="left"
      >
         {collectCompleted ? 'Resources Collected' : 'Collect Resources'}
      </Button>
   </div>
   
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
               
               {#if potentialCollection.details.hexCount > 0}
                  <details class="worksite-details">
                     <summary>View Worksite Details</summary>
                     <ul class="worksite-list">
                        {#each potentialCollection.details.productionByHex as worksite}
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
   
   .collect-button {
      padding: 12px 24px;
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      line-height: var(--type-button-line);
      letter-spacing: var(--type-button-spacing);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all var(--transition-fast);
      
      &:hover:not(:disabled) {
         background: var(--btn-secondary-hover);
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: var(--shadow-md);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
         background: var(--color-gray-700);
      }
      
      i {
         font-size: 1em;
      }
   }
   
   .step-button {
      padding: 10px 16px;
      background: var(--btn-secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      line-height: var(--type-button-line);
      letter-spacing: var(--type-button-spacing);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all var(--transition-fast);
      margin-top: 10px;
      
      &:hover:not(:disabled) {
         background: var(--btn-secondary-hover);
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: var(--shadow-md);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
         background: var(--color-gray-700);
      }
      
      i {
         font-size: 1em;
      }
   }
</style>
