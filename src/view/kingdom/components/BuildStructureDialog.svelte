<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { kingdomState } from '../../../stores/kingdom';
  import { buildQueueService } from '../../../services/domain';
  import { structuresService } from '../../../services/structures';
  import type { Structure, ResourceCost } from '../../../models/Structure';
  import { getCategoryDisplayName } from '../../../models/Structure';
  import type { Settlement } from '../../../models/Settlement';
  import type { ResourceAllocation } from '../../../services/domain';
  
  export let show: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // State
  let selectedStructureId: string = '';
  let selectedSettlementId: string = '';
  let availableStructures: Structure[] = [];
  let settlements: Settlement[] = [];
  let selectedStructure: Structure | undefined;
  let canAfford: boolean = false;
  let missingResources: Map<string, number> = new Map();
  let errorMessage: string = '';
  let successMessage: string = '';
  let addToQueueOnly: boolean = false;
  let searchQuery: string = '';
  let expandedCategories: Set<string> = new Set();
  
  // Initialize structures service
  onMount(() => {
    structuresService.initializeStructures();
  });
  
  // React to state changes
  $: if (show) {
    settlements = $kingdomState.settlements;
    selectedStructureId = '';
    selectedSettlementId = settlements.length > 0 ? settlements[0].id : '';
    selectedStructure = undefined;
    availableStructures = [];
    errorMessage = '';
    successMessage = '';
    addToQueueOnly = false;
    searchQuery = '';
    // Expand all categories by default
    expandedCategories = new Set();
  }
  
  // When settlement is selected, update available structures
  $: if (selectedSettlementId) {
    availableStructures = buildQueueService.getAvailableStructuresForSettlement(selectedSettlementId);
  } else {
    availableStructures = [];
  }
  
  // When structure is selected, check affordability
  $: if (selectedStructureId) {
    selectedStructure = structuresService.getStructure(selectedStructureId);
    if (selectedStructure) {
      const affordCheck = buildQueueService.canAffordStructure(selectedStructureId);
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
  
  function handleConfirm() {
    if (!selectedStructureId || !selectedSettlementId) {
      errorMessage = 'Please select both a structure and a settlement';
      return;
    }
    
    // Add to build queue
    const result = buildQueueService.addToBuildQueue(selectedStructureId, selectedSettlementId);
    
    if (result.success) {
      // If we can afford it, auto-allocate resources
      if (canAfford && !addToQueueOnly) {
        const allocations: ResourceAllocation[] = [];
        if (selectedStructure) {
          Object.entries(selectedStructure.constructionCost).forEach(([resource, amount]) => {
            if (result.project && amount) {
              allocations.push({
                projectId: result.project.id,
                resource,
                amount
              });
            }
          });
          
          const allocResult = buildQueueService.allocateResources(allocations);
          if (allocResult.success) {
            successMessage = `${selectedStructure.name} construction started!`;
          } else {
            successMessage = `${selectedStructure.name} added to build queue. Resources will be allocated when available.`;
          }
        }
      } else {
        successMessage = `${selectedStructure?.name} added to build queue`;
      }
      
      // Dispatch success event
      dispatch('structureQueued', {
        structureId: selectedStructureId,
        settlementId: selectedSettlementId,
        project: result.project
      });
      
      // Reset and close after a brief delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } else {
      errorMessage = result.error || 'Failed to add structure to build queue';
    }
  }
  
  function formatResourceCost(cost: ResourceCost): string {
    return Object.entries(cost)
      .filter(([_, amount]) => amount && amount > 0)
      .map(([resource, amount]) => {
        const available = $kingdomState.resources.get(resource) || 0;
        const missing = missingResources.get(resource) || 0;
        const displayName = resource.charAt(0).toUpperCase() + resource.slice(1);
        
        if (missing > 0) {
          return `<span class="missing-resource">${amount} ${displayName} (need ${missing} more)</span>`;
        } else {
          return `${amount} ${displayName}`;
        }
      })
      .join(', ');
  }
  
  // Group structures by category for better display
  function groupStructuresByCategory(structures: Structure[]): Map<string, Structure[]> {
    const grouped = new Map<string, Structure[]>();
    
    structures.forEach(structure => {
      const category = structure.category || 'Other';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(structure);
    });
    
    return grouped;
  }
  
  // Filter structures based on search query
  $: filteredStructures = searchQuery.trim() 
    ? availableStructures.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.effect?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableStructures;
  
  $: groupedStructures = groupStructuresByCategory(filteredStructures);
  
  // Toggle category expansion
  function toggleCategory(category: string) {
    if (expandedCategories.has(category)) {
      expandedCategories.delete(category);
    } else {
      expandedCategories.add(category);
    }
    expandedCategories = new Set(expandedCategories);
  }
  
  // Select a structure
  function selectStructure(structureId: string) {
    selectedStructureId = structureId;
    selectedStructure = structuresService.getStructure(structureId);
  }
  
  // Get resource icon
  function getResourceIcon(resource: string): string {
    const icons: Record<string, string> = {
      gold: 'fa-coins',
      food: 'fa-wheat-awn',
      lumber: 'fa-tree',
      stone: 'fa-cube',
      ore: 'fa-gem'
    };
    return icons[resource] || 'fa-box';
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={handleClose}>
    <div class="dialog-container" on:click|stopPropagation>
      <div class="dialog-header">
        <h2>Build Structure</h2>
        <div class="header-controls">
          <!-- Settlement Selector -->
          <div class="settlement-selector">
            <label for="settlement-select">Settlement:</label>
            <select 
              id="settlement-select"
              bind:value={selectedSettlementId}
              class="settlement-dropdown"
            >
              {#each settlements as settlement}
                <option value={settlement.id}>
                  {settlement.name} ({settlement.tier})
                </option>
              {/each}
            </select>
          </div>
          <button class="close-button" on:click={handleClose}>
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="dialog-content">
        {#if errorMessage}
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            {errorMessage}
          </div>
        {/if}
        
        {#if successMessage}
          <div class="success-message">
            <i class="fas fa-check-circle"></i>
            {successMessage}
          </div>
        {/if}
        
        {#if settlements.length === 0}
          <div class="no-settlements">
            <i class="fas fa-city"></i>
            <p>No settlements available</p>
            <p class="hint">Establish a settlement first to build structures</p>
          </div>
        {:else if selectedSettlementId}
          <div class="split-panel">
            <!-- Left Panel: Structure List -->
            <div class="structures-panel">
              <div class="search-container">
                <i class="fas fa-search search-icon"></i>
                <input 
                  type="text" 
                  placeholder="Search structures..." 
                  bind:value={searchQuery}
                  class="search-input"
                />
                {#if searchQuery}
                  <button 
                    class="clear-search" 
                    on:click={() => searchQuery = ''}
                  >
                    <i class="fas fa-times"></i>
                  </button>
                {/if}
              </div>
              
              {#if filteredStructures.length === 0}
                {#if searchQuery}
                  <div class="no-results">
                    No structures matching "{searchQuery}"
                  </div>
                {:else if availableStructures.length === 0}
                  <div class="no-structures-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No structures available</p>
                    <p class="hint">This settlement may have reached capacity or doesn't meet tier requirements</p>
                  </div>
                {/if}
              {:else}
                <div class="structures-list">
                  {#each Array.from(groupedStructures.entries()) as [category, structures]}
                    <div class="category-section">
                      <button 
                        class="category-header" 
                        on:click={() => toggleCategory(category)}
                      >
                        <i class="fas {expandedCategories.has(category) ? 'fa-chevron-down' : 'fa-chevron-right'} category-toggle"></i>
                        <span class="category-name">{category}</span>
                        <span class="category-count">({structures.length})</span>
                      </button>
                      
                      {#if expandedCategories.has(category)}
                        <div class="category-structures">
                          {#each structures as structure}
                            <button
                              class="structure-item {selectedStructureId === structure.id ? 'selected' : ''}"
                              on:click={() => selectStructure(structure.id)}
                            >
                              <div class="structure-item-name">{structure.name}</div>
                              {#if structure.tier}
                                <div class="structure-item-tier">T{structure.tier}</div>
                              {/if}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
            
            <!-- Right Panel: Structure Details -->
            <div class="details-panel">
              {#if selectedStructure}
                <div class="structure-details">
                  <!-- Thumbnail placeholder -->
                  <div class="structure-thumbnail">
                    <i class="fas fa-building"></i>
                  </div>
                  
                  <h2 class="structure-title">{selectedStructure.name}</h2>
                  
                  <!-- Cost Breakdown -->
                  <div class="cost-section">
                    <h3>Construction Cost</h3>
                    <div class="resource-list">
                      {#each Object.entries(selectedStructure.constructionCost) as [resource, amount]}
                        {#if amount && amount > 0}
                          {@const available = $kingdomState.resources.get(resource) || 0}
                          {@const missing = missingResources.get(resource) || 0}
                          <div class="resource-item {missing > 0 ? 'insufficient' : 'sufficient'}">
                            <i class="fas {getResourceIcon(resource)}"></i>
                            <span class="resource-name">{resource.charAt(0).toUpperCase() + resource.slice(1)}</span>
                            <span class="resource-cost">{amount}</span>
                            {#if missing > 0}
                              <span class="resource-status">(need {missing} more)</span>
                            {:else}
                              <span class="resource-status">✓</span>
                            {/if}
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                  
                  <!-- Benefits -->
                  <div class="benefits-section">
                    <h3>Benefits</h3>
                    <div class="benefits-list">
                      {#if selectedStructure.effects.goldPerTurn}
                        <div class="benefit-item">
                          <i class="fas fa-coins"></i>
                          <span>+{selectedStructure.effects.goldPerTurn} Gold per turn</span>
                        </div>
                      {/if}
                      {#if selectedStructure.effects.unrestReductionPerTurn}
                        <div class="benefit-item">
                          <i class="fas fa-dove"></i>
                          <span>-{selectedStructure.effects.unrestReductionPerTurn} Unrest per turn</span>
                        </div>
                      {/if}
                      {#if selectedStructure.effects.famePerTurn}
                        <div class="benefit-item">
                          <i class="fas fa-star"></i>
                          <span>+{selectedStructure.effects.famePerTurn} Fame per turn</span>
                        </div>
                      {/if}
                      {#if selectedStructure.effects.foodStorage}
                        <div class="benefit-item">
                          <i class="fas fa-warehouse"></i>
                          <span>+{selectedStructure.effects.foodStorage} Food Storage</span>
                        </div>
                      {/if}
                      {#if selectedStructure.effects.armySupportBonus}
                        <div class="benefit-item">
                          <i class="fas fa-shield-alt"></i>
                          <span>+{selectedStructure.effects.armySupportBonus} Army Support</span>
                        </div>
                      {/if}
                      {#if selectedStructure.effect}
                        <div class="benefit-description">
                          {selectedStructure.effect}
                        </div>
                      {/if}
                    </div>
                  </div>
                  
                  <!-- Build Button -->
                  <div class="action-section">
                    {#if canAfford}
                      <div class="build-status ready">
                        <i class="fas fa-check-circle"></i>
                        <span>Resources available - ready to build</span>
                      </div>
                    {:else}
                      <div class="build-status queue">
                        <i class="fas fa-hourglass-half"></i>
                        <span>Will be added to build queue</span>
                      </div>
                    {/if}
                    
                    <button 
                      class="build-button" 
                      on:click={handleConfirm}
                      disabled={!!successMessage}
                    >
                      {#if addToQueueOnly && !canAfford}
                        Add to Build Queue
                      {:else}
                        Begin Construction
                      {/if}
                    </button>
                  </div>
                </div>
              {:else}
                <div class="no-selection">
                  <i class="fas fa-hand-pointer"></i>
                  <p>Select a structure to view details</p>
                </div>
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
    max-height: 80vh;
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
    
    h2 {
      margin: 0;
      color: var(--color-amber);
      font-size: var(--font-2xl);
    }
    
    .header-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .settlement-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      
      label {
        color: var(--text-secondary);
        font-size: var(--font-md);
      }
      
      .settlement-dropdown {
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-size: var(--font-md);
        cursor: pointer;
        
        &:hover {
          border-color: var(--border-strong);
        }
        
        &:focus {
          outline: none;
          border-color: var(--color-amber);
        }
      }
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
  }
  
  .error-message,
  .success-message {
    padding: 12px;
    border-radius: var(--radius-md);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    
    i {
      font-size: 20px;
    }
  }
  
  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--color-red);
  }
  
  .success-message {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: var(--color-green);
  }
  
  .selection-step {
    margin-bottom: 30px;
    
    h3 {
      margin: 0 0 15px 0;
      color: var(--text-primary);
      font-size: var(--font-2xl);
    }
  }
  
  .settlement-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .settlement-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 15px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    
    &:hover {
      background: rgba(0, 0, 0, 0.5);
      border-color: var(--border-strong);
    }
    
    &.selected {
      background: rgba(251, 191, 36, 0.1);
      border-color: var(--color-amber);
    }
    
    .settlement-name {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: 5px;
    }
    
    .settlement-tier {
      font-size: var(--font-sm);
      color: var(--color-amber);
      margin-bottom: 5px;
    }
    
    .settlement-structures {
      font-size: var(--font-sm);
      color: var(--text-secondary);
    }
  }
  
  .no-settlements {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--text-secondary);
    
    i {
      font-size: 48px;
      color: var(--color-amber);
      margin-bottom: 20px;
    }
    
    p {
      margin: 0 0 10px 0;
      font-size: var(--font-md);
      
      &.hint {
        font-size: var(--font-sm);
        color: var(--text-tertiary);
      }
    }
  }
  
  // Split panel layout
  .split-panel {
    display: flex;
    height: calc(80vh - 120px); // Subtract header height
    gap: 0;
  }
  
  // Left panel - Structure list
  .structures-panel {
    width: 350px;
    border-right: 1px solid var(--border-default);
    display: flex;
    flex-direction: column;
  }
  
  .search-container {
    padding: 15px;
    border-bottom: 1px solid var(--border-default);
    position: relative;
    
    .search-icon {
      position: absolute;
      left: 25px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      pointer-events: none;
    }
    
    .search-input {
      width: 100%;
      padding: 8px 35px 8px 35px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--font-md);
      
      &::placeholder {
        color: var(--text-tertiary);
      }
      
      &:focus {
        outline: none;
        border-color: var(--color-amber);
        background: rgba(0, 0, 0, 0.5);
      }
    }
    
    .clear-search {
      position: absolute;
      right: 25px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 5px;
      
      &:hover {
        color: var(--text-primary);
      }
    }
  }
  
  .no-results,
  .no-structures-message {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-secondary);
    
    i {
      font-size: 32px;
      color: var(--text-tertiary);
      margin-bottom: 15px;
    }
    
    p {
      margin: 0 0 8px 0;
      
      &.hint {
        font-size: var(--font-sm);
        color: var(--text-tertiary);
      }
    }
  }
  
  .structures-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }
  
  .category-section {
    margin-bottom: 5px;
  }
  
  .category-header {
    width: 100%;
    padding: 10px 15px;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(0, 0, 0, 0.4);
    }
    
    .category-toggle {
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .category-name {
      flex: 1;
      text-align: left;
      font-weight: var(--font-weight-semibold);
    }
    
    .category-count {
      color: var(--text-secondary);
      font-size: var(--font-sm);
    }
  }
  
  .category-structures {
    padding: 5px 0 5px 20px;
  }
  
  .structure-item {
    width: calc(100% - 10px);
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3px;
    transition: all 0.15s ease;
    
    &:hover {
      background: rgba(0, 0, 0, 0.4);
      border-color: var(--border-default);
    }
    
    &.selected {
      background: rgba(251, 191, 36, 0.15);
      border-color: var(--color-amber);
    }
    
    .structure-item-name {
      font-size: var(--font-sm);
    }
    
    .structure-item-tier {
      font-size: var(--font-xs);
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 5px;
      border-radius: 3px;
    }
  }
  
  // Right panel - Details
  .details-panel {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
  
  .no-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-tertiary);
    
    i {
      font-size: 48px;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
    }
  }
  
  .structure-details {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .structure-thumbnail {
    width: 120px;
    height: 120px;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid var(--border-default);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    
    i {
      font-size: 48px;
      color: var(--color-amber);
      opacity: 0.5;
    }
  }
  
  .structure-title {
    margin: 0 0 20px 0;
    color: var(--color-amber);
    font-size: var(--font-3xl);
    font-weight: var(--font-weight-semibold);
  }
  
  .cost-section,
  .benefits-section {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
    padding: 15px;
    margin-bottom: 20px;
    
    h3 {
      margin: 0 0 15px 0;
      color: var(--text-primary);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 12px;
    }
  }
  
  .resource-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .resource-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-sm);
    
    &.insufficient {
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      
      .resource-status {
        color: var(--color-red);
        font-size: var(--font-sm);
      }
    }
    
    &.sufficient {
      .resource-status {
        color: var(--color-green);
      }
    }
    
    i {
      color: var(--color-amber);
      width: 20px;
      text-align: center;
    }
    
    .resource-name {
      flex: 1;
      color: var(--text-primary);
    }
    
    .resource-cost {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
    }
  }
  
  .benefits-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .benefit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-secondary);
    
    i {
      color: var(--color-green);
      width: 20px;
      text-align: center;
    }
  }
  
  .benefit-description {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-default);
    color: var(--text-secondary);
    font-size: var(--font-sm);
    line-height: 1.5;
  }
  
  .action-section {
    margin-top: 30px;
  }
  
  .build-status {
    padding: 10px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    font-size: var(--font-sm);
    
    &.ready {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      color: var(--color-green);
    }
    
    &.queue {
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      color: var(--color-amber);
    }
    
    i {
      font-size: 16px;
    }
  }
  
  .build-button {
    width: 100%;
    padding: 12px 20px;
    background: var(--color-amber);
    border: 1px solid var(--color-amber);
    border-radius: var(--radius-md);
    color: var(--color-gray-900);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background: var(--color-amber-light);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
