<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from '../../view/kingdom/components/baseComponents/Dialog.svelte';
  import type { TradeRates } from '../../services/commerce/tradeRates';
  
  export let show: boolean = false;
  export let resources: any = {};
  export let outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' = 'success';
  export let tradeRates: TradeRates = {
    sell: { resourceCost: 2, goldGain: 1 },
    buy: { resourceCost: 1, goldGain: 2 },
    tier: 0
  };
  
  const dispatch = createEventDispatcher<{
    confirm: { resourceType: string; amount: number };
    cancel: void;
  }>();
  
  // Resource types and their display names
  const resourceTypes = [
    { id: 'food', name: 'Food', icon: 'fa-drumstick-bite' },
    { id: 'lumber', name: 'Lumber', icon: 'fa-tree' },
    { id: 'stone', name: 'Stone', icon: 'fa-gem' },
    { id: 'ore', name: 'Ore', icon: 'fa-cube' },
    { id: 'luxuries', name: 'Luxuries', icon: 'fa-crown' }
  ];
  
  // Track selected resource and amount
  let selectedResource: string | null = null;
  let amount: number = 0;
  
  // Calculate gold gained based on outcome
  $: goldGained = calculateGoldGained(amount, outcome);
  $: canConfirm = amount >= tradeRates.sell.resourceCost && amount % tradeRates.sell.resourceCost === 0;
  $: selectedResourceData = resourceTypes.find(r => r.id === selectedResource);
  
  function calculateGoldGained(totalSold: number, outcome: string): number {
    if (totalSold === 0) return 0;
    
    const { resourceCost, goldGain } = tradeRates.sell;
    
    if (outcome === 'criticalSuccess') {
      // Better rate + 1d4 bonus (show average)
      const baseGold = Math.floor((totalSold / resourceCost) * goldGain);
      const avgBonus = 2.5; // Average of 1d4
      return Math.floor(baseGold + avgBonus);
    } else {
      // Normal rate from commerce structure
      return Math.floor((totalSold / resourceCost) * goldGain);
    }
  }
  
  function selectResource(resourceId: string) {
    if (selectedResource !== resourceId) {
      selectedResource = resourceId;
      amount = 0; // Reset amount when switching resources
    }
  }
  
  function increment() {
    if (!selectedResource) return;
    const available = resources[selectedResource] || 0;
    const step = tradeRates.sell.resourceCost;
    if (amount + step <= available) {
      amount += step;
    }
  }
  
  function decrement() {
    const step = tradeRates.sell.resourceCost;
    if (amount >= step) {
      amount -= step;
    }
  }
  
  function handleConfirm() {
    if (canConfirm && selectedResource) {
      dispatch('confirm', { resourceType: selectedResource, amount });
      show = false;
    }
  }
  
  function handleCancel() {
    // Reset state
    selectedResource = null;
    amount = 0;
    dispatch('cancel');
    show = false;
  }
</script>

<Dialog
  bind:show
  title="Sell Surplus Resources"
  confirmLabel="Sell Resources"
  confirmDisabled={!canConfirm}
  width="600px"
  on:confirm={handleConfirm}
  on:cancel={handleCancel}
