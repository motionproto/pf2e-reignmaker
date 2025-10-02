<script lang="ts">
   import { onMount } from 'svelte';
   import { get } from 'svelte/store';
   import { kingdomData, getKingdomActor, isPhaseStepCompleted } from '../../../stores/KingdomStore';
   import Button from '../components/baseComponents/Button.svelte';
   import { tick } from 'svelte';
   
   // Props
   export let isViewingCurrentPhase: boolean = true;
   
   // UI State only
   let isCollecting = false;
   
   // Resource icons and colors - this is presentation configuration, belongs in component
   const resourceConfig: Record<string, { icon: string; color: string }> = {
      food: { icon: 'fa-wheat-awn', color: 'var(--color-brown-light)' },
      lumber: { icon: 'fa-tree', color: 'var(--color-green)' },
      stone: { icon: 'fa-cube', color: 'var(--color-gray-500)' },
      ore: { icon: 'fa-mountain', color: 'var(--color-blue)' },
      gold: { icon: 'fa-coins', color: 'var(--color-amber-light)' }
   };
   
   // Edit state management
   let editingResource: string | null = null;
   let editValue: number = 0;
   let editInputElement: HTMLInputElement | undefined;
   
   async function startEditing(resource: string) {
      editingResource = resource;
      editValue = currentResources.get(resource) || 0;
      await tick();
      if (editInputElement) {
         editInputElement.focus();
         editInputElement.select();
      }
   }
   
   function saveEdit() {
      if (editingResource) {
         const actor = getKingdomActor();
         if (actor) {
            const resource = editingResource; // Capture in const to avoid null check issue
            actor.updateKingdom((kingdom) => {
               kingdom.resources[resource] = Math.max(0, Math.floor(editValue));
            });
         }
         editingResource = null;
      }
   }
   
   function cancelEdit() {
      editingResource = null;
      editValue = 0;
   }
   
   function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
         saveEdit();
      } else if (e.key === 'Escape') {
         cancelEdit();
      }
   }
   
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
            console.error('❌ [ResourcesPhase] Failed to get preview data:', error);
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
         console.error('❌ [ResourcesPhase] Failed to initialize:', error);
      }
   }
   
   // Handle manual resource collection
   async function handleCollectResources() {
      if (isCollecting || !resourceController) return;
      
      isCollecting = true;
      
      try {
         const result = await resourceController.collectResources();
         
         if (!result.success) {
            console.error('❌ [ResourcesPhase] Collection failed:', result.error);
         }
      } catch (error) {
         console.error('❌ [ResourcesPhase] Error:', error);
      } finally {
         isCollecting = false;
      }
   }
   
</script>

