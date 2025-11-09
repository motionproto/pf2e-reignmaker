<script lang="ts">
  import Dialog from './baseComponents/Dialog.svelte';
  import { settlementNameDialog } from '../../../stores/SettlementNameDialogStore';
  
  let show = false;
  let hexId = '';
  let settlementName = '';
  let inputElement: HTMLInputElement;
  
  // Subscribe to store
  settlementNameDialog.subscribe(state => {
    show = state.show;
    hexId = state.hexId || '';
    if (state.show) {
      settlementName = ''; // Reset on open
    }
  });
  
  function handleConfirm() {
    if (settlementName.trim()) {
      settlementNameDialog.confirm(settlementName.trim());
    }
  }
  
  function handleCancel() {
    settlementNameDialog.cancel();
  }
  
  // Auto-focus input when dialog opens
  $: if (show && inputElement) {
    setTimeout(() => inputElement?.focus(), 100);
  }
</script>

<Dialog
  bind:show
  title="Name Your New Village"
  confirmLabel="Create Settlement"
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
      placeholder="Enter settlement name..."
    />
  </div>
</Dialog>

<style>
  .settlement-name-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-base);
  }
  
  input {
    padding: var(--space-8) var(--space-12);
    background: var(--empty);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-base);
    transition: all var(--transition-base);
  }
  
  input:focus {
    outline: none;
    border-color: var(--border-strong);
    background: var(--surface-lower);
  }
  
  input::placeholder {
    color: var(--text-tertiary);
  }
</style>
