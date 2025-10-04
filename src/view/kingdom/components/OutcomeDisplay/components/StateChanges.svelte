<script lang="ts">
  import { formatStateChangeLabel, formatStateChangeValue, getChangeClass } from '../logic/OutcomeDisplayLogic';
  
  export let stateChanges: Record<string, any> | undefined = undefined;
  
  $: hasStateChanges = stateChanges && Object.keys(stateChanges).length > 0;
</script>

{#if hasStateChanges && stateChanges}
  <div class="state-changes">
    <div class="state-changes-list">
      {#each Object.entries(stateChanges) as [key, change]}
        <div class="state-change-item">
          <span class="change-label">{formatStateChangeLabel(key)}:</span>
          <span class="change-value {getChangeClass(change, key)}">
            {formatStateChangeValue(change)}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .state-changes {
    margin-top: 0;
  }
  
  .state-changes-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
  }
  
  .state-change-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    font-size: var(--font-md);
    
    .change-label {
      color: var(--text-secondary);
      font-weight: var(--font-weight-medium);
      font-size: calc(var(--font-md) * 0.95);
    }
    
    .change-value {
      font-weight: var(--font-weight-bold);
      font-family: var(--font-code, monospace);
      font-size: calc(var(--font-md) * 1.1);
      padding: 2px 6px;
      border-radius: 3px;
      
      &.positive {
        color: var(--color-green);
        background: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.2);
      }
      
      &.negative {
        color: var(--color-red);
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
      }
      
      &.neutral {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle);
      }
    }
  }
</style>