>
  <div class="sell-surplus-dialog">
    <div class="exchange-rate-info">
      {#if outcome === 'criticalSuccess'}
        <p class="rate-text crit-success">
          <i class="fas fa-star"></i>
          Critical Success! {tradeRates.sell.resourceCost}:{tradeRates.sell.goldGain} exchange + 1d4 bonus gold
        </p>
      {:else}
        <p class="rate-text">
          Trade {tradeRates.sell.resourceCost} resource{tradeRates.sell.resourceCost > 1 ? 's' : ''} for {tradeRates.sell.goldGain} gold
        </p>
      {/if}
    </div>
    
    <div class="resources-list">
      {#each resourceTypes as resource}
        {@const available = resources[resource.id] || 0}
        {@const canSell = available >= tradeRates.sell.resourceCost}
        {@const isSelected = selectedResource === resource.id}
        
        <div class="resource-row" class:disabled={!canSell} class:selected={isSelected}>
          <label class="resource-selector">
            <input
              type="radio"
              name="resource-select"
              value={resource.id}
              checked={isSelected}
              disabled={!canSell}
              on:change={() => selectResource(resource.id)}
            />
            <div class="resource-info">
              <i class="fas {resource.icon} resource-icon"></i>
              <span class="resource-name">{resource.name}</span>
              <span class="available-count">({available} available)</span>
            </div>
          </label>
          
          <div class="resource-controls">
            <button
              class="control-button"
              on:click={decrement}
              disabled={!isSelected || amount === 0}
              aria-label="Decrease {resource.name}"
            >
              <i class="fas fa-minus"></i>
            </button>
            
            <span class="amount-display">{isSelected ? amount : 0}</span>
            
            <button
              class="control-button"
              on:click={increment}
              disabled={!isSelected || amount + tradeRates.sell.resourceCost > available}
              aria-label="Increase {resource.name}"
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      {/each}
    </div>
    
    <div class="total-section">
      {#if selectedResource && amount > 0}
        <div class="trade-summary">
          <i class="fas fa-exchange-alt trade-icon"></i>
          <span class="trade-text">
            Trading {amount} {selectedResourceData?.name.toLowerCase()} for {goldGained} gold
            {#if outcome === 'criticalSuccess'}
              <span class="bonus-indicator">(+1d4 bonus!)</span>
            {/if}
          </span>
        </div>
      {:else}
        <p class="hint-text">
          <i class="fas fa-info-circle"></i>
          Select a resource type and use +/- buttons to set amount
        </p>
      {/if}
      
      {#if amount > 0 && amount % tradeRates.sell.resourceCost !== 0}
        <p class="warning-text">
          <i class="fas fa-exclamation-triangle"></i>
          Amount must be divisible by {tradeRates.sell.resourceCost} (trade ratio: {tradeRates.sell.resourceCost}:{tradeRates.sell.goldGain})
        </p>
      {/if}
    </div>
  </div>
</Dialog>

<style lang="scss">
  .sell-surplus-dialog {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .exchange-rate-info {
    padding: 0.75rem 1rem;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: var(--radius-md, 6px);
    
    .rate-text {
      margin: 0;
      font-size: 0.95rem;
      color: var(--text-secondary);
      text-align: center;
      
      &.crit-success {
        color: var(--color-amber);
        font-weight: var(--font-weight-semibold);
        
        i {
          margin-right: 0.5rem;
        }
      }
    }
  }
  
  .resources-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .resource-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md, 6px);
    transition: all 0.2s ease;
    
    &:not(.disabled):hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-highlight);
    }
    
    &.selected {
      background: rgba(251, 191, 36, 0.1);
      border-color: rgba(251, 191, 36, 0.5);
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .resource-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    cursor: pointer;
    
    input[type="radio"] {
      width: 1.25rem;
      height: 1.25rem;
      cursor: pointer;
      
      &:disabled {
        cursor: not-allowed;
      }
    }
  }
  
  .resource-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .resource-icon {
      font-size: 1.25rem;
      color: var(--color-amber);
      width: 1.5rem;
      text-align: center;
    }
    
    .resource-name {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      font-size: 1rem;
    }
    
    .available-count {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }
  }
  
  .resource-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .control-button {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-gray-800);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm, 4px);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover:not(:disabled) {
        background: var(--color-gray-700);
        border-color: var(--color-amber);
        color: var(--color-amber);
      }
      
      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      
      i {
        font-size: 0.875rem;
      }
    }
    
    .amount-display {
      min-width: 3rem;
      text-align: center;
      font-size: 1.1rem;
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
    }
  }
  
  .total-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light);
  }
  
  .trade-summary {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(251, 191, 36, 0.15);
    border: 2px solid rgba(251, 191, 36, 0.3);
    border-radius: var(--radius-md, 6px);
    
    .trade-icon {
      font-size: 1.5rem;
      color: var(--color-amber);
    }
    
    .trade-text {
      font-size: 1.1rem;
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      flex: 1;
      
      .bonus-indicator {
        color: var(--color-amber);
        font-size: 0.95rem;
        margin-left: 0.5rem;
      }
    }
  }
  
  .warning-text {
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--radius-sm, 4px);
    color: rgb(239, 68, 68);
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    i {
      font-size: 1rem;
    }
  }
  
  .hint-text {
    margin: 0;
    padding: 0.75rem 1rem;
    background: rgba(100, 116, 139, 0.1);
    border: 1px solid rgba(100, 116, 139, 0.3);
    border-radius: var(--radius-sm, 4px);
    color: var(--text-tertiary);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    
    i {
      font-size: 1rem;
    }
  }
</style>
