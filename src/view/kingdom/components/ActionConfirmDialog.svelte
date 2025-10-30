<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from './baseComponents/Dialog.svelte';
  
  export let show: boolean = false;
  
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
  title="Action Already Performed"
  confirmLabel="Cancel"
  cancelLabel="Roll Anyway"
  width="400px"
  on:confirm={handleCancel}
  on:cancel={handleConfirm}
>
  <p>You have already performed an action this turn.</p>
</Dialog>

<style>
  p {
    margin: 0;
    color: var(--text-secondary, #b0b0b3);
    font-size: 1rem;
  }
</style>
