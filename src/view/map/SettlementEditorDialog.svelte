<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Dialog from '../kingdom/components/baseComponents/Dialog.svelte';
  import { SettlementTier } from '../../models/Settlement';
  import type { Settlement } from '../../models/Settlement';
  import { currentFaction, kingdomData } from '../../stores/KingdomStore';
  import { PLAYER_KINGDOM } from '../../types/ownership';
  
  export let show = false;
  export let existingSettlement: Settlement | null = null;  // For editing existing settlements
  export let hexId: string = '';
  
  const dispatch = createEventDispatcher<{
    confirm: {
      name: string;
      tier: SettlementTier;
    };
    cancel: void;
  }>();
  
  // Form fields - only hex.features properties (name, tier)
  let name = '';
  let tier: SettlementTier = SettlementTier.VILLAGE;
  
  let inputElement: HTMLInputElement;
  let initialized = false;
  
  // Initialize form ONCE when dialog opens (not continuously)
  $: if (show && !initialized) {
    if (existingSettlement) {
      // Editing mode - load existing data
      name = existingSettlement.name;
      tier = existingSettlement.tier;
    } else {
      // New placement mode - reset to defaults
      name = '';
      tier = SettlementTier.VILLAGE;
    }
    initialized = true;
  }
  
  // Reset initialized flag when dialog closes
  $: if (!show) {
    initialized = false;
  }
  
  // Get tier options
  const tierOptions = [
    SettlementTier.VILLAGE,
    SettlementTier.TOWN,
    SettlementTier.CITY,
    SettlementTier.METROPOLIS
  ];
  
  // Get ownership options from kingdom data factions
  $: ownershipOptions = (() => {
    const options: Array<{ value: string | null, label: string }> = [
      { value: PLAYER_KINGDOM, label: 'Player Kingdom' }
    ];
    
    // Add all factions from kingdom data
    if ($kingdomData?.factions) {
      $kingdomData.factions.forEach((faction: any) => {
        options.push({ value: faction.id, label: faction.name });
      });
    }
    
    options.push({ value: null, label: 'Unowned/Neutral' });
    return options;
  })();
  
  function handleConfirm() {
    if (name.trim()) {
      dispatch('confirm', {
        name: name.trim(),
        tier
      });
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
  title={existingSettlement ? `Edit Settlement (${hexId})` : `Place Settlement (${hexId})`}
  confirmLabel={existingSettlement ? 'Save' : 'Place'}
  cancelLabel="Cancel"
  confirmDisabled={!name.trim()}
  width="500px"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
>
  <div class="settlement-editor-dialog">
    <!-- Name -->
    <div class="form-group">
      <label for="settlement-name">Settlement Name:</label>
      <input
        id="settlement-name"
        type="text"
        bind:value={name}
        bind:this={inputElement}
        on:keydown={(e) => e.key === 'Enter' && handleConfirm()}
        placeholder="Enter settlement name..."
      />
    </div>
    
    <!-- Tier -->
    <div class="form-group">
      <label for="settlement-tier">Settlement Tier:</label>
      <select id="settlement-tier" bind:value={tier}>
        {#each tierOptions as tierOption}
          <option value={tierOption}>{tierOption}</option>
        {/each}
      </select>
    </div>
  </div>
</Dialog>

<style lang="scss">
  .settlement-editor-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    
    &.flags {
      gap: var(--space-4);
    }
  }
  
  label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: var(--font-base);
    
    &.checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-weight: 500;
      cursor: pointer;
      
      input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
      }
    }
  }
  
  input[type="text"],
  input[type="number"],
  select {
    padding: var(--space-8) var(--space-12);
    background: var(--empty);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-base);
    line-height: 1.5;
    min-height: 2.5rem;
    transition: all var(--transition-base);
  }
  
  input[type="text"]:focus,
  input[type="number"]:focus,
  select:focus {
    outline: none;
    border-color: var(--border-strong);
    background: var(--surface-lower);
  }
  
  input::placeholder {
    color: var(--text-tertiary);
  }
  
  .hint {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    font-style: italic;
  }
  
  .info-note {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
    padding: var(--space-12);
    background: var(--color-blue-subtle);
    border-left: 3px solid var(--color-blue);
    border-radius: var(--radius-md);
    font-size: var(--font-sm);
    color: var(--text-secondary);
    
    i {
      color: var(--color-blue);
      margin-top: var(--space-2);
    }
  }
</style>
