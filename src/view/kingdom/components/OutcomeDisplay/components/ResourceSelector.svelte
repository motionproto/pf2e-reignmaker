<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { getResourceIcon } from '../../../../kingdom/utils/presentation';
  import { getValidationContext } from '../context/ValidationContext';
  
  export let modifiers: any[] | undefined = undefined;
  export let selectedResources: Map<number, string> = new Map();
  
  const dispatch = createEventDispatcher();
  
  // ✨ NEW: Register with validation context
  const validationContext = getValidationContext();
  const providerId = 'resource-selector';
  
  // Filter to only choice-dropdown modifiers (those with resources array)
  // BREAKING CHANGE: Only recognizes explicit type: "choice-dropdown"
  $: choiceModifiers = (modifiers || [])
    .map((m, originalIdx) => ({ ...m, originalIndex: originalIdx }))
    .filter(m => m.type === 'choice-dropdown' && Array.isArray(m.resources));
  
  $: hasChoiceModifiers = choiceModifiers.length > 0;
  $: allResolved = hasChoiceModifiers && choiceModifiers.every(m => selectedResources.has(m.originalIndex));
  
  // ✨ NEW: Register validation on mount
  onMount(() => {
    if (validationContext) {
      validationContext.register(providerId, {
        id: providerId,
        needsResolution: hasChoiceModifiers,
        isResolved: allResolved
      });
    }
  });
  
  // ✨ NEW: Update validation state when modifiers/selections change
  $: if (validationContext) {
    validationContext.update(providerId, {
      needsResolution: hasChoiceModifiers,
      isResolved: allResolved
    });
  }
  
  // ✨ NEW: Unregister on destroy
  onDestroy(() => {
    if (validationContext) {
      validationContext.unregister(providerId);
    }
  });
  
  function handleResourceSelect(modifierIndex: number, resource: string) {
    dispatch('select', { modifierIndex, resource });
  }
  
  function getChoiceLabel(modifier: any): string {
    const action = modifier.negative ? 'Lose' : 'Gain';
    let valueStr = '';
    
    if (typeof modifier.value === 'object' && modifier.value.formula) {
      valueStr = modifier.value.formula;
    } else if (typeof modifier.value === 'string') {
      valueStr = modifier.value;
    } else {
      valueStr = String(modifier.value);
    }
    
    return `${action} ${valueStr}`;
  }
</script>

{#if hasChoiceModifiers}
  <div class="resource-selectors">
    <div class="selectors-header">Choose resource:</div>
    <div class="selector-cards">
      {#each choiceModifiers as modifier}
        {@const selected = selectedResources.get(modifier.originalIndex)}
        {@const label = getChoiceLabel(modifier)}
        
        <div class="selector-card" class:resolved={selected}>
          <div class="card-header">
            <div class="card-label">{label}</div>
          </div>
          
          <select 
            class="resource-dropdown"
            value={selected || ''}
            on:change={(e) => handleResourceSelect(modifier.originalIndex, e.currentTarget.value)}
          >
            <option value="" disabled>Select resource...</option>
            {#each modifier.resources as resource}
              {@const icon = getResourceIcon(resource)}
              <option value={resource}>
                {resource.charAt(0).toUpperCase() + resource.slice(1)}
              </option>
            {/each}
          </select>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .resource-selectors {
    margin-top: var(--space-10);
    
    .selectors-header {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-12);
    }
    
    .selector-cards {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-12);
    }
    
    .selector-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-10);
      padding: var(--space-12);
      background: rgba(255, 255, 255, 0.03);
      border: 2px solid var(--border-medium);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      min-width: 12.5rem;
      width: auto;
      
      &.resolved {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--border-strong);
        box-shadow: 0 0 1rem var(--hover-high);
      }
      
      .card-header {
        display: flex;
        align-items: center;
        gap: var(--space-10);
        
        .card-label {
          font-size: var(--font-md);
          font-weight: var(--font-weight-medium);
          color: var(--text-primary);
          line-height: 1.4;
          flex: 1;
        }
      }
      
      .resource-dropdown {
        padding: var(--space-8) var(--space-12);
        background: var(--overlay);
        border: 1px solid var(--border-medium);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-size: var(--font-md);
        cursor: pointer;
        width: 100%;
        
        &:hover {
          border-color: var(--border-strong);
          background: rgba(0, 0, 0, 0.4);
        }
        
        &:focus {
          outline: none;
          border-color: var(--color-blue);
          box-shadow: 0 0 0 0.125rem var(--surface-info-higher);
        }
        
        option {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
      }
    }
  }
</style>
