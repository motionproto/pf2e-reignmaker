<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';
  import type { Army } from '../../models/Army';
  import { EQUIPMENT_ICONS, EQUIPMENT_NAMES, EQUIPMENT_BONUSES, type EquipmentType } from '../../utils/presentation';
  import Dialog from '../../view/kingdom/components/baseComponents/Dialog.svelte';

  export let show: boolean = true;
  
  const dispatch = createEventDispatcher();

  // Get eligible armies (those that can receive equipment)
  $: eligibleArmies = ($kingdomData?.armies || []).filter((army: Army) => {
    const equipment = army.equipment || {};
    // Army is eligible if it doesn't have all equipment
    return !equipment.armor || !equipment.runes || !equipment.weapons || !equipment.equipment;
  });

  // Equipment type definitions
  const equipmentTypes = [
    { 
      id: 'armor' as EquipmentType, 
      name: EQUIPMENT_NAMES.armor, 
      icon: EQUIPMENT_ICONS.armor,
      bonus: EQUIPMENT_BONUSES.armor.normal
    },
    { 
      id: 'runes' as EquipmentType, 
      name: EQUIPMENT_NAMES.runes, 
      icon: EQUIPMENT_ICONS.runes,
      bonus: EQUIPMENT_BONUSES.runes.normal
    },
    { 
      id: 'weapons' as EquipmentType, 
      name: EQUIPMENT_NAMES.weapons, 
      icon: EQUIPMENT_ICONS.weapons,
      bonus: EQUIPMENT_BONUSES.weapons.normal
    },
    { 
      id: 'equipment' as EquipmentType, 
      name: EQUIPMENT_NAMES.equipment, 
      icon: EQUIPMENT_ICONS.equipment,
      bonus: EQUIPMENT_BONUSES.equipment.normal
    }
  ];

  // Auto-select first army by default
  let selectedArmyId: string | null = null;
  $: if (eligibleArmies.length > 0 && !selectedArmyId) {
    selectedArmyId = eligibleArmies[0].id;
  }

  let selectedEquipment: string | null = null;
  
  // Clear equipment selection when army changes
  $: if (selectedArmyId) {
    selectedEquipment = null;
  }

  // Get selected army
  $: selectedArmy = eligibleArmies.find((a: Army) => a.id === selectedArmyId);
  
  // Create reactive map of owned equipment for selected army
  $: ownedEquipmentMap = selectedArmy?.equipment || {};
  
  // Available equipment for selected army
  $: availableEquipment = selectedArmy 
    ? equipmentTypes.filter(eq => !ownedEquipmentMap[eq.id])
    : [];

  // Reactive helper to check if equipment is owned
  $: isEquipmentOwned = (equipmentId: string): boolean => {
    return !!ownedEquipmentMap[equipmentId as keyof typeof ownedEquipmentMap];
  };

  function handleConfirm() {
    if (selectedArmyId && selectedEquipment) {
      dispatch('confirm', {
        armyId: selectedArmyId,
        equipmentType: selectedEquipment
      });
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }
  
  // Confirm is only enabled when equipment is selected
  $: confirmDisabled = !selectedEquipment || eligibleArmies.length === 0;
</script>

<Dialog
  bind:show
  title="Military Equipment Aid"
  confirmLabel="Confirm"
  cancelLabel="Cancel"
  confirmDisabled={confirmDisabled}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="600px"
>
  <div class="dialog-content">
    {#if eligibleArmies.length === 0}
      <div class="no-armies">
      <p>⚠️ No armies available to receive equipment.</p>
      <p class="hint">You will receive 1 Gold instead.</p>
    </div>
  {:else}
    <!-- Army Selection -->
    <div class="form-group">
      <label for="army-select">Select Army:</label>
      <select 
        id="army-select" 
        bind:value={selectedArmyId}
      >
        {#each eligibleArmies as army}
          <option value={army.id}>
            {army.name} (Level {army.level})
          </option>
        {/each}
      </select>
    </div>

    <!-- Equipment Selection (always visible) -->
    <div class="equipment-section">
      <label>Select Equipment Upgrade:</label>
      
      {#if availableEquipment.length === 0}
        <p class="all-equipped">
          ✓ This army has all equipment upgrades!
        </p>
      {:else}
        <div class="equipment-grid">
          {#each equipmentTypes as equipment}
            {@const isOwned = isEquipmentOwned(equipment.id)}
            {@const isSelected = selectedEquipment === equipment.id}
            
            <button
              class="equipment-box"
              class:owned={isOwned}
              class:selected={isSelected}
              disabled={isOwned}
              on:click={() => selectedEquipment = equipment.id}
            >
              <i class="{equipment.icon} equipment-icon"></i>
              <div class="equipment-name">{equipment.name}</div>
              {#if isOwned}
                <div class="owned-badge">
                  <i class="fa-solid fa-check"></i> Owned
                </div>
              {:else}
                <div class="equipment-bonus">
                  {equipment.bonus}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
      </div>
    {/if}
  </div>
</Dialog>

<style lang="scss">
  .dialog-content {
    min-width: 550px;
  }

  .no-armies {
    text-align: center;
    padding: 2rem;
    background: var(--surface-warning-low);
    border: 1px solid var(--border-warning-subtle);
    border-radius: 6px;

    p {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
      font-weight: 600;
    }

    .hint {
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: normal;
    }
  }

  .form-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.95rem;
    }

    select {
      width: 100%;
    }
  }

  .equipment-section {
    label {
      display: block;
      margin-bottom: 0.75rem;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.95rem;
    }
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .equipment-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--overlay);
    border: 2px solid var(--border-subtle);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 120px;

    &:hover:not(:disabled) {
      background: var(--overlay-high);
      border-color: var(--border-highlight);
    }

    &.selected {
      background: var(--surface-accent-low);
      border-color: var(--color-amber);
      box-shadow: 0 0 0 1px var(--color-amber);
    }

    &.owned {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .equipment-icon {
    font-size: 2rem;
    line-height: 1;
    color: #ffffff;
  }

  .equipment-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.95rem;
    text-align: center;
  }

  .equipment-bonus {
    padding: 0.25rem 0.5rem;
    background: var(--surface-success-high);
    border: 1px solid var(--border-success-subtle);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-green);
  }

  .owned-badge {
    padding: 0.25rem 0.5rem;
    background: var(--hover);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ffffff;
  }

  .all-equipped {
    padding: 1rem;
    background: var(--surface-success-low);
    border: 1px solid var(--border-success-subtle);
    border-radius: 6px;
    color: var(--color-green);
    text-align: center;
    font-weight: 600;
  }
</style>
