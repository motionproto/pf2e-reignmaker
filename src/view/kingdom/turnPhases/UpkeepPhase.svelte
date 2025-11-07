<script lang="ts">
   import { onMount } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomData, resources, settlements, updateKingdom } from '../../../stores/KingdomStore';
   import { TurnPhase } from '../../../actors/KingdomActor';
   import { logger } from '../../../utils/Logger';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // Import clean architecture components
   import { createUpkeepPhaseController } from '../../../controllers/UpkeepPhaseController';
   import Button from '../components/baseComponents/Button.svelte';
   import BuildQueueItem from '../components/buildQueue/BuildQueueItem.svelte';
   import Notification from '../components/baseComponents/Notification.svelte';
   import ResourceStat from '../components/baseComponents/ResourceStat.svelte';
   import { getResourceIcon, getResourceColor } from '../utils/presentation';
   
   // Controller instance
   let upkeepController: any;
   
   // UI State only - no business logic
   let processingFood = false;
   let processingMilitary = false;
   let processingBuild = false;
   let processingEndTurn = false;
   
   // Reactive UI state - use shared helpers for step completion
   import { getStepCompletion, areAllStepsComplete } from '../../../controllers/shared/PhaseHelpers';
   $: currentSteps = $kingdomData.currentPhaseSteps || [];
   $: consumeCompleted = getStepCompletion(currentSteps, 0); // Step 0 = consume-food
   $: militaryCompleted = getStepCompletion(currentSteps, 1); // Step 1 = military-support
   $: buildCompleted = getStepCompletion(currentSteps, 2); // Step 2 = build-queue
   
   // Phase automatically completes when all steps are done
   $: allStepsComplete = areAllStepsComplete(currentSteps);
   
   // Debug step completion states

   // Get all display data from controller (now async)
   let displayData: {
      currentFood: number;
      foodConsumption: number;
      foodShortage: number;
      settlementConsumption: number;
      armyConsumption: number;
      armyCount: number;
      armySupport: number;
      unsupportedCount: number;
      foodRemainingForArmies: number;
      armyFoodShortage: number;
      settlementFoodShortage: number;
      unfedSettlements: Array<{name: string, tier: string, tierNum: number, unrest: number}>;
      unfedUnrest: number;
      foodStorageCapacity: number;
      excessFood: number;
      fortificationMaintenanceCost: number;
      fortificationCount: number;
   } = {
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
      settlementFoodShortage: 0,
      unfedSettlements: [],
      unfedUnrest: 0,
      foodStorageCapacity: 0,
      excessFood: 0,
      fortificationMaintenanceCost: 0,
      fortificationCount: 0
   };
   
   // Update display data when kingdom data or controller changes
   $: if (upkeepController && $kingdomData) {
      upkeepController.getDisplayData($kingdomData).then((data: any) => {
         displayData = data;
      });
   }
   
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
      settlementFoodShortage,
      unfedSettlements,
      unfedUnrest,
      foodStorageCapacity,
      excessFood,
      fortificationMaintenanceCost,
      fortificationCount
   } = displayData);
   
   // UI state for unfed settlements dropdown
   let showUnfedSettlements = false;
   
   // Initialize phase when component mounts
   onMount(async () => {
      // Wait for kingdomActor to be available before starting phase
      const { kingdomActor } = await import('../../../stores/KingdomStore');
      let unsubscribe: (() => void) | null = null;
      unsubscribe = kingdomActor.subscribe(async (actor) => {
         if (actor && $kingdomData?.currentPhase === TurnPhase.UPKEEP) {
            if (unsubscribe) unsubscribe(); // Stop listening once we start
            await initializePhase();
         }
      });
   });

   async function initializePhase() {

      try {
         upkeepController = await createUpkeepPhaseController();
         const result = await upkeepController.startPhase();
         
         if (result.success) {

         } else {
            logger.error('❌ [UpkeepPhase] Phase initialization failed:', result.error);
         }
      } catch (error) {
         logger.error('❌ [UpkeepPhase] Unexpected error:', error);
      }
   }
   
   // Manual operation handlers
   async function handleFeedSettlements() {
      if (processingFood || !upkeepController) return;
      
      processingFood = true;
      try {
         const result = await upkeepController.feedSettlements();
         if (result.success) {

         } else {
            logger.error('❌ [UpkeepPhase] Failed to feed settlements:', result.error);
         }
      } catch (error) {
         logger.error('❌ [UpkeepPhase] Error feeding settlements:', error);
      } finally {
         processingFood = false;
      }
   }

   async function handleMilitarySupport() {
      if (processingMilitary || !upkeepController) return;
      
      processingMilitary = true;
      try {
         const result = await upkeepController.supportMilitary();
         if (result.success) {

         } else {
            logger.error('❌ [UpkeepPhase] Failed to process military support:', result.error);
         }
      } catch (error) {
         logger.error('❌ [UpkeepPhase] Error processing military support:', error);
      } finally {
         processingMilitary = false;
      }
   }

   async function handleBuildQueue() {
      if (processingBuild || !upkeepController) return;
      
      processingBuild = true;
      try {
         const result = await upkeepController.processBuilds();
         if (result.success) {

         } else {
            logger.error('❌ [UpkeepPhase] Failed to process build queue:', result.error);
         }
      } catch (error) {
         logger.error('❌ [UpkeepPhase] Error processing build queue:', error);
      } finally {
         processingBuild = false;
      }
   }

   // Remove the auto-complete logic since phase completion should be manual
   async function handleCompletePhase() {

      // Phase completes automatically when all steps are done
   }
