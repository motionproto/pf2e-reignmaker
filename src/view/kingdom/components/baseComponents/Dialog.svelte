<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let show: boolean = false;
  export let title: string = '';
  export let confirmLabel: string = 'Confirm';
  export let cancelLabel: string = 'Cancel';
  export let showConfirm: boolean = true;
  export let showCancel: boolean = true;
  export let confirmDisabled: boolean = false;
  export let width: string = '500px';
  
  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
    close: void;
  }>();
  
  function handleConfirm() {
    if (!confirmDisabled) {
      dispatch('confirm');
    }
  }
  
  function handleCancel() {
    dispatch('cancel');
    dispatch('close');
    show = false;
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (!show) return;
    
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter' && !confirmDisabled) {
      handleConfirm();
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
    <div class="dialog" style="max-width: {width};">
      <div class="dialog-content">
        {#if title}
          <div class="dialog-header">
            <h3 class="dialog-title">{title}</h3>
            <button class="dialog-close" on:click={handleCancel} aria-label="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
        {/if}
        
        <div class="dialog-body">
          <slot />
        </div>
        
        {#if showConfirm || showCancel}
          <div class="dialog-footer">
            {#if showCancel}
              <button 
                class="dialog-button dialog-button-secondary" 
                on:click={handleCancel}
              >
                {cancelLabel}
              </button>
            {/if}
            {#if showConfirm}
              <button 
                class="dialog-button dialog-button-primary" 
                on:click={handleConfirm}
                disabled={confirmDisabled}
                autofocus
              >
                {confirmLabel}
              </button>
            {/if}
          </div>
        {/if}
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
    background: var(--color-gray-900, #1f1f23);
    border: 2px solid var(--border-highlight, #4a4a4d);
    border-radius: var(--radius-lg, 8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    width: 90%;
    animation: dialogSlideIn 0.2s ease-out;
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
    padding: 1rem;
    border-bottom: 1px solid var(--border-light, #3a3a3d);
    background: var(--color-gray-950, #18181b);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .dialog-title {
    margin: 0;
    font-size: 1.2rem;
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary, #ffffff);
  }
  
  .dialog-close {
    background: none;
    border: none;
    color: var(--text-secondary, #b0b0b3);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm, 4px);
    transition: all 0.2s ease;
  }
  
  .dialog-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary, #ffffff);
  }
  
  .dialog-body {
    padding: 1.5rem 1rem;
  }
  
  .dialog-footer {
    padding: 1rem;
    border-top: 1px solid var(--border-light, #3a3a3d);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  
  .dialog-button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-default, #3a3a3d);
    border-radius: var(--radius-sm, 4px);
    font-size: 0.9rem;
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;
  }
  
  .dialog-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .dialog-button-primary {
    background: var(--color-amber, #fbbf24);
    color: var(--color-gray-950, #18181b);
    border-color: var(--color-amber, #fbbf24);
  }
  
  .dialog-button-primary:hover:not(:disabled) {
    background: var(--color-amber-dark, #f59e0b);
    border-color: var(--color-amber-dark, #f59e0b);
  }
  
  .dialog-button-primary:focus {
    outline: 2px solid var(--color-amber, #fbbf24);
    outline-offset: 2px;
  }
  
  .dialog-button-secondary {
    background: var(--color-gray-800, #27272a);
    color: var(--text-secondary, #b0b0b3);
    border-color: var(--border-default, #3a3a3d);
  }
  
  .dialog-button-secondary:hover {
    background: var(--color-gray-700, #3a3a3d);
  }
</style>
