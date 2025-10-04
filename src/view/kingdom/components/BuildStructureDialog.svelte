<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { createBuildStructureController } from '../../../controllers/BuildStructureController';
  import { structuresService } from '../../../services/structures';
  import type { Structure, ResourceCost } from '../../../models/Structure';
  import { getCategoryDisplayName } from '../../../models/Structure';
  import type { Settlement } from '../../../models/Settlement';
  import CategoryItem from './structures/CategoryItem.svelte';
  import StructureCard from './structures/StructureCard.svelte';
  import { getCategoryIcon } from '../utils/presentation';
  import {
    extractCategorySkills,
    groupStructuresByTier,
    separateStructuresByType,
    getUniqueCategories
  } from '../logic/structureLogic';
  
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
  
  // React to state changes
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
  
  // When settlement is selected, update available structures
  $: if (selectedSettlementId && controller) {
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
  
  // Separate structures by type
  $: ({ skill: skillStructures, support: supportStructures } = separateStructuresByType(availableStructures));
  
  // Get categories for each type
  $: skillCategories = getUniqueCategories(skillStructures);
  $: supportCategories = getUniqueCategories(supportStructures);
  
  // Get all structures for selected category (both built and available)
  $: categoryStructures = (() => {
    if (!selectedCategory || !selectedSettlementId) return [];
    
    const settlement = settlements.find(s => s.id === selectedSettlementId);
    if (!settlement) return [];
    
    // Get all structures in this category
    const allInCategory = structuresService.getAllStructures()
      .filter(s => {
        if (!s.category) return false;
        const displayName = getCategoryDisplayName(s.category);
        return displayName === selectedCategory;
      })
      .sort((a, b) => (a.tier || 0) - (b.tier || 0));
    
    return allInCategory;
  })();
  
  // Separate built and available structures
  $: builtAndAvailable = (() => {
    if (!selectedSettlementId) return { built: [], available: [] };
    
    const settlement = settlements.find(s => s.id === selectedSettlementId);
    if (!settlement) return { built: [], available: [] };
    
    const built = categoryStructures.filter(s => 
      settlement.structureIds.includes(s.id)
    );
    
    const available = categoryStructures.filter(s => 
      availableStructures.some(av => av.id === s.id)
    );
    
    return { built, available };
  })();
  
  // Group structures by tier
  $: structuresByTier = groupStructuresByTier(categoryStructures);
  
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
  
  // Helper function to get skills for a category
  function getSkillsForCategory(category: string): string[] {
    const categoryStructures = availableStructures.filter(s => {
      if (!s.category) return false;
      const displayName = getCategoryDisplayName(s.category);
      return displayName === category;
    });
    return extractCategorySkills(categoryStructures);
  }
  
  // Check if a category is a skill structure category
  function isSkillCategory(category: string): boolean {
    return skillCategories.includes(category);
  }
  
  // Helper function to capitalize each word in skills
  function capitalizeSkills(skills: string[]): string[] {
    return skills.map(skill => 
      skill.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    );
  }
  
  // Helper function to format skills as string
  function formatSkillsString(skills: string[]): string {
    return capitalizeSkills(skills).join(', ');
  }
  
  function handleClose() {
    show = false;
    dispatch('close');
  }
  
  async function handleConfirm() {
    if (!selectedStructureId || !selectedSettlementId || !controller) {
      errorMessage = 'Please select both a structure and a settlement';
      return;
    }
    
    // Add to build queue
    const result = await controller.addToBuildQueue(selectedStructureId, selectedSettlementId);
    
    if (result.success) {
      // If we can afford it, auto-allocate resources
      if (canAfford && !addToQueueOnly && selectedStructure && result.project) {
        let allAllocated = true;
        
        for (const [resource, amount] of Object.entries(selectedStructure.constructionCost)) {
          if (amount && amount > 0) {
            const allocated = await controller.allocateResources(result.project.id, resource, amount);
            if (!allocated) {
              allAllocated = false;
            }
          }
        }
        
        if (allAllocated) {
          successMessage = `${selectedStructure.name} construction started!`;
        } else {
          successMessage = `${selectedStructure.name} added to build queue. Resources will be allocated when available.`;
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
  
  // Handle build button click from structure card
  async function handleBuildStructure(structureId: string) {
    selectedStructureId = structureId;
    selectedStructure = structuresService.getStructure(structureId);
    await handleConfirm();
  }
  
  // Select a structure
  function selectStructure(structureId: string) {
    selectedStructureId = structureId;
    selectedStructure = structuresService.getStructure(structureId);
  }
  
  // Select category
  function selectCategory(category: string) {
    selectedCategory = category;
    // Clear structure selection when changing category
    selectedStructureId = '';
    selectedStructure = undefined;
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
        <h2><i class="fas fa-hammer"></i> Build Structure</h2>
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
                  {settlement.name} (Tier {settlement.tier})
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
          <div class="structures-container">
            <!-- Left Panel: Category List -->
            <div class="categories-panel">
              <div class="categories-list">
                {#if availableStructures.length === 0}
                  <div class="no-structures-available">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No structures available</p>
                    <p class="hint">This settlement may have reached capacity or doesn't meet tier requirements</p>
                  </div>
                {:else}
                  <!-- Skill Categories -->
                  {#if skillCategories.length > 0}
                    <div class="category-type-section">
                      <h3 class="section-title">Skill Structures</h3>
                      
                      {#each skillCategories as category}
                        {@const skills = capitalizeSkills(getSkillsForCategory(category))}
                        <CategoryItem 
                          {category}
                          {skills}
                          isSelected={selectedCategory === category}
                          on:click={() => selectCategory(category)}
                        />
                      {/each}
                    </div>
                  {/if}
                  
                  <!-- Support Categories -->
                  {#if supportCategories.length > 0}
                    <div class="category-type-section">
                      <h3 class="section-title">Support Structures</h3>
                      
                      {#each supportCategories as category}
                        <CategoryItem 
                          {category}
                          isSelected={selectedCategory === category}
                          showSkills={false}
                          on:click={() => selectCategory(category)}
                        />
                      {/each}
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
            
            <!-- Right Panel: Structure Selection and Details -->
            <div class="selection-panel">
              {#if selectedCategory && categoryStructures.length > 0}
                <div class="selection-content">
                  <div class="selection-header">
                    <div class="header-content">
                      <i class="fas {getCategoryIcon(selectedCategory)}"></i>
                      <div class="text-container">
                        <h2>{selectedCategory}</h2>
                        {#if isSkillCategory(selectedCategory)}
                          {@const skills = getSkillsForCategory(selectedCategory)}
                          {#if skills.length > 0}
                            <p class="category-skills-label">
                              {formatSkillsString(skills)}
                            </p>
                          {/if}
                        {/if}
                      </div>
                    </div>
                  </div>
                  
                  <div class="structures-grid">
                    <!-- Show built structures as simple headers -->
                    {#each builtAndAvailable.built as structure}
                      <div class="structure-built">
                        <span class="structure-built-name">{structure.name}</span>
                        <span class="structure-built-status">
                          <i class="fas fa-check"></i>
                          Built
                        </span>
                      </div>
                    {/each}
                    
                    <!-- Show available structures as full cards with build buttons -->
                    {#each builtAndAvailable.available as structure}
                      {@const structureMissing = new Map()}
                      {@const available = $kingdomData.resources}
                      {#each Object.entries(structure.constructionCost) as [resource, needed]}
                        {#if needed && needed > 0}
                          {@const avail = available[resource] || 0}
                          {#if avail < needed}
                            {@const _ = structureMissing.set(resource, needed - avail)}
                          {/if}
                        {/if}
                      {/each}
                      {@const structureCanAfford = structureMissing.size === 0}
                      
                      <div class="structure-card-with-build">
                        <div 
                          class="structure-card-wrapper {selectedStructureId === structure.id ? 'selected' : ''}"
                          on:click={() => selectStructure(structure.id)}
                        >
                          <StructureCard 
                            {structure} 
                            tier={structure.tier}
                          />
                        </div>
                        
                        <!-- Build Button in Card -->
                        <div class="card-build-section">
                          {#if !structureCanAfford}
                            <span class="build-queue">
                              <i class="fas fa-hourglass-half"></i>
                              Queue
                            </span>
                          {/if}
                          
                          <button 
                            class="card-cancel-button"
                            on:click={handleClose}
                          >
                            Cancel
                          </button>
                          
                          <button 
                            class="card-build-button" 
                            on:click={() => handleBuildStructure(structure.id)}
                            disabled={!!successMessage}
                          >
                            <i class="fas fa-hammer"></i>
                            Build
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else if selectedCategory}
                <div class="empty-selection">
                  <i class="fas fa-building"></i>
                  <p>No structures available in this category</p>
                </div>
              {:else}
                <div class="empty-selection">
                  <i class="fas fa-hand-pointer"></i>
                  <p>Select a category to view structures</p>
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
    
    .settlement-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      
      label {
        color: var(--text-secondary);
        font-size: var(--font-md);
        white-space: nowrap;
      }
      
      .settlement-dropdown {
        padding: 6px 12px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-size: var(--font-md);
        cursor: pointer;
        min-width: 200px;
        
        &:hover {
          border-color: var(--border-strong);
          background: rgba(0, 0, 0, 0.5);
        }
        
        &:focus {
          outline: none;
          border-color: var(--color-amber);
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
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
    display: flex;
    flex-direction: column;
  }
  
  .error-message,
  .success-message {
    padding: 12px;
    border-radius: var(--radius-md);
    margin: 15px;
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
  
  .no-settlements {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
    
    i {
      font-size: 48px;
      color: var(--color-amber);
      margin-bottom: 20px;
      opacity: 0.5;
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
  
  .categories-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .no-structures-available {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-secondary);
    
    i {
      font-size: 32px;
      color: var(--text-tertiary);
      margin-bottom: 15px;
      opacity: 0.5;
    }
    
    p {
      margin: 0 0 8px 0;
      
      &.hint {
        font-size: var(--font-sm);
        color: var(--text-tertiary);
      }
    }
  }
  
  .category-type-section {
    .section-title {
      margin: 0 0 0.75rem 0;
      color: var(--color-amber);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
    }
  }
  
  // Right panel - Structure selection
  .selection-panel {
    flex: 1;
    background: rgba(0, 0, 0, 0.1);
    overflow-y: auto;
    position: relative;
  }
  
  .selection-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .selection-header {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-default);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    min-height: 90px; // Fixed minimum height to maintain consistent layout
    display: flex;
    align-items: center;
    
    .header-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      > i {
        font-size: var(--font-3xl);
        color: var(--color-amber);
        opacity: 1;
        flex-shrink: 0;
      }
      
      .text-container {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-height: 3.5rem; // Fixed height to prevent layout shift
        justify-content: center;
        
        h2 {
          margin: 0;
          color: var(--color-amber);
          font-size: var(--font-3xl);
          font-family: var(--base-font);
          line-height: 1.2;
        }
        
        .category-skills-label {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-sm);
          line-height: 1.4;
        }
      }
    }
  }
  
  .structures-grid {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  // Removed tier-section styles as we're not using tier grouping
  
  // Structure card wrapper for selection
  .structure-card-wrapper {
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    
    &.selected {
      ::v-deep(.structure-card) {
        border-color: var(--color-amber);
        background: rgba(251, 191, 36, 0.1);
        box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
      }
    }
    
    &:hover:not(.selected) {
      transform: translateY(-2px);
      
      ::v-deep(.structure-card) {
        border-color: var(--border-strong);
      }
    }
  }
  
  .structure-tile {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    
    &:hover {
      background: rgba(0, 0, 0, 0.5);
      border-color: var(--border-strong);
      transform: translateY(-2px);
    }
    
    &.selected {
      background: rgba(251, 191, 36, 0.15);
      border-color: var(--color-amber);
      box-shadow: 0 0 0 1px var(--color-amber) inset;
    }
    
    .structure-name {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }
    
    .structure-cost {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      
      .cost-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-sm);
        font-size: var(--font-sm);
        color: var(--text-secondary);
        
        &.insufficient {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-red);
        }
        
        i {
          font-size: var(--font-xs);
          opacity: 0.8;
        }
      }
    }
  }
  
  // Structure details (when selected)
  .structure-details {
    background: rgba(255, 255, 255, 0.03);
    border-top: 1px solid var(--border-default);
    padding: 1.5rem;
    
    h3 {
      margin: 0 0 1rem 0;
      color: var(--color-amber);
      font-size: var(--font-xl);
    }
    
    .detail-section {
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 1rem;
      
      h4 {
        margin: 0 0 0.75rem 0;
        color: var(--text-primary);
        font-size: var(--font-sm);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
    
    .resource-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .resource-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-sm);
      
      &.insufficient {
        background: rgba(239, 68, 68, 0.05);
        border: 1px solid rgba(239, 68, 68, 0.2);
        
        .resource-status {
          color: var(--color-red);
        }
      }
      
      &.sufficient {
        .resource-status {
          color: var(--color-green);
        }
      }
      
      i {
        color: var(--color-amber);
        width: 16px;
        text-align: center;
      }
      
      .resource-name {
        flex: 1;
        color: var(--text-primary);
        font-size: var(--font-sm);
      }
      
      .resource-cost {
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
      }
      
      .resource-status {
        font-size: var(--font-xs);
      }
    }
    
    .benefits-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .benefit-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      font-size: var(--font-sm);
      
      i {
        color: var(--color-green);
        width: 16px;
        text-align: center;
      }
    }
    
    .benefit-description {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-default);
      color: var(--text-secondary);
      font-size: var(--font-sm);
      line-height: 1.5;
    }
  }
  
  .action-section {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .build-status {
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
      font-size: 14px;
    }
  }
  
  .build-button {
    padding: 0.75rem 1.5rem;
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
  
  .empty-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--text-tertiary);
    
    i {
      font-size: 48px;
      margin-bottom: 1rem;
      opacity: 0.3;
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
    }
  }
  
  // Built structures - simple display
  .structure-built {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    opacity: 0.7;
    
    .structure-built-name {
      font-size: var(--font-md);
      color: var(--text-secondary);
    }
    
    .structure-built-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--font-sm);
      color: var(--color-green);
      opacity: 0.8;
      
      i {
        font-size: var(--font-sm);
      }
    }
  }
  
  // Available structures with build button
  .structure-card-with-build {
    position: relative;
    
    .card-build-section {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.8);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      
      .build-ready,
      .build-queue {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: var(--font-sm);
        
        i {
          font-size: var(--font-sm);
        }
      }
      
      .build-ready {
        color: var(--color-green);
      }
      
      .build-queue {
        color: var(--color-amber);
      }
      
      .card-cancel-button {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        color: var(--text-secondary);
        font-size: var(--font-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: var(--border-strong);
          color: var(--text-primary);
          transform: translateY(-1px);
        }
      }
      
      .card-build-button {
        padding: 0.5rem 1rem;
        background: var(--color-amber);
        border: 1px solid var(--color-amber);
        border-radius: var(--radius-sm);
        color: var(--color-gray-900);
        font-size: var(--font-sm);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        i {
          font-size: var(--font-sm);
        }
        
        &:hover:not(:disabled) {
          background: var(--color-amber-light);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
</style>
