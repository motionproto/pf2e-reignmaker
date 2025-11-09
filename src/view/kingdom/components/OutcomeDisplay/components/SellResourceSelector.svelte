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

  // Hardcoded resources (always the same for sell action)
  const resources = ['food', 'lumber', 'stone', 'ore'];
  
  // Get trade rates based on outcome
  $: tradeRates = outcome === 'criticalSuccess' 
    ? getCriticalSuccessRates() 
    : getBestTradeRates();
  // Note: For selling, resourceCost is resources spent, goldGain is gold received
  $: resourceCost = tradeRates.sell.resourceCost;
  $: goldGain = tradeRates.sell.goldGain;
  
  // Get available resources
  $: availableResources = $kingdomData.resources || {};
  
  // Get resolution state from instance (only for selectedResource)
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedResource = resolutionState.customComponentData?.selectedResource || '';
  
  // Use local state for amount (no actor updates on every change)
  let selectedAmount = 2;
  
  // Get max sellable amount for selected resource
  $: maxSellable = selectedResource ? (availableResources[selectedResource] || 0) : 0;
  $: maxSets = Math.floor(maxSellable / resourceCost);
  $: maxAmount = maxSets * resourceCost;
  
  // Update selectedAmount when resourceCost changes (but only if current amount is invalid)
  $: if (resourceCost > 0 && (!selectedAmount || selectedAmount < resourceCost)) {
    selectedAmount = resourceCost;
  }
  
  // Validation
  $: isValid = selectedResource && selectedAmount > 0 && selectedAmount <= maxSellable && selectedAmount % resourceCost === 0;
  $: totalGold = selectedAmount > 0 ? Math.floor(selectedAmount / resourceCost) * goldGain : 0;

  // Format resource name for display
  function formatResourceName(resource: string): string {
    return resource.charAt(0).toUpperCase() + resource.slice(1);
  }

  async function handleResourceSelect(resource: string) {
    if (!instance) return;

    // Update local state
    selectedResource = resource;
    selectedAmount = resourceCost; // Reset to minimum valid amount
    
    // Persist selectedResource to metadata (for ActionPhaseController)
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
    const newAmount = selectedAmount + resourceCost;
    if (newAmount > maxAmount) return;
    
    // Update local state only (no persistence)
    selectedAmount = newAmount;
    notifySelectionChanged();
  }
  
  function decrementAmount() {
    const newAmount = selectedAmount - resourceCost;
    if (newAmount < resourceCost) return;
    
    // Update local state only (no persistence)
    selectedAmount = newAmount;
    notifySelectionChanged();
  }
  
  // Notify parent of current selection (enables Apply button, no persistence)
  function notifySelectionChanged() {
    if (!selectedResource) return;
    
    const sets = Math.floor(selectedAmount / resourceCost);
    const gold = sets * goldGain;
    
    // Just dispatch event - no actor update!
    dispatch('selection', { 
      selectedResource: selectedResource,
      selectedAmount: selectedAmount,
      goldGained: gold,
      modifiers: [
        {
          type: 'static',
          resource: selectedResource,
          value: -selectedAmount,
          duration: 'immediate'
        },
        {
          type: 'static',
          resource: 'gold',
          value: gold,
          duration: 'immediate'
        }
      ]
    });
  }
  
</script>

<div class="sell-resource-selector">
  <div class="header">
    <h4>Sell Surplus Resources</h4>
    <div class="rate-info">
      <i class="fas fa-exchange-alt"></i>
      <span>Rate: {resourceCost} resource{resourceCost > 1 ? 's' : ''} → {goldGain} gold</span>
      {#if outcome === 'criticalSuccess'}
        <span class="crit-bonus">✨ Tier Bonus!</span>
      {/if}
    </div>
  </div>

  <div class="resource-grid">
    {#each resources as resource}
      {@const available = availableResources[resource] || 0}
      {@const canSell = available >= resourceCost}
      <button
        class="resource-option"
        class:selected={selectedResource === resource}
        on:click={() => handleResourceSelect(resource)}
        disabled={!canSell}
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
        Amount to Sell:
      </label>
      <div class="input-row">
        <div class="input-with-buttons">
          <input
            id="amount-input"
            type="number"
            min={resourceCost}
            max={maxAmount}
            step={resourceCost}
            value={selectedAmount}
            on:input={handleAmountChange}
          />
          <button 
            class="decrement-btn"
            on:click={decrementAmount}
            disabled={selectedAmount <= resourceCost}
            title="Decrease amount"
          >
            <i class="fas fa-minus"></i>
          </button>
          <button 
            class="increment-btn"
            on:click={incrementAmount}
            disabled={selectedAmount >= maxAmount}
            title="Increase amount"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="gain-display">
          <i class="fas fa-coins"></i>
          <span>+{totalGold} gold</span>
        </div>
      </div>
      {#if selectedAmount % resourceCost !== 0}
        <div class="validation-warning">
          <i class="fas fa-exclamation-triangle"></i>
          Amount must be divisible by {resourceCost}
        </div>
      {/if}
    </div>
  {/if}

</div>

<style lang="scss">
  .sell-resource-selector {
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
    flex-wrap: wrap;
    gap: 8px;
    
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
    gap: 8px;
    font-size: var(--font-sm);
    color: var(--color-amber, #fbbf24);
    
    i {
      font-size: 14px;
    }
    
    .crit-bonus {
      color: var(--color-amber, #fbbf24);
      font-weight: var(--font-weight-semibold);
    }
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .resource-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--border-strong, rgba(255, 255, 255, 0.2));
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--color-amber, #fbbf24);
      transform: translateY(-2px);
    }
    
    &.selected {
      background: rgba(251, 191, 36, 0.2);
      border-color: var(--color-amber, #fbbf24);
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

  .resource-count {
    font-size: var(--font-xs);
    color: var(--text-tertiary, #9ca3af);
    margin-top: 4px;
  }

  .amount-selector {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: var(--radius-sm);
    
    label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
    }
    
    .input-row {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .input-with-buttons {
      display: flex;
      gap: 6px;
      align-items: center;
      
      button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        background: rgba(251, 191, 36, 0.2);
        border: 1px solid var(--color-amber, #fbbf24);
        border-radius: var(--radius-sm);
        color: var(--color-amber, #fbbf24);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        
        i {
          font-size: 12px;
        }
        
        &:hover:not(:disabled) {
          background: rgba(251, 191, 36, 0.3);
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
      width: 80px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--font-md);
      font-family: inherit;
      text-align: center;
      
      &:focus {
        outline: none;
        border-color: var(--color-amber);
      }
    }
    
    .gain-display {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--color-amber);
      white-space: nowrap;
      
      i {
        font-size: 14px;
      }
    }
  }

  .validation-warning {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--radius-sm);
    font-size: var(--font-xs);
    color: rgb(239, 68, 68);
    
    i {
      font-size: 12px;
    }
  }
</style>
