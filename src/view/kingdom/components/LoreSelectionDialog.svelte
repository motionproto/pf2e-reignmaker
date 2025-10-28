<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Notification from './baseComponents/Notification.svelte';
  
  export let show: boolean = false;
  export let loreItems: any[] = [];
  
  const dispatch = createEventDispatcher<{
    select: { loreItem: any };
    cancel: void;
  }>();
  
  let selectedSlug: string = '';
  
  // Auto-select first item when dialog opens
  $: if (show && loreItems.length > 0 && !selectedSlug) {
    selectedSlug = loreItems[0].slug;
  }
  
  function handleSelect() {
    const selectedItem = loreItems.find(item => item.slug === selectedSlug);
    if (selectedItem) {
      dispatch('select', { loreItem: selectedItem });
      show = false;
      selectedSlug = '';
    }
  }
  
  function handleCancel() {
    dispatch('cancel');
    show = false;
    selectedSlug = '';
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (!show) return;
    
    if (event.key === 'Enter') {
      handleSelect();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="dialog-backdrop" on:click={handleBackdropClick}>
    <div class="dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3 class="dialog-title">Select Applicable Lore Skill</h3>
        </div>
        <div class="dialog-body">
          <label for="lore-selection" class="dialog-label">
            Choose which Lore skill to use:
          </label>
          <select 
            id="lore-selection" 
            bind:value={selectedSlug}
            class="lore-select"
            autofocus
          >
            {#each loreItems as item}
              <option value={item.slug}>{item.name}</option>
            {/each}
          </select>
          <div class="notification-wrapper">
            <Notification
              variant="info"
              title="GM Approval"
              description="The GM will determine if your chosen Lore is applicable to this action."
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button 
            class="dialog-button dialog-button-outline" 
            on:click={handleCancel}
          >
            <i class="fas fa-times"></i>
            Cancel
          </button>
          <button 
            class="dialog-button dialog-button-secondary" 
            on:click={handleSelect}
          >
            <i class="fas fa-dice-d20"></i>
            Roll
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .dialog {
    background: var(--color-gray-900);
    border: 2px solid var(--border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-overlay);
    max-width: 450px;
    width: 90%;
    animation: dialogSlideIn var(--transition-fast) ease-out;
  }
  
  @keyframes dialogSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .dialog-content {
    padding: 0;
  }
  
  .dialog-header {
    padding: var(--space-8);
    border-bottom: 1px solid var(--border-default);
    background: var(--color-gray-950);
  }
  
  .dialog-title {
    margin: 0;
    font-size: var(--font-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
  
  .dialog-body {
    padding: var(--space-12) var(--space-8);
  }
  
  .dialog-label {
    display: block;
    margin-bottom: var(--space-6);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
  }
  
  .lore-select {
    width: 100%;
    padding: var(--space-6);
    background: var(--color-gray-800);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-family: var(--font-sans-rm);
    cursor: pointer;
    transition: all var(--transition-base);
    line-height: var(--line-height-relaxed);
    min-height: 44px;
  }
  
  .lore-select:hover {
    border-color: var(--border-highlight);
  }
  
  .lore-select:focus {
    outline: 2px solid var(--color-amber);
    outline-offset: 2px;
    border-color: var(--color-amber);
  }
  
  .lore-select option {
    background: var(--color-gray-800);
    color: var(--text-primary);
  }
  
  .notification-wrapper {
    margin-top: var(--space-8);
  }
  
  .dialog-footer {
    padding: var(--space-8);
    border-top: 1px solid var(--border-default);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-4);
  }
  
  .dialog-button {
    padding: var(--space-4) var(--space-8);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-base);
    min-width: 90px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
  }
  
  .dialog-button i {
    font-size: var(--font-xs);
  }
  
  .dialog-button-primary {
    background: var(--color-amber);
    color: var(--color-gray-950);
    border-color: var(--color-amber);
  }
  
  .dialog-button-primary:hover {
    background: var(--color-amber-light);
    border-color: var(--color-amber-light);
  }
  
  .dialog-button-primary:focus {
    outline: 2px solid var(--color-amber);
    outline-offset: 2px;
  }
  
  .dialog-button-secondary {
    background: var(--color-gray-800);
    color: var(--text-secondary);
    border-color: var(--border-default);
  }
  
  .dialog-button-secondary:hover {
    background: var(--color-gray-700);
  }
  
  .dialog-button-outline {
    background: transparent;
    color: var(--text-secondary);
    border-color: var(--border-default);
  }
  
  .dialog-button-outline:hover {
    background: var(--color-gray-800);
    border-color: var(--border-highlight);
  }
</style>