<div class="resources-phase">
   
   <!-- Resource Dashboard -->
   <div class="resource-dashboard">
      {#each Object.entries(resourceConfig) as [resource, config]}
         <!-- svelte-ignore a11y-click-events-have-key-events -->
         <!-- svelte-ignore a11y-no-static-element-interactions -->
         <div 
            class="resource-card" 
            class:editing={editingResource === resource}
            style="--resource-color: {config.color};"
            on:click={() => startEditing(resource)}
         >
            <i class="fas {config.icon} resource-icon" style="color: {config.color};"></i>
            <div class="resource-info">
               {#if editingResource === resource}
                  <input
                     bind:this={editInputElement}
                     type="number"
                     bind:value={editValue}
                     on:keydown={handleKeydown}
                     on:click|stopPropagation
                     class="resource-edit-input"
                     min="0"
                  />
                  <div class="edit-buttons">
                     <button 
                        class="save-btn" 
                        on:click|stopPropagation={saveEdit} 
                        aria-label="Save"
                        title="Save"
                     >
                        <i class="fas fa-check"></i>
                     </button>
                     <button 
                        class="cancel-btn" 
                        on:click|stopPropagation={cancelEdit} 
                        aria-label="Cancel"
                        title="Cancel"
                     >
                        <i class="fas fa-times"></i>
                     </button>
                  </div>
               {:else}
                  <div class="resource-value">{currentResources.get(resource) || 0}</div>
                  <div class="resource-label">{resource}</div>
               {/if}
            </div>
         </div>
      {/each}
   </div>
   
   <!-- Manual Collection Controls -->
   <div class="manual-collection-section">
      {#if !collectCompleted}
         <div class="collection-prompt">
            <h3>Ready to Collect Resources</h3>
            <p>Click the button below to manually collect territory production and settlement gold income.</p>
         </div>
         
         <div class="collect-button-container">
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
                  Collect All Resources
               {/if}
            </Button>
         </div>
      {:else}
         <div class="collection-completed">
            <h3>✅ Resources Collected</h3>
            <p>All territory production and settlement gold have been added to your treasury.</p>
         </div>
      {/if}
   </div>
   
   <!-- Phase Steps -->
   <div class="phase-steps-container">
      
      <!-- Step 1: Collect Resources and Revenue -->
      <div class="phase-step" class:completed={collectCompleted}>
         <!-- Resource Production -->
         {#if totalProduction.size > 0}
            {@const productionList = Object.keys(resourceConfig)
               .filter(resource => (totalProduction.get(resource) || 0) > 0)
               .map(resource => ({resource, amount: totalProduction.get(resource) || 0}))}
            <div class="production-summary">
               <div class="production-header">
                  <span class="production-title">Resource Production This Turn:</span>
                  <span class="production-total">
                     {#each productionList as item, i}
                        {#if i > 0} | {/if}
                        <span style="color: {resourceConfig[item.resource]?.color || 'var(--text-primary)'}">
                           +{item.amount} {item.resource.charAt(0).toUpperCase() + item.resource.slice(1)}
                        </span>
                     {/each}
                  </span>
               </div>
               
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
         
         <!-- Gold Income from Settlements -->
         {#if settlementCount > 0}
            <div class="gold-income-summary">
               <div class="income-header">
                  <i class="fas fa-coins" style="color: var(--color-amber-light);"></i>
                  <span class="income-title">Settlement Gold Income:</span>
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
            </div>
         {/if}
         
         <!-- Collection completed indicator -->
         {#if collectCompleted}
            <div class="phase-summary">
               <div class="summary-title">✅ Resources collected this turn</div>
               <div class="summary-details">
                  <span>Territory production and settlement gold have been added to your treasury</span>
               </div>
            </div>
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
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
   }
   
   .resource-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      outline: 2px solid transparent;
      outline-offset: 2px;
      transition: all 0.2s ease;
      position: relative;
      
      &:hover:not(.editing) {
         outline-color: var(--resource-color);
         background: rgba(0, 0, 0, 0.3);
      }
      
      &.editing {
         outline-width: 3px;
         outline-color: var(--resource-color);
         background: linear-gradient(135deg, 
            rgba(0, 0, 0, 0.3),
            color-mix(in srgb, var(--resource-color) 10%, transparent)
         );
      }
      
      .resource-icon {
         font-size: 1.5rem;
      }
      
      .resource-info {
         display: flex;
         flex-direction: column;
         min-width: 80px;
      }
      
      .resource-value {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-bold);
         color: var(--text-primary);
      }
      
      .resource-label {
         font-size: var(--font-sm);
         color: var(--text-tertiary);
         text-transform: capitalize;
      }
      
      .resource-edit-input {
         width: 80px;
         padding: 0.25rem 0.5rem;
         border: 2px solid var(--resource-color);
         border-radius: 0.25rem;
         background: var(--bg-surface);
         color: var(--text-primary);
         font-size: var(--font-xl);
         font-weight: var(--font-weight-bold);
         text-align: center;
         
         &:focus {
            outline: none;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--resource-color) 20%, transparent);
         }
      }
      
      /* Remove number input arrows for cleaner look */
      .resource-edit-input::-webkit-inner-spin-button,
      .resource-edit-input::-webkit-outer-spin-button {
         -webkit-appearance: none;
         margin: 0;
      }
      
      .resource-edit-input[type="number"] {
         -moz-appearance: textfield;
      }
      
      .edit-buttons {
         display: flex;
         gap: 0.25rem;
         margin-top: 0.25rem;
      }
      
      .save-btn,
      .cancel-btn {
         flex: 1;
         padding: 0.25rem;
         border: 1px solid var(--border-default);
         background: var(--bg-surface);
         border-radius: 0.25rem;
         display: flex;
         align-items: center;
         justify-content: center;
         cursor: pointer;
         transition: all var(--transition-fast);
         color: var(--text-primary);
         font-size: 0.75rem;
         
         i {
            font-size: 0.75rem;
         }
      }
      
      .save-btn:hover {
         background: var(--color-success);
         border-color: var(--color-success);
         color: white;
      }
      
      .cancel-btn:hover {
         background: var(--color-danger);
         border-color: var(--color-danger);
         color: white;
      }
      
      .save-btn:active,
      .cancel-btn:active {
         transform: scale(0.95);
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
         font-size: var(--font-xl);  /* 20px */
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
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
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.5;
         color: var(--text-primary);
      }
      
      .production-total {
         font-size: var(--font-2xl);  /* 18px */
         font-weight: var(--font-weight-semibold);
         color: var(--color-green);
      }
   }
   
   .worksite-summary {
      margin-top: 10px;
      
      .worksite-count {
         color: var(--text-secondary);
         font-size: var(--font-sm);
         font-style: italic;
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
   
   .gold-income-summary {
      margin: 15px 0;
      padding: 15px;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      
      .income-header {
         display: flex;
         align-items: center;
         gap: 10px;
         margin-bottom: 10px;
         
         i {
            font-size: 20px;
         }
      }
      
      .income-title {
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.5;
         color: var(--text-primary);
         flex: 1;
      }
      
      .income-amount {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
      }
   }
   
   .income-note {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: var(--font-m);
      
      &.warning {
         background: rgba(245, 158, 11, 0.1);
         color: var(--color-amber-light);
         border: 1px solid var(--color-amber);
         
         i {
            font-size: 14px;
         }
      }
      
      &.success {
         background: rgba(34, 197, 94, 0.1);
         color: var(--color-green-light);
         border: 1px solid var(--color-green);
         
         i {
            font-size: 14px;
         }
      }
   }
   
   .manual-collection-section {
      margin: 20px 0;
      padding: 20px;
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.5),
         rgba(31, 31, 35, 0.3));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      text-align: center;
      
      h3 {
         margin: 0 0 10px 0;
         color: var(--text-primary);
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
      }
      
      p {
         margin: 0 0 20px 0;
         color: var(--text-secondary);
         font-size: var(--font-md);
         line-height: 1.5;
      }
   }
   
   .collection-prompt {
      margin-bottom: 20px;
   }
   
   .collection-completed {
      h3 {
         color: var(--color-green);
      }
   }
   
   .collect-button-container {
      display: flex;
      justify-content: center;
      padding: 0;
   }
   
   .phase-summary {
      margin-top: 15px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      
      .summary-title {
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
         margin-bottom: 8px;
      }
      
      .summary-details {
         display: flex;
         gap: 15px;
         flex-wrap: wrap;
         font-size: var(--font-sm);
         color: var(--text-secondary);
         
         span {
            display: flex;
            align-items: center;
            gap: 5px;
         }
      }
   }
</style>
