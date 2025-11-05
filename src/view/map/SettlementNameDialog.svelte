<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from '../kingdom/components/baseComponents/Dialog.svelte';
  
  export let show = false;
  export let settlementName = '';
  
  const dispatch = createEventDispatcher<{
    confirm: string;
    cancel: void;
  }>();
  
  let inputElement: HTMLInputElement;
  
  function handleConfirm() {
    if (settlementName.trim()) {
      dispatch('confirm', settlementName.trim());
      show = false;
    }
  }
  
  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
  
  // Auto-focus input when dialog opens
  $: if (show && inputElement) {
    setTimeout(() => inputElement?.focus(), 100);
  }
</script>

<Dialog
  bind:show
  title="Place Settlement"
  confirmLabel="Place"
  cancelLabel="Cancel"
  confirmDisabled={!settlementName.trim()}
  width="400px"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
>
  <div class="settlement-name-dialog">
    <label for="settlement-name">Settlement Name:</label>
    <input
      id="settlement-name"
      type="text"
      bind:value={settlementName}
      bind:this={inputElement}
      on:keydown={(e) => e.key === 'Enter' && handleConfirm()}
    />
  </div>
</Dialog>

<style>
  .settlement-name-dialog {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-base);
  }
  
  input {
    padding: 0.5rem 0.75rem;
    background: var(--bg-base);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-base);
    transition: all var(--transition-base);
  }
  
  input:focus {
    outline: none;
    border-color: var(--border-strong);
    background: var(--bg-elevated);
  }
  
  input::placeholder {
    color: var(--text-tertiary);
  }
</style>
