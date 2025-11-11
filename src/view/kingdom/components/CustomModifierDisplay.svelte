<script lang="ts">
  import type { ActiveModifier } from '../../../models/Modifiers';
  import AdjustmentBadges from './AdjustmentBadges.svelte';
  
  export let modifier: ActiveModifier;
</script>

<div class="custom-modifier-display">
  <div class="modifier-header">
    <div class="modifier-title">
      <span class="modifier-name">{modifier.name || modifier.sourceName}</span>
    </div>
  </div>
  
  <div class="modifier-details">
    <div class="modifier-content">
      {#if modifier.description}
        <div class="modifier-description">
          {modifier.description}
        </div>
      {/if}
      
      {#if modifier.modifiers && modifier.modifiers.length > 0}
        <AdjustmentBadges modifiers={modifier.modifiers} />
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .custom-modifier-display {
    background: linear-gradient(135deg, 
      rgba(100, 116, 139, 0.1),
      rgba(71, 85, 105, 0.05));
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .modifier-header {
    padding: var(--space-12) var(--space-16);
    background: var(--surface-low);
    border-bottom: 1px solid var(--border-default);
  }
  
  .modifier-title {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
  
  .modifier-name {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary); /* Neutral gray color */
  }
  
  .modifier-details {
    padding: var(--space-12) var(--space-16);
  }
  
  .modifier-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-16);
  }
  
  .modifier-description {
    flex: 1;
    color: var(--text-secondary);
    font-size: var(--font-md);
    line-height: 1.5;
  }
</style>
