<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { kingdomData } from '../../../../stores/KingdomStore';
  import { createBuildStructureController } from '../../../../controllers/BuildStructureController';
  import { structuresService } from '../../../../services/structures';
  import type { Structure } from '../../../../models/Structure';
  import { getCategoryDisplayName } from '../../../../models/Structure';
  import type { Settlement } from '../../../../models/Settlement';
  import { getUniqueCategories } from '../../logic/structureLogic';
  import { getCategoryStructures, separateBuiltAndAvailable, getMaxTierBuiltInCategory, separateByBuildability } from './logic/structureFiltering';
  
  // Sub-components
  import MessageBanner from './components/MessageBanner.svelte';
  import SettlementSelector from './components/SettlementSelector.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import CategoryList from './components/CategoryList.svelte';
  import StructureGrid from './components/StructureGrid.svelte';
  
  export let show: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // State
  let selectedStructureId: string = '';
  let selectedSettlementId: string = '';
  let selectedCategory: string = '';
  let availableStructures: Structure[] = [];
  let settlements: Settlement[] = [];
  let selectedStructure: Structure | undefined;
  let canAfford: boolean = false;
  let missingResources: Map<string, number> = new Map();
  let errorMessage: string = '';
  let successMessage: string = '';
  let addToQueueOnly: boolean = false;
  let controller: Awaited<ReturnType<typeof createBuildStructureController>> | null = null;
  
  // Initialize structures service and controller
  onMount(async () => {
    structuresService.initializeStructures();
    controller = await createBuildStructureController();
  });
  
  // Check settlement capacity
  $: capacityInfo = controller && selectedSettlementId 
    ? controller.isSettlementAtCapacity(selectedSettlementId)
    : { atCapacity: false, current: 0, max: 0 };
  
  // React to dialog open/close
  $: if (show) {
    settlements = $kingdomData.settlements;
    selectedStructureId = '';
    selectedSettlementId = settlements.length > 0 ? settlements[0].id : '';
    selectedStructure = undefined;
    availableStructures = [];
    errorMessage = '';
    successMessage = '';
    addToQueueOnly = false;
    selectedCategory = '';
  }
  
  // When settlement is selected OR settlements change, update available structures
  // This ensures the dialog reacts to manual structure additions/removals
  $: if (selectedSettlementId && controller && $kingdomData.settlements) {
    availableStructures = controller.getAvailableStructuresForSettlement(selectedSettlementId);
    
    // Auto-select first category
    if (availableStructures.length > 0 && !selectedCategory) {
      const firstCategory = getUniqueCategories(availableStructures)[0];
      if (firstCategory) {
        selectedCategory = firstCategory;
      }
    }
  } else {
    availableStructures = [];
  }
  
  // Get all structures for selected category (both built and available)
  // React to settlements changes to ensure built structures list is current
  $: categoryStructures = getCategoryStructures(selectedCategory, selectedSettlementId, $kingdomData.settlements);
  
  // Separate built structures from unbuilt
  // React to settlements changes to ensure proper filtering
  $: builtStructures = categoryStructures.filter(s => {
    const settlement = $kingdomData.settlements.find(st => st.id === selectedSettlementId);
    return settlement ? settlement.structureIds.includes(s.id) : false;
  });
  
  // Get all unbuilt structures (regardless of availability)
  $: unbuiltStructures = categoryStructures.filter(s => !builtStructures.some(b => b.id === s.id));
  
  // Separate unbuilt structures into buildable and locked based on tier progression
  // React to settlements changes to ensure tier progression is current
  $: ({ buildable: buildableInCategory, locked: lockedInCategory } = separateByBuildability(
    unbuiltStructures,
    selectedCategory,
    selectedSettlementId,
    $kingdomData.settlements
  ));
  
  // Combine buildable and locked for display (buildable first, then locked)
  $: availableInCategory = [...buildableInCategory, ...lockedInCategory];
  
  // Get current tier built in selected category (for tier badge)
  // React to settlements changes to ensure tier calculation is current
  $: currentTierInCategory = selectedCategory 
    ? getMaxTierBuiltInCategory(selectedCategory, selectedSettlementId, $kingdomData.settlements)
    : undefined;
  
  // Get selected settlement for passing to child components
  // React to settlements changes to ensure we have current settlement data
  $: selectedSettlement = $kingdomData.settlements.find(s => s.id === selectedSettlementId);
  
  // Get categories with structures in progress for this settlement
  // React to buildQueue and settlements changes
  $: categoriesInProgress = new Set<string>(
    ($kingdomData.buildQueue || [])
      .filter(project => project.settlementName === selectedSettlement?.name)
      .map(project => {
        const structure = structuresService.getStructure(project.structureId);
        if (structure?.category) {
          return getCategoryDisplayName(structure.category);
        }
        return null;
      })
      .filter((cat): cat is string => cat !== null)
  );
  
  // Get skill categories for checking if category is skill-based
  $: skillCategories = getUniqueCategories(
    availableStructures.filter(s => 'skills' in s && Array.isArray(s.skills) && s.skills.length > 0)
  );
  
  // When structure is selected, check affordability
  $: if (selectedStructureId && controller) {
    selectedStructure = structuresService.getStructure(selectedStructureId);
    if (selectedStructure) {
      const affordCheck = controller.canAffordStructure(selectedStructureId);
      canAfford = affordCheck.canAfford;
      missingResources = affordCheck.missing;
      
      // If we can't afford it immediately, we'll add to queue
      addToQueueOnly = !canAfford;
    }
  } else {
    selectedStructure = undefined;
    canAfford = false;
    missingResources = new Map();
  }
  
  function handleClose() {
    show = false;
    dispatch('close');
  }
  
  // Handle build button click from structure card - just dispatch selection
  async function handleBuildStructure(event: CustomEvent<string>) {
    selectedStructureId = event.detail;
    selectedStructure = structuresService.getStructure(event.detail);
    
    if (!selectedStructureId || !selectedSettlementId) {
      errorMessage = 'Please select both a structure and a settlement';
      return;
    }
    
    // Dispatch selection event (actual building happens after roll)
    dispatch('structureQueued', {
      structureId: selectedStructureId,
      settlementId: selectedSettlementId
    });
  }
  
  // Select a structure
  function handleSelectStructure(event: CustomEvent<string>) {
    selectedStructureId = event.detail;
    selectedStructure = structuresService.getStructure(event.detail);
  }
  
  // Select category
  function handleSelectCategory(event: CustomEvent<string>) {
    selectedCategory = event.detail;
    // Clear structure selection when changing category
    selectedStructureId = '';
    selectedStructure = undefined;
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={handleClose}>
    <div class="dialog-container" on:click|stopPropagation>
      <div class="dialog-header">
        <h2><i class="fas fa-hammer"></i> Build Structure</h2>
        <div class="header-controls">
          <!-- Settlement Selector -->
          <SettlementSelector bind:selectedSettlementId {settlements} />
          <button class="close-button" on:click={handleClose}>
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="dialog-content">
        <MessageBanner 
          type={errorMessage ? 'error' : successMessage ? 'success' : null}
          message={errorMessage || successMessage}
        />
        
        {#if settlements.length === 0}
          <EmptyState type="no-settlements" />
        {:else if selectedSettlementId}
          <div class="structures-container">
            <!-- Left Panel: Category List -->
            <div class="categories-panel">
              <CategoryList 
                {availableStructures}
                {selectedCategory}
                {categoriesInProgress}
                {selectedSettlementId}
                {settlements}
                on:select={handleSelectCategory}
              />
            </div>
            
            <!-- Right Panel: Structure Selection and Details -->
            <div class="selection-panel">
              {#if selectedCategory && categoryStructures.length > 0}
                <StructureGrid
                  {selectedCategory}
                  {categoryStructures}
                  builtStructures={builtStructures}
                  availableStructures={availableInCategory}
                  {skillCategories}
                  {selectedStructureId}
                  {successMessage}
                  {selectedSettlement}
                  {capacityInfo}
                  on:build={handleBuildStructure}
                  on:select={handleSelectStructure}
                  on:cancel={handleClose}
                />
              {:else if selectedCategory}
                <EmptyState type="no-category" />
              {:else}
                <EmptyState type="select-category" />
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dialog-container {
    background: var(--color-gray-900);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    max-width: 1200px;
    width: 90%;
    height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid var(--border-medium);
    background: linear-gradient(135deg, rgba(31, 31, 35, 0.8), rgba(15, 15, 17, 0.6));
    
    h2 {
      margin: 0;
      color: var(--color-amber);
      font-size: var(--font-2xl);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      i {
        font-size: var(--font-xl);
      }
    }
    
    .header-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .close-button {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
      }
    }
  }
  
  .dialog-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  // Main container with left/right split
  .structures-container {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  
  // Left panel - Categories
  .categories-panel {
    flex: 0 0 340px;
    background: rgba(0, 0, 0, 0.2);
    border-right: 1px solid var(--border-default);
    padding: 1rem;
    overflow-y: auto;
  }
  
  // Right panel - Structure selection
  .selection-panel {
    flex: 1;
    background: rgba(0, 0, 0, 0.1);
    overflow-y: auto;
    position: relative;
  }
</style>
