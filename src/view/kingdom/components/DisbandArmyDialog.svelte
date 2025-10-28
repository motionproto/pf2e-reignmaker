<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from './baseComponents/Dialog.svelte';
  import Notification from './baseComponents/Notification.svelte';
  
  export let show: boolean = false;
  export let armyName: string = '';
  export let armyLevel: number = 0;
  export let hasLinkedActor: boolean = false;
  export let isSupported: boolean = false;
  export let supportedBySettlement: string = '';
  
  $: armyDescription = `Level ${armyLevel} ${armyName}${isSupported && supportedBySettlement ? `, supported by ${supportedBySettlement}` : ', unsupported'}`;
  
  const dispatch = createEventDispatcher<{
    confirm: { deleteActor: boolean };
    cancel: void;
  }>();
  
  let deleteActor = true; // Default to deleting actor
  
  function handleConfirm() {
    dispatch('confirm', { deleteActor });
    show = false;
  }
  
  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
</script>

<Dialog 
  bind:show 
  title="Disband Army?" 
  confirmLabel="Disband Army"
  cancelLabel="Cancel"
  width="600px"
  on:confirm={handleConfirm}
  on:cancel={handleCancel}
>
  <div class="disband-army-content">
    <Notification
      variant="warning"
      title="Disband Army"
      description={armyDescription}
    />
    
    <div class="consequences-section">
      <h4>This will:</h4>
      <ul>
        <li>Remove the army from kingdom records</li>
        {#if isSupported && supportedBySettlement}
          <li>Free the support slot in {supportedBySettlement}</li>
        {/if}
        {#if hasLinkedActor}
          <li class="actor-option">
            <label class="actor-choice">
              <input 
                type="checkbox" 
                bind:checked={deleteActor}
              />
              <span>Also delete the linked NPC actor</span>
            </label>
            <p class="choice-hint">
              {#if deleteActor}
                The NPC actor will be permanently deleted.
              {:else}
                The NPC actor will be kept and can be reused or deleted later.
              {/if}
            </p>
          </li>
        {/if}
      </ul>
    </div>
    
    <p class="warning-text">
      <i class="fas fa-exclamation-triangle"></i>
      This action cannot be undone.
    </p>
  </div>
</Dialog>

<style>
  .disband-army-content {
    color: var(--text-primary, #ffffff);
    font-family: var(--font-sans-rm);
  }
  
  .disband-army-content :global(.notification-rm) {
    margin-bottom: 1.5rem;
  }
  
  .disband-army-content :global(.notification-rm-description) {
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
    list-style: none;
  }
  
  .consequences-section li {
    margin-bottom: 0.5rem;
    padding-left: 0.25rem;
  }
  
  .consequences-section li:not(.actor-option):before {
    content: "•";
    margin-right: 0.5rem;
  }
  
  .actor-option {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.375rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .actor-choice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary, #ffffff);
  }
  
  .actor-choice input[type="checkbox"] {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
  }
  
  .choice-hint {
    margin: 0.5rem 0 0 1.625rem;
    font-size: var(--font-sm);
    color: var(--text-secondary, #b0b0b3);
    font-style: italic;
  }
  
  .warning-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 1rem 0 0 0;
    padding: 0.75rem;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 0.375rem;
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
    font-size: var(--font-sm);
  }
  
  .warning-text i {
    font-size: 1rem;
  }
</style>
