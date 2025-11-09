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
  const resources = ['food', 'lumber', 'stone', 'ore', 'luxuries'];
  
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

  // Get resolution state from instance
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedResource = resolutionState.customComponentData?.selectedResource || '';
  $: selectedAmount = resolutionState.customComponentData?.selectedAmount || resourceGain;

  // Validation
  $: isValid = selectedResource && selectedAmount > 0 && selectedAmount <= maxResources && selectedAmount % resourceGain === 0;
  $: totalCost = Math.ceil(selectedAmount / resourceGain) * goldCost;

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
        selectedAmount: selectedAmount,
        goldCost: totalCost
      }
    });

    // Emit selection event with modifier format
    emitSelection(resource, selectedAmount);
  }
  
  async function handleAmountChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const amount = parseInt(input.value, 10);
    
    if (!instance || isNaN(amount)) return;

    // Update instance resolution state
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { 
        selectedResource: selectedResource,
        selectedAmount: amount,
        goldCost: Math.ceil(amount / resourceGain) * goldCost
      }
    });

    // Emit selection if resource already selected
    if (selectedResource) {
      emitSelection(selectedResource, amount);
    }
  }
  
  function emitSelection(resource: string, amount: number) {
    const sets = Math.ceil(amount / resourceGain);
    const cost = sets * goldCost;
    
    dispatch('selection', { 
      selectedResource: resource,
      selectedAmount: amount,
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
          resource: resource,
          value: amount,
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

  <div class="available-gold">
    <i class="fas fa-coins"></i>
    <span>Available: {availableGold} gold (can buy up to {maxResources} resources)</span>
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
        Amount (in multiples of {resourceGain}):
      </label>
      <input
        id="amount-input"
        type="number"
        min={resourceGain}
        max={maxResources}
        step={resourceGain}
        value={selectedAmount}
        on:input={handleAmountChange}
      />
      <div class="cost-display">
        <i class="fas fa-coins"></i>
        <span>Cost: {totalCost} gold</span>
      </div>
    </div>
  {/if}

</div>

<style lang="scss">
  .purchase-resource-selector {
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
    color: var(--color-blue, #60a5fa);
    
    i {
      font-size: 14px;
    }
    
    .crit-bonus {
      color: var(--color-amber, #fbbf24);
      font-weight: var(--font-weight-semibold);
    }
  }

  .available-gold {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-sm);
    font-size: var(--font-sm);
    color: var(--text-secondary);
    
    i {
      color: var(--color-amber);
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
      border-color: var(--color-blue, #60a5fa);
      transform: translateY(-2px);
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
    gap: 8px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: var(--radius-sm);
    
    label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
    }
    
    input {
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--font-md);
      font-family: inherit;
      
      &:focus {
        outline: none;
        border-color: var(--color-blue);
      }
    }
    
    .cost-display {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--color-amber);
      
      i {
        font-size: var(--font-sm);
      }
    }
  }
</style>
