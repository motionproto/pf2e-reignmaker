<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '../../baseComponents/Button.svelte';
  
  export let showCancelButton: boolean = false;
  export let showFameRerollButton: boolean = false;
  export let effectivePrimaryLabel: string = '';
  export let primaryButtonDisabled: boolean = false;
  export let currentFame: number = 0;
  
  const dispatch = createEventDispatcher();
  
  $: showAnyButton = showCancelButton || showFameRerollButton || effectivePrimaryLabel;
  
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
      {#if effectivePrimaryLabel}
        <Button
          variant="secondary"
          disabled={primaryButtonDisabled}
          on:click={handlePrimary}
          icon="fas fa-check"
          iconPosition="left"
        >
          {effectivePrimaryLabel}
        </Button>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .resolution-actions {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid var(--border-subtle);
    
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
      gap: 12px;
      flex: 1;
      justify-content: flex-end;
      
      // Main buttons can expand to equal width
      :global(.button) {
        flex: 0 1 auto;
        min-width: 120px;
      }
    }
  }
</style>
