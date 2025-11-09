<script lang="ts">
   import { currentPhase, currentTurn, viewingPhase, isCurrentPhaseComplete, advancePhase, kingdomData } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   
   const phaseNames: Record<TurnPhase, string> = {
      [TurnPhase.STATUS]: 'Status',
      [TurnPhase.RESOURCES]: 'Resources',
      [TurnPhase.UNREST]: 'Unrest',
      [TurnPhase.EVENTS]: 'Events',
      [TurnPhase.ACTIONS]: 'Actions',
      [TurnPhase.UPKEEP]: 'Upkeep'
   };
   
   const phaseSteps: Record<TurnPhase, string[]> = {
      [TurnPhase.STATUS]: ['gain-fame', 'apply-modifiers'],
      [TurnPhase.RESOURCES]: ['resources-collect'],
      [TurnPhase.UNREST]: ['calculate-unrest'],
      [TurnPhase.EVENTS]: ['resolve-event'],
      [TurnPhase.ACTIONS]: [],  // No required steps
      [TurnPhase.UPKEEP]: ['upkeep-food', 'upkeep-military', 'upkeep-build']
   };
   
   $: actualPhase = $currentPhase;
   $: currentViewingPhase = $viewingPhase;
   $: currentSteps = $kingdomData.currentPhaseSteps || [];
   $: phasesCompleted = new Set(); // TODO: Implement in new store if needed
   $: nextPhase = getNextPhase(actualPhase);
   $: currentPhaseComplete = isCurrentPhaseComplete();
   $: canAdvance = currentPhaseComplete;
   
   // Debug logging
   $: {

   }
   
   // Helper function for next phase calculation
   function getNextPhase(phase: TurnPhase): TurnPhase | null {
      const phases = Object.values(TurnPhase);
      const currentIndex = phases.indexOf(phase);
      return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
   }
   
   async function forceCompleteCurrentPhase() {
      const { PhaseHandler } = await import('../../../models/turn-manager/phase-handler');
      const totalSteps = currentSteps.length;
      
      // Complete all incomplete steps
      for (let i = 0; i < totalSteps; i++) {
         if (currentSteps[i]?.completed !== 1) {
            await PhaseHandler.completePhaseStepByIndex(i);
         }
      }
   }
   
   function handleAdvancePhase() {
      if (canAdvance) {
         advancePhase();
      }
   }
</script>

