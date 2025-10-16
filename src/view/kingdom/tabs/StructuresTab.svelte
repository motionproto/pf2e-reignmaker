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
    capitalizeSkills, 
    formatSkillsString 
  } from '../utils/presentation';
  import {
    groupStructuresByTier,
    separateStructuresByType,
    getUniqueCategories
  } from '../logic/structureLogic';
  import {
    getSkillsForCategory,
    isSkillCategory
  } from '../logic/BuildStructureDialogLogic';
  
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
  
</script>

<div class="structures-tab">
  <div class="structures-container">
    <!-- Left Panel: Category List -->
    <div class="categories-panel">
      <div class="categories-list">
        <!-- Skill Categories -->
        <div class="category-type-section">
          <h3 class="section-title">
            Skill Structures
          </h3>
          
          {#each skillCategories as category}
            {@const skills = capitalizeSkills(getSkillsForCategory(category, allStructures))}
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
            <div class="header-content">
              <i class="fas {getCategoryIcon($structureSelection.selectedCategory)}"></i>
              <div class="text-container">
                <h2>{$structureSelection.selectedCategory}</h2>
                {#if isSkillCategory($structureSelection.selectedCategory, skillCategories)}
                  {@const skills = getSkillsForCategory($structureSelection.selectedCategory, allStructures)}
                  {#if skills.length > 0}
                    <p class="progression-description">
                      {formatSkillsString(skills)}
                    </p>
                  {/if}
                {/if}
              </div>
            </div>
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

    height: 100%;
  }
  
  .structures-container {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  
  .categories-panel {
    flex: 0 0 340px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-md);
    padding: .75rem;
    overflow-y: auto;
  }
  
  .categories-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .category-type-section {
    .section-title {
      margin: 0 0 1rem 0;
      color: var(--color-amber);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      display: flex;
      align-items: center;
      gap: 0.5rem;
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
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .progression-header {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    padding: 1.5rem;
    margin-bottom: 0;
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
          line-height: 1.2;
        }
        
        .progression-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-sm);
          line-height: 1.4;
        }
      }
    }
  }
  
  .tier-progression {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    padding-top: 2rem;
    padding-bottom: 1rem;
    flex: 1;
    overflow-y: auto;
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
