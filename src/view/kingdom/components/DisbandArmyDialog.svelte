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
        {#if !hasLinkedActor}
          <li>No linked NPC actor to delete</li>
        {/if}
        {#if hasLinkedActor}
          <li class="actor-option">
            <label class="actor-choice">
              <input 
                type="checkbox" 
                bind:checked={deleteActor}
              />
              <span>Delete NPC Actor</span>
            </label>
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
    margin-bottom: var(--space-24);
  }
  
  .disband-army-content :global(.notification-rm-description) {
    font-size: var(--font-xl);
    color: var(--text-primary);
  }
  
  .consequences-section {
    margin-bottom: var(--space-16);
  }
  
  .consequences-section h4 {
    margin: 0 0 var(--space-12) 0;
    font-size: var(--font-lg);
    font-family: var(--font-sans-rm);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary, #ffffff);
  }
  
  .consequences-section ul {
    margin: 0;
    padding-left: var(--space-24);
    color: var(--text-secondary, #b0b0b3);
    font-size: var(--font-md);
    line-height: 1.6;
    list-style: none;
  }
  
  .consequences-section li {
    margin-bottom: var(--space-8);
    padding-left: var(--space-4);
  }
  
  .consequences-section li:not(.actor-option):before {
    content: "•";
    margin-right: var(--space-8);
  }
  
  .actor-option {
    margin-top: var(--space-16);
    padding: var(--space-12);
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .actor-choice {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary, #ffffff);
  }
  
  .actor-choice input[type="checkbox"] {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
  }
  
  .warning-text {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    margin: var(--space-16) 0 0 0;
    padding: var(--space-12);
    background: rgba(255, 107, 107, 0.1);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
    font-size: var(--font-sm);
  }
  
  .warning-text i {
    font-size: var(--font-md);
  }
</style>
