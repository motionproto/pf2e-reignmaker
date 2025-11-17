<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from './baseComponents/Dialog.svelte';
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
</script>

<Dialog 
  bind:show 
  title="Select Applicable Lore Skill"
  confirmLabel={loreItems.length > 0 ? "Roll" : "OK"}
  width="450px"
  confirmDisabled={loreItems.length === 0}
  on:confirm={loreItems.length > 0 ? handleSelect : handleCancel}
  on:cancel={handleCancel}
>
  <div class="lore-dialog-content">
    {#if loreItems.length > 0}
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
    {:else}
      <div class="notification-wrapper">
        <Notification
          variant="warning"
          title="No Lore Skills"
          description="You have no Lore skills. Add a Lore skill to your character sheet to use this option."
        />
      </div>
    {/if}
  </div>
</Dialog>

<style>
  .lore-dialog-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
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
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-family: var(--font-sans-rm);
    cursor: pointer;
    transition: all var(--transition-base);
    line-height: var(--line-height-relaxed);
    min-height: 2.75rem;
  }
  
  .lore-select:hover {
    border-color: var(--border-highlight);
  }
  
  .lore-select:focus {
    outline: 2px solid var(--color-amber);
    outline-offset: 0.125rem;
    border-color: var(--color-amber);
  }
  
  .lore-select option {
    background: var(--color-gray-800);
    color: var(--text-primary);
  }
  
  .notification-wrapper {
    margin-top: var(--space-8);
  }
</style>
