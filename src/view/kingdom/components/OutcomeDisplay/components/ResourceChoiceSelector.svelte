<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../../../../controllers/shared/ResolutionStateHelpers';
  import { getResourceIcon } from '../../../../kingdom/utils/presentation';

  // Props
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;

  const dispatch = createEventDispatcher();

  // Hardcoded resources (always the same for harvest action)
  const resources = ['food', 'lumber', 'stone', 'ore'];
  
  // Calculate amount based on outcome
  $: amount = outcome === 'criticalSuccess' ? 2 : 1;

  // Get resolution state from instance
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedResource = resolutionState.customComponentData?.selectedResource || '';

  // Check if resolution is complete
  $: isResolved = !!selectedResource;

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
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 16px;
    margin: 12px 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
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
    gap: 8px;
    font-size: var(--font-md);
    color: var(--color-green, #22c55e);
    
    i {
      font-size: 14px;
    }
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .resource-option {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--border-strong, rgba(255, 255, 255, 0.2));
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--color-green, #22c55e);
      transform: translateY(-2px);
    }
    
    &.selected {
      background: rgba(34, 197, 94, 0.2);
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
    gap: 8px;
    padding: 10px;
    background: rgba(34, 197, 94, 0.1);
    border-left: 3px solid var(--color-green, #22c55e);
    border-radius: 4px;
    
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
