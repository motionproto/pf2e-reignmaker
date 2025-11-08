<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CategoryItem from '../../structures/CategoryItem.svelte';
  import type { Structure } from '../../../../../models/Structure';
  import type { Settlement } from '../../../../../models/Settlement';
  import { structuresService } from '../../../../../services/structures';
  import { 
    capitalizeSkills 
  } from '../../../utils/presentation';
  import {
    separateStructuresByType,
    getUniqueCategories,
    getAllCategories
  } from '../../../logic/structureLogic';
  import {
    getSkillsForCategory
  } from '../../../logic/BuildStructureDialogLogic';
  import {
    getMaxTierBuiltInCategory
  } from '../logic/structureFiltering';
  
  export let availableStructures: Structure[];
  export let selectedCategory: string;
  export let categoriesInProgress: Set<string>;
  export let selectedSettlementId: string;
  export let settlements: Settlement[];
  
  const dispatch = createEventDispatcher();
  
  // Calculate current tier for a category
  function getCurrentTier(category: string): number | undefined {
    const tier = getMaxTierBuiltInCategory(category, selectedSettlementId, settlements);
    return tier > 0 ? tier : undefined;
  }
  
  // Get all structures to determine all categories
  $: allStructures = structuresService.getAllStructures();
  
  // Separate ALL structures by type (not just available)
  $: ({ skill: allSkillStructures, support: allSupportStructures } = separateStructuresByType(allStructures));
  
  // Get all categories for each type
  $: allSkillCategories = getUniqueCategories(allSkillStructures);
  $: allSupportCategories = getUniqueCategories(allSupportStructures);
  
  // Since we now show ALL structures (built, buildable, and locked), 
  // categories are never "unavailable" - they just might only have locked structures
  function isCategoryUnavailable(category: string, isSkillCategory: boolean): boolean {
    return false; // Always show categories as available
  }
  
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
    {#if allSkillCategories.length > 0}
      <div class="category-type-section">
        <h3 class="section-title">Skill Structures</h3>
        
        {#each allSkillCategories as category}
          {@const skills = capitalizeSkills(getSkillsForCategory(category, allSkillStructures))}
          {@const currentTier = getCurrentTier(category)}
          {@const isUnavailable = isCategoryUnavailable(category, true)}
          <CategoryItem 
            {category}
            {skills}
            {currentTier}
            {isUnavailable}
            isSelected={selectedCategory === category}
            isInProgress={categoriesInProgress.has(category)}
            on:click={() => selectCategory(category)}
          />
        {/each}
      </div>
    {/if}
    
    <!-- Support Categories -->
    {#if allSupportCategories.length > 0}
      <div class="category-type-section">
        <h3 class="section-title">Support Structures</h3>
        
        {#each allSupportCategories as category}
          {@const currentTier = getCurrentTier(category)}
          {@const isUnavailable = isCategoryUnavailable(category, false)}
          <CategoryItem 
            {category}
            {currentTier}
            {isUnavailable}
            isSelected={selectedCategory === category}
            isInProgress={categoriesInProgress.has(category)}
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
