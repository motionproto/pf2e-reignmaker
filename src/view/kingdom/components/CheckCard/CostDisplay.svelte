<script lang="ts">
  import { getResourceIcon, getResourceColor } from '../../utils/presentation';
  
  /**
   * Cost object with resource types as keys and amounts as values
   * Example: { gold: 1, lumber: 2 }
   */
  export let cost: Record<string, number> = {};
  
  // Resource order (matches resources display order)
  const RESOURCE_ORDER = ['food', 'gold', 'lumber', 'stone', 'ore'];
  
  // Filter and sort costs by resource order
  $: sortedCosts = RESOURCE_ORDER
    .filter(resource => cost[resource] && cost[resource] > 0)
    .map(resource => ({
      resource,
      amount: cost[resource],
      icon: getResourceIcon(resource),
      color: getResourceColor(resource),
      label: resource.charAt(0).toUpperCase() + resource.slice(1)
    }));
</script>

{#if sortedCosts.length > 0}
  <div class="cost-section">
    <div class="cost-label">Cost:</div>
    <div class="cost-display">
      {#each sortedCosts as { resource, amount, icon, color, label }, index}
        <div class="cost-item">
          <i class="fas {icon} cost-icon" style="color: {color};" title={label}></i>
          <span class="cost-amount">{amount}</span>
          <span class="cost-label-text">{label}</span>
        </div>
        {#if index < sortedCosts.length - 1}
          <span class="cost-separator">•</span>
        {/if}
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .cost-section {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    padding: var(--space-12) var(--space-16);
    background: var(--surface-accent-lower);
    border: 1px solid var(--border-accent);
    border-radius: var(--radius-md);
    
    .cost-label {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--color-amber);
      white-space: nowrap;
    }
  }
  
  .cost-display {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    font-size: var(--font-md);
    color: var(--text-secondary);
  }
  
  .cost-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  
  .cost-amount {
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
  
  .cost-icon {
    font-size: 1em;
  }
  
  .cost-label-text {
    color: var(--text-secondary);
  }
  
  .cost-separator {
    color: var(--text-tertiary);
    opacity: 0.5;
  }
</style>
