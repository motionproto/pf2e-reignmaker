<script lang="ts">
   import { onMount } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomState } from '../../../stores/kingdom';
   import { gameState } from '../../../stores/gameState';
   import { TurnPhase } from '../../../models/KingdomState';
   
   // Import clean architecture components
   import { createStatusPhaseController } from '../../../controllers/StatusPhaseController';
   import type { StatusPhaseController } from '../../../controllers/StatusPhaseController';
   
   // Import the ModifierCard component
   import ModifierCard from '../components/ModifierCard.svelte';
   
   // Controller instance
   let statusController: StatusPhaseController;
   
   // Constants
   const MAX_FAME = 3;
   
   // UI State for tracking what happened
   let fameReset = false;
   let previousFame = 0;
   let modifiersProcessed = false;
   let appliedEffects: Array<{
      name: string;
      source: string;
      effects: Array<{
         resource: string;
         amount: number;
      }>;
   }> = [];
   
   // Initialize controller and automatically process phase on mount
   onMount(async () => {
      statusController = createStatusPhaseController();
      
      // Only run automation if we're in the Status Phase
      if ($gameState.currentPhase === TurnPhase.PHASE_I) {
         await runAutomation();
      }
   });
   
   // Run automation when phase changes to Status Phase
   $: if ($gameState.currentPhase === TurnPhase.PHASE_I && statusController && !fameReset && !modifiersProcessed) {
      runAutomation();
   }
   
   // Automatically process fame and modifiers
   async function runAutomation() {
      // Store previous fame for display
      previousFame = $kingdomState.fame;
      
      // Reset fame to 1
      const fameResult = await statusController.resetFame(
         get(kingdomState),
         $gameState.currentTurn || 1
      );
      
      if (fameResult.success) {
         fameReset = true;
      }
      
      // Process modifiers and get detailed effects
      const modifierResult = await statusController.processModifiers(
         get(kingdomState),
         $gameState.currentTurn || 1
      );
      
      if (modifierResult.success) {
         appliedEffects = modifierResult.modifierDetails;
         modifiersProcessed = true;
      }
      
      // Expire old modifiers
      statusController.expireModifiers(get(kingdomState), $gameState.currentTurn || 1);
   }
   
   // Format resource name for display
   function formatResourceName(resource: string): string {
      const resourceNames: Record<string, string> = {
         gold: 'Gold',
         food: 'Food',
         lumber: 'Lumber',
         stone: 'Stone',
         ore: 'Ore',
         luxuries: 'Luxuries',
         unrest: 'Unrest',
         fame: 'Fame'
      };
      return resourceNames[resource] || resource;
   }
   
   // Group effects by positive and negative
   $: positiveEffects = appliedEffects.filter(mod => 
      mod.effects.some(e => e.amount > 0)
   );
   
   $: negativeEffects = appliedEffects.filter(mod => 
      mod.effects.some(e => e.amount < 0)
   );
   
   // Get phase summary from controller
   $: phaseSummary = statusController?.getPhaseSummary();
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
                  class="{i < $kingdomState.fame ? 'fas' : 'far'} fa-star star-icon" 
                  class:filled={i < $kingdomState.fame}
               ></i>
            {/each}
         </div>
         
         <div class="fame-info">
            <div class="fame-value">{$kingdomState.fame} / {MAX_FAME}</div>
            {#if fameReset && previousFame !== 1}
               <div class="fame-change">
                  Fame reset from {previousFame} to 1
               </div>
            {/if}
         </div>
      </div>
   </div>
   
   <!-- Active Modifiers Overview -->
   {#if $kingdomState.modifiers && $kingdomState.modifiers.length > 0}
      <div class="phase-section active-modifiers">
         <div class="section-header">
            <i class="fas fa-list"></i>
            <h3>Active Modifiers</h3>
         </div>
         
         <div class="modifiers-grid">
            {#each $kingdomState.modifiers as modifier}
               <ModifierCard {modifier} />
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
   
   // Modifier Effects Styles
   .no-modifiers {
      text-align: center;
      padding: 30px;
      color: var(--text-secondary);
      
      i {
         font-size: 48px;
         color: var(--color-green);
         margin-bottom: 10px;
      }
      
      p {
         margin: 0;
         font-size: var(--font-md);
      }
   }
   
   .effects-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .effects-group {
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      padding: 15px;
      
      h4 {
         margin: 0 0 12px 0;
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         display: flex;
         align-items: center;
         gap: 8px;
         
         i {
            font-size: 18px;
         }
      }
      
      &.positive {
         border-left: 3px solid var(--color-green);
         
         h4 {
            color: var(--color-green-light);
            
            i {
               color: var(--color-green);
            }
         }
         
         .effect-value {
            color: var(--color-green-light);
         }
      }
      
      &.negative {
         border-left: 3px solid var(--color-red);
         
         h4 {
            color: var(--color-red-light);
            
            i {
               color: var(--color-red);
            }
         }
         
         .effect-value {
            color: var(--color-red-light);
         }
      }
   }
   
   .effects-list {
      list-style: none;
      margin: 0;
      padding: 0;
   }
   
   .effect-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: var(--font-md);
      
      &:last-child {
         border-bottom: none;
      }
      
      .effect-value {
         font-weight: var(--font-weight-bold);
         font-size: var(--font-lg);
         min-width: 40px;
      }
      
      .effect-resource {
         color: var(--text-primary);
         font-weight: var(--font-weight-medium);
      }
      
      .effect-source {
         margin-left: auto;
         color: var(--text-tertiary);
         font-size: var(--font-sm);
         font-style: italic;
      }
   }
   
   // Active Modifiers Grid
   .modifiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
   }
   
   // Phase Complete Indicator
   .phase-complete {
      background: linear-gradient(135deg,
         rgba(34, 197, 94, 0.1),
         rgba(34, 197, 94, 0.05));
      border: 1px solid var(--color-green-border);
      border-radius: var(--radius-md);
      padding: 20px;
      text-align: center;
      
      i {
         font-size: 32px;
         color: var(--color-green);
         margin-bottom: 10px;
      }
      
      p {
         margin: 0;
         color: var(--color-green-light);
         font-size: var(--font-md);
      }
   }
</style>
