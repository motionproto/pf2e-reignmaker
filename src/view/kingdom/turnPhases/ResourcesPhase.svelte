<script lang="ts">
   import { kingdomState, modifyResource, totalProduction } from '../../../stores/kingdom';
   import { markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import { settlementService } from '../../../services/settlements';
   import { get } from 'svelte/store';
   
   // Check if step is completed
   $: collectCompleted = isPhaseStepCompleted('resources-collect');
   
   // Resource icons and colors
   const resourceConfig: Record<string, { icon: string; color: string }> = {
      food: { icon: 'fa-wheat-awn', color: 'var(--color-brown-light)' },
      lumber: { icon: 'fa-tree', color: 'var(--color-green)' },
      stone: { icon: 'fa-cube', color: 'var(--color-gray-500)' },
      ore: { icon: 'fa-mountain', color: 'var(--color-blue)' },
      gold: { icon: 'fa-coins', color: 'var(--color-amber-light)' }
   };
   
   // Calculate potential gold income from settlements (based on last turn's feeding)
   $: potentialGoldIncome = settlementService.calculateSettlementGoldIncome($kingdomState.settlements);
   $: fedSettlementsCount = $kingdomState.settlements.filter(s => s.wasFedLastTurn).length;
   $: unfedSettlementsCount = $kingdomState.settlements.length - fedSettlementsCount;
   
   function handleCollectResources() {
      try {
         const state = get(kingdomState);
         
         // Use cached production from KingdomState (calculated once when hexes change)
         const production = state.cachedProduction;
         
         // Log production for debugging/transparency
         console.log('Collecting resources (from cache):', {
            total: Object.fromEntries(production),
            hexCount: state.cachedProductionByHex.length
         });
         
         // Update store with results (excluding gold - that comes from settlements)
         production.forEach((amount, resource) => {
            if (amount > 0) {
               modifyResource(resource, amount);
            }
         });
         
         // Generate gold from settlements that were fed last turn
         if (potentialGoldIncome > 0) {
            console.log(`Settlements generate ${potentialGoldIncome} gold (${fedSettlementsCount} fed, ${unfedSettlementsCount} unfed)`);
            modifyResource('gold', potentialGoldIncome);
         }
         
         markPhaseStepCompleted('resources-collect');
      } catch (error) {
         console.error('Error collecting resources:', error);
         // Could show user-friendly error message here
      }
   }
</script>

<div class="resources-phase">
   
   <!-- Resource Dashboard -->
   <div class="resource-dashboard">
      {#each Object.entries(resourceConfig) as [resource, config]}
         <div class="resource-card">
            <i class="fas {config.icon} resource-icon" style="color: {config.color};"></i>
            <div class="resource-value">{$kingdomState.resources.get(resource) || 0}</div>
            <div class="resource-label">{resource.charAt(0).toUpperCase() + resource.slice(1)}</div>
         </div>
      {/each}
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
               
               {#if $kingdomState.cachedProductionByHex.length > 0}
                  <details class="worksite-details">
                     <summary>View Worksite Details</summary>
                     <ul class="worksite-list">
                        {#each $kingdomState.cachedProductionByHex as [hex, production]}
                           <li class="worksite-item">
                              <span>{hex.name || `Hex ${hex.id}`} ({hex.terrain})</span>
                              <span class="worksite-production">
                                 {#each Array.from(production.entries()) as [resource, amount], i}
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
         
         <button 
            on:click={handleCollectResources} 
            disabled={collectCompleted}
            class="step-button"
         >
            {#if collectCompleted}
               <i class="fas fa-check"></i> Resources Collected
            {:else}
               <i class="fas fa-hand-holding-usd"></i> Collect All Resources
            {/if}
         </button>
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
      gap: 15px;
      padding: 20px;
      background: linear-gradient(135deg, 
         rgba(15, 15, 17, 0.5),
         rgba(24, 24, 27, 0.3));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      justify-content: center;
      flex-wrap: wrap;
   }
   
   .resource-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      min-width: 80px;
      
      .resource-icon {
         font-size: 28px;
         margin-bottom: 8px;
      }
      
      .resource-value {
         font-size: 20px;
         font-weight: bold;
         color: var(--text-primary);
         margin-bottom: 4px;
      }
      
      .resource-label {
         font-size: 11px;
         color: var(--text-tertiary);
         text-transform: uppercase;
         letter-spacing: 0.5px;
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
         font-size: var(--font-lg);
         font-weight: 600;
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
         font-weight: 600;
         font-size: var(--font-md);
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
         font-weight: 600;
         font-size: var(--font-md);
         color: var(--text-secondary);
         flex: 1;
      }
      
      .income-amount {
         font-weight: 600;
         font-size: var(--font-md);
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
   
   .step-button {
      padding: 10px 16px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-md);
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      margin-top: 10px;
      
      &:hover:not(:disabled) {
         background: var(--color-primary-hover);
         transform: translateY(-1px);
         box-shadow: var(--shadow-md);
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
         background: var(--color-gray-700);
      }
      
      i {
         font-size: 1em;
      }
   }
</style>
