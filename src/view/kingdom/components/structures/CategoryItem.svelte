<script lang="ts">
  import { getCategoryIcon } from '../../utils/structure-presentation';
  
  export let category: string;
  export let skills: string[] = [];
  export let isSelected: boolean = false;
  export let showSkills: boolean = true;
</script>

<button
  class="category-item {isSelected ? 'selected' : ''}"
  on:click
>
  <i class="fas {getCategoryIcon(category)} category-icon"></i>
  <div class="category-info">
    <div class="category-name">{category}</div>
    {#if showSkills && skills.length > 0}
      <div class="category-skills">{skills.join(', ')}</div>
    {/if}
  </div>
  <i class="fas fa-chevron-right arrow"></i>
</button>

<style lang="scss">
  .category-item {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
    min-height: fit-content;
    border-color: var(--border-subtle);
    
    &:hover {
      background: rgba(0, 0, 0, 0.3);
      border-color: var(--border-default);
    }
    
    &.selected {
      background: rgba(251, 191, 36, 0.1);
      border-color: var(--color-amber);
      
      .arrow {
        color: var(--color-amber);
      }
    }
    
    .category-icon {
      font-size: var(--font-xl);
      color: var(--color-amber);
      opacity: 1;
      width: 1 rem;
      text-align: center;
      flex-shrink: 0;
    }
    
    .category-info {
      flex: 1;
      min-width: 0;
      
      .category-name {
        font-weight: 600;
        font-size: var(--font-lg);
        font-weight: 600;
        font-family: var(--base-font);
        color: var(--text-primary);
        margin-bottom: 0.25rem;
        word-wrap: break-word;
      }
      
      .category-skills {
        color: var(--text-tertiary);
        word-wrap: break-word;
        font-size: var(--font-sm);
        font-family: var(--base-font);
      }
    }
    
    .arrow {
      color: var(--text-tertiary);
      font-size: var(--font-sm);
      flex-shrink: 0;
    }
  }
</style>
