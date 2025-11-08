<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';
  import type { Army } from '../../models/Army';
  import type { ActiveCheckInstance } from '../../models/CheckInstance';
  import { EQUIPMENT_ICONS, EQUIPMENT_NAMES, EQUIPMENT_BONUSES, type EquipmentType } from '../../utils/presentation';

  export let instance: ActiveCheckInstance | null = null;
  export let outcome: 'success' | 'criticalSuccess' = 'success';
  export let modifiers: any[] = [];
  export let stateChanges: any = {};
  export let applied: boolean = false;
  
  const dispatch = createEventDispatcher();

  // Get army ID from global state (set during pre-roll dialog)
  $: armyId = (globalThis as any).__pendingOutfitArmyArmy;
  
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

  let selectedEquipment: string | null = null;

  // Get the army
  $: army = ($kingdomData?.armies || []).find((a: Army) => a.id === armyId);

  // Check which equipment is already owned
  $: ownedEquipment = army?.equipment || {};

  // Helper to check if equipment is owned
  function isEquipmentOwned(equipmentId: string): boolean {
    if (!ownedEquipment) return false;
    const key = equipmentId as keyof typeof ownedEquipment;
    return !!ownedEquipment[key];
  }

  // Available equipment (not yet owned)
  $: availableEquipment = equipmentTypes.filter(
    eq => !isEquipmentOwned(eq.id)
  );

  // Auto-select when user clicks an equipment box
  $: if (selectedEquipment && !applied) {
    // Dispatch selection event with metadata
    dispatch('selection', {
      equipmentType: selectedEquipment,
      outcome,
      armyId,
      armyName: army?.name || 'Unknown Army',
      // Store metadata for display
      equipmentName: equipmentTypes.find(e => e.id === selectedEquipment)?.name || selectedEquipment
    });
  }
</script>

{#if army}
  <div class="outfit-army-resolution">
    <div class="resolution-header">
      <h4>🎖️ Outfit: {army.name}</h4>
      {#if outcome === 'criticalSuccess'}
        <span class="outcome-badge crit">Critical Success (+2 bonus)</span>
      {:else}
        <span class="outcome-badge">Success (+1 bonus)</span>
      {/if}
    </div>

    {#if availableEquipment.length === 0}
      <p class="all-equipped">
        ✓ This army has all equipment upgrades!
      </p>
    {:else}
      <p class="instruction">
        Select equipment to apply:
      </p>

      <div class="equipment-grid">
        {#each equipmentTypes as equipment}
          {@const isOwned = isEquipmentOwned(equipment.id)}
          {@const isAvailable = !isOwned}
          {@const isSelected = selectedEquipment === equipment.id}
          {@const bonus = outcome === 'criticalSuccess' ? equipment.critBonus : equipment.normalBonus}
          
          <button
            class="equipment-box"
            class:owned={isOwned}
            class:selected={isSelected}
            class:disabled={applied || isOwned}
            disabled={applied || isOwned}
            on:click={() => selectedEquipment = equipment.id}
          >
            <i class="{equipment.icon} equipment-icon"></i>
            <div class="equipment-name">{equipment.name}</div>
            {#if isOwned}
              <div class="owned-badge-inline">
                <i class="fa-solid fa-check"></i> Owned
              </div>
            {:else}
              <div class="equipment-bonus" class:crit={outcome === 'criticalSuccess'}>
                {bonus}
              </div>
            {/if}
          </button>
        {/each}
      </div>

      {#if selectedEquipment}
        {@const selected = equipmentTypes.find(e => e.id === selectedEquipment)}
        <div class="selection-summary">
          ✓ Selected: {selected?.name} ({outcome === 'criticalSuccess' ? selected?.critBonus : selected?.normalBonus})
        </div>
      {/if}
    {/if}
  </div>
{:else}
  <div class="outfit-army-resolution">
    <p class="error">⚠️ No army selected. This shouldn't happen!</p>
  </div>
{/if}

<style lang="scss">
  .outfit-army-resolution {
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .resolution-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .resolution-header h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .outcome-badge {
    padding: 0.25rem 0.75rem;
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.4);
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-green);

    &.crit {
      background: rgba(34, 197, 94, 0.3);
      border-color: rgba(34, 197, 94, 0.6);
      color: var(--color-green-light);
    }
  }

  .instruction {
    margin: 0 0 0.75rem 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .equipment-box {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 120px;

    &:hover:not(.disabled) {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    &.selected {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
    }

    &.owned {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.disabled {
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
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-green);

    &.crit {
      background: rgba(34, 197, 94, 0.3);
      border-color: rgba(34, 197, 94, 0.5);
      color: var(--color-green-light);
    }
  }

  .owned-badge-inline {
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ffffff;
  }

  .selection-summary {
    padding: 0.75rem;
    background: rgba(74, 158, 255, 0.1);
    border: 1px solid rgba(74, 158, 255, 0.3);
    border-radius: 6px;
    color: var(--color-accent);
    font-weight: 600;
    text-align: center;
  }

  .all-equipped {
    padding: 1rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 6px;
    color: var(--color-green);
    text-align: center;
    font-weight: 600;
  }

  .error {
    color: var(--color-red);
    text-align: center;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
  }
</style>
