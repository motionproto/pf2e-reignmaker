<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import { structuresService } from '../../../../../services/structures';
  import type { ActiveCheckInstance } from '../../../../../models/CheckInstance';

  // Props (automatically passed by OutcomeDisplay)
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;

  const dispatch = createEventDispatcher();

  // Determine how much unrest can be imprisoned based on outcome
  $: maxUnrestToImprison = outcome === 'criticalSuccess' ? 8 : 4;

  // Local state (not persisted until Apply clicked)
  let selectedSettlementId = '';
  let amount = 0;

  // Get current unrest
  $: currentUnrest = $kingdomData?.unrest || 0;

  // Get settlements with justice structures
  $: settlementsWithJustice = ($kingdomData?.settlements || [])
    .map(settlement => {
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      const currentImprisoned = settlement.imprisonedUnrest || 0;
      const availableSpace = capacity - currentImprisoned;
      return {
        ...settlement,
        justiceCapacity: capacity,
        availableSpace
      };
    })
    .filter(s => s.justiceCapacity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Get selected settlement (provide default if auto-select hasn't completed)
  $: selectedSettlement = settlementsWithJustice.find(s => s.id === selectedSettlementId) || 
    (settlementsWithJustice.length > 0 ? settlementsWithJustice[0] : null);
  
  // Get current imprisoned and capacity for display
  $: currentImprisoned = selectedSettlement?.imprisonedUnrest || 0;
  $: maxCapacity = selectedSettlement?.justiceCapacity || 0;
  
  // Calculate max amount user can ADD (outcome limit, available unrest, available space)
  $: maxToAdd = selectedSettlement 
    ? Math.min(maxUnrestToImprison, currentUnrest, selectedSettlement.availableSpace)
    : 0;

  // Auto-select first settlement
  $: if (settlementsWithJustice.length > 0 && !selectedSettlementId) {
    selectedSettlementId = settlementsWithJustice[0].id;
    emitSelection();
  }

  function handleSettlementChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedSettlementId = target.value;
    amount = 0;  // Reset amount when changing settlement
    emitSelection();
  }

  function incrementAmount() {
    if (amount < maxToAdd) {
      amount = Math.min(amount + 1, maxToAdd);
      emitSelection();
    }
  }

  function decrementAmount() {
    if (amount > 0) {
      amount = Math.max(amount - 1, 0);
      emitSelection();
    }
  }

  function emitSelection() {
    // Build allocations object (single settlement)
    const allocations = amount > 0 && selectedSettlementId 
      ? { [selectedSettlementId]: amount }
      : {};

    // Build modifiers array for OutcomeDisplay
    const modifiers = [];
    if (amount > 0) {
      // Decrease regular unrest
      modifiers.push({
        type: 'static',
        resource: 'unrest',
        value: -amount,
        duration: 'immediate'
      });

      // Increase imprisoned unrest
      modifiers.push({
        type: 'static',
        resource: 'imprisoned',
        value: amount,
        duration: 'immediate'
      });
    }

    // ✅ Dispatch 'resolution' event per OutcomeDisplay.md pattern
    dispatch('resolution', {
      isResolved: amount > 0,     // Resolved when amount selected
      metadata: { allocations },  // Used by execute function
      modifiers                   // Resource changes for preview
    });
  }
</script>

<div class="arrest-dissidents-resolution">
  <div class="header">
    <h4>Imprison Dissidents</h4>
    <div class="info-row">
      <div class="info-item">
        <span class="label">Current Unrest:</span>
        <span class="value">{currentUnrest}</span>
      </div>
      <div class="info-item">
        <span class="label">Can Imprison:</span>
        <span class="value highlight">Up to {maxUnrestToImprison}</span>
      </div>
    </div>
  </div>

  {#if settlementsWithJustice.length === 0}
    <div class="no-justice">
      <i class="fas fa-exclamation-triangle"></i>
      <p>No settlements with justice structures (Stocks, Jail, Prison, or Donjon) available.</p>
    </div>
  {:else}
    <div class="two-column-layout">
      <div class="form-field">
        <label for="settlement-select">Select Prison:</label>
        <select 
          id="settlement-select"
          class="settlement-select"
          value={selectedSettlementId}
          on:change={handleSettlementChange}
        >
          {#each settlementsWithJustice as settlement}
            {@const currentImprisoned = settlement.imprisonedUnrest || 0}
            <option value={settlement.id}>
              {settlement.name} (imprisoned: {currentImprisoned}/{settlement.justiceCapacity}, space: {settlement.availableSpace})
            </option>
          {/each}
        </select>
      </div>

      <div class="form-field">
        <label>Imprisoned Unrest:</label>
        <div class="amount-controls">
          <div class="amount-display">
            <span class="amount-value">{currentImprisoned + amount}</span>
            <span class="amount-max">/ {maxCapacity}</span>
          </div>
          
          <button
            class="btn-control"
            disabled={amount <= 0}
            on:click={decrementAmount}
            title="Decrease by 1"
          >
            <i class="fas fa-minus"></i>
          </button>
          
          <button
            class="btn-control btn-add"
            disabled={amount >= maxToAdd}
            on:click={incrementAmount}
            title="Increase by 1"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
        {#if maxToAdd > 0}
          <div class="add-info">
            Can add up to {maxToAdd} more
          </div>
        {/if}
      </div>
    </div>

    {#if selectedSettlement}
      <div class="help-text">
        Outcome allows {maxUnrestToImprison} imprisoned. Current unrest: {currentUnrest}. Available space: {selectedSettlement.availableSpace}
      </div>
    {/if}

    {#if amount > 0 && selectedSettlement}
      <div class="preview">
        <i class="fas fa-info-circle"></i>
        <span>
          Will imprison <strong>{amount}</strong> unrest in <strong>{selectedSettlement.name}</strong>
        </span>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .arrest-dissidents-resolution {
    background: var(--overlay-low);
    border-radius: var(--radius-lg);
    padding: var(--space-16);
    margin: var(--space-12) 0;
  }

  .header {
    margin-bottom: var(--space-16);
    
    h4 {
      margin: 0 0 var(--space-8) 0;
      font-size: var(--font-md);
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .info-row {
    display: flex;
    gap: var(--space-16);
    font-size: var(--font-md);
  }

  .info-item {
    display: flex;
    gap: var(--space-6);
    
    .label {
      color: var(--text-secondary);
    }
    
    .value {
      font-weight: 600;
      color: var(--text-primary);
      
      &.highlight {
        color: var(--color-orange);
      }
    }
  }

  .no-justice {
    text-align: center;
    padding: var(--space-20);
    color: var(--text-secondary);
    
    i {
      font-size: var(--font-2xl);
      margin-bottom: var(--space-8);
      color: var(--color-orange);
    }
    
    p {
      margin: 0;
      font-size: var(--font-md);
    }
  }

  .two-column-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-16);
    margin-bottom: var(--space-12);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    
    label {
      font-size: var(--font-md);
      font-weight: 500;
      color: var(--text-primary);
    }
  }

  .settlement-select {
    padding: var(--space-8) var(--space-12);
    background: var(--surface-low);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    cursor: pointer;
    
    &:hover {
      background: var(--hover-low);
    }
    
    &:focus {
      outline: none;
      border-color: var(--color-blue);
    }
  }

  .amount-controls {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  .amount-display {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
    min-width: 5rem;
    justify-content: center;
    
    .amount-value {
      font-size: var(--font-lg);
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .amount-max {
      font-size: var(--font-md);
      color: var(--text-secondary);
    }
  }

  .btn-control {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-strong, var(--border-default));
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      background: var(--hover-high);
      border-color: var(--border-strong, var(--border-medium));
    }
    
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    &.btn-add:not(:disabled) {
      border-color: var(--color-green);
      color: var(--color-green);
      
      &:hover {
        background: var(--surface-success-high);
      }
    }
    
    i {
      font-size: var(--font-xs);
    }
  }

  .add-info {
    font-size: var(--font-sm);
    color: var(--text-secondary);
    margin-top: var(--space-2);
  }

  .help-text {
    font-size: var(--font-sm);
    color: var(--text-tertiary);
    font-style: italic;
  }

  .preview {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-12);
    background: var(--surface-success-low);
    border: 1px solid var(--color-green);
    border-radius: var(--radius-md);
    font-size: var(--font-md);
    color: var(--text-primary);
    
    i {
      color: var(--color-green);
    }
    
    strong {
      color: var(--color-green);
    }
  }
</style>
