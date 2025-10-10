<script lang="ts">
import { kingdomData, kingdomActor, isInitialized } from '../../../stores/KingdomStore';
import { TurnPhase } from '../../../actors/KingdomActor';
import ModifierCard from '../components/ModifierCard.svelte';
import CustomModifierDisplay from '../components/CustomModifierDisplay.svelte';

// Props - add the missing prop to fix the warning
export let isViewingCurrentPhase: boolean = true;

// Constants
const MAX_FAME = 3;

// Better initialization - wait for store to be ready before initializing phase
let hasInitialized = false;
$: if ($kingdomData.currentPhase === TurnPhase.STATUS && $isInitialized && $kingdomActor && !hasInitialized) {
   initializePhase();
}

async function initializePhase() {
   if (hasInitialized) return;
   hasInitialized = true;
   
   console.log('🟡 [StatusPhase] Initializing phase controller...');
   
   try {
      const { createStatusPhaseController } = await import('../../../controllers/StatusPhaseController');
      const controller = await createStatusPhaseController();
      await controller.startPhase();
   } catch (error) {
      console.error('❌ [StatusPhase] FATAL: Phase initialization failed:', error);
      // No retry - fail fast and loud
      throw error;
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
         </div>
      </div>
   </div>

   <!-- Status Phase Modifiers (Size, Metropolises) -->
   {#if $kingdomData.turnState?.statusPhase?.displayModifiers && $kingdomData.turnState.statusPhase.displayModifiers.length > 0}
      <div class="phase-section status-modifiers">
         <div class="section-header">
            <i class="fas fa-balance-scale"></i>
            <h3>Status Modifiers</h3>
         </div>

         <div class="modifiers-stack">
            {#each $kingdomData.turnState.statusPhase.displayModifiers as modifier}
               <CustomModifierDisplay {modifier} />
            {/each}
         </div>
      </div>
   {/if}

   <!-- Structure Modifiers (Permanent modifiers from built structures) -->
   {#if $kingdomData.activeModifiers && $kingdomData.activeModifiers.filter(m => m.sourceType === 'structure' && m.modifiers?.some(mod => mod.duration === 'permanent')).length > 0}
      <div class="phase-section structure-modifiers">
         <div class="section-header">
            <i class="fas fa-building"></i>
            <h3>Structure Modifiers</h3>
         </div>

         <div class="modifiers-stack">
            {#each $kingdomData.activeModifiers.filter(m => m.sourceType === 'structure' && m.modifiers?.some(mod => mod.duration === 'permanent')) as modifier}
               <CustomModifierDisplay {modifier} />
            {/each}
         </div>
      </div>
   {/if}
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

   // Status Modifiers Stack (Full Width)
   .modifiers-stack {
      display: flex;
      flex-direction: column;
      gap: 15px;
   }

   // Active Modifiers Grid
   .modifiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
   }
</style>
