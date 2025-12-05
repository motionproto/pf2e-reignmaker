<script lang="ts">
  import type { Settlement } from '../../../../../models/Settlement';
  
  export let settlements: Settlement[];
  export let selectedSettlementId: string;
  export let demandedSettlementIds: Set<string> = new Set();
  
  function hasDemand(settlementId: string): boolean {
    return demandedSettlementIds.has(settlementId);
  }
</script>

<div class="settlement-selector">
  <label for="settlement-select">Settlement:</label>
  <select 
    id="settlement-select"
    bind:value={selectedSettlementId}
  >
    {#each settlements as settlement}
      <option value={settlement.id}>
        {settlement.name} ({settlement.tier}){hasDemand(settlement.id) ? ' ⚠️' : ''}
      </option>
    {/each}
  </select>
</div>

<style lang="scss">
  /* Horizontal layout with label on left, dropdown on right */
  .settlement-selector {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-8);
  }
  
  label {
    margin-bottom: 0;
    font-size: var(--font-md);
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  
  select {
    padding: var(--space-2) var(--space-16);
    min-height: 2rem;
    background: var(--surface-high);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-sans-rm);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    cursor: pointer;
    transition: all var(--transition-fast);
    
    &:hover:not(:disabled) {
      background: var(--surface-higher);
      border-color: var(--border-strong);
      transform: translateY(-0.0625rem);
      box-shadow: var(--shadow-md);
    }
    
    &:focus {
      outline: none;
      border-color: var(--border-strong);
      box-shadow: 0 0 0 3px hsla(240, 5%, 38%, 0.2);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
</style>
