<script lang="ts">
   import { onMount } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomData, updateKingdom, markPhaseStepCompleted, isPhaseStepCompleted, resetPhaseSteps, setCurrentPhase, incrementTurn } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../models/KingdomState';
   import type { BuildProject } from '../../../models/KingdomState';
   
   // Import clean architecture components
   import { createUpkeepPhaseController } from '../../../controllers/UpkeepPhaseController';
   import type { UpkeepPhaseController } from '../../../controllers/UpkeepPhaseController';
   
   // Controller instance
   let upkeepController: UpkeepPhaseController;
   
   // UI State only - no business logic
   let processingFood = false;
   let processingMilitary = false;
   let processingBuild = false;
   let processingEndTurn = false;
   
   // Reactive UI state - use new kingdomData store
   $: consumeCompleted = isPhaseStepCompleted('upkeep-food');
   $: militaryCompleted = isPhaseStepCompleted('upkeep-military');
   $: buildCompleted = isPhaseStepCompleted('upkeep-build');
   $: resolveCompleted = isPhaseStepCompleted('upkeep-complete');
   
   // Get all display data from controller
   $: displayData = upkeepController?.getDisplayData($kingdomData) || {
      currentFood: 0,
      foodConsumption: 0,
      foodShortage: 0,
      settlementConsumption: 0,
      armyConsumption: 0,
      armyCount: 0,
      armySupport: 0,
      unsupportedCount: 0,
      foodRemainingForArmies: 0,
      armyFoodShortage: 0,
      settlementFoodShortage: 0
   };
   
   // Destructure for easier template access
   $: ({
      currentFood,
      settlementConsumption,
      armyConsumption,
      armyCount,
      armySupport,
      unsupportedCount,
      foodRemainingForArmies,
      armyFoodShortage,
      settlementFoodShortage
   } = displayData);
   
   // Initialize controller on mount
   onMount(() => {
      upkeepController = createUpkeepPhaseController();
      
      // Auto-complete steps that don't need action
      const autoCompleteSteps = upkeepController.getAutoCompleteSteps($kingdomData);
      autoCompleteSteps.forEach(step => {
         if (!isPhaseStepCompleted(step)) {
            markPhaseStepCompleted(step);
         }
      });
   });
   
   // Handle food consumption using controller
   async function handleFoodConsumption() {
      if (!upkeepController) return;
      
      processingFood = true;
      
      try {
         const result = await upkeepController.processFoodConsumption(
            $kingdomData,
            $kingdomData.currentTurn || 1
         );
         
         // Controller now handles settlement feeding status
         markPhaseStepCompleted('upkeep-food');
      } finally {
         processingFood = false;
      }
   }
   
   // Handle military support using controller
   async function handleMilitarySupport() {
      if (!upkeepController) return;
      
      processingMilitary = true;
      
      try {
         // Controller handles all military support logic
         const result = await upkeepController.processMilitarySupport(
            $kingdomData,
            $kingdomData.currentTurn || 1
         );
         
         if (result.success) {
            markPhaseStepCompleted('upkeep-military');
         }
      } finally {
         processingMilitary = false;
      }
   }
   
   // Handle build queue using controller
   async function handleBuildQueue() {
      if (!upkeepController) return;
      
      processingBuild = true;
      
      try {
         // Process projects through controller
         const progress = upkeepController.processProjects($kingdomData);
         
         // Update kingdom data to reflect completed projects
         updateKingdom(state => {
            // Remove completed projects (already done by controller)
            return state;
         });
         
         markPhaseStepCompleted('upkeep-build');
      } finally {
         processingBuild = false;
      }
   }
   
   // Handle end turn resolution using controller and commands
   async function handleEndTurnResolution() {
      if (!upkeepController) return;
      
      processingEndTurn = true;
      
      try {
         // Process resource decay
         await upkeepController.processResourceDecay(
            $kingdomData,
            $kingdomData.currentTurn || 1
         );
         
         markPhaseStepCompleted('upkeep-complete');
      } finally {
         processingEndTurn = false;
      }
   }
   
   // End turn and move to next
   async function endTurn() {
      // Automatically clear non-storable resources when ending turn
      if (!resolveCompleted) {
         await handleEndTurnResolution();
      }
      
      // Process modifiers using controller
      updateKingdom(state => {
         upkeepController.processEndTurnModifiers(state);
         return state;
      });
      
      incrementTurn();
      setCurrentPhase(TurnPhase.STATUS);
      resetPhaseSteps();
   }
   
   // Use controller methods for project calculations
   $: getProjectCompletionPercentage = (project: BuildProject) => 
      upkeepController ? upkeepController.getProjectCompletionPercentage(project) : 0;
   
   $: getProjectRemainingCost = (project: BuildProject) => 
      upkeepController ? upkeepController.getProjectRemainingCost(project) : {};
   
   // Get controller state for display
   $: controllerState = upkeepController?.getState();
   $: phaseSummary = upkeepController?.getPhaseSummary();
