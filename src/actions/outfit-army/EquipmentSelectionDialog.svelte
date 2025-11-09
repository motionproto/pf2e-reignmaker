<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';
  import type { Army } from '../../models/Army';

  export let show: boolean = false;
  export let armyId: string = '';
  export let outcome: 'success' | 'criticalSuccess' = 'success';
  
  const dispatch = createEventDispatcher();

  // Equipment type definitions
  const equipmentTypes = [
    { id: 'armor', name: 'Armor', description: '+1 AC (+2 on critical success)' },
    { id: 'runes', name: 'Runes', description: '+1 to hit (+2 on critical success)' },
    { id: 'weapons', name: 'Weapons', description: '+1 damage dice (+2 on critical success)' },
    { id: 'equipment', name: 'Enhanced Gear', description: '+1 saving throws (+2 on critical success)' }
  ];

  let selectedEquipment: string | null = null;

  // Get the army
  $: army = ($kingdomData?.armies || []).find((a: Army) => a.id === armyId);

  // Check which equipment is already owned
  $: ownedEquipment = army?.equipment || {};

  // Helper to check if equipment is owned (type-safe)
  function isEquipmentOwned(equipmentId: string): boolean {
    if (!ownedEquipment) return false;
    const key = equipmentId as keyof typeof ownedEquipment;
    return !!ownedEquipment[key];
  }

  // Available equipment (not yet owned)
  $: availableEquipment = equipmentTypes.filter(
    eq => !isEquipmentOwned(eq.id)
  );

  // Debug
  $: if (show) {
    console.log(`[EquipmentSelectionDialog] Showing for army ${army?.name}`);
    console.log(`[EquipmentSelectionDialog] Owned:`, ownedEquipment);
    console.log(`[EquipmentSelectionDialog] Available:`, availableEquipment.map(e => e.id));
  }

  function handleConfirm() {
    if (!selectedEquipment) {
      ui.notifications?.warn('Please select an equipment type');
      return;
    }

    dispatch('equipmentSelected', { 
      armyId, 
      equipmentType: selectedEquipment,
      outcome 
    });
    
    // Reset
    selectedEquipment = null;
    show = false;
  }

  function handleCancel() {
    selectedEquipment = null;
    show = false;
    dispatch('cancel');
  }
</script>

{#if show && army}
  <div class="dialog-overlay" on:click={handleCancel} role="presentation">
    <div class="dialog-content" on:click|stopPropagation role="dialog">
      <h2>Outfit {army.name}</h2>
      
      <div class="equipment-list">
        {#each equipmentTypes as equipment}
          {@const isOwned = isEquipmentOwned(equipment.id)}
          {@const isAvailable = !isOwned}
          
          <label 
            class="equipment-item" 
            class:owned={isOwned}
            class:available={isAvailable}
            class:selected={selectedEquipment === equipment.id}
          >
            <input 
              type="radio" 
              name="equipment" 
              value={equipment.id}
              bind:group={selectedEquipment}
              disabled={isOwned}
            />
            {#if isOwned || selectedEquipment === equipment.id}
              <i class="fa-solid fa-check checkmark"></i>
            {/if}
            <div class="equipment-info">
              <div class="equipment-header">
                <span class="equipment-name">{equipment.name}</span>
                {#if isOwned}
                  <span class="owned-badge">Owned</span>
                {/if}
              </div>
              <span class="equipment-description">
                {equipment.description}
              </span>
            </div>
          </label>
        {/each}
      </div>

      {#if availableEquipment.length === 0}
        <p class="no-slots">
          {army.name} has all equipment upgrades!
        </p>
      {/if}

      <div class="button-row">
        <button 
          class="confirm-button" 
          on:click={handleConfirm}
          disabled={!selectedEquipment}
        >
          Confirm
        </button>
        <button class="cancel-button" on:click={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-higher);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog-content {
    background: var(--color-bg-primary, #1a1a1a);
    border: 2px solid var(--color-border-primary, #4a4a4a);
    border-radius: 8px;
    padding: 1.5rem;
    min-width: 500px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }

  h2 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary, #ffffff);
    font-size: 1.5rem;
  }

  .subtitle {
    color: var(--color-text-secondary, #cccccc);
    margin: 0 0 1.5rem 0;
    font-size: 0.95rem;
  }

  .equipment-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .equipment-item {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: #2a2a2a;
    border: 2px solid #3a3a3a;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .equipment-item.available:hover {
    background: #3a3a3a;
    border-color: #5a5a5a;
  }

  .equipment-item.selected {
    border-color: #ffffff;
    background: #3a3a3a;
  }

  .equipment-item.owned {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .equipment-item input[type="radio"] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .checkmark {
    position: absolute;
    top: 1rem;
    right: 1rem;
    color: #ffffff;
    font-size: 1.25rem;
  }

  .equipment-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .equipment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .equipment-name {
    font-weight: bold;
    color: var(--color-text-primary, #ffffff);
    font-size: 1rem;
  }

  .owned-badge {
    color: #ffffff;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .equipment-description {
    color: var(--color-text-tertiary, #999999);
    font-size: 0.85rem;
  }

  .no-slots {
    color: var(--color-warning, #fbbf24);
    text-align: center;
    margin: 1rem 0;
    font-style: italic;
  }

  .button-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  .confirm-button,
  .cancel-button {
    flex: 1;
    padding: 0.75rem;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .confirm-button {
    background: var(--color-primary, #4a9eff);
    border: 1px solid var(--color-primary, #4a9eff);
    color: #ffffff;
  }

  .confirm-button:hover:not(:disabled) {
    background: var(--color-primary-hover, #3a8eef);
  }

  .confirm-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-button {
    background: var(--color-bg-secondary, #2a2a2a);
    border: 1px solid var(--color-border-secondary, #3a3a3a);
    color: var(--color-text-primary, #ffffff);
  }

  .cancel-button:hover {
    background: var(--color-bg-hover, #3a3a3a);
  }
</style>
