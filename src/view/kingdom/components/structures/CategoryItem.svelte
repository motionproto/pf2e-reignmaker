<script lang="ts">
  import { getCategoryIcon } from '../../utils/presentation';
  
  export let category: string;
  export let skills: string[] = [];
  export let isSelected: boolean = false;
  export let isInProgress: boolean = false;
  export let isUnavailable: boolean = false;
  export let showSkills: boolean = true;
  export let currentTier: number | undefined = undefined;
</script>

<button
  class="category-item {isSelected ? 'selected' : ''} {isInProgress ? 'in-progress' : ''} {isUnavailable ? 'unavailable' : ''}"
  on:click
>
  {#if isUnavailable}
    <i class="fas fa-lock unavailable-icon"></i>
  {/if}
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
    padding: var(--space-6) var(--space-12);  // Reduced from var(--space-8)
    background: var(--overlay-high);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-6);  // Reduced from var(--space-8)
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: var(--space-12);
    text-align: left;
    min-height: fit-content;
    border-color: var(--border-faint);
    position: relative;
    
    &:hover {
      background: var(--overlay);
      border-color: var(--border-subtle);
    }
    
    &.selected {
      background: var(--surface-accent-low);
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
    
    &.unavailable {
      opacity: 0.5;
      background: var(--overlay);
      border-color: var(--border-faint);
      
      &:hover {
        opacity: 0.65;
        background: rgba(0, 0, 0, 0.25);
        border-color: var(--border-subtle);
      }
      
      .category-icon {
        color: var(--text-tertiary);
      }
      
      .category-name {
        color: var(--text-secondary);
      }
      
      .category-skills {
        color: var(--text-tertiary);
      }
    }
    
    .unavailable-icon {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      font-size: var(--font-xs);
      color: var(--text-tertiary);
      z-index: 1;
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
        font-family: var(--font-sans-rm);
        color: var(--text-primary);
        word-wrap: break-word;
        margin-bottom: var(--space-4);
      }
      
      .category-skills {
        color: var(--text-tertiary);
        word-wrap: break-word;
        font-size: var(--font-sm);
      }
    }
    
    .tier-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.75rem;
      display: inline-flex;
      align-items: center;
      padding: var(--space-2) var(--space-8);
      background: rgba(128, 128, 128, 0.15);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: rgba(180, 180, 180, 0.9);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.0312rem;
      flex-shrink: 0;
    }
  }
</style>