</script>

<div class="upkeep-phase">
   
   
   <!-- Phase Steps Grid Container -->
   <div class="phase-steps-grid">
      
      <!-- Step 1: Feed Settlements -->
      <div class="phase-card" class:completed={consumeCompleted}>
         <div class="card-header">
            <h4 class="text-heading-secondary">
               <i class="fas fa-home step-icon"></i>
               1. Feed Settlements
            </h4>
            {#if consumeCompleted}
               <i class="fas fa-check-circle phase-complete-indicator"></i>
            {/if}
         </div>
         
         <button 
            on:click={handleFoodConsumption} 
            disabled={consumeCompleted || processingFood}
            class="btn btn-secondary"
         >
            {#if consumeCompleted}
               <i class="fas fa-check"></i> Settlements Fed
            {:else if processingFood}
               <i class="fas fa-spinner fa-spin"></i> Processing...
            {:else}
               <i class="fas fa-utensils"></i> Feed Settlements
            {/if}
         </button>
         
         <div class="card-content">
            <div class="consumption-display">
               <div class="consumption-stat">
                  <i class="fas fa-home"></i>
                  <div class="stat-value">{settlementConsumption}</div>
                  <div class="stat-label">Food Required</div>
               </div>
               
               <div class="consumption-stat" class:danger={currentFood < settlementConsumption}>
                  <i class="fas fa-wheat-awn"></i>
                  <div class="stat-value">{currentFood}</div>
                  <div class="stat-label">Food Available</div>
               </div>
            </div>
            
            {#if settlementFoodShortage > 0 && !consumeCompleted}
               <div class="warning-box warning-stacked">
                  <i class="fas fa-exclamation-triangle"></i>
                  <div class="warning-title">Food shortage: Need {settlementFoodShortage} more food</div>
                  <div class="warning-message">Unfed settlements will not generate gold next turn and cause +{settlementFoodShortage} Unrest.</div>
               </div>
            {:else if !consumeCompleted}
               <div class="info-text">Settlements require {settlementConsumption} food this turn</div>
            {/if}
         </div>
      </div>
      
      <!-- Step 2: Military Support & Food -->
      <div class="phase-card" class:completed={militaryCompleted}>
         <div class="card-header">
            <h4 class="text-heading-secondary">
               <i class="fas fa-shield-alt step-icon"></i>
               2. Military Support
            </h4>
            {#if militaryCompleted}
               <i class="fas fa-check-circle phase-complete-indicator"></i>
            {/if}
         </div>
         
         <button 
            on:click={handleMilitarySupport} 
            disabled={militaryCompleted || processingMilitary || armyCount === 0}
            class="btn btn-secondary"
         >
            {#if militaryCompleted}
               <i class="fas fa-check"></i> Military Support Processed
            {:else if processingMilitary}
               <i class="fas fa-spinner fa-spin"></i> Processing...
            {:else if armyCount === 0}
               <i class="fas fa-ban"></i> No Armies to Support
            {:else}
               <i class="fas fa-flag"></i> Support Military
            {/if}
         </button>
         
         <div class="card-content">
            {#if armyCount > 0}
               <!-- Army Food Consumption -->
               <div class="consumption-display">
                  <div class="consumption-stat">
                     <i class="fas fa-utensils"></i>
                     <div class="stat-value">{armyConsumption}</div>
                     <div class="stat-label">Food Required</div>
                  </div>
                  
                  <div class="consumption-stat" class:danger={armyFoodShortage > 0}>
                     <i class="fas fa-wheat-awn"></i>
                     <div class="stat-value">{foodRemainingForArmies}</div>
                     <div class="stat-label">Food Remaining</div>
                  </div>
               </div>
               
               {#if armyFoodShortage > 0 && !militaryCompleted}
                  <div class="warning-box">
                     <i class="fas fa-exclamation-triangle"></i>
                     <strong>Warning:</strong> Not enough food for armies! Short by {armyFoodShortage} food.
                     <br><small>This will cause +{armyFoodShortage} Unrest.</small>
                  </div>
               {/if}
               
               <!-- Army Support Capacity -->
               <div class="army-support-display">
                  <div class="support-status" class:danger={unsupportedCount > 0} class:warning={armyCount === armySupport}>
                     <i class="fas fa-shield-alt"></i>
                     <div>
                        <div class="stat-value">{armyCount} / {armySupport}</div>
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
               {/if}
            {:else}
               <div class="info-text">No armies currently fielded</div>
               <div class="auto-skipped">
                  <i class="fas fa-ban"></i>
                  <span>No Armies to Support (Skipped)</span>
               </div>
            {/if}
         </div>
      </div>
      
      <!-- Step 3: Build Queue -->
      <div class="phase-card" class:completed={buildCompleted}>
         <div class="card-header">
            <h4 class="text-heading-secondary">
               <i class="fas fa-hammer step-icon"></i>
               3. Build Queue
            </h4>
            {#if buildCompleted}
               <i class="fas fa-check-circle phase-complete-indicator"></i>
            {/if}
         </div>
         
         <button 
            on:click={handleBuildQueue} 
            disabled={buildCompleted || processingBuild || $kingdomData.buildQueue?.length === 0}
            class="btn btn-secondary"
         >
            {#if buildCompleted}
               <i class="fas fa-check"></i> Resources Applied
            {:else if processingBuild}
               <i class="fas fa-spinner fa-spin"></i> Processing...
            {:else if $kingdomData.buildQueue?.length === 0}
               <i class="fas fa-ban"></i> No Projects in Queue
            {:else}
               <i class="fas fa-hammer"></i> Apply to Construction
            {/if}
         </button>
         
         <div class="card-content">
            {#if $kingdomData.buildQueue?.length > 0}
               <div class="build-resources-available">
                  <strong>Available:</strong>
                  {['lumber', 'stone', 'ore'].map(r => 
                     `${$kingdomData.resources?.[r] || 0} ${r.charAt(0).toUpperCase() + r.slice(1)}`
                  ).join(', ')}
               </div>
               
               <div class="build-queue">
                  {#each $kingdomData.buildQueue as project}
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
            {:else}
               <div class="info-text">No construction projects in queue</div>
               <div class="auto-skipped">
                  <i class="fas fa-ban"></i>
                  <span>No Construction Projects (Skipped)</span>
               </div>
            {/if}
         </div>
      </div>
   </div>
   
   <!-- End of Turn Summary Section -->
   <div class="end-turn-summary" class:completed={resolveCompleted}>
      <div class="summary-header">
         <h4 class="text-heading-secondary">
            <i class="fas fa-scroll"></i>
            End of Turn Summary
         </h4>
         {#if resolveCompleted}
            <i class="fas fa-check-circle phase-complete-indicator"></i>
         {/if}
      </div>
      
      <div class="summary-content">
         <div class="summary-grid">
            <div class="summary-item">
               <i class="fas fa-info-circle"></i>
               <p>Non-storable resources (lumber, stone, ore) will be automatically cleared when you end the turn.</p>
            </div>
            
            <div class="summary-item">
               <i class="fas fa-coins"></i>
               <p>Gold and stored food will carry over to the next turn.</p>
            </div>
            
            {#if $kingdomData.settlements.filter(s => !s.wasFedLastTurn).length > 0}
               <div class="summary-item warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <p>{$kingdomData.settlements.filter(s => !s.wasFedLastTurn).length} settlement{$kingdomData.settlements.filter(s => !s.wasFedLastTurn).length > 1 ? 's' : ''} will not generate gold next turn (unfed).</p>
               </div>
            {/if}
            
            {#if phaseSummary}
               <div class="summary-item">
                  <i class="fas fa-chart-line"></i>
                  <p>Turn summary: {phaseSummary.unrestGenerated} unrest generated, {phaseSummary.projectsCompleted} projects completed</p>
               </div>
            {/if}
         </div>
      </div>
   </div>
   
   <!-- End Turn Button removed - using the one in top right navigation instead -->
</div>

<style lang="scss">
   .upkeep-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   // New grid container for responsive columns
   .phase-steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
      
      @media (max-width: 767px) {
         grid-template-columns: 1fr;
      }
      
      @media (min-width: 768px) and (max-width: 1023px) {
         grid-template-columns: repeat(3, 1fr);
      }
      
      @media (min-width: 1024px) {
         grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }
   }
   
   // ActionCard-like styling for each phase step
   .phase-card {
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-medium);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      position: relative;
      min-height: auto;
      
      // Top accent line
      &::before {
         content: '';
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         height: 3px;
         background: linear-gradient(90deg, 
            transparent, 
            var(--color-amber), 
            transparent);
         border-radius: var(--radius-md) var(--radius-md) 0 0;
         opacity: 0;
         transition: opacity 0.3s ease;
      }
      
      &:hover:not(.completed) {
         border-color: var(--border-strong);
         transform: translateY(-2px);
         box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
         
         &::before {
            opacity: 0.6;
         }
      }
      
      &.completed {
         background: linear-gradient(135deg,
            rgba(35, 35, 40, 0.4),
            rgba(40, 40, 45, 0.3));
         border-color: var(--border-subtle);
         opacity: 0.9;
         
         &::after {
            content: '';
            position: absolute;
            top: 12px;
            right: 12px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-green);
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
            animation: pulse 2s infinite;
         }
      }
   }
   
   .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      position: relative;
      
      h4 {
         margin: 0;
         display: flex;
         align-items: center;
         gap: 10px;
         font-family: var(--base-font);  // Use Signika font
         
         .step-icon {
            color: var(--color-amber);
            font-size: 20px;
         }
      }
   }
   
   .phase-complete-indicator {
      position: absolute;
      top: 18px;
      right: 20px;
      color: var(--color-green);
      font-size: 20px;
   }
   
   // Button styles (replacing typography.css btn classes)
   .phase-card .btn {
      margin: 0 20px 16px 20px;
      width: calc(100% - 40px); // Full width minus margins
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.025em;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      
      // Secondary button styles
      &.btn-secondary {
         background: var(--btn-secondary-bg);
         border-color: var(--border-medium);
         color: var(--text-primary);
         
         &:hover:not(:disabled) {
            background: var(--btn-secondary-hover);
            border-color: var(--border-strong);
            transform: translateY(-1px);
         }
         
         &:disabled {
            opacity: var(--opacity-disabled);
            cursor: not-allowed;
         }
      }
   }
   
   .card-content {
      padding: 0 20px 12px 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
   }
   
   @keyframes pulse {
      0% {
         opacity: 1;
         transform: scale(1);
      }
      50% {
         opacity: 0.6;
         transform: scale(1.1);
      }
      100% {
         opacity: 1;
         transform: scale(1);
      }
   }
   
   // End of Turn Summary Section
   .end-turn-summary {
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-medium);
      transition: all 0.3s ease;
      margin-bottom: 20px;
      
      &.completed {
         background: linear-gradient(135deg,
            rgba(35, 35, 40, 0.3),
            rgba(40, 40, 45, 0.2));
         border-color: var(--border-subtle);
      }
   }
   
   .summary-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      position: relative;
      
      h4 {
         margin: 0;
         display: flex;
         align-items: center;
         gap: 10px;
         font-family: var(--base-font);  // Use Signika font
         
         i {
            color: var(--color-amber);
            font-size: 20px;
         }
      }
   }
   
   .summary-content {
      padding: 20px;
   }
   
   .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
   }
   
   .summary-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      
      i {
         font-size: 18px;
         color: var(--color-blue);
         margin-top: 2px;
         flex-shrink: 0;
      }
      
      p {
         margin: 0;
         color: var(--text-secondary);
         font-size: var(--font-md);
         line-height: 1.5;
      }
      
      &.warning {
         background: rgba(245, 158, 11, 0.1);
         border: 1px solid rgba(245, 158, 11, 0.3);
         
         i {
            color: var(--color-amber);
         }
         
         p {
            color: var(--color-amber-light);
         }
      }
   }
   
   .consumption-display {
      display: flex;
      justify-content: space-around;
      gap: 15px;
      flex-wrap: wrap;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      padding: 12px;
   }
   
   .consumption-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      flex: 1;
      min-width: 80px;
      
      i {
         font-size: var(--font-3xl);
         color: var(--color-amber);
         margin-bottom: 4px;
      }
      
      .stat-value {
         font-size: 18px;
         font-weight: var(--font-weight-bold);
         color: var(--text-primary);
         margin: 2px 0;
      }
      
      .stat-label {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         letter-spacing: 0.025em;
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
      gap: 15px;
      flex-wrap: wrap;
   }
   
   .support-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 15px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      flex: 1;
      justify-content: center;
      
      i {
         font-size: 24px;
         color: var(--color-blue);
      }
      
      .stat-value {
         font-size: 18px;
         font-weight: var(--font-weight-bold);
         color: var(--text-primary);
      }
      
      .stat-label {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         letter-spacing: 0.025em;
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
      padding: 10px 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-sm);
      color: var(--color-amber-light);
      font-size: var(--font-sm);
      
      &.warning-stacked {
         flex-direction: column;
         align-items: flex-start;
         gap: 6px;
      }
      
      i {
         font-size: 16px;
         margin-top: 2px;
         flex-shrink: 0;
      }
      
      .warning-title {
         font-weight: var(--font-weight-semibold);
         color: var(--color-amber-light);
      }
      
      .warning-message {
         opacity: 0.9;
         font-size: var(--font-xs);
         line-height: 1.4;
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
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: var(--font-sm);
   }
   
   .build-queue {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 200px;
      overflow-y: auto;
   }
   
   .build-project-card {
      padding: 10px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      
      .project-header {
         display: flex;
         justify-content: space-between;
         margin-bottom: 8px;
         font-size: var(--font-sm);
      }
      
      .project-name {
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }
      
      .project-tier {
         color: var(--color-amber);
         opacity: 0.8;
      }
      
      .progress-bar {
         height: 16px;
         background: rgba(0, 0, 0, 0.3);
         border-radius: var(--radius-sm);
         overflow: hidden;
         margin-bottom: 6px;
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
         font-weight: var(--font-weight-bold);
      }
      
      .project-needs {
         font-size: var(--font-sm);
         color: var(--text-tertiary);
      }
   }
   
   
   // Remove the .step-button styles as we replaced it with .step-action-button
   
   .auto-skipped {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      color: var(--text-tertiary);
      font-size: var(--font-sm);
      
      i {
         color: var(--text-tertiary);
         opacity: 0.7;
      }
   }
   
</style>
