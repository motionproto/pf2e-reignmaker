<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '../../baseComponents/Button.svelte';
  import BuiltStructureItem from './BuiltStructureItem.svelte';
  import AvailableStructureItem from './AvailableStructureItem.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import { getCategoryIcon, formatSkillsString } from '../../../utils/presentation';
  import { getSkillsForCategory } from '../../../logic/BuildStructureDialogLogic';
  import { getMaxTierBuiltInCategory } from '../logic/structureFiltering';
  import type { Settlement } from '../../../../../models/Settlement';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  
  export let selectedCategory: string;
  export let categoryStructures: Structure[];
  export let builtStructures: Structure[];
  export let availableStructures: Structure[];
  export let skillCategories: string[];
  export let selectedStructureId: string;
  export let successMessage: string;
  export let selectedSettlement: Settlement | undefined;
  export let capacityInfo: { atCapacity: boolean; current: number; max: number };
  
  const dispatch = createEventDispatcher();
  
  // Get demanded structure IDs from active modifiers (Demand Structure event)
  $: demandedStructureIds = new Set<string>(
    ($kingdomData.activeModifiers || [])
      .filter((m: any) => m.sourceType === 'custom' && m.sourceName === 'Demand Structure Event')
      .map((m: any) => {
        // Prefer metadata (cleaner storage)
        if (m.metadata?.demandedStructureId) {
          return m.metadata.demandedStructureId;
        }
        // Fallback: Extract structure ID from modifier id: "demand-structure-{structureId}-{timestamp}"
        const parts = m.id.split('-');
        if (parts.length >= 4 && parts[0] === 'demand' && parts[1] === 'structure') {
          // Rejoin the structure ID parts (structure IDs can contain hyphens)
          return parts.slice(2, -1).join('-');
        }
        return null;
      })
      .filter((id: string | null): id is string => id !== null)
  );
  
  // Helper to check if structure is demanded
  function isStructureDemanded(structureId: string): boolean {
    return demandedStructureIds.has(structureId);
  }
  
  // Calculate max tier built in this category
  $: maxTierBuilt = selectedSettlement 
    ? getMaxTierBuiltInCategory(selectedCategory, selectedSettlement.id, [selectedSettlement])
    : 0;
  $: nextTier = maxTierBuilt + 1;
  
  // Check if a structure is locked (tier beyond next tier)
  function isStructureLocked(structure: Structure): boolean {
    const structureTier = structure.tier || 1;
    return structureTier > nextTier;
  }
  
  function handleBuild(event: CustomEvent<string>) {
    dispatch('build', event.detail);
  }
  
  function handleSelect(event: CustomEvent<string>) {
    dispatch('select', event.detail);
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

{#if selectedCategory && categoryStructures.length > 0}
  <div class="selection-content">
    <div class="selection-header">
      <div class="header-content">
        <i class="fas {getCategoryIcon(selectedCategory)}"></i>
        <div class="text-container">
          <h2>{selectedCategory}</h2>
          {#if skillCategories.includes(selectedCategory)}
            {#if getSkillsForCategory(selectedCategory, availableStructures).length > 0}
              <p class="category-skills-label">
                {formatSkillsString(getSkillsForCategory(selectedCategory, availableStructures))}
              </p>
            {/if}
          {/if}
        </div>
      </div>
      
      <div class="header-actions">
        <Button 
          variant="outline"
          size="small"
          on:click={handleCancel}
        >
          Cancel
        </Button>
        
        <Button 
          variant="primary"
          size="small"
          icon="fas fa-hammer"
          iconPosition="left"
          disabled={!selectedStructureId || !!successMessage}
          on:click={() => handleBuild(new CustomEvent('build', { detail: selectedStructureId }))}
        >
          Build
        </Button>
      </div>
    </div>
    
    <div class="structures-grid">
      <!-- Capacity Warning (above all structures) -->
      {#if capacityInfo.atCapacity}
        <div class="capacity-warning">
          <i class="fas fa-exclamation-triangle"></i>
          Settlement at tier limit ({capacityInfo.current}/{capacityInfo.max} structures)
        </div>
      {/if}
      
      <!-- Show built structures as simple headers -->
      {#each builtStructures as structure}
        <BuiltStructureItem {structure} on:select={handleSelect} />
      {/each}
      
      <!-- Show all structures (buildable and locked) -->
      {#each availableStructures as structure}
        <AvailableStructureItem 
          {structure}
          locked={isStructureLocked(structure)}
          {selectedStructureId}
          {selectedSettlement}
          atCapacity={false}
          isDemanded={isStructureDemanded(structure.id)}
          on:build={handleBuild}
          on:select={handleSelect}
          on:cancel={handleCancel}
        />
      {/each}
      
      <!-- Requirement message when no available structures -->
      {#if availableStructures.length === 0 && builtStructures.length > 0}
        <div class="requirement-message">
          {#if builtStructures.length === categoryStructures.length}
            <i class="fas fa-check-circle"></i>
            <div class="message-content">
              <p class="message-title">All Structures Built</p>
              <p class="message-text">All structures in this category have been built in this settlement.</p>
            </div>
          {:else}
            <i class="fas fa-lock"></i>
            <div class="message-content">
              <p class="message-title">Tier Progression Required</p>
              <p class="message-text">Build at least one Tier {maxTierBuilt} structure in this category to unlock Tier {nextTier}.</p>
            </div>
          {/if}
        </div>
      {:else if availableStructures.length === 0 && builtStructures.length === 0}
        <div class="requirement-message">
          <i class="fas fa-info-circle"></i>
          <div class="message-content">
            <p class="message-title">No Structures Available</p>
            <p class="message-text">This settlement doesn't meet the tier requirements for structures in this category yet.</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .selection-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .selection-header {
    background: var(--surface-lower);
    padding: var(--space-4) var(--space-24);
    border-bottom: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
    
    .header-content {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      flex: 1;
      
      > i {
        font-size: var(--font-3xl);
        color: var(--color-amber);
        opacity: 1;
        flex-shrink: 0;
      }
      
      .text-container {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        min-height: 3.5rem;
        justify-content: center;
        
        h2 {
          margin: 0;
          color: var(--color-amber);
          font-size: var(--font-3xl);
          font-family: var(--font-sans-rm);
          font-weight: var(--font-weight-semibold);
          line-height: var(--line-height-snug);
        }
        
        .category-skills-label {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-sm);
          line-height: var(--line-height-normal);
        }
        
        .capacity-warning {
          margin: 0;
          margin-top: var(--space-8);
          color: var(--text-warning);
          font-size: var(--font-sm);
          line-height: var(--line-height-normal);
          display: flex;
          align-items: center;
          gap: var(--space-8);
          padding: var(--space-8) var(--space-12);
          background: var(--surface-warning-lowest);
          border: 1px solid var(--border-warning-subtle);
          border-radius: var(--radius-sm);
          
          i {
            font-size: var(--font-sm);
          }
        }
      }
    }
    
    .header-actions {
      display: flex;
      gap: var(--space-12);
      align-items: center;
    }
  }
  
  .structures-grid {
    flex: 1;
    padding: var(--space-24);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    
    .capacity-warning {
      color: var(--text-warning);
      font-size: var(--font-sm);
      line-height: var(--line-height-normal);
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-12) var(--space-16);
      background: var(--surface-warning-lowest);
      border: 1px solid var(--border-warning-subtle);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-8);
      
      i {
        font-size: var(--font-sm);
      }
    }
    
    .requirement-message {
      display: flex;
      align-items: flex-start;
      gap: var(--space-16);
      padding: var(--space-20) var(--space-24);
      background: var(--overlay-low);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      margin-top: var(--space-8);
      
      > i {
        font-size: var(--font-xl);
        color: var(--text-secondary);
        margin-top: var(--space-2);
        flex-shrink: 0;
        
        &.fa-check-circle {
          color: var(--text-success);
        }
        
        &.fa-lock {
          color: var(--text-warning);
        }
        
        &.fa-info-circle {
          color: var(--text-info);
        }
      }
      
      .message-content {
        flex: 1;
        
        .message-title {
          margin: 0 0 var(--space-6) 0;
          font-size: var(--font-md);
          font-weight: var(--font-weight-semibold);
          color: var(--text-primary);
        }
        
        .message-text {
          margin: 0;
          font-size: var(--font-sm);
          color: var(--text-secondary);
          line-height: var(--line-height-relaxed);
        }
      }
    }
  }
</style>
