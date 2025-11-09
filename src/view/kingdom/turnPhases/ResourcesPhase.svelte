<script lang="ts">
   import { onMount } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomData, getKingdomActor, isPhaseStepCompleted } from '../../../stores/KingdomStore';
   import Button from '../components/baseComponents/Button.svelte';
   import ResourceCard from '../components/baseComponents/ResourceCard.svelte';
   import { tick } from 'svelte';
   import { getResourceIcon, getResourceColor } from '../utils/presentation';
   import { logger } from '../../../utils/Logger';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // UI State only
   let isCollecting = false;
   let isBreakdownExpanded = false;
   
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
   let modifierService: any;
   
   // Modifier application state
   let modifierPreview: Array<{ resource: string; change: number; modifiers: Array<{ name: string; value: number }> }> = [];
   
   // Calculate total income from all sources
   $: totalsByResource = (() => {
      const totals = new Map();
      for (const resource of resourceOrder) {
         const production = totalProduction.get(resource) || 0;
         const modifierAmount = modifierPreview.find(m => m.resource === resource)?.change || 0;
         const goldAmount = resource === 'gold' ? potentialGoldIncome : 0;
         const total = production + modifierAmount + goldAmount;
         if (total !== 0) {
            totals.set(resource, { production, modifierAmount, goldAmount, total });
         }
      }
      return totals;
   })();
   
   onMount(async () => {
      if (isViewingCurrentPhase && $kingdomData) {
         await initializePhase();
         await loadModifierPreview();
      }
   });

   async function initializePhase() {
      try {
         const { createResourcePhaseController } = await import('../../../controllers/ResourcePhaseController');
         resourceController = await createResourcePhaseController();
         await resourceController.startPhase();
         // Load initial preview data
         await updatePreviewData();
         
         // Initialize modifier service
         const { createModifierService } = await import('../../../services/ModifierService');
         modifierService = await createModifierService();
      } catch (error) {
         logger.error('❌ [ResourcesPhase] Failed to initialize:', error);
      }
   }
   
   async function loadModifierPreview() {
      if (!modifierService) return;
      try {
         modifierPreview = await modifierService.previewModifierEffects();
      } catch (error) {
         logger.error('❌ [ResourcesPhase] Failed to load modifier preview:', error);
      }
   }
   
   // Handle manual resource collection and modifier application
   async function handleCollectResources() {
      if (isCollecting || !resourceController || !modifierService) return;
      
      isCollecting = true;
      
      try {
         // First collect resources
         const collectResult = await resourceController.collectResources();
         
         if (!collectResult.success) {
            logger.error('❌ [ResourcesPhase] Collection failed:', collectResult.error);
            return;
         }
         
         // Then apply ongoing modifiers
         const modifierResult = await modifierService.applyOngoingModifiers();
         
         if (modifierResult.success && modifierResult.appliedCount > 0) {
            ui?.notifications?.info(`Collected resources and applied ${modifierResult.appliedCount} ongoing modifier effects`);
         } else {
            ui?.notifications?.info('Resources collected');
         }
         
         // Refresh the resource display
         await updatePreviewData();
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
      
      <!-- Total Income Summary -->
      <div class="income-production-summary" class:collected={collectCompleted}>
         <!-- Total Income Header -->
         {#if totalsByResource.size > 0}
            <div class="total-income-header">
               <div class="total-income-title">
                  <span class="section-title">Total Income This Turn:</span>
               </div>
               <div class="total-income-list">
                  {#each resourceOrder as resource}
                     {@const amounts = totalsByResource.get(resource)}
                     {@const total = amounts?.total || 0}
                     <div class="total-income-item">
                        <span style="color: {getResourceColor(resource)}">
                           {total > 0 ? '+' : ''}{total} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                        </span>
                     </div>
                  {/each}
               </div>
            </div>
         {:else}
            <div class="no-production">
               No income this turn
            </div>
         {/if}
         
         <!-- Settlement Notes -->
         {#if settlementCount > 0}
            {#if unfedSettlementsCount > 0}
               <div class="income-note warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  {unfedSettlementsCount} settlement{unfedSettlementsCount > 1 ? 's' : ''} not generating gold (unfed last turn)
               </div>
            {:else if fedSettlementsCount > 0 && potentialGoldIncome > 0}
               <div class="income-note success">
                  <i class="fas fa-check-circle"></i>
                  All settlements were fed last turn and generate gold
               </div>
            {/if}
         {/if}
         
         <!-- Unrest Modifier Notes -->
         {#if modifierPreview.find(m => m.resource === 'unrest')}
            {@const unrestModifier = modifierPreview.find(m => m.resource === 'unrest')}
            {#if unrestModifier && unrestModifier.change > 0}
               <div class="income-note warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  Ongoing modifiers will increase Unrest by {unrestModifier.change}
               </div>
            {:else if unrestModifier && unrestModifier.change < 0}
               <div class="income-note success">
                  <i class="fas fa-check-circle"></i>
                  Ongoing modifiers will reduce Unrest by {Math.abs(unrestModifier.change)}
               </div>
            {:else if unrestModifier && unrestModifier.modifiers.length > 0}
               <div class="income-note info">
                  <i class="fas fa-info-circle"></i>
                  Ongoing modifiers affecting Unrest (net change: 0)
               </div>
            {/if}
         {/if}
         
         <!-- Expandable Breakdown Section -->
         {#if totalsByResource.size > 0}
            <button class="breakdown-toggle" on:click={() => isBreakdownExpanded = !isBreakdownExpanded}>
               <i class="fas fa-chevron-{isBreakdownExpanded ? 'up' : 'down'}"></i>
               {isBreakdownExpanded ? 'Hide' : 'Show'} Breakdown
            </button>
            
            {#if isBreakdownExpanded}
            <div class="income-breakdown">
               <div class="breakdown-title">Breakdown:</div>
               
               {#if totalProduction.size > 0}
                  <div class="breakdown-row">
                     <span class="breakdown-label">Worksite Production:</span>
                     <span class="breakdown-values">
                        {#each resourceOrder.filter(r => (totalProduction.get(r) || 0) > 0) as resource, i}
                           {#if i > 0}, {/if}
                           <span style="color: {getResourceColor(resource)}">
                              +{totalProduction.get(resource)} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                           </span>
                        {/each}
                     </span>
                  </div>
               {/if}
               
               {#if potentialGoldIncome > 0}
                  <div class="breakdown-row">
                     <span class="breakdown-label">Settlement Income:</span>
                     <span class="breakdown-values" style="color: var(--color-amber-light);">
                        +{potentialGoldIncome} Gold
                     </span>
                  </div>
               {/if}
               
               {#if modifierPreview.length > 0}
                  <div class="breakdown-row">
                     <span class="breakdown-label">Ongoing Modifiers:</span>
                     <span class="breakdown-values">
                        {#each modifierPreview as preview, i}
                           {#if i > 0}, {/if}
                           <span style="color: {getResourceColor(preview.resource)}">
                              {preview.change > 0 ? '+' : ''}{preview.change} {preview.resource.charAt(0).toUpperCase() + preview.resource.slice(1)}
                           </span>
                        {/each}
                     </span>
                  </div>
                  
                  <!-- Modifier Details -->
                  <div class="modifier-details-section">
                     {#each modifierPreview as preview}
                        <div class="modifier-detail-row">
                           <span class="modifier-detail-label">
                              {preview.resource.charAt(0).toUpperCase() + preview.resource.slice(1)}:
                           </span>
                           <span class="modifier-detail-list">
                              {preview.modifiers.map(mod => `${mod.name}(${mod.value >= 0 ? '+' : ''}${mod.value})`).join(', ')}
                           </span>
                        </div>
                     {/each}
                  </div>
               {/if}
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
      gap: var(--space-20);
   }
   
   .resource-dashboard {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-16);
      max-width: 50rem;
      margin: 0 auto;
      justify-content: center;
   }
   
   .phase-steps-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
   }
   
   .income-production-summary {
      margin: var(--space-16) auto;
      padding: var(--space-24) var(--space-24);
      width: 100%;
      max-width: 50rem;
      box-sizing: border-box;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
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
      gap: var(--space-10);
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
      margin: 0 var(--space-8);
   }
   
   .income-amount {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
   }
   
   .worksite-summary {
      width: 100%;
      margin-top: var(--space-4);
      
      .worksite-count {
         color: var(--text-secondary);
         font-size: var(--font-md);
      }
   }
   
   .no-production {
      padding: var(--space-16);
      border-radius: var(--radius-md);
      text-align: center;
      color: var(--text-primary);
      font-size: var(--font-md);
   }
   
   .production-section,
   .gold-income-section {
      i {
         font-size: var(--font-xl);
      }
   }
   
   .income-note {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-8) var(--space-12);
      border-radius: var(--radius-sm);
      font-size: var(--font-md);
      
      &.warning {
         color: var(--color-amber-light);
         border: 1px solid var(--color-amber);
         
         i {
            font-size: var(--font-sm);
            color: var(--color-amber-light);
         }
      }
      
      &.success {
         color: var(--color-green-light);
         border: 1px solid var(--color-green);
         
         i {
            font-size: var(--font-sm);
            color: var(--color-green-light);
         }
      }
      
      &.info {
         color: var(--color-blue-light);
         border: 1px solid var(--color-blue);
         
         i {
            font-size: var(--font-sm);
            color: var(--color-blue-light);
         }
      }
   }
   
   .button-area {
      display: flex;
      align-items: flex-start;
      justify-content: center;
   }
   
   .auto-status {
      padding: var(--space-8) var(--space-16);
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      display: inline-flex;
      align-items: center;
      
      i {
         margin-right: var(--space-8);
         color: var(--color-green);
      }
   }
   
   // Modifier Application Section
   .modifier-application-section {
      margin: var(--space-16) auto;
      padding: var(--space-24) var(--space-24);
      max-width: 50rem;
      width: 100%;
      box-sizing: border-box;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
   }
   
   .modifier-section-title {
      margin: 0;
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: var(--space-8);
      width: 100%;
      
      i {
         color: var(--text-primary);
         opacity: 0.8;
      }
   }
   
   .modifier-preview-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
   }
   
   .modifier-row {
      display: grid;
      grid-template-columns: 3.75rem auto 1fr;
      gap: var(--space-8);
      align-items: center;
   }
   
   .modifier-value {
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-bold);
      text-align: right;
      white-space: nowrap;
   }
   
   .modifier-resource {
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-bold);
      text-align: left;
      margin-right: var(--space-24);
      white-space: nowrap;
   }
   
   .modifier-details {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-normal);
      color: var(--text-secondary);
   }
   
   // Total Income Summary Styles
   .total-income-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      padding-bottom: var(--space-16);
      border-bottom: 1px solid var(--border-subtle);
   }
   
   .total-income-title {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      
      i {
         font-size: var(--font-xl);
         color: var(--text-primary);
      }
   }
   
   .total-income-list {
      display: flex;
      gap: var(--space-16);
      flex-wrap: wrap;
   }
   
   .total-income-item {
      span {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-bold);
      }
   }
   
   .income-breakdown {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
      padding-top: var(--space-8);
   }
   
   .breakdown-title {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      margin-bottom: var(--space-4);
   }
   
   .breakdown-row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-12);
      font-size: var(--font-lg);
   }
   
   .breakdown-label {
      width: 9.375rem;
      flex-shrink: 0;
      white-space: nowrap;
      color: var(--text-primary);
      font-weight: var(--font-weight-medium);
      margin-right: var(--space-16);
   }
   
   .breakdown-values {
      flex: 1;
      font-weight: var(--font-weight-semibold);
   }
   
   .modifier-details-section {
      margin-left: var(--space-16);
      display: flex;
      flex-direction: column;
      margin-top: var(--space-8);
      margin-bottom: var(--space-16);
      gap: var(--space-8);
   }
   
   .modifier-detail-row {
      display: flex;
      gap: var(--space-8);
      font-size: var(--font-md);
   }
   
   .modifier-detail-label {
      font-weight: var(--font-weight-semibold);
   }
   
   .modifier-detail-list {
      color: var(--text-secondary);
      font-weight: var(--font-weight-normal);
   }
   
   .breakdown-toggle {
      width: 100%;
      padding: var(--space-12) var(--space-16);
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-8);
      transition: all 0.2s ease;
      
      &:hover {
         background: rgba(0, 0, 0, 0.3);
         border-color: var(--color-blue);
      }
      
      i {
         font-size: var(--font-xs);
         transition: transform 0.2s ease;
      }
   }
</style>
