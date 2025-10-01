<script lang="ts">
import { onMount } from 'svelte';
import { kingdomData, isPhaseStepCompleted } from '../../../stores/KingdomStore';
import { TurnPhase } from '../../../models/KingdomState';

// Props (currently unused but kept for potential future use)
// export let isViewingCurrentPhase: boolean = true;

// Import the ModifierCard component
import ModifierCard from '../components/ModifierCard.svelte';

// Constants
const MAX_FAME = 3;

// UI State
let automationRunning = false;
let automationComplete = false;
let previousFame = 0;

// Reactive UI state based on step completion
$: fameReset = isPhaseStepCompleted('gain-fame');
$: modifiersProcessed = isPhaseStepCompleted('apply-modifiers');

// Simple initialization - run automation when StatusPhase loads
onMount(async () => {
   console.log('🟡 [StatusPhase] Mounted, checking if should run automation...');
   
   // Only run automation if we're in the Status Phase and haven't run yet
   if ($kingdomData.currentPhase === TurnPhase.STATUS && !fameReset && !modifiersProcessed) {
      console.log('🟡 [StatusPhase] Starting automation...');
      previousFame = $kingdomData.fame;
      await runAutomation();
   } else {
      console.log('🟡 [StatusPhase] Skipping automation (wrong phase or already done)');
   }
});

// UI calls controller - no business logic here
async function runAutomation() {
   if (automationRunning) return;
   
   automationRunning = true;
   previousFame = $kingdomData.fame;
   
   try {
      // Use controller for business logic
      const { createStatusPhaseController } = await import('../../../controllers/StatusPhaseController');
      const controller = await createStatusPhaseController();
      
      const result = await controller.runAutomation();
      
      if (result.success) {
         automationComplete = true;
         console.log('✅ [StatusPhase] Automation completed successfully');
      } else {
         console.error('❌ [StatusPhase] Automation failed:', result.error);
      }
   } catch (error) {
      console.error('❌ [StatusPhase] Error running automation:', error);
   } finally {
      automationRunning = false;
   }
}

// Manual step functions for UI buttons (for testing/debugging)
async function manualResetFame() {
   try {
      const { createStatusPhaseController } = await import('../../../controllers/StatusPhaseController');
      const controller = await createStatusPhaseController();
      await controller.resetFame();
   } catch (error) {
      console.error('❌ [StatusPhase] Manual fame reset failed:', error);
   }
}

async function manualApplyModifiers() {
   try {
      const { createStatusPhaseController } = await import('../../../controllers/StatusPhaseController');
      const controller = await createStatusPhaseController();
      await controller.applyModifiers();
   } catch (error) {
      console.error('❌ [StatusPhase] Manual modifiers apply failed:', error);
   }
}
</script>

