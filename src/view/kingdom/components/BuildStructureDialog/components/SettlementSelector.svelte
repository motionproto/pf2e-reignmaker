<script lang="ts">
  import type { Settlement } from '../../../../../models/Settlement';
  
  export let settlements: Settlement[];
  export let selectedSettlementId: string;
</script>

<div class="settlement-selector">
  <label for="settlement-select">Settlement:</label>
  <select 
    id="settlement-select"
    bind:value={selectedSettlementId}
    class="settlement-dropdown"
  >
    {#each settlements as settlement}
      <option value={settlement.id}>
        {settlement.name} (Tier {settlement.tier})
      </option>
    {/each}
  </select>
</div>

<style lang="scss">
  .settlement-selector {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    
    label {
      color: var(--text-secondary);
      font-size: var(--font-md);
      white-space: nowrap;
    }
    
    .settlement-dropdown {
      padding: var(--space-6) var(--space-12);
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: var(--font-md);
      cursor: pointer;
      min-width: 12.5000rem;
      
      &:hover {
        border-color: var(--border-strong);
        background: rgba(0, 0, 0, 0.5);
      }
      
      &:focus {
        outline: none;
        border-color: var(--color-amber);
        box-shadow: 0 0 0 0.1250rem rgba(251, 191, 36, 0.2);
      }
    }
  }
</style>
