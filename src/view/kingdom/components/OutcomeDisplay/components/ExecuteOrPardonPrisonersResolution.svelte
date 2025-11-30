<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import type { OutcomePreview } from '../../../../../models/OutcomePreview';
  import { 
    updateInstanceResolutionState,
    getInstanceResolutionState 
  } from '../../../../../controllers/shared/ResolutionStateHelpers';
  import { structuresService } from '../../../../../services/structures';
  import { getValidationContext } from '../context/ValidationContext';

  // Props
  export let instance: OutcomePreview | null = null;
  export let outcome: string;
  export let modifiers: any[] | undefined = undefined;
  export let stateChanges: Record<string, any> | undefined = undefined;

  const dispatch = createEventDispatcher();
  
  // ✨ NEW: Register with validation context
  const validationContext = getValidationContext();
  const providerId = 'execute-or-pardon-prisoners-resolution';

  // Get resolution state from instance
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedSettlementId = resolutionState.customComponentData?.selectedSettlementId || '';

  // Check if resolution is complete
  $: isResolved = !!selectedSettlementId;
  
  // ✨ NEW: Register validation on mount
  onMount(() => {
    if (validationContext) {
      validationContext.register(providerId, {
        id: providerId,
        needsResolution: true,  // Always needs settlement selection
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

  // Get settlements with imprisoned unrest, sorted by imprisoned unrest descending
  $: settlementsWithPrisoners = ($kingdomData?.settlements || [])
    .map(settlement => {
      const imprisonedUnrest = settlement.imprisonedUnrest || 0;
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      return { ...settlement, imprisonedUnrest, capacity };
    })
    .filter(s => s.imprisonedUnrest > 0 && s.capacity > 0)
    .sort((a, b) => {
      // Sort by imprisoned unrest descending
      if (b.imprisonedUnrest !== a.imprisonedUnrest) {
        return b.imprisonedUnrest - a.imprisonedUnrest;
      }
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

  function formatOptionText(settlement: any): string {
    const nameWidth = 20;
    const name = settlement.name.padEnd(nameWidth);
    const prisoners = `${settlement.imprisonedUnrest} imprisoned`;
    const capacity = `(${settlement.capacity} capacity)`;
    return `${name} ${prisoners} ${capacity}`;
  }

  function getOutcomeDescription(): string {
    if (outcome === 'criticalSuccess') {
      return 'Release or execute all imprisoned unrest in the selected settlement and reduce kingdom unrest by 1';
    } else if (outcome === 'success') {
      return 'Release or execute 1d4 imprisoned unrest from the selected settlement';
    }
    return '';
  }

  async function handleSettlementChange(event: Event) {
    if (!instance) return;

    const target = event.target as HTMLSelectElement;
    const settlementId = target.value;

    // Only update if a valid settlement is selected (not the default empty option)
    if (!settlementId || settlementId === '') {
      return;
    }

    // Update instance resolution state
    await updateInstanceResolutionState(instance.previewId, {
      customComponentData: { selectedSettlementId: settlementId }
    });

    // Emit selection event
    dispatch('selection', { selectedSettlementId: settlementId });
  }
</script>

<div class="execute-pardon-resolution">
  <div class="header">
    <h4>Execute or Pardon Prisoners</h4>
    <div class="outcome-badge" class:critical={outcome === 'criticalSuccess'}>
      <i class="fas fa-gavel"></i>
      <span>{outcome === 'criticalSuccess' ? 'Critical Success' : 'Success'}</span>
    </div>
  </div>

  <div class="guidance">
    <i class="fas fa-info-circle"></i>
    <p>{getOutcomeDescription()}</p>
  </div>

  <div class="settlement-selection">
    <label for="settlement-select">Select Settlement:</label>
    <select 
      id="settlement-select"
      class="settlement-dropdown"
      bind:value={selectedSettlementId}
      on:change={handleSettlementChange}
    >
      <option value="" disabled>Choose settlement with prisoners...</option>
      {#each settlementsWithPrisoners as settlement}
        <option value={settlement.id}>
          {formatOptionText(settlement)}
        </option>
      {/each}
    </select>
  </div>

  {#if settlementsWithPrisoners.length === 0}
    <div class="warning">
      <i class="fas fa-exclamation-triangle"></i>
      <p>No settlements with imprisoned unrest found. Use Arrest Dissidents first to imprison unrest.</p>
    </div>
  {/if}
</div>

<style lang="scss">
  .execute-pardon-resolution {
    background: var(--overlay-low);
    border-radius: var(--radius-lg);
    padding: var(--space-16);
    margin: var(--space-12) 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-12);
    
    h4 {
      margin: 0;
      font-size: var(--font-md);
      font-weight: 600;
      color: var(--text-primary, #e0e0e0);
    }
  }

  .outcome-badge {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-10);
    background: var(--surface-success);
    border: 1px solid var(--color-green, #22c55e);
    border-radius: var(--radius-md);
    font-size: var(--font-sm);
    color: var(--color-green, #22c55e);
    
    &.critical {
      background: rgba(250, 204, 21, 0.15);
      border-color: var(--color-amber, #fbbf24);
      color: var(--color-amber, #fbbf24);
    }
    
    i {
      font-size: var(--font-xs);
    }
  }

  .guidance {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
    margin-bottom: var(--space-12);
    padding: var(--space-10);
    background: rgba(139, 92, 246, 0.1);
    border-left: 3px solid var(--color-purple, #8b5cf6);
    border-radius: var(--radius-md);
    
    i {
      color: var(--color-purple, #8b5cf6);
      margin-top: var(--space-2);
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
    }
  }

  .settlement-selection {
    margin-bottom: var(--space-12);
    
    label {
      display: block;
      margin-bottom: var(--space-6);
      font-size: var(--font-md);
      font-weight: 500;
      color: var(--text-secondary, #a0a0a0);
    }
  }

  .settlement-dropdown {
    width: 100%;
    padding: var(--space-10) var(--space-12);
    font-size: var(--font-md);
    font-family: 'Courier New', monospace;
    background: var(--hover-low);
    border: 1px solid var(--border-strong, var(--border-default));
    border-radius: var(--radius-md);
    color: var(--text-primary, #e0e0e0);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--border-strong, var(--border-medium));
    }
    
    &:focus {
      outline: none;
      border-color: var(--color-purple, #8b5cf6);
      background: var(--hover);
    }
    
    option {
      background: var(--color-gray-900, #1f1f23);
      padding: var(--space-8);
    }
  }

  .warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
    padding: var(--space-10);
    background: rgba(249, 115, 22, 0.1);
    border-left: 3px solid var(--color-orange, #f97316);
    border-radius: var(--radius-md);
    
    i {
      color: var(--color-orange, #f97316);
      margin-top: var(--space-2);
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
    }
  }
</style>
