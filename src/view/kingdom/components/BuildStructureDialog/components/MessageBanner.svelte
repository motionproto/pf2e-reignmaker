<script lang="ts">
  export let type: 'error' | 'success' | null = null;
  export let message: string = '';
</script>

{#if type && message}
  <div class="{type}-message">
    <i class="fas {type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
    {message}
  </div>
{/if}

<style lang="scss">
  .error-message,
  .success-message {
    padding: var(--space-12);
    border-radius: var(--radius-md);
    margin: var(--space-16);
    display: flex;
    align-items: center;
    gap: var(--space-10);
    
    i {
      font-size: var(--font-xl);
    }
  }
  
  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--border-primary-subtle);
    color: var(--color-red);
  }
  
  .success-message {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid var(--border-success-subtle);
    color: var(--color-green);
  }
</style>
