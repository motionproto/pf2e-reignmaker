<script lang="ts">
  import { getCategoryIcon } from "../../utils/presentation";

  export let category: string;
  export let skills: string[] = [];
  export let isSelected: boolean = false;
  export let isInProgress: boolean = false;
  export let showSkills: boolean = true;
  export let currentTier: number | undefined = undefined;
</script>

<button
  class="category-item {isSelected ? 'selected' : ''} {isInProgress
    ? 'in-progress'
    : ''}"
  on:click
>
  {#if currentTier !== undefined}
    <span class="tier-badge">Tier {currentTier}</span>
  {/if}
  <i class="fas {getCategoryIcon(category)} category-icon"></i>
  <div class="category-info">
    <div class="category-name">{category}</div>
    {#if showSkills && skills.length > 0}
      <div class="category-skills">{skills.join(", ")}</div>
    {/if}
  </div>
</button>

<style lang="scss">
  .category-item {
    width: 100%;
    padding: var(--space-8) var(--space-12);
    background: var(--surface-low);
    border: 1px solid;
    border-radius: var(--radius-xl);
    margin-bottom: var(--space-8);
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: var(--space-12);
    text-align: left;
    min-height: fit-content;
    border-color: var(--border-subtle);
    position: relative;

    &:hover {
      background: var(--surface-high);
      border-color: var(--border-default);
    }

    &.selected {
      background: var(--surface-accent-low);
      border-color: var(--border-accent);
    }

    &.in-progress {
      background: var(--surface-success-lowest);
      border-color: var(--border-success-medium);

      &:hover {
        background: var(--surface-success-lower);
        border-color: var(--border-success-medium);
      }

      &.selected {
        background: var(--surface-success-low);
        border-color: var(--border-success-medium);
      }

      .category-icon {
        color: var(--text-success);
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
        font-family: var(--font-sans-rm);
        color: var(--text-primary);
        word-wrap: break-word;
        margin-bottom: var(--space-4);
      }

      .category-skills {
        color: var(--text-secondary);
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
