<script lang="ts">
   import { onMount } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomData, getKingdomActor, isPhaseStepCompleted } from '../../../stores/KingdomStore';
   import Button from '../components/baseComponents/Button.svelte';
   import ResourceCard from '../components/baseComponents/ResourceCard.svelte';
   import { tick } from 'svelte';
   import { getResourceIcon, getResourceColor } from '../utils/presentation';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // UI State only
   let isCollecting = false;
   
   // Resource order for display
   const resourceOrder = ['food', 'gold', 'lumber', 'stone', 'ore'];
   
   // Reactive data from kingdomData store
   $: currentResources = new Map([
      ['food', $kingdomData.resources?.food || 0],
      ['lumber', $kingdomData.resources?.lumber || 0], 
      ['stone', $kingdomData.resources?.stone || 0],
      ['ore', $kingdomData.resources?.ore || 0],
      ['gold', $kingdomData.resources?.gold || 0]
   ]);
   
   // Preview data state - now handled with async calls
   let previewData: any = null;
   
   $: totalProduction = previewData?.territoryProduction || new Map();
   $: worksiteDetails = previewData?.worksiteDetails || [];
   $: potentialGoldIncome = previewData?.goldIncome || 0;
   $: fedSettlementsCount = previewData?.fedCount || 0;
   $: unfedSettlementsCount = previewData?.unfedCount || 0;
   $: settlementCount = previewData?.totalSettlements || 0;
   $: collectCompleted = previewData?.isCollected || isPhaseStepCompleted(0);
   
   // Function to update preview data
   async function updatePreviewData() {
      if (resourceController) {
         try {
            previewData = await resourceController.getPreviewData();
         } catch (error) {
            logger.error('❌ [ResourcesPhase] Failed to get preview data:', error);
            previewData = null;
         }
      }
   }
   
   // React to kingdom data changes to update preview
   $: if (resourceController && $kingdomData) {
      updatePreviewData();
   }
   
   // Initialize controller when component mounts
   let resourceController: any;
   
   onMount(async () => {
      if (isViewingCurrentPhase && $kingdomData) {
         await initializePhase();
      }
   });

   async function initializePhase() {
      try {
         const { createResourcePhaseController } = await import('../../../controllers/ResourcePhaseController');
         resourceController = await createResourcePhaseController();
         await resourceController.startPhase();
         // Load initial preview data
         await updatePreviewData();
      } catch (error) {
         logger.error('❌ [ResourcesPhase] Failed to initialize:', error);
      }
   }
   
   // Handle manual resource collection
   async function handleCollectResources() {
      if (isCollecting || !resourceController) return;
      
      isCollecting = true;
      
      try {
         const result = await resourceController.collectResources();
         
         if (!result.success) {
            logger.error('❌ [ResourcesPhase] Collection failed:', result.error);
         }
      } catch (error) {
         logger.error('❌ [ResourcesPhase] Error:', error);
      } finally {
         isCollecting = false;
      }
   }
   
</script>

<div class="resources-phase">
   
   <!-- Resource Dashboard -->
   <div class="resource-dashboard">
      {#each resourceOrder as resource}
         <ResourceCard
            resource={resource}
            value={currentResources.get(resource) || 0}
            icon={getResourceIcon(resource)}
            color={getResourceColor(resource)}
            size="normal"
         />
      {/each}
   </div>
   
   <!-- Phase Steps -->
   <div class="phase-steps-container">
      
      <!-- Collection Button -->
      <div class="button-area">
            {#if !collectCompleted}
               <Button 
                  variant="secondary"
                  on:click={handleCollectResources} 
                  disabled={isCollecting}
                  icon={isCollecting ? "fas fa-spinner fa-spin" : "fas fa-hand-holding-usd"}
                  iconPosition="left"
               >
                  {#if isCollecting}
                     Collecting Resources...
                  {:else}
                     Collect Resources
                  {/if}
               </Button>
            {:else}
               <div class="auto-status">
                  <i class="fas fa-check"></i> Resources Collected
               </div>
            {/if}
      </div>
      
      <!-- Resource Production & Gold Income -->
      <div class="income-production-summary" class:collected={collectCompleted}>
         {#if totalProduction.size > 0}
            {@const productionList = resourceOrder
               .filter(resource => (totalProduction.get(resource) || 0) > 0)
               .map(resource => ({resource, amount: totalProduction.get(resource) || 0}))}
            <div class="production-section">
               <i class="fas fa-hand-holding-usd"></i>
               <span class="section-title">Resource Production This Turn:</span>
               <span class="production-total">
                  {#each productionList as item, i}
                     {#if i > 0}<span class="pipe-separator">|</span>{/if}
                     <span style="color: {getResourceColor(item.resource)}">
                        +{item.amount} {item.resource.charAt(0).toUpperCase() + item.resource.slice(1)}
                     </span>
                  {/each}
               </span>
               
               {#if worksiteDetails.length > 0}
                  <div class="worksite-summary">
                     <span class="worksite-count">{worksiteDetails.length} worksite{worksiteDetails.length !== 1 ? 's' : ''} producing resources</span>
                  </div>
               {/if}
            </div>
         {:else}
            <div class="no-production">
               No worksites currently producing resources
            </div>
         {/if}
         
         {#if settlementCount > 0}
            <div class="gold-income-section">
               <i class="fas fa-coins" style="color: var(--color-amber-light);"></i>
               <span class="section-title">Settlement Gold Income:</span>
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
         {/if}
      </div>
      
   </div> <!-- End of phase-steps-container -->
</div> <!-- End of resources-phase -->

<style lang="scss">
   .resources-phase {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .resource-dashboard {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      max-width: 800px;
      margin: 0 auto;
      justify-content: center;
   }
   
   .phase-steps-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
   }
   
   .income-production-summary {
      margin: 1rem auto;
      padding: 1.5rem 2rem;
      max-width: 800px;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.3s ease;
      
      &.collected {
         border: 2px solid var(--color-green);
         background: linear-gradient(135deg,
            rgba(34, 197, 94, 0.15),
            rgba(34, 197, 94, 0.08));
      }
   }
   
   .production-section,
   .gold-income-section {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
   }
   
   .section-title {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
   }
   
   .production-total {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-green);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
   }
   
   .pipe-separator {
      color: var(--text-secondary);
      margin: 0 8px;
   }
   
   .income-amount {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
   }
   
   .worksite-summary {
      width: 100%;
      margin-top: 5px;
      
      .worksite-count {
         color: var(--text-secondary);
         font-size: var(--font-md);
      }
   }
   
   .no-production {
      padding: .5rem;
      border-radius: var(--radius-md);
      text-align: center;
      color: var(--text-primary);
      font-size: var(--font-md);
   }
   
   .production-section,
   .gold-income-section {
      i {
         font-size: 20px;
      }
   }
   
   .income-note {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: var(--font-md);
      
      &.warning {
         color: var(--color-amber-light);
         border: 1px solid var(--color-amber);
         
         i {
            font-size: 14px;
            color: var(--color-amber-light);
         }
      }
      
      &.success {
         color: var(--color-green-light);
         border: 1px solid var(--color-green);
         
         i {
            font-size: 14px;
            color: var(--color-green-light);
         }
      }
   }
   
   .button-area {
      display: flex;
      align-items: flex-start;
      justify-content: center;
   }
   
   .auto-status {
      padding: 0.5rem 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      display: inline-flex;
      align-items: center;
      
      i {
         margin-right: 8px;
         color: var(--color-green);
      }
   }
</style>
