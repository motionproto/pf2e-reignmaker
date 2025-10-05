<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatStateChangeLabel } from '../../../../../services/resolution';
  import { detectResourceArrayModifiers } from '../logic/OutcomeDisplayLogic';
  
  export let modifiers: any[] | undefined = undefined;
  export let selectedResources: Map<number, string> = new Map();
  
  const dispatch = createEventDispatcher();
  
  $: resourceArrayModifiers = detectResourceArrayModifiers(modifiers);
  $: hasResourceArrays = resourceArrayModifiers.length > 0;
  
  function handleResourceSelect(modifierIndex: number, resourceType: string) {
    dispatch('select', {
      modifierIndex,
      resourceType
    });
  }
</script>

{#if hasResourceArrays}
  <div class="resource-array-selectors">
    {#each resourceArrayModifiers as modifier, index}
      <div class="resource-selector">
        <label class="resource-selector-label">
          Choose resource {modifier.value > 0 ? 'to gain' : 'to lose'} ({modifier.value > 0 ? '+' : ''}{modifier.value}):
        </label>
        <select 
          class="resource-dropdown"
          value={selectedResources.get(index) || ''}
          on:change={(e) => handleResourceSelect(index, e.currentTarget.value)}
        >
          <option value="" disabled>Select resource...</option>
          {#each modifier.resource as resourceType}
            <option value={resourceType}>
              {formatStateChangeLabel(resourceType)}
            </option>
          {/each}
        </select>
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .resource-array-selectors {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    
    .resource-selector {
      display: flex;
      flex-direction: column;
      gap: 6px;
      
      .resource-selector-label {
        font-size: var(--font-sm);
        font-weight: var(--font-weight-medium);
        color: var(--text-secondary);
      }
      
      .resource-dropdown {
        padding: 10px 14px;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid var(--border-medium);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--font-md);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        
        &:hover {
          background: rgba(0, 0, 0, 0.4);
          border-color: var(--border-strong);
        }
        
        &:focus {
          outline: none;
          border-color: var(--color-blue);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        option {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
      }
    }
  }
</style>
