<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import type { ComponentResolutionData } from '../../../../../types/CustomComponentInterface';
  import { getResourceIcon } from '../../../../kingdom/utils/presentation';
  import { getValidationContext } from '../context/ValidationContext';

  // ✅ STANDARD PROPS (CustomComponentInterface)
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  export let config: Record<string, any> = {};

  const dispatch = createEventDispatcher<{ resolution: ComponentResolutionData }>();
  
  // ✅ Register with validation context
  const validationContext = getValidationContext();
  const providerId = 'resource-choice-selector';

  // Component-specific configuration
  const resources = config.resources || ['food', 'lumber', 'stone', 'ore'];
  
  // Calculate amount based on outcome
  $: amount = outcome === 'criticalSuccess' ? 2 : 1;

  // Local UI state (not persisted to instance)
  let selectedResource = '';

  // Check if resolution is complete
  $: isResolved = !!selectedResource;
  
  // ✅ LIFECYCLE: Register validation on mount
  onMount(() => {
    if (validationContext) {
      validationContext.register(providerId, {
        id: providerId,
        needsResolution: true,
        isResolved: false
      });
    }
  });
  
  // ✅ LIFECYCLE: Update validation state when selection changes
  $: if (validationContext) {
    validationContext.update(providerId, {
      needsResolution: true,
      isResolved: isResolved
    });
  }
  
  // ✅ LIFECYCLE: Unregister on destroy
  onDestroy(() => {
    if (validationContext) {
      validationContext.unregister(providerId);
    }
  });

  // Format resource name for display
  function formatResourceName(resource: string): string {
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  // ✅ STANDARD EVENT: Emit 'resolution' with ComponentResolutionData
  function handleResourceClick(resource: string) {
    // Update local UI state
    selectedResource = resource;
    
    // Emit standardized resolution event
    const resolutionData: ComponentResolutionData = {
      isResolved: true,
      modifiers: [{
        type: 'static',
        resource: resource,
        value: amount,
        duration: 'immediate'
      }],
      metadata: {
        selectedResource: resource,
        amount: amount
      }
    };
    
    dispatch('resolution', resolutionData);
  }
</script>

<div class="resource-choice-selector">
  <div class="header">
    <h4>Choose Resource to Harvest</h4>
    <div class="amount-info">
      <i class="fas fa-gift"></i>
      <span>Gain {amount} resource{amount !== 1 ? 's' : ''}</span>
    </div>
  </div>

  <div class="resource-buttons">
    {#each resources as resource}
      <button
        class="resource-button"
        class:selected={selectedResource === resource}
        on:click={() => handleResourceClick(resource)}
      >
        <i class="fas {getResourceIcon(resource)}"></i>
        <span>{formatResourceName(resource)}</span>
      </button>
    {/each}
  </div>

  {#if selectedResource}
    <div class="selection-info">
      <i class="fas fa-check-circle"></i>
      <span>Selected: <strong>{formatResourceName(selectedResource)}</strong> (+{amount})</span>
    </div>
  {/if}

</div>

<style lang="scss">
  .resource-choice-selector {
    background: var(--overlay-low);
    border-radius: var(--radius-lg);
    padding: var(--space-16);
    margin: var(--space-12) 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-12);
    
    h4 {
      margin: 0;
      font-size: var(--font-md);
      font-weight: 600;
      color: var(--text-primary, #e0e0e0);
    }
  }

  .amount-info {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font-size: var(--font-md);
    color: var(--color-green, #22c55e);
    
    i {
      font-size: var(--font-sm);
    }
  }

  .resource-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
    margin-bottom: var(--space-12);
  }

  .resource-button {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-10) var(--space-16);
    background: var(--hover-low);
    border: 2px solid var(--border-strong, var(--border-default));
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s;
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--text-primary, #e0e0e0);
    
    i {
      font-size: var(--font-lg);
      color: var(--text-secondary);
      transition: color 0.2s;
    }
    
    &:hover:not(:disabled):not(.selected) {
      background: var(--hover);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }
    
    &.selected {
      background: var(--surface-success-high);
      border-color: var(--color-green, #22c55e);
      border-width: 3px;
      color: var(--color-green, #22c55e);
      
      i {
        color: var(--color-green, #22c55e);
      }
    }
    
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .selection-info {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    padding: var(--space-12);
    background: var(--surface-success-low);
    border-left: 3px solid var(--color-green, #22c55e);
    border-radius: var(--radius-md);
    color: var(--text-primary, #e0e0e0);
    
    i {
      color: var(--color-green, #22c55e);
      font-size: var(--font-lg);
    }
    
    strong {
      color: var(--color-green, #22c55e);
    }
  }
</style>
