<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import { structuresService } from '../../../../../services/structures';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../../../../controllers/shared/ResolutionStateHelpers';

  // Props
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  export let modifiers: any[] | undefined = undefined;
  export let stateChanges: Record<string, any> | undefined = undefined;

  const dispatch = createEventDispatcher();

  // Determine how much unrest can be imprisoned based on outcome
  $: maxUnrestToImprison = outcome === 'criticalSuccess' ? 8 : 4;

  // Get resolution state from instance
  $: resolutionState = getInstanceResolutionState(instance);
  $: allocations = (resolutionState.customComponentData?.allocations || {}) as Record<string, number>;

  // Calculate total allocated
  $: totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0) as number;
  $: remaining = maxUnrestToImprison - totalAllocated;

  // Get current unrest
  $: currentUnrest = $kingdomData?.unrest || 0;
  
  // Calculate real-time displayed unrest (decrements as user allocates)
  $: displayedUnrest = currentUnrest - totalAllocated;

  // Get settlements with justice structures
  $: settlementsWithJustice = ($kingdomData?.settlements || [])
    .map(settlement => {
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      return {
        ...settlement,
        justiceCapacity: capacity,
        allocated: allocations[settlement.id] || 0
      };
    })
    .filter(s => s.justiceCapacity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Check if user can allocate more
  $: canAllocate = totalAllocated < maxUnrestToImprison && totalAllocated < currentUnrest;

  // Check if resolution is complete (user has allocated something)
  $: isResolved = totalAllocated > 0;

  async function handleAllocate(settlementId: string) {
    if (!instance) return;

    const settlement = settlementsWithJustice.find(s => s.id === settlementId);
    if (!settlement) return;

    // Calculate available space in this settlement
    const availableSpace = settlement.justiceCapacity - settlement.imprisonedUnrest - settlement.allocated;
    
    // Can't allocate if no space or already at max
    if (availableSpace <= 0 || !canAllocate) return;

    // Allocate 1 unrest
    const newAllocations = {
      ...allocations,
      [settlementId]: (allocations[settlementId] || 0) + 1
    };

    // Update instance resolution state
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { allocations: newAllocations }
    });

    // Emit selection event
    dispatch('selection', { allocations: newAllocations });
  }

  async function handleDeallocate(settlementId: string) {
    if (!instance) return;

    const currentAllocation = allocations[settlementId] || 0;
    if (currentAllocation <= 0) return;

    // Remove 1 unrest
    const newAllocations = { ...allocations };
    if (currentAllocation === 1) {
      delete newAllocations[settlementId];
    } else {
      newAllocations[settlementId] = currentAllocation - 1;
    }

    // Update instance resolution state
    await updateInstanceResolutionState(instance.instanceId, {
      customComponentData: { allocations: newAllocations }
    });

    // Emit selection event
    dispatch('selection', { allocations: newAllocations });
  }
</script>

<div class="arrest-dissidents-resolution">
  <div class="header">
    <h4>Allocate Imprisoned Unrest</h4>
    <div class="totals">
      <div class="total-item">
        <span class="label">Current Unrest:</span>
        <span class="value">{displayedUnrest}</span>
      </div>
      <div class="total-item">
        <span class="label">Store up to:</span>
        <span class="value {remaining === 0 ? 'complete' : ''}">{remaining}</span>
      </div>
    </div>
  </div>

  {#if settlementsWithJustice.length === 0}
    <div class="no-justice">
      <i class="fas fa-exclamation-triangle"></i>
      <p>No settlements with justice structures (Stocks, Jail, Prison, or Donjon) available.</p>
    </div>
  {:else}
    <div class="settlements-list">
      {#each settlementsWithJustice as settlement}
        {@const availableSpace = settlement.justiceCapacity - settlement.imprisonedUnrest - settlement.allocated}
        {@const canAdd = availableSpace > 0 && canAllocate}
        {@const canRemove = settlement.allocated > 0}
        {@const currentImprisoned = settlement.imprisonedUnrest + settlement.allocated}
        
        <div class="settlement-row">
          <div class="allocation-controls">
            <button
              class="btn-control"
              disabled={!canRemove}
              on:click={() => handleDeallocate(settlement.id)}
              title="Remove 1"
            >
              <i class="fas fa-minus"></i>
            </button>
            
            <button
              class="btn-control btn-add"
              disabled={!canAdd}
              on:click={() => handleAllocate(settlement.id)}
              title="Add 1"
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
          
          <div class="settlement-info">
            <span class="settlement-name">{settlement.name}</span>
            <span class="capacity">
              {currentImprisoned}/{settlement.justiceCapacity}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .arrest-dissidents-resolution {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 16px;
    margin: 12px 0;
  }

  .header {
    margin-bottom: 16px;
    
    h4 {
      margin: 0 0 8px 0;
      font-size: var(--font-md);
      font-weight: 600;
      font-family: var(--base-font);
      color: var(--text-primary, #e0e0e0);
    }
  }

  .totals {
    display: flex;
    gap: 16px;
    font-size: var(--font-md);
  }

  .total-item {
    display: flex;
    gap: 6px;
    
    .label {
      color: var(--text-secondary, #a0a0a0);
    }
    
    .value {
      font-weight: 600;
      color: var(--color-orange, #f97316);
      
      &.complete {
        color: var(--color-green, #22c55e);
      }
    }
  }

  .no-justice {
    text-align: center;
    padding: 20px;
    color: var(--text-secondary, #a0a0a0);
    
    i {
      font-size: 24px;
      margin-bottom: 8px;
      color: var(--color-orange, #f97316);
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
    }
  }

  .settlements-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .settlement-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    transition: background 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
  }

  .settlement-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    
    .settlement-name {
      font-weight: 500;
      color: var(--text-primary, #e0e0e0);
      font-size: var(--font-md);
    }
    
    .capacity {
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
      font-family: monospace;
    }
  }

  .allocation-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .allocated-badge {
    font-size: var(--font-md);
    font-weight: 600;
    color: var(--color-green, #22c55e);
    padding: 2px 6px;
    background: rgba(34, 197, 94, 0.2);
    border-radius: 3px;
  }

  .btn-control {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.2));
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary, #e0e0e0);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
      border-color: var(--border-strong, rgba(255, 255, 255, 0.3));
    }
    
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    &.btn-add:not(:disabled) {
      border-color: var(--color-green, #22c55e);
      color: var(--color-green, #22c55e);
      
      &:hover {
        background: rgba(34, 197, 94, 0.2);
      }
    }
    
    i {
      font-size: 12px;
    }
  }
</style>
