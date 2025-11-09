<script lang="ts">
  export let type: 'no-settlements' | 'no-structures' | 'no-category' | 'select-category' = 'select-category';
</script>

{#if type === 'no-settlements'}
  <div class="empty-state">
    <i class="fas fa-city"></i>
    <p>No settlements available</p>
    <p class="hint">Establish a settlement first to build structures</p>
  </div>
{:else if type === 'no-structures'}
  <div class="empty-state">
    <i class="fas fa-exclamation-circle"></i>
    <p>No structures available</p>
    <p class="hint">This settlement may have reached capacity or doesn't meet tier requirements</p>
  </div>
{:else if type === 'no-category'}
  <div class="empty-state">
    <i class="fas fa-building"></i>
    <p>No structures available in this category</p>
  </div>
{:else if type === 'select-category'}
  <div class="empty-state">
    <i class="fas fa-hand-pointer"></i>
    <p>Select a category to view structures</p>
  </div>
{/if}

<style lang="scss">
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--text-tertiary);
    padding: var(--space-24) var(--space-16);
    
    i {
      font-size: var(--font-6xl);
      margin-bottom: var(--space-16);
      opacity: 0.3;
      color: var(--text-secondary);
    }
    
    p {
      margin: 0 0 var(--space-8) 0;
      font-size: var(--font-md);
      
      &.hint {
        font-size: var(--font-sm);
        color: var(--text-tertiary);
      }
    }
  }
</style>
