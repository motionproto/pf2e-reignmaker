<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BuiltStructureItem from './BuiltStructureItem.svelte';
  import AvailableStructureItem from './AvailableStructureItem.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import { getCategoryIcon, formatSkillsString } from '../../../utils/presentation';
  import { getSkillsForCategory } from '../../../logic/BuildStructureDialogLogic';
  
  export let selectedCategory: string;
  export let categoryStructures: Structure[];
  export let builtStructures: Structure[];
  export let availableStructures: Structure[];
  export let skillCategories: string[];
  export let selectedStructureId: string;
  export let successMessage: string;
  
  const dispatch = createEventDispatcher();
  
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
      <!-- Show built structures as simple headers -->
      {#each builtStructures as structure}
        <BuiltStructureItem {structure} />
      {/each}
      
      <!-- Show available structures as full cards with build buttons -->
      {#each availableStructures as structure}
        <AvailableStructureItem 
          {structure}
          {selectedStructureId}
          {successMessage}
          on:build={handleBuild}
          on:select={handleSelect}
          on:cancel={handleCancel}
        />
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
</style>
