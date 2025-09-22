<script lang="ts">
   import { kingdomState, collectResources, processFoodConsumption, totalProduction, foodConsumption, foodConsumptionBreakdown, armySupport, unsupportedArmies } from '../../../stores/kingdom';
   import { markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   
   // Check if steps are completed
   $: collectCompleted = isPhaseStepCompleted('resources-collect');
   $: consumeCompleted = isPhaseStepCompleted('resources-consume');
   $: militaryCompleted = isPhaseStepCompleted('resources-military');
   $: buildCompleted = isPhaseStepCompleted('resources-build');
   
   // Calculate values - Fixed type issues
   $: currentFood = $kingdomState.resources.get('food') || 0;
   $: foodShortage = Math.max(0, $foodConsumption - currentFood);
   $: settlementConsumption = $foodConsumptionBreakdown ? $foodConsumptionBreakdown[0] : 0;
   $: armyConsumption = $foodConsumptionBreakdown ? $foodConsumptionBreakdown[1] : 0;
   $: unsupportedCount = $unsupportedArmies || 0;
   $: armyCount = $kingdomState.armies.length;
   
   // Resource icons and colors - Fixed type annotation
   const resourceConfig: Record<string, { icon: string; color: string }> = {
      food: { icon: 'fa-wheat-awn', color: 'var(--color-brown-light)' },
      lumber: { icon: 'fa-tree', color: 'var(--color-green)' },
      stone: { icon: 'fa-cube', color: 'var(--color-gray-500)' },
      ore: { icon: 'fa-mountain', color: 'var(--color-blue)' },
      gold: { icon: 'fa-coins', color: 'var(--color-amber-light)' }
   };
   
   function handleCollectResources() {
      collectResources();
      markPhaseStepCompleted('resources-collect');
   }
   
   function handleFoodConsumption() {
      const shortage = processFoodConsumption();
      if (shortage > 0) {
         console.log(`Food shortage! Added ${shortage} unrest.`);
      }
      markPhaseStepCompleted('resources-consume');
   }
   
   function handleMilitarySupport() {
      // Process military support logic
      kingdomState.update(state => {
         // Check unsupported armies (returns number not array)
         const unsupported = state.getUnsupportedArmies();
         if (unsupported > 0) {
            // Handle morale checks for unsupported armies
            console.log(`${unsupported} unsupported armies require morale checks`);
         }
         return state;
      });
      markPhaseStepCompleted('resources-military');
   }
   
   function handleBuildQueue() {
      // Process build queue
      kingdomState.update(state => {
         state.buildQueue.forEach(project => {
            // Apply available resources to construction using remainingCost
            project.remainingCost.forEach((amount, resource) => {
               const available = state.resources.get(resource) || 0;
               const toApply = Math.min(available, amount);
               if (toApply > 0) {
                  state.resources.set(resource, available - toApply);
                  const currentRemaining = project.remainingCost.get(resource) || 0;
                  project.remainingCost.set(resource, Math.max(0, currentRemaining - toApply));
               }
            });
         });
         // Remove completed projects
         state.buildQueue = state.buildQueue.filter(p => {
            let hasRemaining = false;
            p.remainingCost.forEach(amount => {
               if (amount > 0) hasRemaining = true;
            });
            return hasRemaining;
         });
         return state;
      });
      markPhaseStepCompleted('resources-build');
   }
   
   // Helper functions for BuildProject display
   function getProjectCompletionPercentage(project: any): number {
      if (!project.totalCost || project.totalCost.size === 0) return 100;
      
      let totalNeeded = 0;
      let totalRemaining = 0;
      
      project.totalCost.forEach((needed: number) => {
         totalNeeded += needed;
      });
      
      project.remainingCost.forEach((amount: number) => {
         totalRemaining += amount;
      });
      
      if (totalNeeded === 0) return 100;
      const invested = totalNeeded - totalRemaining;
      return Math.floor((invested / totalNeeded) * 100);
   }
   
   function getProjectRemainingCost(project: any): Record<string, number> {
      const remaining: Record<string, number> = {};
      if (project.remainingCost) {
         project.remainingCost.forEach((amount: number, resource: string) => {
            if (amount > 0) {
               remaining[resource] = amount;
            }
         });
      }
      return remaining;
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
   
   <!-- Phase Steps -->
   <div class="phase-steps-container">
      
      <!-- Step 1: Collect Resources -->
      <div class="phase-step" class:completed={collectCompleted}>
         {#if collectCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 1: Collect Resources and Revenue</h4>
         
         {#if Object.keys($totalProduction).length > 0}
            <div class="production-summary">
               <div class="production-header">
                  <span class="production-title">Expected Income This Turn:</span>
                  <span class="production-total">
                     {#each Object.entries($totalProduction) as [resource, amount], i}
                        {#if i > 0} | {/if}
                        <span style="color: {resourceConfig[resource]?.color || 'var(--text-primary)'}">
                           +{amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                        </span>
                     {/each}
                  </span>
               </div>
               
               {#if $kingdomState.hexes.some(h => h.worksite)}
                  <details class="worksite-details">
                     <summary>View Worksite Details</summary>
                     <ul class="worksite-list">
                        {#each $kingdomState.hexes.filter(h => h.worksite) as hex}
                           <li class="worksite-item">
                              <span>{hex.name || `Hex ${hex.id}`} ({hex.terrain})</span>
                              <span class="worksite-production">
                                 {#if hex.getProduction && Object.keys(hex.getProduction()).length > 0}
                                    {#each Object.entries(hex.getProduction()) as [resource, amount], i}
                                       {#if i > 0}, {/if}
                                       {amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                                    {/each}
                                 {:else}
                                    No production
                                 {/if}
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
         
         <button 
            on:click={handleCollectResources} 
            disabled={collectCompleted}
            class="step-button"
         >
            {#if collectCompleted}
               <i class="fas fa-check"></i> Resources Collected
            {:else}
               <i class="fas fa-hand-holding-usd"></i> Collect Resources
            {/if}
         </button>
      </div>
      
      <!-- Step 2: Food Consumption -->
      <div class="phase-step" class:completed={consumeCompleted}>
         {#if consumeCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 2: Food Consumption</h4>
         
         <div class="consumption-display">
            <div class="consumption-stat">
               <i class="fas fa-home"></i>
               <div class="stat-value">{settlementConsumption}</div>
               <div class="stat-label">Settlement Consumption</div>
            </div>
            
            <div class="consumption-stat">
               <i class="fas fa-shield-alt"></i>
               <div class="stat-value">{armyConsumption}</div>
               <div class="stat-label">Army Consumption</div>
            </div>
            
            <div class="consumption-stat" class:danger={foodShortage > 0}>
               <i class="fas fa-wheat-awn"></i>
               <div class="stat-value">{currentFood} / {$foodConsumption}</div>
               <div class="stat-label">Available / Required</div>
            </div>
         </div>
         
         {#if foodShortage > 0 && !consumeCompleted}
            <div class="warning-box">
               <i class="fas fa-exclamation-triangle"></i>
               <strong>Warning:</strong> Food shortage of {foodShortage} will cause +{foodShortage} Unrest!
            </div>
         {/if}
         
         <button 
            on:click={handleFoodConsumption} 
            disabled={consumeCompleted}
            class="step-button"
         >
            {#if consumeCompleted}
               <i class="fas fa-check"></i> Consumption Paid
            {:else}
               <i class="fas fa-utensils"></i> Pay Food Consumption
            {/if}
         </button>
      </div>
      
      <!-- Step 3: Military Support -->
      <div class="phase-step" class:completed={militaryCompleted}>
         {#if militaryCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 3: Military Support</h4>
         
         <div class="army-support-display">
            <div class="support-status" class:danger={unsupportedCount > 0} class:warning={armyCount === $armySupport}>
               <i class="fas fa-shield-alt"></i>
               <div>
                  <div class="stat-value">{armyCount} / {$armySupport}</div>
                  <div class="stat-label">Armies / Capacity</div>
               </div>
            </div>
            
            {#if unsupportedCount > 0}
               <div class="support-status danger">
                  <i class="fas fa-exclamation-triangle"></i>
                  <div>
                     <div class="stat-value">{unsupportedCount}</div>
                     <div class="stat-label">Unsupported</div>
                  </div>
               </div>
            {/if}
         </div>
         
         {#if unsupportedCount > 0 && !militaryCompleted}
            <div class="warning-box">
               <i class="fas fa-exclamation-triangle"></i>
               <strong>Warning:</strong> {unsupportedCount} unsupported {unsupportedCount === 1 ? 'army' : 'armies'} will require morale checks!
            </div>
         {:else if armyCount === 0}
            <div class="info-text">No armies currently fielded</div>
         {/if}
         
         {#if armyCount > 0}
            <button 
               on:click={handleMilitarySupport} 
               disabled={militaryCompleted}
               class="step-button"
            >
               {#if militaryCompleted}
                  <i class="fas fa-check"></i> Support Processed
               {:else}
                  <i class="fas fa-flag"></i> Process Military Support
               {/if}
            </button>
         {/if}
      </div>
      
      <!-- Step 4: Build Queue -->
      <div class="phase-step" class:completed={buildCompleted}>
         {#if buildCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 4: Process Build Queue</h4>
         
         {#if $kingdomState.buildQueue.length > 0}
            <div class="build-resources-available">
               <strong>Available Resources:</strong>
               {['lumber', 'stone', 'ore'].map(r => 
                  `${$kingdomState.resources.get(r) || 0} ${r.charAt(0).toUpperCase() + r.slice(1)}`
               ).join(', ')}
            </div>
            
            <div class="build-queue">
               {#each $kingdomState.buildQueue as project}
                  <div class="build-project-card">
                     <div class="project-header">
                        <span class="project-name">{project.structureId}</span>
                        <span class="project-tier">In {project.settlementName}</span>
                     </div>
                     
                     <div class="progress-bar">
                        <div class="progress-fill" style="width: {getProjectCompletionPercentage(project)}%">
                           <span class="progress-text">{getProjectCompletionPercentage(project)}%</span>
                        </div>
                     </div>
                     
                     <div class="project-needs">
                        {#if Object.keys(getProjectRemainingCost(project)).length > 0}
                           Needs: {Object.entries(getProjectRemainingCost(project))
                              .map(([r, a]) => `${a} ${r}`)
                              .join(', ')}
                        {:else}
                           Complete!
                        {/if}
                     </div>
                  </div>
               {/each}
            </div>
            
            <button 
               on:click={handleBuildQueue} 
               disabled={buildCompleted}
               class="step-button"
            >
               {#if buildCompleted}
                  <i class="fas fa-check"></i> Resources Applied
               {:else}
                  <i class="fas fa-hammer"></i> Apply to Construction
               {/if}
            </button>
         {:else}
            <div class="info-text">No construction projects in queue</div>
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
   
   .consumption-display {
      display: flex;
      justify-content: space-around;
      gap: 20px;
      margin: 15px 0;
      flex-wrap: wrap;
   }
   
   .consumption-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      
      i {
         font-size: 32px;
         color: var(--color-amber);
         margin-bottom: 5px;
      }
      
      .stat-value {
         font-size: 20px;
         font-weight: bold;
         color: var(--text-primary);
         margin: 2px 0;
      }
      
      .stat-label {
         font-size: 11px;
         color: var(--text-tertiary);
         text-transform: uppercase;
      }
      
      &.danger {
         i {
            color: var(--color-red);
         }
         
         .stat-value {
            color: var(--color-red);
         }
      }
   }
   
   .army-support-display {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin: 15px 0;
      flex-wrap: wrap;
   }
   
   .support-status {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      i {
         font-size: 32px;
         color: var(--color-blue);
      }
      
      .stat-value {
         font-size: 18px;
         font-weight: bold;
         color: var(--text-primary);
      }
      
      .stat-label {
         font-size: 12px;
         color: var(--text-tertiary);
      }
      
      &.warning {
         background: rgba(245, 158, 11, 0.1);
         border-color: var(--color-amber);
         
         i {
            color: var(--color-amber);
         }
      }
      
      &.danger {
         background: rgba(239, 68, 68, 0.1);
         border-color: var(--color-red);
         
         i {
            color: var(--color-red);
         }
         
         .stat-value {
            color: var(--color-red);
         }
      }
   }
   
   .warning-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-md);
      color: var(--color-amber-light);
      margin: 15px 0;
      
      i {
         font-size: 18px;
      }
   }
   
   .info-text {
      text-align: center;
      color: var(--text-tertiary);
      font-style: italic;
      padding: 10px;
   }
   
   .build-resources-available {
      padding: 10px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      margin-bottom: 15px;
      color: var(--text-secondary);
   }
   
   .build-queue {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 15px;
   }
   
   .build-project-card {
      padding: 15px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      .project-header {
         display: flex;
         justify-content: space-between;
         margin-bottom: 10px;
      }
      
      .project-name {
         font-weight: 600;
         color: var(--text-primary);
      }
      
      .project-tier {
         color: var(--color-amber);
         font-size: var(--font-sm);
      }
      
      .progress-bar {
         height: 20px;
         background: rgba(0, 0, 0, 0.3);
         border-radius: var(--radius-md);
         overflow: hidden;
         margin-bottom: 8px;
      }
      
      .progress-fill {
         height: 100%;
         background: linear-gradient(90deg, var(--color-crimson), var(--color-amber));
         display: flex;
         align-items: center;
         justify-content: center;
         transition: width 0.3s ease;
      }
      
      .progress-text {
         font-size: 11px;
         color: white;
         font-weight: bold;
      }
      
      .project-needs {
         font-size: var(--font-sm);
         color: var(--text-tertiary);
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
