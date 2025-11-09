<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../../../../controllers/shared/ResolutionStateHelpers';
  import { getBestTradeRates, getCriticalSuccessRates } from '../../../../../services/commerce/tradeRates';

  // Props
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;

  const dispatch = createEventDispatcher();

  // Hardcoded resources (always the same for purchase action)
  const resources = ['food', 'lumber', 'stone', 'ore'];
  
  // Get trade rates based on outcome
  $: tradeRates = outcome === 'criticalSuccess' 
    ? getCriticalSuccessRates() 
    : getBestTradeRates();
  // Note: For buying, goldGain is gold cost, resourceCost is resources gained
  $: goldCost = tradeRates.buy.goldGain;
  $: resourceGain = tradeRates.buy.resourceCost;
  
  // Get available gold
  $: availableGold = $kingdomData.resources?.gold || 0;
  $: maxSets = Math.floor(availableGold / goldCost);
  $: maxResources = maxSets * resourceGain;

  // Get resolution state from instance (only for selectedResource)
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedResource = resolutionState.customComponentData?.selectedResource || '';
  
  // Use local state for amount (no actor updates on every change)
  // Initialize to default, then update reactively when resourceGain changes
  let selectedAmount = 2;
  
  // Update selectedAmount when resourceGain changes (but only if current amount is invalid)
  $: if (resourceGain > 0 && (!selectedAmount || selectedAmount < resourceGain)) {
    selectedAmount = resourceGain;
  }
  
  // Validation
  $: isValid = selectedResource && selectedAmount > 0 && selectedAmount <= maxResources && selectedAmount % resourceGain === 0;
  $: totalCost = selectedAmount > 0 ? Math.ceil(selectedAmount / resourceGain) * goldCost : 0;

  // Format resource name for display
  function formatResourceName(resource: string): string {
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  async function handleResourceSelect(resource: string) {
    if (!instance) return;

    // Update local state
    selectedResource = resource;
    
    // Persist selectedResource to metadata (for ActionPhaseController)
    // This is a ONE-TIME persistence when selecting resource, not on every amount change
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { 
        selectedResource: resource
      }
    });
    
    // Notify parent
    notifySelectionChanged();
  }
  
  function handleAmountChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const amount = parseInt(input.value, 10);
    
    if (isNaN(amount)) return;

    // Update local state only (no persistence)
    selectedAmount = amount;
    notifySelectionChanged();
  }
  
  function incrementAmount() {
    const newAmount = selectedAmount + resourceGain;
    if (newAmount > maxResources) return;
    
    // Update local state only (no persistence)
    selectedAmount = newAmount;
    notifySelectionChanged();
  }
  
  function decrementAmount() {
    const newAmount = selectedAmount - resourceGain;
    if (newAmount < resourceGain) return;
    
    // Update local state only (no persistence)
    selectedAmount = newAmount;
    notifySelectionChanged();
  }
  
  // Notify parent of current selection (enables Apply button, no persistence)
  function notifySelectionChanged() {
    if (!selectedResource) return;
    
    const sets = Math.ceil(selectedAmount / resourceGain);
    const cost = sets * goldCost;
    
    // Just dispatch event - no actor update!
    dispatch('selection', { 
      selectedResource: selectedResource,
      selectedAmount: selectedAmount,
      goldCost: cost,
      modifiers: [
        {
          type: 'static',
          resource: 'gold',
          value: -cost,
          duration: 'immediate'
        },
        {
          type: 'static',
          resource: selectedResource,
          value: selectedAmount,
          duration: 'immediate'
        }
      ]
    });
  }
  
</script>

<div class="purchase-resource-selector">
  <div class="header">
    <h4>Purchase Resources</h4>
    <div class="rate-info">
      <i class="fas fa-exchange-alt"></i>
      <span>Rate: {goldCost} gold → {resourceGain} resource{resourceGain > 1 ? 's' : ''}</span>
      {#if outcome === 'criticalSuccess'}
        <span class="crit-bonus">✨ Tier Bonus!</span>
      {/if}
    </div>
  </div>

  <div class="resource-grid">
    {#each resources as resource}
      <button
        class="resource-option"
        class:selected={selectedResource === resource}
        on:click={() => handleResourceSelect(resource)}
        disabled={maxResources < resourceGain}
      >
        <div class="resource-name">
          {formatResourceName(resource)}
        </div>
      </button>
    {/each}
  </div>

  {#if selectedResource}
    <div class="amount-selector">
      <label for="amount-input">
        Amount:
      </label>
      <div class="input-row">
        <div class="input-with-buttons">
          <input
            id="amount-input"
            type="number"
            min={resourceGain}
            max={maxResources}
            step={resourceGain}
            value={selectedAmount}
            on:input={handleAmountChange}
          />
          <button 
            class="decrement-btn"
            on:click={decrementAmount}
            disabled={selectedAmount <= resourceGain}
            title="Decrease amount"
          >
            <i class="fas fa-minus"></i>
          </button>
          <button 
            class="increment-btn"
            on:click={incrementAmount}
            disabled={selectedAmount >= maxResources}
            title="Increase amount"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="cost-display">
          <i class="fas fa-coins"></i>
          <span>{totalCost} gold</span>
        </div>
      </div>
    </div>
  {/if}

</div>

<style lang="scss">
  .purchase-resource-selector {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-lg);
    padding: var(--space-16);
    margin: var(--space-12) 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-12);
    flex-wrap: wrap;
    gap: var(--space-8);
    
    h4 {
      margin: 0;
      font-size: var(--font-md);
      font-weight: 600;
      color: var(--text-primary, #e0e0e0);
    }
  }

  .rate-info {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font-size: var(--font-sm);
    color: var(--color-blue, #60a5fa);
    
    i {
      font-size: var(--font-sm);
    }
    
    .crit-bonus {
      color: var(--color-amber, #fbbf24);
      font-weight: var(--font-weight-semibold);
    }
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6.25rem, 1fr));
    gap: var(--space-12);
    margin-bottom: var(--space-12);
  }

  .resource-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--border-strong, rgba(255, 255, 255, 0.2));
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--color-blue, #60a5fa);
      transform: translateY(-0.125rem);
    }
    
    &.selected {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--color-blue, #60a5fa);
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

  .amount-selector {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12);
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: var(--radius-sm);
    
    label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
    }
    
    .input-row {
      display: flex;
      gap: var(--space-12);
      align-items: center;
    }
    
    .input-with-buttons {
      display: flex;
      gap: var(--space-6);
      align-items: center;
      
      button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        background: rgba(59, 130, 246, 0.2);
        border: 1px solid var(--color-blue, #60a5fa);
        border-radius: var(--radius-sm);
        color: var(--color-blue, #60a5fa);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        
        i {
          font-size: var(--font-xs);
        }
        
        &:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.3);
          transform: scale(1.05);
        }
        
        &:active:not(:disabled) {
          transform: scale(0.95);
        }
        
        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      }
    }
    
    input {
      width: 5rem;
      padding: var(--space-6) var(--space-10);
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--font-md);
      font-family: inherit;
      text-align: center;
      
      &:focus {
        outline: none;
        border-color: var(--color-blue);
      }
    }
    
    .cost-display {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--color-amber);
      white-space: nowrap;
      
      i {
        font-size: var(--font-sm);
      }
    }
  }
</style>
