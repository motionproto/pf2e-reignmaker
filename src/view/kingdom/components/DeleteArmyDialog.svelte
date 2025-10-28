<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from './baseComponents/Dialog.svelte';
  import Notification from './baseComponents/Notification.svelte';
  
  export let show: boolean = false;
  export let actorName: string = '';
  export let armyLevel: number = 0;
  export let isSupported: boolean = false;
  export let supportedBySettlement: string = '';
  
  $: armyDescription = `Level ${armyLevel} ${actorName}${isSupported && supportedBySettlement ? `, supported by ${supportedBySettlement}` : ', unsupported'}`;
  
  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();
  
  function handleConfirm() {
    dispatch('confirm');
    show = false;
  }
  
  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
</script>

<Dialog 
  bind:show 
  title="Delete Army Actor?" 
  confirmLabel="Delete Anyway"
  cancelLabel="Cancel"
  width="600px"
  on:confirm={handleConfirm}
  on:cancel={handleCancel}
>
  <div class="delete-army-content">
    <Notification
      variant="warning"
      title="This is a Reignmaker Army"
      description={armyDescription}
    />
    
    <div class="consequences-section">
      <h4>If you delete anyway:</h4>
      <ul>
        <li>Actor will be permanently deleted</li>
        <li>Army will be removed from kingdom records</li>
        <li>Settlement support slots will be freed</li>
      </ul>
    </div>
  </div>
</Dialog>

<style>
  .delete-army-content {
    color: var(--text-primary, #ffffff);
    font-family: var(--font-sans-rm);
  }
  
  .delete-army-content :global(.notification-rm) {
    margin-bottom: 1.5rem;
  }
  
  .delete-army-content :global(.notification-rm-description) {
    font-size: var(--font-xl);
    color: var(--text-primary);
  }
  
  .consequences-section {
    margin-bottom: 1rem;
  }
  
  .consequences-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: var(--font-lg);
    font-family: var(--font-sans-rm);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary, #ffffff);
  }
  
  .consequences-section ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary, #b0b0b3);
    font-size: var(--font-md);
    line-height: 1.6;
  }
  
  .consequences-section li {
    margin-bottom: 0.25rem;
  }
</style>
