<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../../../../controllers/shared/ResolutionStateHelpers';
  import { getResourceIcon } from '../../../../kingdom/utils/presentation';
  import { getValidationContext } from '../context/ValidationContext';

  // Props
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;

  const dispatch = createEventDispatcher();
  
  // ✨ NEW: Register with validation context
  const validationContext = getValidationContext();
  const providerId = 'resource-choice-selector';

  // Hardcoded resources (always the same for harvest action)
  const resources = ['food', 'lumber', 'stone', 'ore'];
  
  // Calculate amount based on outcome
  $: amount = outcome === 'criticalSuccess' ? 2 : 1;

  // Get resolution state from instance
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedResource = resolutionState.customComponentData?.selectedResource || '';

  // Check if resolution is complete
  $: isResolved = !!selectedResource;
  
  // ✨ NEW: Register validation on mount
  onMount(() => {
    if (validationContext) {
      validationContext.register(providerId, {
        id: providerId,
        needsResolution: true,  // Always needs resource selection
        isResolved: isResolved
      });
    }
  });
  
  // ✨ NEW: Update validation state when selection changes
  $: if (validationContext) {
    validationContext.update(providerId, {
      needsResolution: true,
      isResolved: isResolved
    });
  }
  
  // ✨ NEW: Unregister on destroy
  onDestroy(() => {
    if (validationContext) {
      validationContext.unregister(providerId);
    }
  });

  // Format resource name for display
  function formatResourceName(resource: string): string {
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  async function handleResourceSelect(resource: string) {
    if (!instance) return;

    // Update instance resolution state
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { 
        selectedResource: resource,
        amount: amount
      }
    });

    // Emit selection event with modifier format (for OutcomeDisplay to process)
    dispatch('selection', { 
      selectedResource: resource,
      amount: amount,
      modifiers: [{
        type: 'static',
        resource: resource,
        value: amount,
        duration: 'immediate'
      }]
    });
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

  <div class="resource-grid">
    {#each resources as resource}
      <button
        class="resource-option"
        class:selected={selectedResource === resource}
        on:click={() => handleResourceSelect(resource)}
      >
        <div class="resource-amount">
          +{amount}
        </div>
        <div class="resource-name">
          {formatResourceName(resource)}
        </div>
      </button>
    {/each}
  </div>

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

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
    gap: var(--space-12);
    margin-bottom: var(--space-12);
  }

  .resource-option {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    padding: var(--space-12) var(--space-16);
    background: var(--hover-low);
    border: 2px solid var(--border-strong, var(--border-default));
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: var(--hover);
      border-color: var(--color-green, #22c55e);
      transform: translateY(-0.125rem);
    }
    
    &.selected {
      background: var(--surface-success-high);
      border-color: var(--color-green, #22c55e);
      border-width: 3px;
    }
    
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .resource-name {
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--text-primary, #e0e0e0);
  }

  .resource-amount {
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--color-green, #22c55e);
  }

  .selection-confirmation {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-10);
    background: var(--surface-success-low);
    border-left: 3px solid var(--color-green, #22c55e);
    border-radius: var(--radius-md);
    
    i {
      color: var(--color-green, #22c55e);
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
      
      strong {
        color: var(--text-primary, #e0e0e0);
      }
    }
  }
</style>
