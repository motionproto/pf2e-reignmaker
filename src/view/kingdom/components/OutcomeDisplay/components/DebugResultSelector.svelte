<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let currentOutcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  
  const dispatch = createEventDispatcher();
  
  type OutcomeOption = {
    value: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    label: string;
    icon: string;
  };
  
  const outcomes: OutcomeOption[] = [
    { value: 'criticalSuccess', label: 'Crit Success', icon: 'fas fa-star' },
    { value: 'success', label: 'Success', icon: 'fas fa-check' },
    { value: 'failure', label: 'Failure', icon: 'fas fa-times' },
    { value: 'criticalFailure', label: 'Crit Failure', icon: 'fas fa-skull' }
  ];
  
  function selectOutcome(outcome: OutcomeOption['value']) {
    dispatch('outcomeSelected', { outcome });
  }
</script>

<div class="debug-result-selector">
  <div class="debug-label">
    <i class="fas fa-bug"></i>
    <span>DEBUG RESULT</span>
  </div>
  
  <div class="outcome-buttons">
    {#each outcomes as outcome}
      <button
        class="outcome-btn {outcome.value}"
        class:active={currentOutcome === outcome.value}
        on:click={() => selectOutcome(outcome.value)}
      >
        <i class="{outcome.icon}"></i>
        <span>{outcome.label}</span>
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .debug-result-selector {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    padding: var(--space-10) var(--space-12);
    background: rgba(139, 92, 246, 0.1);
    border: 0.0625rem solid rgba(139, 92, 246, 0.3);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-16);
  }
  
  .debug-label {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-8);
    background: rgba(139, 92, 246, 0.2);
    border-radius: var(--radius-sm);
    color: rgba(196, 181, 253, 1);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-xs);
    text-transform: uppercase;
    letter-spacing: 0.05rem;
    white-space: nowrap;
    
    i {
      font-size: var(--font-xs);
    }
  }
  
  .outcome-buttons {
    display: flex;
    gap: var(--space-6);
    flex: 1;
  }
  
  .outcome-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-6) var(--space-10);
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--font-xs);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
    white-space: nowrap;
    
    i {
      font-size: var(--font-xs);
    }
    
    &:hover {
      background: rgba(0, 0, 0, 0.3);
      border-color: var(--border-strong);
    }
    
    &.active {
      border-width: 0.125rem;
      
      &.criticalSuccess {
        background: rgba(34, 197, 94, 0.2);
        border-color: var(--color-green);
        color: var(--color-green-light);
      }
      
      &.success {
        background: rgba(34, 197, 94, 0.15);
        border-color: rgba(34, 197, 94, 0.5);
        color: var(--color-green);
      }
      
      &.failure {
        background: rgba(249, 115, 22, 0.15);
        border-color: rgba(249, 115, 22, 0.5);
        color: var(--color-orange);
      }
      
      &.criticalFailure {
        background: rgba(239, 68, 68, 0.2);
        border-color: var(--color-red);
        color: var(--color-red);
      }
    }
  }
</style>
