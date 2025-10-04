<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CategoryItem from '../../structures/CategoryItem.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import { 
    capitalizeSkills 
  } from '../../../utils/presentation';
  import {
    separateStructuresByType,
    getUniqueCategories
  } from '../../../logic/structureLogic';
  import {
    getSkillsForCategory
  } from '../../../logic/BuildStructureDialogLogic';
  
  export let availableStructures: Structure[];
  export let selectedCategory: string;
  
  const dispatch = createEventDispatcher();
  
  // Separate structures by type
  $: ({ skill: skillStructures, support: supportStructures } = separateStructuresByType(availableStructures));
  
  // Get categories for each type
  $: skillCategories = getUniqueCategories(skillStructures);
  $: supportCategories = getUniqueCategories(supportStructures);
  
  function selectCategory(category: string) {
    dispatch('select', category);
  }
</script>

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
          {@const skills = capitalizeSkills(getSkillsForCategory(category, availableStructures))}
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

<style lang="scss">
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
</style>
