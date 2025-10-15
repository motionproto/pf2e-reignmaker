<script lang="ts">
  import { getCategoryIcon } from '../../utils/presentation';
  
  export let category: string;
  export let skills: string[] = [];
  export let isSelected: boolean = false;
  export let isInProgress: boolean = false;
  export let showSkills: boolean = true;
  export let currentTier: number | undefined = undefined;
</script>

<button
  class="category-item {isSelected ? 'selected' : ''} {isInProgress ? 'in-progress' : ''}"
  on:click
>
  {#if currentTier !== undefined}
    <span class="tier-badge">Tier {currentTier}</span>
  {/if}
  <i class="fas {getCategoryIcon(category)} category-icon"></i>
  <div class="category-info">
    <div class="category-name">{category}</div>
    {#if showSkills && skills.length > 0}
      <div class="category-skills">{skills.join(', ')}</div>
    {/if}
  </div>
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
    position: relative;
    
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
    
    &.in-progress {
      background: var(--info-background);
      border-color: var(--info-border);
      
      &:hover {
        background: var(--info-background-hover);
        border-color: var(--info-border-hover);
      }
      
      .category-icon {
        color: var(--info-icon);
      }
      
      .arrow {
        color: var(--info-icon);
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
        font-weight: var(--font-weight-semibold);
        font-size: var(--font-lg);
        font-family: var(--base-font);
        color: var(--text-primary);
        word-wrap: break-word;
        margin-bottom: 0.25rem;
      }
      
      .category-skills {
        color: var(--text-tertiary);
        word-wrap: break-word;
        font-size: var(--font-sm);
        font-family: var(--base-font);
      }
    }
    
    .tier-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.75rem;
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      background: rgba(128, 128, 128, 0.15);
      border: 1px solid rgba(128, 128, 128, 0.3);
      border-radius: var(--radius-sm);
      color: rgba(180, 180, 180, 0.9);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
  }
</style>
