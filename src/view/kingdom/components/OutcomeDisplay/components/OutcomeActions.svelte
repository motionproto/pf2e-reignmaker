<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '../../baseComponents/Button.svelte';
  
  export let showCancelButton: boolean = false;
  export let showFameRerollButton: boolean = false;
  export let showPrimaryButton: boolean = true;  // New prop to control visibility
  export let effectivePrimaryLabel: string = '';
  export let primaryButtonDisabled: boolean = false;
  export let currentFame: number = 0;
  export let applied: boolean = false;  // New prop to show "Applied" confirmation
  
  const dispatch = createEventDispatcher();
  
  $: showAnyButton = showCancelButton || showFameRerollButton || showPrimaryButton;
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  function handleReroll() {
    dispatch('reroll');
  }
  
  function handlePrimary() {
    dispatch('primary');
  }
</script>

{#if showAnyButton}
  <div class="resolution-actions">
    {#if showCancelButton}
      <Button
        variant="outline"
        on:click={handleCancel}
        icon="fas fa-times"
        iconPosition="left"
      >
        Cancel
      </Button>
    {/if}
    <div class="resolution-actions-main">
      {#if showFameRerollButton}
        <Button
          variant="secondary"
          disabled={currentFame === 0}
          on:click={handleReroll}
          icon="fas fa-star"
          iconPosition="left"
        >
          Reroll with Fame
          <span class="fame-count">({currentFame} left)</span>
        </Button>
      {/if}
      {#if showPrimaryButton && effectivePrimaryLabel}
        <Button
          variant="secondary"
          disabled={primaryButtonDisabled}
          on:click={handlePrimary}
          icon={effectivePrimaryLabel === '✓ Applied' ? 'fas fa-check-circle' : 'fas fa-check'}
          iconPosition="left"
        >
          {effectivePrimaryLabel}
        </Button>
      {/if}
    </div>
  </div>
{:else if applied}
  <div class="resolution-applied">
    <i class="fas fa-check-circle"></i>
    <span>Results Applied</span>
  </div>
{/if}

<style lang="scss">
  .resolution-actions {
    display: flex;
    justify-content: space-between;
    gap: var(--space-12);
    padding: var(--space-16);
    border-top: 1px solid var(--border-faint);
    
    // Cancel button stays on the left
    > :global(.button.outline) {
      flex: 0 0 auto;
      margin-right: auto;
      opacity: 0.7;
      
      &:hover {
        opacity: 1;
      }
    }
    
    // Main action buttons group on the right
    .resolution-actions-main {
      display: flex;
      gap: var(--space-12);
      flex: 1;
      justify-content: flex-end;
      
      // Main buttons can expand to equal width
      :global(.button) {
        flex: 0 1 auto;
        min-width: 7.5rem;
      }
    }
  }
  
  .resolution-applied {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-16);
    border-top: 1px solid var(--border-faint);
    background: linear-gradient(135deg,
      rgba(34, 197, 94, 0.1),
      rgba(34, 197, 94, 0.05));
    
    i {
      color: var(--color-green);
      font-size: var(--font-xl);
    }
    
    span {
      color: var(--color-green-light);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
    }
  }
</style>
