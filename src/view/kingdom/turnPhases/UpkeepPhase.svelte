<script lang="ts">
   import { kingdomState, setResource, updateKingdomStat, 
            foodConsumption, foodConsumptionBreakdown, armySupport, unsupportedArmies } from '../../../stores/kingdom';
   import { gameState, incrementTurn, setCurrentPhase, resetPhaseSteps, 
            markPhaseStepCompleted, isPhaseStepCompleted } from '../../../stores/gameState';
   import { TurnPhase } from '../../../models/KingdomState';
   import { settlementService } from '../../../services/settlements';
   import { economicsService } from '../../../services/economics';
   import { get } from 'svelte/store';
   
   // Check if steps are completed
   $: consumeCompleted = isPhaseStepCompleted('upkeep-food');
   $: militaryCompleted = isPhaseStepCompleted('upkeep-military');
   $: buildCompleted = isPhaseStepCompleted('upkeep-build');
   $: resolveCompleted = isPhaseStepCompleted('upkeep-complete');
   
   // Calculate values
   $: currentFood = $kingdomState.resources.get('food') || 0;
   $: foodShortage = Math.max(0, $foodConsumption - currentFood);
   $: settlementConsumption = $foodConsumptionBreakdown ? $foodConsumptionBreakdown[0] : 0;
   $: armyConsumption = $foodConsumptionBreakdown ? $foodConsumptionBreakdown[1] : 0;
   $: unsupportedCount = $unsupportedArmies || 0;
   $: armyCount = $kingdomState.armies.length;
   
   // Auto-complete military step if no armies
   $: if (armyCount === 0 && !militaryCompleted) {
      markPhaseStepCompleted('upkeep-military');
   }
   
   // Auto-complete build step if no build queue
   $: if ($kingdomState.buildQueue.length === 0 && !buildCompleted) {
      markPhaseStepCompleted('upkeep-build');
   }
   
   function handleFoodConsumption() {
      try {
         const state = get(kingdomState);
         const currentFood = state.resources.get('food') || 0;
         const totalNeeded = settlementConsumption + armyConsumption;
         
         // Process consumption and update fed status
         const result = settlementService.processFoodConsumption(
            state.settlements,
            currentFood
         );
         
         if (result.shortage > 0) {
            console.log(`Food shortage! Adding ${result.shortage} unrest.`);
            setResource('food', 0);
            updateKingdomStat('unrest', state.unrest + result.shortage);
            
            // Update settlements' fed status for next turn's gold generation
            state.settlements.forEach(settlement => {
               settlement.wasFedLastTurn = false;
            });
            
            console.log(`${result.unfedSettlements.size} settlements unfed - no gold income next turn`);
         } else {
            const remaining = currentFood - totalNeeded;
            setResource('food', remaining);
            
            // Update settlements' fed status for next turn's gold generation
            state.settlements.forEach(settlement => {
               settlement.wasFedLastTurn = true;
            });
            
            console.log('All settlements fed - will generate gold next turn');
         }
         
         markPhaseStepCompleted('upkeep-food');
      } catch (error) {
         console.error('Error processing food consumption:', error);
      }
   }
   
   function handleMilitarySupport() {
      try {
         const state = get(kingdomState);
         
         if (unsupportedCount > 0) {
            // For now, apply automatic unrest penalty
            // TODO: Implement morale check system when army UI is ready
            console.log(`${unsupportedCount} unsupported armies - adding ${unsupportedCount} unrest`);
            updateKingdomStat('unrest', state.unrest + unsupportedCount);
         }
         
         markPhaseStepCompleted('upkeep-military');
      } catch (error) {
         console.error('Error processing military support:', error);
      }
   }
   
   function handleBuildQueue() {
      // Process build queue - apply available resources to construction
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
      
      markPhaseStepCompleted('upkeep-build');
   }
   
   function handleEndTurnResolution() {
      // Clear non-storable resources (lumber, stone, ore)
      kingdomState.update(state => {
         const nonStorable = economicsService.getNonStorableResources();
         nonStorable.forEach(resource => {
            state.resources.set(resource, 0);
         });
         return state;
      });
      markPhaseStepCompleted('upkeep-complete');
   }
   
   function endTurn() {
      // Make sure all steps are complete
      if (!resolveCompleted) {
         handleEndTurnResolution();
      }
      
      incrementTurn();
      // Reset phase to Phase I for next turn
      setCurrentPhase(TurnPhase.PHASE_I);
      resetPhaseSteps();
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

<div class="upkeep-phase">
   
   <div class="phase-intro">
      <h3>Phase VI: Upkeep</h3>
      <p>Pay all consumption costs and prepare for the next turn.</p>
   </div>
   
   <!-- Phase Steps -->
   <div class="phase-steps-container">
      
      <!-- Step 1: Food Consumption -->
      <div class="phase-step" class:completed={consumeCompleted}>
         {#if consumeCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 1: Food Consumption</h4>
         
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
               <br><small>Unfed settlements will not generate gold next turn.</small>
            </div>
         {/if}
         
         <button 
            on:click={handleFoodConsumption} 
            disabled={consumeCompleted}
            class="step-button"
         >
            {#if consumeCompleted}
               <i class="fas fa-check"></i> Food Consumption Paid
            {:else}
               <i class="fas fa-utensils"></i> Pay Food Consumption
            {/if}
         </button>
      </div>
      
      <!-- Step 2: Military Support -->
      <div class="phase-step" class:completed={militaryCompleted}>
         {#if militaryCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 2: Military Support</h4>
         
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
               <strong>Warning:</strong> {unsupportedCount} unsupported {unsupportedCount === 1 ? 'army' : 'armies'} will cause +{unsupportedCount} Unrest!
               <br><small>Future update: Morale checks will be required.</small>
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
                  <i class="fas fa-check"></i> Military Support Processed
               {:else}
                  <i class="fas fa-flag"></i> Process Military Support
               {/if}
            </button>
         {:else}
            <div class="auto-skipped">
               <i class="fas fa-ban"></i>
               <span>No Armies to Support (Skipped)</span>
            </div>
         {/if}
      </div>
      
      <!-- Step 3: Build Queue -->
      <div class="phase-step" class:completed={buildCompleted}>
         {#if buildCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 3: Process Build Queue</h4>
         
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
            <div class="auto-skipped">
               <i class="fas fa-ban"></i>
               <span>No Construction Projects (Skipped)</span>
            </div>
         {/if}
      </div>
      
      <!-- Step 4: End of Turn Resolution -->
      <div class="phase-step" class:completed={resolveCompleted}>
         {#if resolveCompleted}
            <i class="fas fa-check-circle phase-step-complete"></i>
         {/if}
         
         <h4>Step 4: End of Turn Resolution</h4>
         
         <div class="resolution-summary">
            <p><i class="fas fa-info-circle"></i> Non-storable resources (lumber, stone, ore) will be cleared.</p>
            <p><i class="fas fa-coins"></i> Gold and stored food will carry over to the next turn.</p>
            {#if $kingdomState.settlements.filter(s => !s.wasFedLastTurn).length > 0}
               <p class="warning">
                  <i class="fas fa-exclamation-triangle"></i> 
                  {$kingdomState.settlements.filter(s => !s.wasFedLastTurn).length} settlement{$kingdomState.settlements.filter(s => !s.wasFedLastTurn).length > 1 ? 's' : ''} will not generate gold next turn (unfed).
               </p>
            {/if}
         </div>
         
         <button 
            on:click={handleEndTurnResolution} 
            disabled={resolveCompleted}
            class="step-button"
         >
            {#if resolveCompleted}
               <i class="fas fa-check"></i> Resources Cleared
            {:else}
               <i class="fas fa-broom"></i> Clear Non-Storable Resources
            {/if}
         </button>
      </div>
      
   </div>
   
   <!-- End Turn Button -->
   <div class="phase-actions">
      <button 
         class="end-turn-button" 
         on:click={endTurn}
         disabled={!consumeCompleted || !militaryCompleted || !buildCompleted || !resolveCompleted}
      >
         <i class="fas fa-check-circle"></i>
         End Turn {$gameState.currentTurn} and Start Turn {$gameState.currentTurn + 1}
      </button>
   </div>
</div>

<style lang="scss">
   .upkeep-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .phase-intro {
      padding: 15px;
      background: rgba(0, 0, 0, 0.08);
      border-radius: var(--radius-md);
      
      h3 {
         margin: 0 0 8px 0;
         color: var(--text-primary);
         font-size: var(--type-heading-1-size);
         font-weight: var(--type-heading-1-weight);
         line-height: var(--type-heading-1-line);
      }
      
      p {
         margin: 0;
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
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
         font-size: var(--type-label-size);
         font-weight: var(--type-label-weight);
         letter-spacing: var(--type-label-spacing);
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
         font-size: var(--type-label-size);
         font-weight: var(--type-label-weight);
         letter-spacing: var(--type-label-spacing);
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
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-md);
      color: var(--color-amber-light);
      margin: 15px 0;
      
      i {
         font-size: 18px;
         margin-top: 2px;
      }
      
      small {
         opacity: 0.9;
         display: block;
         margin-top: 4px;
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
   
   .resolution-summary {
      padding: 15px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      
      p {
         margin: 8px 0;
         color: var(--text-secondary);
         display: flex;
         align-items: center;
         gap: 8px;
         
         i {
            font-size: 16px;
            color: var(--color-blue);
         }
         
         &.warning {
            color: var(--color-amber-light);
            
            i {
               color: var(--color-amber);
            }
         }
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
   
   .phase-actions {
      margin-top: 20px;
      display: flex;
      justify-content: center;
   }
   
   .auto-skipped {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      color: var(--text-tertiary);
      margin-top: 10px;
      
      i {
         color: var(--text-tertiary);
         opacity: 0.7;
      }
      
      span {
         font-size: var(--type-body-size);
      }
   }
   
   .end-turn-button {
      padding: 14px 28px;
      background: var(--btn-primary-bg);
      color: white;
      border: 1px solid var(--color-crimson);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--type-button-size);
      font-weight: var(--type-button-weight);
      line-height: var(--type-button-line);
      letter-spacing: var(--type-button-spacing);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-md);
      
      &:hover:not(:disabled) {
         background: var(--btn-primary-hover);
         transform: translateY(-2px);
         box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
         background: var(--color-gray-700);
         border-color: var(--border-subtle);
      }
      
      i {
         font-size: 1.1em;
      }
   }
</style>