<div class="status-phase">
   <!-- Fame Display Section -->
   <div class="phase-section fame-section">
      <div class="section-header">
         <i class="fas fa-star"></i>
         <h3>Kingdom Fame</h3>
      </div>

      <div class="fame-display">
         <div class="fame-stars">
            {#each Array(MAX_FAME) as _, i}
               <i
                  class="{i < $kingdomData.fame ? 'fas' : 'far'} fa-star star-icon"
                  class:filled={i < $kingdomData.fame}
               ></i>
            {/each}
         </div>

         <div class="fame-info">
            <div class="fame-value">{$kingdomData.fame} / {MAX_FAME}</div>
            {#if fameReset && previousFame !== 1}
               <div class="fame-change">
                  Fame reset from {previousFame} to 1
               </div>
            {/if}
         </div>
      </div>

      <!-- Manual controls for testing/debugging -->
      {#if !fameReset}
         <div class="manual-controls">
            <button on:click={manualResetFame} disabled={automationRunning}>
               Reset Fame to 1
            </button>
         </div>
      {/if}
   </div>

   <!-- Active Modifiers Overview -->
   {#if $kingdomData.modifiers && $kingdomData.modifiers.length > 0}
      <div class="phase-section active-modifiers">
         <div class="section-header">
            <i class="fas fa-list"></i>
            <h3>Active Modifiers</h3>
            {#if modifiersProcessed}
               <span class="status-badge processed">✅ Applied</span>
            {:else}
               <span class="status-badge pending">⏳ Pending</span>
            {/if}
         </div>

         <div class="modifiers-grid">
            {#each $kingdomData.modifiers as modifier}
               <ModifierCard {modifier} />
            {/each}
         </div>

         <!-- Manual controls for testing/debugging -->
         {#if !modifiersProcessed}
            <div class="manual-controls">
               <button on:click={manualApplyModifiers} disabled={automationRunning}>
                  Apply Modifiers
               </button>
            </div>
         {/if}
      </div>
   {:else}
      <div class="phase-section no-modifiers">
         <div class="section-header">
            <i class="fas fa-check-circle"></i>
            <h3>No Active Modifiers</h3>
         </div>
         <p>Your kingdom has no active modifiers affecting this turn.</p>
      </div>
   {/if}

   <!-- Automation Status -->
   <div class="phase-section automation-status">
      <div class="section-header">
         <i class="fas fa-cog"></i>
         <h3>Phase Status</h3>
      </div>

      <div class="status-grid">
         <div class="status-item" class:complete={fameReset}>
            <i class="fas {fameReset ? 'fa-check-circle' : 'fa-circle'}"></i>
            <span>Fame Reset</span>
         </div>
         
         <div class="status-item" class:complete={modifiersProcessed}>
            <i class="fas {modifiersProcessed ? 'fa-check-circle' : 'fa-circle'}"></i>
            <span>Modifiers Applied</span>
         </div>
      </div>

      {#if automationRunning}
         <div class="automation-running">
            <i class="fas fa-spinner fa-spin"></i>
            Running automation...
         </div>
      {:else if !automationComplete && !fameReset && !modifiersProcessed}
         <button class="automation-button" on:click={runAutomation}>
            <i class="fas fa-play"></i>
            Run Status Phase
         </button>
      {/if}
   </div>
</div>

<style lang="scss">
   .status-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }

   .phase-section {
      background: linear-gradient(135deg,
         rgba(31, 31, 35, 0.6),
         rgba(15, 15, 17, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      padding: 20px;
   }

   .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;

      i {
         font-size: 20px;
         color: var(--color-amber);
      }

      h3 {
         margin: 0;
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
         color: var(--text-primary);
         flex: 1;
      }
   }

   .status-badge {
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      
      &.processed {
         background: rgba(34, 197, 94, 0.2);
         color: var(--color-green);
         border: 1px solid rgba(34, 197, 94, 0.3);
      }
      
      &.pending {
         background: rgba(251, 191, 36, 0.2);
         color: var(--color-amber);
         border: 1px solid rgba(251, 191, 36, 0.3);
      }
   }

   // Fame Section Styles
   .fame-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
   }

   .fame-stars {
      display: flex;
      gap: 12px;
      justify-content: center;

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
         }

         &:not(.filled) {
            opacity: 0.3;
         }
      }
   }

   .fame-info {
      text-align: center;

      .fame-value {
         font-size: var(--font-3xl);
         font-weight: var(--font-weight-semibold);
         color: var(--color-amber-light);
         text-shadow: var(--text-shadow-md);
      }

      .fame-change {
         margin-top: 8px;
         font-size: var(--font-md);
         color: var(--text-secondary);
         font-style: italic;
      }
   }

   // Status Grid
   .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
   }

   .status-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      
      &.complete {
         border-color: var(--color-green);
         background: rgba(34, 197, 94, 0.1);
         
         i {
            color: var(--color-green);
         }
      }
      
      i {
         font-size: 16px;
         color: var(--color-gray-500);
      }
      
      span {
         color: var(--text-primary);
         font-weight: var(--font-weight-medium);
      }
   }

   // Manual Controls
   .manual-controls {
      margin-top: 15px;
      text-align: center;
      
      button {
         background: var(--color-secondary);
         color: var(--text-primary);
         border: 1px solid var(--border-default);
         padding: 8px 16px;
         border-radius: var(--radius-md);
         cursor: pointer;
         font-size: var(--font-sm);
         
         &:hover:not(:disabled) {
            background: var(--color-secondary-hover);
         }
         
         &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
         }
      }
   }

   // Automation Button
   .automation-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 20px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
         background: var(--color-primary-hover);
         transform: translateY(-1px);
      }
      
      i {
         font-size: 14px;
      }
   }

   .automation-running {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      color: var(--color-amber);
      font-weight: var(--font-weight-medium);
      
      i {
         font-size: 16px;
      }
   }

   // No Modifiers Styles
   .no-modifiers {
      text-align: center;
      
      p {
         margin: 0;
         color: var(--text-secondary);
         font-size: var(--font-md);
      }
   }

   // Active Modifiers Grid
   .modifiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
   }
</style>