<div class="phase-debug-panel">
   <div class="debug-header">
      <i class="fas fa-bug"></i>
      Phase Progression Debug
   </div>
   
   <div class="debug-content">
      <!-- Current Status -->
      <div class="debug-section">
         <div class="section-title">Current Status</div>
         <div class="status-grid">
            <div class="status-item">
               <span class="label">Turn:</span>
               <span class="value">{$currentTurn}</span>
            </div>
            <div class="status-item">
               <span class="label">Current Phase:</span>
               <span class="value">{phaseNames[actualPhase]} ({actualPhase})</span>
            </div>
            <div class="status-item">
               <span class="label">Viewing Phase:</span>
               <span class="value">{currentViewingPhase ? phaseNames[currentViewingPhase] : 'None'}</span>
            </div>
            <div class="status-item">
               <span class="label">Phase Complete:</span>
               <span class="value {currentPhaseComplete ? 'complete' : 'incomplete'}">
                  {currentPhaseComplete ? 'Yes' : 'No'}
               </span>
            </div>
         </div>
      </div>
      
      <!-- Phase Steps -->
      <div class="debug-section">
         <div class="section-title">Phase Steps</div>
         <div class="steps-list">
            {#each Object.entries(phaseSteps) as [phaseKey, steps]}
               {@const phase = phaseKey as TurnPhase}
               {@const phaseName = phaseNames[phase]}
               {@const isCurrentPhase = phase === actualPhase}
               {@const phaseComplete = phasesCompleted.has(phase)}
               <div class="phase-group" class:current={isCurrentPhase} class:complete={phaseComplete}>
                  <div class="phase-name">
                     {phaseName}
                     {#if phaseComplete}
                        <i class="fas fa-check-circle"></i>
                     {/if}
                  </div>
                  {#if steps.length > 0}
                     <div class="steps">
                        {#each steps as step, stepIndex}
                           {@const completed = isCurrentPhase ? currentSteps[stepIndex]?.completed === 1 : false}
                           <div class="step" class:completed>
                              <i class="fas {completed ? 'fa-check-square' : 'fa-square'}"></i>
                              {step}
                           </div>
                        {/each}
                     </div>
                  {:else}
                     <div class="no-steps">No required steps</div>
                  {/if}
               </div>
            {/each}
         </div>
      </div>
      
      <!-- Actions -->
      <div class="debug-section">
         <div class="section-title">Actions</div>
         <div class="action-buttons">
            <button 
               on:click={forceCompleteCurrentPhase}
               class="debug-btn complete"
               disabled={currentPhaseComplete}
            >
               <i class="fas fa-check"></i>
               Force Complete Current Phase
            </button>
            
            <button 
               on:click={handleAdvancePhase}
               class="debug-btn advance"
               disabled={!canAdvance}
            >
               <i class="fas fa-arrow-right"></i>
               Advance to {nextPhase ? phaseNames[nextPhase] : 'Next Turn'}
            </button>
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   .phase-debug-panel {
      position: fixed;
      bottom: 1.2500rem;
      right: 1.2500rem;
      width: 21.8750rem;
      max-height: 37.5000rem;
      background: rgba(20, 20, 25, 0.95);
      border: 2px solid var(--color-amber);
      border-radius: var(--radius-lg);
      box-shadow: 0 0.2500rem 1.2500rem rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      font-size: var(--font-xs);
   }
   
   .debug-header {
      padding: var(--space-12);
      background: rgba(251, 191, 36, 0.1);
      border-bottom: 1px solid var(--border-medium);
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-weight: bold;
      color: var(--color-amber);
      
      i {
         font-size: var(--font-md);
      }
   }
   
   .debug-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-12);
   }
   
   .debug-section {
      margin-bottom: var(--space-16);
      
      &:last-child {
         margin-bottom: 0;
      }
   }
   
   .section-title {
      font-weight: bold;
      color: var(--text-primary);
      margin-bottom: var(--space-8);
      font-size: var(--font-xs);
   }
   
   .status-grid {
      display: grid;
      gap: var(--space-6);
   }
   
   .status-item {
      display: flex;
      justify-content: space-between;
      padding: var(--space-4) var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-sm);
      
      .label {
         color: var(--text-secondary);
      }
      
      .value {
         color: var(--text-primary);
         font-weight: 500;
         
         &.complete {
            color: var(--color-green);
         }
         
         &.incomplete {
            color: var(--color-amber);
         }
      }
   }
   
   .steps-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }
   
   .phase-group {
      padding: var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-sm);
      border: 0.0625rem solid transparent;
      
      &.current {
         border-color: var(--color-amber);
         background: rgba(251, 191, 36, 0.05);
      }
      
      &.complete {
         opacity: 0.7;
      }
   }
   
   .phase-name {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      i {
         color: var(--color-green);
         font-size: var(--font-xs);
      }
   }
   
   .steps {
      margin-left: var(--space-12);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
   }
   
   .step {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      color: var(--text-secondary);
      
      &.completed {
         color: var(--color-green);
      }
      
      i {
         font-size: var(--font-xs);
      }
   }
   
   .no-steps {
      margin-left: var(--space-12);
      color: var(--text-tertiary);
      font-style: italic;
   }
   
   .action-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }
   
   .debug-btn {
      padding: var(--space-8) var(--space-12);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-medium);
      background: rgba(0, 0, 0, 0.5);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-6);
      font-size: var(--font-xs);
      font-weight: 500;
      transition: all 0.2s ease;
      
      &:hover: not(:disabled) { transform: translateY(-0.0625rem);
         box-shadow: 0 0.1250rem 0.5000rem rgba(0, 0, 0, 0.3);
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
      
      &.complete {
         border-color: var(--color-green);
         color: var(--color-green);
         
         &:hover:not(:disabled) {
            background: rgba(34, 197, 94, 0.1);
         }
      }
      
      &.advance {
         border-color: var(--color-amber);
         color: var(--color-amber);
         
         &:hover:not(:disabled) {
            background: rgba(251, 191, 36, 0.1);
         }
      }
      
      i {
         font-size: var(--font-xs);
      }
   }
</style>
