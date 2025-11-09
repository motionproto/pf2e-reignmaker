<script lang="ts">
  import type { ActiveModifier } from '../../../models/Modifiers';
  import StateChanges from './OutcomeDisplay/components/StateChanges.svelte';
  
  export let modifier: ActiveModifier;
  
  // Determine tags based on modifier properties
  $: tags = getModifierTags(modifier);
  
  function getModifierTags(mod: ActiveModifier): string[] {
    const tags: string[] = [];
    
    // Check if it has ongoing duration
    const hasOngoing = mod.modifiers?.some(m => 
      m.duration === 'ongoing' || m.duration === 'permanent' || typeof m.duration === 'number'
    );
    if (hasOngoing) tags.push('ongoing');
    
    // Check if it's dangerous (negative effects OR positive unrest)
    const hasDangerous = mod.modifiers?.some(m => {
      // For unrest, positive values are dangerous (increasing unrest is bad)
      if (m.resource === 'unrest') {
        if (typeof m.value === 'number' && m.value > 0) return true;
        if (typeof m.value === 'string' && !m.value.startsWith('-')) return true;
      }
      // For other resources, negative values are dangerous
      if (typeof m.value === 'number' && m.value < 0) return true;
      if (typeof m.value === 'string' && m.value.startsWith('-')) return true;
      return false;
    });
    if (hasDangerous) tags.push('dangerous');
    
    // Check if it's beneficial (positive effects, but not unrest)
    const hasBeneficial = mod.modifiers?.some(m => {
      // Unrest increases are never beneficial
      if (m.resource === 'unrest') return false;
      if (typeof m.value === 'number' && m.value > 0) return true;
      if (typeof m.value === 'string' && !m.value.startsWith('-')) return true;
      return false;
    });
    if (hasBeneficial && !hasDangerous) tags.push('beneficial');
    
    // Only add custom tag if this is a user-created custom modifier
    if (mod.sourceType === 'custom') {
      tags.push('custom');
    }
    
    return tags;
  }
  
  // Convert modifiers to stateChanges format for StateChanges component
  $: stateChanges = modifier.modifiers?.reduce((acc, mod) => {
    if (mod.resource && mod.value !== undefined) {
      const resource = mod.resource;
      const value = typeof mod.value === 'string' 
        ? parseInt(mod.value.replace(/[^-\d]/g, '')) 
        : mod.value;
      acc[resource] = value;
    }
    return acc;
  }, {} as Record<string, number>) || {};
</script>

<div class="custom-modifier-display">
  <div class="modifier-header">
    <div class="modifier-title">
      <span class="modifier-name">{modifier.name || modifier.sourceName}</span>
      <div class="modifier-tags">
        {#each tags as tag}
          <span class="tag tag-{tag}">{tag}</span>
        {/each}
      </div>
    </div>
  </div>
  
  <div class="modifier-details">
    {#if modifier.description}
      <div class="modifier-description">
        {modifier.description}
      </div>
    {/if}
    
    {#if Object.keys(stateChanges).length > 0}
      <StateChanges 
        {stateChanges} 
        modifiers={modifier.modifiers}
        resolvedDice={new Map()}
        manualEffects={[]}
        outcome="applied"
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .custom-modifier-display {
    background: linear-gradient(135deg, 
      rgba(100, 116, 139, 0.1),
      rgba(71, 85, 105, 0.05));
    border: 0.0625rem solid rgba(100, 116, 139, 0.3);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .modifier-header {
    padding: var(--space-12) var(--space-16);
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 0.0625rem solid rgba(100, 116, 139, 0.2);
  }
  
  .modifier-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
  }
  
  .modifier-name {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary); /* Neutral gray color */
  }
  
  .modifier-tags {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
  }
  
  .tag {
    padding: var(--space-2) var(--space-8);
    border-radius: var(--radius-sm);
    font-size: var(--font-xs);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.05rem;
    border: 0.0625rem solid;
  }
  
  .tag-ongoing {
    background: rgba(251, 191, 36, 0.1);
    border-color: rgba(251, 191, 36, 0.4);
    color: var(--color-amber);
  }
  
  .tag-dangerous {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.4);
    color: var(--color-red);
  }
  
  .tag-beneficial {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.4);
    color: var(--color-green);
  }
  
  .tag-custom {
    background: rgba(100, 116, 139, 0.1);
    border-color: rgba(100, 116, 139, 0.4);
    color: var(--text-tertiary);
  }
  
  .modifier-details {
    padding: var(--space-12) var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .modifier-description {
    color: var(--text-secondary);
    font-size: var(--font-md);
    line-height: 1.5;
  }
</style>
