<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { structuresService } from '../../../services/structures';
  import type { Structure } from '../../../models/Structure';
  import { getCategoryDisplayName } from '../../../models/Structure';
  import { structureSelection, setStructureCategory } from '../../../stores/ui';
  import CategoryItem from '../components/structures/CategoryItem.svelte';
  import StructureCard from '../components/structures/StructureCard.svelte';
  import {
    getCategoryIcon,
    extractCategorySkills,
    groupStructuresByTier,
    separateStructuresByType,
    getUniqueCategories
  } from '../utils/structure-presentation';
  
  // State
  let allStructures: Structure[] = [];
  let unsubscribe: () => void;
  
  // Initialize structures service
  onMount(() => {
    console.log('StructuresTab: Initializing structures...');
    structuresService.initializeStructures();
    allStructures = structuresService.getAllStructures();
    console.log(`StructuresTab: Loaded ${allStructures.length} structures`);
    
    // Subscribe to selection state
    unsubscribe = structureSelection.subscribe(state => {
      // Handle state changes if needed
    });
    
    // Select first category by default if none selected
    if (!$structureSelection.selectedCategory) {
      const firstCategory = getUniqueCategories(allStructures)[0];
      if (firstCategory) {
        setStructureCategory(firstCategory);
      }
    }
  });
  
  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
  
  // Reactive: Separate structures by type
  $: ({ skill: skillStructures, support: supportStructures } = separateStructuresByType(allStructures));
  
  // Reactive: Get categories for each type
  $: skillCategories = getUniqueCategories(skillStructures);
  $: supportCategories = getUniqueCategories(supportStructures);
  
  // Reactive: Get structures for selected category
  $: categoryStructures = (() => {
    if (!$structureSelection.selectedCategory) return [];
    
    return allStructures
      .filter(s => getCategoryDisplayName(s.category) === $structureSelection.selectedCategory)
      .sort((a, b) => (a.tier || 0) - (b.tier || 0));
  })();
  
  // Reactive: Group structures by tier
  $: structuresByTier = groupStructuresByTier(categoryStructures);
  
  // Reactive: Statistics
  $: totalStructures = allStructures.length;
  $: skillCount = skillStructures.length;
  $: supportCount = supportStructures.length;
  
  // Helper function to get skills for a category
  function getSkillsForCategory(category: string): string[] {
    const categoryStructures = allStructures.filter(
      s => getCategoryDisplayName(s.category) === category
    );
    return extractCategorySkills(categoryStructures);
  }
  
  // Check if a category is a skill structure category
  function isSkillCategory(category: string): boolean {
    return skillCategories.includes(category);
  }
</script>

<div class="structures-tab">
  <div class="structures-header">
    <h2>Structures Library</h2>
  </div>
  
  <div class="structures-container">
    <!-- Left Panel: Category List -->
    <div class="categories-panel">
      <div class="categories-list">
        <!-- Skill Categories -->
        <div class="category-type-section">
          <h3 class="section-title">
            <i class="fas fa-graduation-cap"></i>
            Skill Structures
          </h3>
          
          {#each skillCategories as category}
            {@const skills = getSkillsForCategory(category)}
            <CategoryItem 
              {category}
              {skills}
              isSelected={$structureSelection.selectedCategory === category}
              on:click={() => setStructureCategory(category)}
            />
          {/each}
        </div>
        
        <!-- Support Categories -->
        <div class="category-type-section">
          <h3 class="section-title">
            <i class="fas fa-toolbox"></i>
            Support Structures
          </h3>
          
          {#each supportCategories as category}
            <CategoryItem 
              {category}
              isSelected={$structureSelection.selectedCategory === category}
              showSkills={false}
              on:click={() => setStructureCategory(category)}
            />
          {/each}
        </div>
      </div>
    </div>
    
    <!-- Right Panel: Structure Progression -->
    <div class="progression-panel">
      {#if $structureSelection.selectedCategory}
        <div class="progression-content">
          <div class="progression-header">
            <h2>
              <i class="fas {getCategoryIcon($structureSelection.selectedCategory)}"></i>
              {$structureSelection.selectedCategory}
            </h2>
            {#if isSkillCategory($structureSelection.selectedCategory)}
              {@const skills = getSkillsForCategory($structureSelection.selectedCategory)}
              {#if skills.length > 0}
                <p class="progression-description">
                  Affects: {skills.join(', ')}
                </p>
              {/if}
            {/if}
          </div>
          
          <div class="tier-progression">
            {#each [1, 2, 3, 4] as tier}
              {@const tierStructures = structuresByTier.get(tier) || []}
              <div class="tier-column">
                <div class="tier-structures">
                  {#if tierStructures.length > 0}
                    {#each tierStructures as structure}
                      <StructureCard {structure} {tier} />
                    {/each}
                  {:else}
                    <div class="no-structures">
                      <i class="fas fa-times-circle"></i>
                      <p>No Tier {tier} structures</p>
                    </div>
                  {/if}
                </div>
              </div>
              
              {#if tier < 4}
                <div class="tier-connector">
                  <i class="fas fa-chevron-right"></i>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {:else}
        <div class="empty-selection">
          <i class="fas fa-hand-pointer"></i>
          <h3>Select a Category</h3>
          <p>Choose a structure category from the left to view its progression</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .structures-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }
  
  .structures-header {
    h2 {
      padding: 1rem;
      color: var(--white);
       font-size: var(--font-4xl);
      font-family: var(--base-font);
    }
  }
  
  .structures-container {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  
  .categories-panel {
    flex: 0 0 350px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-md);
    padding: 1rem;
    overflow-y: auto;
  }
  
  .categories-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .category-type-section {
    .section-title {
      margin: 0 0 1rem 0;
      color: var(--color-amber);
      font-size: var(--font-lg);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      i {
        opacity: 0.8;
      }
    }
  }
  
  
  .progression-panel {
    flex: 1;
    background: rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-md);
    overflow-y: auto;
    position: relative;
  }
  
  .progression-content {
    padding-top: 0;
  }
  
  .progression-header {
    position: sticky;
    top: 0;
    background: rgba(0, 0, 0, 0.9);
    padding: 1.5rem;
    margin-bottom: 0;
    z-index: 10;
    border-bottom: 1px solid var(--border-default);
    
    h2 {
      margin: 0 0 0.5rem 0;
      color: var(--color-amber);
      font-size: var(--font-3xl);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      i {
        opacity: 0.6;
      }
    }
    
    .progression-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-sm);
    }
  }
  
  .tier-progression {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    padding-top: 2rem;
    padding-bottom: 1rem;
  }
  
  .tier-column {
    display: flex;
    flex-direction: column;
  }
  
  .tier-structures {
    display: flex;
    flex-direction: column;
  }
  
  
  .no-structures {
    text-align: center;
    padding: 2rem;
    color: var(--text-tertiary);
    
    i {
      font-size: var(--font-4xl);
      opacity: 0.3;
      margin-bottom: 0.5rem;
    }
    
    p {
      margin: 0;
      font-size: var(--font-sm);
    }
  }
  
  .tier-connector {
    display: none;
  }
  
  .empty-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--text-secondary);
    
    i {
      font-size: var(--font-6xl);
      margin-bottom: 1rem;
      opacity: 0.3;
      color: var(--color-amber);
    }
    
    h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }
    
    p {
      margin: 0.5rem 0;
      color: var(--text-tertiary);
    }
  }
</style>
