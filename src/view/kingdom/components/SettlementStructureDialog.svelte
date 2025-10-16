<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { settlementStructureManagement } from '../../../services/structures/management';
  import { structuresService } from '../../../services/structures';
  import type { Structure } from '../../../models/Structure';
  import type { Settlement } from '../../../models/Settlement';
  import { SettlementTierConfig } from '../../../models/Settlement';
  
  export let show: boolean = false;
  export let settlement: Settlement | null = null;
  
  const dispatch = createEventDispatcher();
  
  // State
  let activeTab: 'skill' | 'support' = 'skill';
  let selectedStructureId: string = '';
  let errorMessage: string = '';
  let successMessage: string = '';
  let isProcessing: boolean = false;
  
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
    errorMessage = '';
    successMessage = '';
  }
  
  // Get current tab's groups
  $: currentGroups = activeTab === 'skill' ? skillGroups : supportGroups;
  
  function handleClose() {
    show = false;
    dispatch('close');
  }
  
  async function handleAddStructure(structure: Structure) {
    if (!settlement || isProcessing) return;
    
    isProcessing = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      const result = await settlementStructureManagement.addStructureToSettlement(
        structure.id,
        settlement.id
      );
      
      if (result.success) {
        successMessage = `Added ${structure.name}`;
        dispatch('structureAdded', { structureId: structure.id });
        
        // Close after brief delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        errorMessage = result.error || 'Failed to add structure';
      }
    } catch (error) {
      console.error('Error adding structure:', error);
      errorMessage = error instanceof Error ? error.message : 'Failed to add structure';
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
          <span class="capacity-badge">
            <i class="fas fa-layer-group"></i>
            {getSettlementCapacityText()}
          </span>
          <button class="close-button" on:click={handleClose}>
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab" 
          class:active={activeTab === 'skill'}
          on:click={() => activeTab = 'skill'}
        >
          <i class="fas fa-graduation-cap"></i>
          Skill Structures
        </button>
        <button 
          class="tab" 
          class:active={activeTab === 'support'}
          on:click={() => activeTab = 'support'}
        >
          <i class="fas fa-hands-helping"></i>
          Support Structures
        </button>
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
              {group.displayName}
            </div>
            
            <div class="structures-list">
              {#each group.structures as structure}
                {@const isBuilt = isStructureBuilt(structure.id)}
                {@const skillsText = getSkillsText(structure)}
                
                <div class="structure-item" class:built={isBuilt}>
                  <div class="structure-info">
                    <div class="structure-name-row">
                      <span class="structure-name">
                        {structure.name}
                        {#if skillsText}
                          <span class="skills-text">({skillsText})</span>
                        {/if}
                      </span>
                      {#if isBuilt}
                        <span class="built-badge">
                          <i class="fas fa-check"></i>
                          Built
                        </span>
                      {/if}
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
                  
                  {#if !isBuilt}
                    <button 
                      class="add-button"
                      on:click={() => handleAddStructure(structure)}
                      disabled={isProcessing}
                    >
                      Add
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
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
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-elevated);
    
    h2 {
      margin: 0;
      color: var(--color-amber, #f59e0b);
      font-size: var(--font-2xl, 1.5rem);
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
  
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-elevated);
    
    .tab {
      flex: 1;
      padding: 1rem;
      background: none;
      border: none;
      color: var(--text-secondary, #9ca3af);
      font-size: var(--font-md, 1rem);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      border-bottom: 2px solid transparent;
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary, #f3f4f6);
      }
      
      &.active {
        color: var(--color-amber, #f59e0b);
        border-bottom-color: var(--color-amber, #f59e0b);
        background: rgba(245, 158, 11, 0.1);
      }
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
    padding: 1rem;
  }
  
  .category-section {
    margin-bottom: 0.75rem;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md, 0.375rem);
    background: var(--bg-surface);
    overflow: hidden;
  }
  
  .category-header {
    padding: 0.5rem 0.75rem;
    background: var(--bg-overlay);
    color: var(--color-accent, #f59e0b);
    font-size: var(--font-lg, 0.875rem);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .structures-list {
    padding: 0.25rem;
  }
  
  .structure-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    margin-bottom: 0.25rem;
    background: var(--bg-base);
    transition: all 0.2s ease;
    
    &:hover:not(.built) {
      background: var(--bg-elevated);
    }
    
    &.built {
      opacity: 0.6;
      background: rgba(34, 197, 94, 0.05);
      border-color: rgba(34, 197, 94, 0.2);
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
    font-size: var(--font-md, 1rem);
    
    .skills-text {
      font-weight: normal;
      color: var(--text-secondary, #9ca3af);
      font-size: var(--font-sm, 0.875rem);
      margin-left: 0.5rem;
    }
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
  
  .structure-description {
    color: var(--text-secondary, #9ca3af);
    font-size: var(--font-sm, 0.875rem);
    font-style: italic;
    margin-top: 0.25rem;
    line-height: 1.3;
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
</style>
