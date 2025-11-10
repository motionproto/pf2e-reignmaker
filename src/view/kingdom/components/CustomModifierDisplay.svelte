<script lang="ts">
  import type { ActiveModifier } from '../../../models/Modifiers';
  import { isStaticModifier } from '../../../types/modifiers';
  import AdjustmentBadges from './AdjustmentBadges.svelte';
  
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
      // Only check StaticModifier (has definite values)
      if (!isStaticModifier(m)) return false;
      
      // For regular unrest, positive values are dangerous (increasing unrest is bad)
      // Note: imprisonedUnrest is NOT dangerous - it's controlled/contained
      if (m.resource === 'unrest') {
        return m.value > 0;
      }
      
      // For other resources, negative values are dangerous
      return m.value < 0;
    });
    if (hasDangerous) tags.push('dangerous');
    
    // Check if it's beneficial (positive effects, but not unrest types)
    const hasBeneficial = mod.modifiers?.some(m => {
      // Only check StaticModifier (has definite values)
      if (!isStaticModifier(m)) return false;
      
      // Regular unrest changes and imprisoned unrest increases are not beneficial
      // (Though imprisoned unrest is not dangerous either - it's neutral/controlled)
      if (m.resource === 'unrest') return false;
      if (m.resource === 'imprisonedUnrest' && m.value > 0) return false;
      
      return m.value > 0;
    });
    if (hasBeneficial && !hasDangerous) tags.push('beneficial');
    
    // Only add custom tag if this is a user-created custom modifier
    if (mod.sourceType === 'custom') {
      tags.push('custom');
    }
    
    return tags;
  }
  
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
    border: 1px solid;
  }
  
  .tag-ongoing {
    background: var(--surface-accent-low);
    border-color: var(--border-accent);
    color: var(--color-amber);
  }
  
  .tag-dangerous {
    background: var(--surface-primary-low);
    border-color: var(--border-primary);
    color: var(--color-red);
  }
  
  .tag-beneficial {
    background: var(--surface-success-low);
    border-color: var(--border-success);
    color: var(--color-green);
  }
  
  .tag-custom {
    background: rgba(100, 116, 139, 0.1);
    border-color: var(--border-medium);
    color: var(--text-tertiary);
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
