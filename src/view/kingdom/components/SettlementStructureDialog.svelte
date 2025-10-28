<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { settlementStructureManagement } from '../../../services/structures/management';
  import { structuresService } from '../../../services/structures';
  import type { Structure } from '../../../models/Structure';
  import type { Settlement } from '../../../models/Settlement';
  import { SettlementTierConfig } from '../../../models/Settlement';
  import { getCategoryIcon } from '../../kingdom/utils/presentation';
  
  export let show: boolean = false;
  export let settlement: Settlement | null = null;
  export let requiredCount: number | undefined = undefined;
  
  const dispatch = createEventDispatcher();
  
  // State
  let activeTab: 'skill' | 'support' = 'skill';
  let selectedStructureId: string = '';
  let selectedStructureIds: string[] = [];
  let errorMessage: string = '';
  let successMessage: string = '';
  let isProcessing: boolean = false;
  let tierWarningMessage: string = '';
  let showingTierWarning: boolean = false;
  
  // Selection limit: requiredCount if specified, otherwise 1 for single selection
  $: selectionLimit = requiredCount || 1;
  
  // Grouped structures
  let skillGroups: Array<{ category: string; displayName: string; structures: Structure[] }> = [];
  let supportGroups: Array<{ category: string; displayName: string; structures: Structure[] }> = [];
  
  // Initialize structures
  onMount(() => {
    structuresService.initializeStructures();
    const grouped = settlementStructureManagement.getStructuresGroupedByTypeAndCategory();
    skillGroups = grouped.skill;
    supportGroups = grouped.support;
  });
  
  // Reset state when dialog opens
  $: if (show) {
    selectedStructureId = '';
    selectedStructureIds = [];
    errorMessage = '';
    successMessage = '';
    tierWarningMessage = '';
    showingTierWarning = false;
  }
  
  // Get current tab's groups
  $: currentGroups = activeTab === 'skill' ? skillGroups : supportGroups;
  
  function handleClose() {
    show = false;
    dispatch('close');
  }
  
  function toggleStructureSelection(structureId: string) {
    const allStructures = [...skillGroups, ...supportGroups].flatMap(g => g.structures);
    const structure = allStructures.find(s => s.id === structureId);
    
    if (!structure) return;
    
    // If deselecting, remove it and cascade to dependent structures
    if (selectedStructureIds.includes(structureId)) {
      // Find all dependent structures (same category, higher tier, currently selected)
      const dependents = allStructures.filter(s => 
        s.category === structure.category && 
        s.tier > structure.tier &&
        selectedStructureIds.includes(s.id)
      );
      
      // Remove the clicked structure and all its dependents
      const idsToRemove = [structureId, ...dependents.map(s => s.id)];
      selectedStructureIds = selectedStructureIds.filter(id => !idsToRemove.includes(id));
      return;
    }
    
    // If selecting, add prerequisites if needed
    // Find all prerequisite structures (same category, lower tier, not built, not selected)
    const prerequisites = allStructures.filter(s => 
      s.category === structure.category && 
      s.tier < structure.tier &&
      !isStructureBuilt(s.id) &&
      !selectedStructureIds.includes(s.id)
    );
    
    // Total structures to add (clicked + prerequisites)
    const totalToAdd = 1 + prerequisites.length;
    
    // Check if adding all would exceed limit
    if (selectedStructureIds.length + totalToAdd > selectionLimit) {
      return; // Don't allow if it would exceed limit
    }
    
    // Select the clicked structure and all prerequisites
    const idsToAdd = [structureId, ...prerequisites.map(s => s.id)];
    selectedStructureIds = [...selectedStructureIds, ...idsToAdd];
  }
  
  function isStructureSelected(structureId: string): boolean {
    return selectedStructureIds.includes(structureId);
  }
  
  async function handleAddSelectedStructures() {
    if (!settlement || isProcessing || selectedStructureIds.length === 0) return;
    
    // If warning is already showing, proceed with build (user clicked "Build Anyway")
    if (showingTierWarning) {
      await proceedWithBuild();
      return;
    }
    
    // Check if any selected structures exceed tier
    const exceedingStructures = selectedStructureIds
      .map(id => [...skillGroups, ...supportGroups]
        .flatMap(g => g.structures)
        .find(s => s.id === id))
      .filter(s => s && structureExceedsTier(s));
    
    if (exceedingStructures.length > 0) {
      // Show inline warning
      const structure = exceedingStructures[0];
      if (structure) {
        const requiredTierMap: Record<number, string> = {
          1: 'Village', 2: 'Town', 3: 'City', 4: 'Metropolis'
        };
        const requiredTier = requiredTierMap[structure.minimumSettlementTier || 1];
        tierWarningMessage = `${structure.name} requires a ${requiredTier}.`;
        showingTierWarning = true;
        return;
      }
    }
    
    // No tier issues, proceed normally
    await proceedWithBuild();
  }
  
  async function proceedWithBuild() {
    if (!settlement || isProcessing || selectedStructureIds.length === 0) return;
    
    isProcessing = true;
    errorMessage = '';
    successMessage = '';
    tierWarningMessage = '';
    showingTierWarning = false;
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const structureId of selectedStructureIds) {
        const result = await settlementStructureManagement.addStructureToSettlement(
          structureId,
          settlement.id
        );
        
        if (result.success) {
          successCount++;
          dispatch('structureAdded', { structureId });
        } else {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        successMessage = `Added ${successCount} structure${successCount > 1 ? 's' : ''}`;
        
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
      
      if (errorCount > 0) {
        errorMessage = `Failed to add ${errorCount} structure${errorCount > 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error adding structures:', error);
      errorMessage = error instanceof Error ? error.message : 'Failed to add structures';
    } finally {
      isProcessing = false;
    }
  }
  
  function isStructureBuilt(structureId: string): boolean {
    return settlement?.structureIds.includes(structureId) || false;
  }
  
  function getSettlementCapacityText(): string {
    if (!settlement) return '';
    const max = SettlementTierConfig[settlement.tier].maxStructures;
    const current = settlement.structureIds.length;
    return `${current}/${max}`;
  }
  
  function getSkillsText(structure: Structure): string {
    if (structure.type === 'skill' && structure.effects.skillsSupported) {
      return structure.effects.skillsSupported
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(', ');
    }
    return '';
  }
  
  function structureExceedsTier(structure: Structure): boolean {
    if (!settlement || !structure.minimumSettlementTier) return false;
    const tierMap: Record<string, number> = {
      'Village': 1, 'Town': 2, 'City': 3, 'Metropolis': 4
    };
    const settlementTierNum = tierMap[settlement.tier] || 1;
    return structure.minimumSettlementTier > settlementTierNum;
  }
  
</script>

{#if show && settlement}
  <div class="dialog-overlay" on:click={handleClose}>
    <div class="dialog-container" on:click|stopPropagation>
      <!-- Header -->
      <div class="dialog-header">
        <h2>
          <i class="fas fa-building"></i>
          Add Structure to {settlement.name}
        </h2>
        <div class="header-info">
          {#if requiredCount}
            <span class="selection-counter">
              <i class="fas fa-check-square"></i>
              {selectedStructureIds.length}/{requiredCount} selected
            </span>
          {/if}
          <span class="capacity-badge">
            <i class="fas fa-layer-group"></i>
            {getSettlementCapacityText()}
          </span>
          <button class="close-button" on:click={handleClose}>
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <!-- Structure Type Selection -->
      <div class="structure-type-selector">
        <div class="radio-group" role="radiogroup" aria-label="Structure type">
          <label class="radio-option" class:selected={activeTab === 'skill'}>
            <input 
              type="radio" 
              name="structureType" 
              value="skill" 
              bind:group={activeTab}
              class="radio-input"
            />
            <span class="radio-content">
              <span class="radio-icon">
                <i class="fas fa-graduation-cap"></i>
              </span>
              <span class="radio-label">Skill Structures</span>
            </span>
          </label>
          
          <label class="radio-option" class:selected={activeTab === 'support'}>
            <input 
              type="radio" 
              name="structureType" 
              value="support" 
              bind:group={activeTab}
              class="radio-input"
            />
            <span class="radio-content">
              <span class="radio-icon">
                <i class="fas fa-hands-helping"></i>
              </span>
              <span class="radio-label">Support Structures</span>
            </span>
          </label>
        </div>
      </div>
      
      <!-- Messages -->
      {#if errorMessage}
        <div class="message error">
          <i class="fas fa-exclamation-circle"></i>
          {errorMessage}
        </div>
      {/if}
      
      {#if successMessage}
        <div class="message success">
          <i class="fas fa-check-circle"></i>
          {successMessage}
        </div>
      {/if}
      
      <!-- Content -->
      <div class="dialog-content">
        {#each currentGroups as group}
          <div class="category-section">
            <div class="category-header">
              <i class="fas {getCategoryIcon(group.displayName)}"></i>
              {group.displayName}
            </div>
            
            <div class="structures-list">
              {#each group.structures as structure}
                {@const isBuilt = isStructureBuilt(structure.id)}
                {@const skillsText = getSkillsText(structure)}
                {@const isSelected = isStructureSelected(structure.id)}
                {@const canSelect = !isBuilt && (selectedStructureIds.length < selectionLimit || isSelected)}
                
                <div 
                  class="structure-item" 
                  class:built={isBuilt}
                  class:selected={isSelected}
                  class:selectable={canSelect}
                  on:click={() => {
                    if (canSelect) {
                      toggleStructureSelection(structure.id);
                    }
                  }}
                >
                  <div class="structure-info">
                    <div class="structure-name-row">
                      <span class="structure-name">
                        {structure.name}
                        {#if skillsText}
                          <span class="skills-text">({skillsText})</span>
                        {/if}
                      </span>
                    </div>
                    
                    {#if structure.description}
                      <div class="structure-description">{structure.description}</div>
                    {/if}
                    
                    {#if structure.modifiers && structure.modifiers.length > 0}
                      <div class="structure-modifiers">
                        {#each structure.modifiers as modifier}
                          <span class="modifier-badge">
                            {modifier.value > 0 ? '+' : ''}{modifier.value} {modifier.resource}
                          </span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  
                  <div class="structure-badges">
                    {#if isBuilt}
                      <span class="built-badge">
                        <i class="fas fa-check"></i>
                        Built
                      </span>
                    {:else if isSelected}
                      <span class="pending-badge">
                        <i class="fas fa-clock"></i>
                        Pending
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Footer (always shown) -->
      <div class="dialog-footer">
        {#if tierWarningMessage}
          <div class="tier-warning">
            <i class="fas fa-exclamation-triangle"></i>
            {tierWarningMessage}
          </div>
        {/if}
        <div class="footer-buttons">
          <button 
            class="cancel-button"
            on:click={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <div class="build-button-wrapper">
            {#if requiredCount && requiredCount > 1}
              <div class="selection-count">
                {selectedStructureIds.length}/{requiredCount} Selected
              </div>
            {/if}
            <button 
              class="add-selected-button"
              on:click={handleAddSelectedStructures}
              disabled={isProcessing || selectedStructureIds.length === 0}
            >
              <i class="fas fa-plus"></i>
              {showingTierWarning ? 'Build Anyway' : (selectedStructureIds.length === 1 ? 'Build Structure' : 'Build Structures')}
            </button>
          </div>
        </div>
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
    background: var(--bg-base);
    border-radius: var(--radius-lg, 0.5rem);
    border: 1px solid var(--border-strong);
    max-width: 900px;
    width: 90%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: .75rem;
    padding-left: 1.5rem;
    border-bottom: 1px solid var(--border-light, #3a3a3d);
    background: var(--color-gray-950, #18181b);
    
    h2 {
      margin: 0;
      color: var(--text-primary, #ffffff);
      font-size: 1.2rem;
      font-weight: var(--font-weight-semibold);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .header-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .capacity-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--bg-overlay);
      border-radius: var(--radius-md, 0.375rem);
      color: var(--text-secondary, #9ca3af);
      font-size: var(--font-sm, 0.875rem);
    }
    
    .close-button {
      background: none;
      border: none;
      color: var(--text-secondary, #9ca3af);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: var(--radius-sm, 0.25rem);
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary, #f3f4f6);
      }
    }
  }
  
  .structure-type-selector {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    align-items: center;
    
    .selector-label {
      padding: 0.5rem 0.75rem;
      color: rgba(255, 255, 255, 0.8);
      font-size: var(--font-md, 1rem);
      font-weight: var(--font-weight-medium);
    }
    
    .radio-group {
      display: flex;
      gap: 0.5rem;
      padding: 0.25rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .radio-option {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      border: 2px solid transparent;
      user-select: none;
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      &.selected {
        background: rgba(94, 0, 0, 0.3);
        border-color: var(--color-primary);
        
        .radio-content {
          color: var(--text-primary);
        }
      }
    }
    
    .radio-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    
    .radio-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      color: var(--text-secondary);
      transition: color 0.2s;
    }
    
    .radio-icon {
      font-size: 1.25rem;
      
      i {
        font-size: inherit;
      }
    }
    
    .radio-label {
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
  }
  
  .message {
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--font-sm, 0.875rem);
    
    &.error {
      background: rgba(239, 68, 68, 0.1);
      color: #fca5a5;
      border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    &.success {
      background: rgba(34, 197, 94, 0.1);
      color: #86efac;
      border-bottom: 1px solid rgba(34, 197, 94, 0.3);
    }
  }
  
  .dialog-content {
    flex: 1;
    overflow-y: auto;
    padding: 0rem;
  }
  
  .category-section {
    margin-bottom: 0.5rem;
    border: 0px solid var(--border-default);
    border-radius: var(--radius-md, 0.375rem);
    background: var(--bg-surface);
    overflow: hidden;
  }
  
  .category-header {
    padding: 0.5rem 1.5rem;
    background: var(--bg-overlay);
    color: var(--color-accent, #f59e0b);
    font-size: var(--font-xl);
    font-weight: 600;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    i {
      font-size: 1.25rem;
    }
  }
  
  .structures-list {
    padding-left: .5rem;
    padding-top: .5rem;
  }
  
  .structure-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg,
      rgba(24, 24, 27, 0.6),
      rgba(31, 31, 35, 0.4));
    border-radius: var(--radius-md);
    border: 1px solid var(--border-medium);
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;
    
    &.selectable {
      cursor: pointer;
    }
    
    &:hover:not(.built):not(.selected) {
      border-color: var(--border-strong);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    &.built {
      opacity: 0.6;
      background: linear-gradient(135deg,
        rgba(34, 197, 94, 0.15),
        rgba(34, 197, 94, 0.1));
      border-color: rgba(34, 197, 94, 0.3);
      cursor: not-allowed;
    }
    
    &.selected {
      border-width: 2px;
      border-style: solid;
      border-color: #f59e0b;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(245, 158, 11, 0.15);
      }
    }
  }
  
  .structure-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0rem;
  }
  
  .structure-name-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .structure-name {
    font-weight: 600;
    color: var(--text-primary, #f3f4f6);
    font-size: var(--font-lg, 1rem);
    
    .skills-text {
      font-weight: normal;
      color: var(--text-secondary, #9ca3af);
      font-size: var(--font-sm, 0.875rem);
      margin-left: 0.5rem;
    }
  }
  
  .structure-badges {
    display: flex;
    align-items: center;
    margin-left: auto;
    flex-shrink: 0;
  }
  
  .built-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
    border-radius: var(--radius-full, 9999px);
    font-size: var(--font-sm, 0.75rem);
    font-weight: 600;
  }
  
  .pending-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    background: rgba(245, 158, 11, 0.2);
    color: var(--color-amber, #f59e0b);
    border-radius: var(--radius-full, 9999px);
    font-size: var(--font-sm, 0.75rem);
    font-weight: 600;
  }
  
  .structure-description {
    color: var(--text-tertiary, #9ca3af);
    font-size: var(--font-md);
    margin-top: 0.25rem;
    line-height: 1.3;
    font-weight: var(--font-weight-medium);
  }
  
  .structure-modifiers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .modifier-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.625rem;
    background: rgba(34, 197, 94, 0.15);
    color: #86efac;
    border-radius: var(--radius-md, 0.375rem);
    font-size: var(--font-xs, 0.75rem);
    font-weight: 600;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  
  .add-button {
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: var(--radius-md, 0.375rem);
    color: var(--text-secondary, #9ca3af);
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    white-space: nowrap;
    font-size: var(--font-sm, 0.875rem);
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary, #f3f4f6);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .selection-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(245, 158, 11, 0.2);
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: var(--radius-md, 0.375rem);
    color: var(--color-amber, #f59e0b);
    font-size: var(--font-sm, 0.875rem);
    font-weight: 600;
  }
  
  .dialog-footer {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-default);
    background: var(--bg-elevated);
    
    .tier-warning {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: var(--radius-md, 0.375rem);
      color: #fbbf24;
      font-size: var(--font-sm, 0.875rem);
      font-weight: 500;
      
      i {
        font-size: 1.25rem;
      }
    }
    
    .footer-buttons {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      gap: 1rem;
    }
    
    .build-button-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    
    .selection-count {
      color: var(--text-secondary, #9ca3af);
      font-size: var(--font-sm, 0.875rem);
      font-weight: 500;
    }
    
    .cancel-button {
      padding: 0.5rem 1rem;
      background: var(--color-gray-800, #27272a);
      border: 1px solid var(--border-default, #3a3a3d);
      border-radius: var(--radius-sm, 4px);
      color: var(--text-secondary, #b0b0b3);
      font-size: 0.9rem;
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 80px;
      
      &:hover:not(:disabled) {
        background: var(--color-gray-700, #3a3a3d);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .add-selected-button {
      padding: 0.5rem 1rem;
      background: var(--color-amber, #fbbf24);
      border: 1px solid var(--color-amber, #fbbf24);
      border-radius: var(--radius-sm, 4px);
      color: var(--color-gray-950, #18181b);
      font-size: 0.9rem;
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      min-width: 80px;
      
      &:hover:not(:disabled) {
        background: var(--color-amber-dark, #f59e0b);
        border-color: var(--color-amber-dark, #f59e0b);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  
</style>
