<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BuiltStructureItem from './BuiltStructureItem.svelte';
  import AvailableStructureItem from './AvailableStructureItem.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import { getCategoryIcon, formatSkillsString } from '../../../utils/presentation';
  import { getSkillsForCategory } from '../../../logic/BuildStructureDialogLogic';
  import { getMaxTierBuiltInCategory } from '../logic/structureFiltering';
  import type { Settlement } from '../../../../../models/Settlement';
  
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
            {@const skills = getSkillsForCategory(selectedCategory, availableStructures)}
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
      <!-- Capacity Warning (above all structures) -->
      {#if capacityInfo.atCapacity}
        <div class="capacity-warning">
          <i class="fas fa-exclamation-triangle"></i>
          Settlement at capacity ({capacityInfo.current}/{capacityInfo.max})
        </div>
      {/if}
      
      <!-- Show built structures as simple headers -->
      {#each builtStructures as structure}
        <BuiltStructureItem {structure} />
      {/each}
      
      <!-- Show only the next buildable tier (not locked ones) -->
      {#each availableStructures as structure}
        {@const locked = isStructureLocked(structure)}
        {#if !locked}
          <AvailableStructureItem 
            {structure}
            locked={false}
            {selectedStructureId}
            {successMessage}
            {selectedSettlement}
            atCapacity={false}
            on:build={handleBuild}
            on:select={handleSelect}
            on:cancel={handleCancel}
          />
        {/if}
      {/each}
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
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-default);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    min-height: 90px;
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
        min-height: 3.5rem;
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
        
        .capacity-warning {
          margin: 0;
          margin-top: 0.5rem;
          color: var(--warning-text);
          font-size: var(--font-sm);
          line-height: 1.4;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 191, 0, 0.1);
          border: 1px solid rgba(255, 191, 0, 0.3);
          border-radius: var(--radius-sm);
          
          i {
            font-size: var(--font-sm);
          }
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
    
    .capacity-warning {
      color: var(--warning-text);
      font-size: var(--font-sm);
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 191, 0, 0.1);
      border: 1px solid rgba(255, 191, 0, 0.3);
      border-radius: var(--radius-md);
      margin-bottom: 0.5rem;
      
      i {
        font-size: var(--font-sm);
      }
    }
  }
</style>
