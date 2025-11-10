<script lang="ts">
  import type { EventModifier } from '../../../types/modifiers';
  import { isStaticModifier, isDiceModifier, isChoiceModifier } from '../../../types/modifiers';
  
  export let modifiers: EventModifier[];
  
  // Format modifier text based on type
  function formatModifier(modifier: EventModifier): string {
    if (isChoiceModifier(modifier)) {
      // Handle choice modifiers: player chooses from multiple resources
      const action = modifier.negative ? 'Lose' : 'Gain';
      const resourceList = modifier.resources
        .map(r => r.charAt(0).toUpperCase() + r.slice(1))
        .join(', ')
        .replace(/, ([^,]*)$/, ', or $1');
      const valueStr = typeof modifier.value === 'object' 
        ? modifier.value.formula 
        : typeof modifier.value === 'string'
        ? modifier.value
        : String(modifier.value);
      return `${action} ${valueStr} ${resourceList}`;
    } else if (isDiceModifier(modifier)) {
      // Handle dice modifiers
      const resourceName = modifier.resource.charAt(0).toUpperCase() + modifier.resource.slice(1);
      const isNegative = modifier.negative || modifier.operation === 'subtract';
      return `${isNegative ? '-' : '+'}${modifier.formula} ${resourceName}`;
    } else if (isStaticModifier(modifier)) {
      // Handle static modifiers
      const resourceName = modifier.resource.charAt(0).toUpperCase() + modifier.resource.slice(1);
      return `${modifier.value > 0 ? '+' : ''}${modifier.value} ${resourceName}`;
    }
    return '';
  }
</script>

{#if modifiers && modifiers.length > 0}
  <div class="adjustment-badges">
    {#each modifiers as modifier}
      {@const text = formatModifier(modifier)}
      {#if text}
        <span class="badge">{text}</span>
      {/if}
    {/each}
  </div>
{/if}

<style lang="scss">
  .adjustment-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
  }
  
  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-lg);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1.3;
    white-space: nowrap;
    background: var(--hover-low);
    color: var(--text-secondary);
    border: 1px solid var(--border-medium);
  }
</style>
