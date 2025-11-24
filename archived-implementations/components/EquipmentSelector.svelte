<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { EQUIPMENT_ICONS, EQUIPMENT_NAMES, EQUIPMENT_BONUSES, type EquipmentType } from '../../../utils/presentation';
  import type { Army } from '../../../models/Army';

  export let army: Army;
  export let outcome: 'success' | 'criticalSuccess' = 'success';
  export let selectedEquipment: string | null = null;

  const dispatch = createEventDispatcher<{
    select: { equipmentType: string };
  }>();

  // Equipment type definitions with bonuses
  const equipmentTypes = [
    { 
      id: 'armor' as EquipmentType, 
      name: EQUIPMENT_NAMES.armor, 
      icon: EQUIPMENT_ICONS.armor,
      normalBonus: EQUIPMENT_BONUSES.armor.normal,
      critBonus: EQUIPMENT_BONUSES.armor.critical
    },
    { 
      id: 'runes' as EquipmentType, 
      name: EQUIPMENT_NAMES.runes, 
      icon: EQUIPMENT_ICONS.runes,
      normalBonus: EQUIPMENT_BONUSES.runes.normal,
      critBonus: EQUIPMENT_BONUSES.runes.critical
    },
    { 
      id: 'weapons' as EquipmentType, 
      name: EQUIPMENT_NAMES.weapons, 
      icon: EQUIPMENT_ICONS.weapons,
      normalBonus: EQUIPMENT_BONUSES.weapons.normal,
      critBonus: EQUIPMENT_BONUSES.weapons.critical
    },
    { 
      id: 'equipment' as EquipmentType, 
      name: EQUIPMENT_NAMES.equipment, 
      icon: EQUIPMENT_ICONS.equipment,
      normalBonus: EQUIPMENT_BONUSES.equipment.normal,
      critBonus: EQUIPMENT_BONUSES.equipment.critical
    }
  ];

  // Check which equipment is already owned
  $: ownedEquipment = army?.equipment || {};

  // Helper to check if equipment is owned
  function isEquipmentOwned(equipmentId: string): boolean {
    if (!ownedEquipment) return false;
    const key = equipmentId as keyof typeof ownedEquipment;
    return !!ownedEquipment[key];
  }

  function handleSelect(equipmentId: string) {
    if (!isEquipmentOwned(equipmentId)) {
      selectedEquipment = equipmentId;
      dispatch('select', { equipmentType: equipmentId });
    }
  }
</script>

<div class="equipment-list">
  {#each equipmentTypes as equipment}
    {@const isOwned = isEquipmentOwned(equipment.id)}
    {@const isSelected = selectedEquipment === equipment.id}
    {@const bonus = outcome === 'criticalSuccess' ? equipment.critBonus : equipment.normalBonus}
    
    <label 
      class="equipment-item" 
      class:owned={isOwned}
      class:selected={isSelected}
    >
      <input 
        type="radio" 
        name="equipment" 
        value={equipment.id}
        checked={isSelected}
        disabled={isOwned}
        on:change={() => handleSelect(equipment.id)}
      />
      
      <i class="{equipment.icon} equipment-icon"></i>
      
      <div class="equipment-info">
        <div class="equipment-header">
          <span class="equipment-name">{equipment.name}</span>
          {#if isOwned}
            <span class="owned-badge">
              <i class="fa-solid fa-check"></i> Owned
            </span>
          {:else}
            <span class="equipment-bonus">{bonus}</span>
          {/if}
        </div>
      </div>
      
      {#if isSelected && !isOwned}
        <i class="fa-solid fa-check checkmark"></i>
      {/if}
    </label>
  {/each}
</div>

<style lang="scss">
  .equipment-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .equipment-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid var(--border-subtle);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(.owned) {
      background: var(--hover-low);
      border-color: var(--border-medium);
    }

    &.selected {
      border-color: var(--border-faint);
      background: var(--hover);
    }

    &.owned {
      opacity: 0.5;
      cursor: not-allowed;
    }

    input[type="radio"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
  }

  .equipment-icon {
    font-size: 2rem;
    line-height: 1;
    color: #ffffff;
    flex-shrink: 0;
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
    gap: 1rem;
  }

  .equipment-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 1rem;
  }

  .equipment-bonus {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    background: transparent;
    white-space: nowrap;
  }

  .owned-badge {
    padding: 0.25rem 0.5rem;
    background: var(--hover);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ffffff;
    white-space: nowrap;
  }

  .checkmark {
    position: absolute;
    top: 1rem;
    right: 1rem;
    color: #ffffff;
    font-size: 1.25rem;
  }
</style>