</script>

<div class="upkeep-phase">
   
   
   <!-- Phase Steps Grid Container -->
   <div class="phase-steps-grid">
      
      <!-- Step 1: Feed Settlements -->
      <div class="phase-card" class:completed={consumeCompleted}>
         <div class="card-header">
            <h4 class="text-heading-secondary">
               <i class="fas fa-home step-icon"></i>
               Feed Settlements
            </h4>
            {#if consumeCompleted}
               <i class="fas fa-check-circle phase-complete-indicator"></i>
            {/if}
         </div>
         
         <div class="card-content">
            <div class="content-area">
            <div class="consumption-display">
               <ResourceStat 
                  icon="fas fa-home"
                  value={settlementConsumption}
                  label="Food Required"
                  variant="required"
               />
               
               <ResourceStat 
                  icon="fas fa-wheat-awn resource-food"
                  value={currentFood}
                  label="Food Available"
                  variant="available"
                  status={currentFood < settlementConsumption ? 'danger' : 'normal'}
               />
            </div>
            
            <div class="consumption-display">
               <ResourceStat 
                  icon="fas fa-boxes-stacked"
                  value={consumeCompleted ? `${currentFood} / ${foodStorageCapacity}` : `${Math.max(0, currentFood - settlementConsumption)} / ${foodStorageCapacity}`}
                  label="Food Stored / Capacity"
                  variant="storage"
                  status={excessFood > 0 ? 'warning' : 'normal'}
               />
            </div>
            
            {#if foodStorageCapacity === 0 && currentFood > settlementConsumption && !consumeCompleted}
               <Notification 
                  variant="info"
                  title="No food storage"
                  description="Build a Granary to store food."
               />
            {:else if excessFood > 0 && !consumeCompleted}
               <Notification 
                  variant="info"
                  title="Storage capacity exceeded"
                  description="Excess food will be lost at end of turn."
               />
            {/if}
            
            {#if unfedSettlements.length > 0 && !consumeCompleted}
               <Notification 
                  variant="warning"
                  title="Food shortage"
                  description="Unfed settlements generate unrest based on their tier and will not generate gold next turn."
                  impact="+{unfedUnrest} Unrest"
               />
               
               <!-- Collapsible unfed settlements list -->
               <button 
                  class="unfed-dropdown-toggle" 
                  on:click={() => showUnfedSettlements = !showUnfedSettlements}
               >
                  {showUnfedSettlements ? 'Hide' : 'Show'} unfed settlements ({unfedSettlements.length})
                  <i class="fas fa-chevron-{showUnfedSettlements ? 'up' : 'down'}"></i>
               </button>
               
               {#if showUnfedSettlements}
                  <div class="unfed-settlements-list">
                     {#each unfedSettlements as settlement}
                        <div class="unfed-settlement-item">
                           <span class="settlement-name">{settlement.name}</span>
                           <span class="settlement-tier">({settlement.tier})</span>
                           <span class="settlement-unrest">+{settlement.unrest} Unrest</span>
                        </div>
                     {/each}
                  </div>
               {/if}
            {/if}
            </div>
            
            <div class="button-area">
            {#if !consumeCompleted}
               <Button 
                  variant="secondary"
                  fullWidth={true}
                  disabled={processingFood}
                  icon={processingFood ? "fas fa-spinner spinning" : "fas fa-utensils"}
                  on:click={handleFeedSettlements}
               >
                  {processingFood ? "Processing..." : "Feed Settlements"}
               </Button>
            {:else}
               <div class="auto-status">
                  <i class="fas fa-check"></i> Settlements Fed
               </div>
            {/if}
            </div>
         </div>
      </div>
      
      <!-- Step 2: Military Support & Food -->
      <div class="phase-card" class:completed={militaryCompleted}>
         <div class="card-header">
            <h4 class="text-heading-secondary">
               <i class="fas fa-shield-alt step-icon"></i>
               Military Support
            </h4>
            {#if militaryCompleted}
               <i class="fas fa-check-circle phase-complete-indicator"></i>
            {/if}
         </div>
         
         <div class="card-content">
            <div class="content-area">
            {#if armyCount > 0 || fortificationCount > 0}
               <!-- 1. Food Requirements -->
               <div class="consumption-display">
                  <ResourceStat 
                     icon="fas fa-utensils"
                     value={armyConsumption}
                     label="Food Required"
                     variant="required"
                  />
                  
                  <ResourceStat 
                     icon="fas fa-wheat-awn resource-food"
                     value={foodRemainingForArmies}
                     label="Food Remaining"
                     variant="available"
                     status={armyFoodShortage > 0 ? 'danger' : 'normal'}
                  />
               </div>
               
               <!-- 2. Gold Requirements -->
               <div class="consumption-display">
                  <ResourceStat 
                     icon="fas fa-coins"
                     value={armyCount + fortificationMaintenanceCost}
                     label="Gold Required"
                     variant="required"
                  />
                  
                  <ResourceStat 
                     icon="fas fa-coins resource-gold"
                     value={$resources?.gold || 0}
                     label="Gold Available"
                     variant="available"
                     status={$resources?.gold < (armyCount + fortificationMaintenanceCost) ? 'danger' : 'normal'}
                  />
               </div>
               
               <!-- 3. Summary (Combined Capacity Display) -->
               <div class="military-capacity-display">
                  <div class="capacity-item" class:danger={unsupportedCount > 0} class:warning={armyCount === armySupport && armyCount > 0}>
                     <i class="fas fa-chess-knight"></i>
                     <span>{armyCount} / {armySupport} Armies</span>
                  </div>
                  
                  <div class="capacity-item">
                     <i class="fas fa-chess-rook"></i>
                     <span>{fortificationCount} Fortifications</span>
                  </div>
                  
                  {#if unsupportedCount > 0}
                     <div class="capacity-item danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>{unsupportedCount} Unsupported</span>
                     </div>
                  {/if}
               </div>
               
               <!-- 4. Notifications -->
               {#if armyCount > 0 && armyFoodShortage > 0 && !militaryCompleted}
                  <Notification 
                     variant="warning"
                     title="Food shortage"
                     description="Short by {armyFoodShortage} food."
                     impact="+{armyFoodShortage} Unrest"
                  />
               {/if}
               
               {#if armyCount > 0 && unsupportedCount > 0 && !militaryCompleted}
                  <Notification 
                     variant="warning"
                     title="Unsupported armies"
                     description="{unsupportedCount} {unsupportedCount === 1 ? 'army' : 'armies'} without support. Future update: Morale checks will be required."
                     impact="+{unsupportedCount} Unrest"
                  />
               {/if}
               
               {#if !militaryCompleted && ($resources?.gold || 0) < (armyCount + fortificationMaintenanceCost)}
                  <Notification 
                     variant="danger"
                     title="Insufficient gold"
                     description={($resources?.gold || 0) < armyCount 
                        ? "Cannot afford army upkeep." 
                        : "Cannot afford fortification maintenance."}
                     impact={($resources?.gold || 0) < armyCount 
                        ? "Will generate Unrest" 
                        : "Fortification effectiveness reduced by 1 tier"}
                  />
               {/if}
            {:else}
               <div class="info-text">No armies or fortifications requiring maintenance</div>
            {/if}
            </div>
            
            <div class="button-area">
            {#if armyCount > 0 || fortificationCount > 0}
               {#if !militaryCompleted}
                  <Button 
                     variant="secondary"
                     fullWidth={true}
                     disabled={processingMilitary}
                     icon={processingMilitary ? "fas fa-spinner spinning" : "fas fa-shield-alt"}
                     on:click={handleMilitarySupport}
                  >
                     {processingMilitary ? "Processing..." : armyCount > 0 && fortificationCount > 0 ? "Pay Armies & Fortifications" : armyCount > 0 ? "Pay Armies" : "Pay Fortifications"}
                  </Button>
               {:else}
                  <div class="auto-status">
                     <i class="fas fa-check"></i> Military Support Processed
                  </div>
               {/if}
            {:else}
               <div class="auto-status">
                  <i class="fas fa-check"></i> No Military Support Needed
               </div>
            {/if}
            </div>
         </div>
      </div>
      
      <!-- Step 3: Build Queue -->
      <div class="phase-card" class:completed={buildCompleted}>
         <div class="card-header">
            <h4 class="text-heading-secondary">
               <i class="fas fa-hammer step-icon"></i>
               Build Queue
            </h4>
            {#if buildCompleted}
               <i class="fas fa-check-circle phase-complete-indicator"></i>
            {/if}
         </div>
         
         <div class="card-content">
            <div class="content-area">
            {#if $kingdomData.buildQueue?.length > 0}
               <div class="build-resources-available">
                  <span class="available-label">Available Resources:</span>
                  <div class="resource-list">
                     {#each ['lumber', 'stone', 'ore'] as resource}
                        <div class="resource-item">
                           <i class="fas {getResourceIcon(resource)}" style="color: {getResourceColor(resource)}"></i>
                           <span>{$resources?.[resource] || 0}</span>
                        </div>
                     {/each}
                  </div>
               </div>
               
               <div class="build-queue">
                  {#each $kingdomData.buildQueue as project}
                     <BuildQueueItem {project} />
                  {/each}
               </div>
               
            {:else}
               <div class="info-text">No construction projects in queue</div>
            {/if}
            </div>
            
            <div class="button-area">
            {#if $kingdomData.buildQueue?.length > 0}
               {#if !buildCompleted}
                  <Button 
                     variant="secondary"
                     fullWidth={true}
                     disabled={processingBuild}
                     icon={processingBuild ? "fas fa-spinner spinning" : "fas fa-hammer"}
                     on:click={handleBuildQueue}
                  >
                     {processingBuild ? "Processing..." : "Process Build Queue"}
                  </Button>
               {:else}
                  <div class="auto-status">
                     <i class="fas fa-check"></i> Build Queue Processed
                  </div>
               {/if}
            {:else}
               <div class="auto-status">
                  <i class="fas fa-check"></i> No Projects
               </div>
            {/if}
            </div>
         </div>
      </div>
   </div>
   
   <!-- End of Turn Summary Section -->
   <div class="end-turn-summary" class:completed={allStepsComplete}>
      <div class="summary-header">
         <h4 class="text-heading-secondary">
            <i class="fas fa-scroll"></i>
            End of Turn Summary
         </h4>
         {#if allStepsComplete}
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
            
            {#if $settlements.filter(s => !s.wasFedLastTurn).length > 0}
               <div class="summary-item warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <p>{$settlements.filter(s => !s.wasFedLastTurn).length} settlement{$settlements.filter(s => !s.wasFedLastTurn).length > 1 ? 's' : ''} will not generate gold next turn (unfed).</p>
               </div>
            {/if}
         </div>
      </div>
   </div>
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
   
   
   .card-content {
      padding: 0 20px 12px 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
   }
   
   .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
   }
   
   .button-area {
      margin-top: auto;
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      
      .auto-status {
         width: 100%;
      }
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
      width: 100%;
   }
   
   .military-capacity-display {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      width: 100%;
   }
   
   .capacity-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: var(--font-sm);
      color: var(--text-primary);
      
      i {
         font-size: 18px;
         color: var(--color-blue);
         width: 20px;
         text-align: center;
      }
      
      span {
         font-weight: var(--font-weight-medium);
      }
      
      &.warning {
         i {
            color: var(--color-amber);
         }
         span {
            color: var(--color-amber);
         }
      }
      
      &.danger {
         i {
            color: var(--color-red);
         }
         span {
            color: var(--color-red);
         }
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
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .available-label {
         font-weight: var(--font-weight-semibold);
         margin-bottom: 4px;
      }
      
      .resource-list {
         display: flex;
         gap: 16px;
         flex-wrap: wrap;
      }
      
      .resource-item {
         display: flex;
         align-items: center;
         gap: 6px;
         
         i {
            font-size: 16px;
         }
         
         span {
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
         }
      }
   }
   
   .build-queue {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 200px;
      overflow-y: auto;
   }
   
   
   // Auto-status section for the new architecture
   .auto-status {
      padding: 0.5rem 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      text-align: center;
      
      i {
         margin-right: 8px;
         color: var(--color-blue);
         
         &.fa-check {
            color: var(--color-green);
         }
         
         &.fa-ban {
            color: var(--text-tertiary);
         }
         
         &.fa-cog {
            color: var(--color-amber);
         }
      }
   }
   
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
   
   // Unfed settlements dropdown
   .unfed-dropdown-toggle {
      width: 100%;
      padding: 8px 12px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid var(--color-amber);
      border-radius: var(--radius-sm);
      color: var(--color-amber-light);
      font-size: var(--font-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      
      &:hover {
         background: rgba(245, 158, 11, 0.25);
         border-color: var(--color-amber-light);
      }
      
      i {
         font-size: 12px;
      }
   }
   
   .unfed-settlements-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
   }
   
   .unfed-settlement-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      background: rgba(245, 158, 11, 0.1);
      border-radius: var(--radius-sm);
      font-size: var(--font-md);
      
      .settlement-name {
         flex: 1;
         color: var(--text-primary);
         font-weight: var(--font-weight-medium);
      }
      
      .settlement-tier {
         color: var(--text-tertiary);
         font-size: var(--font-md);
      }
      
      .settlement-unrest {
         color: var(--color-red);
         font-weight: var(--font-weight-semibold);
         font-size: var(--font-);
      }
   }
   
</style>
