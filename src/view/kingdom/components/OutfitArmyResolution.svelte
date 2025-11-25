<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import type { Army } from '../../../models/Army';
  import type { ActiveCheckInstance } from '../../../models/CheckInstance';
  import { EQUIPMENT_ICONS, EQUIPMENT_NAMES, EQUIPMENT_BONUSES, type EquipmentType } from '../../../utils/presentation';
  import Dialog from './baseComponents/Dialog.svelte';

  export let instance: ActiveCheckInstance | null = null;
  export let outcome: 'success' | 'criticalSuccess' = 'success';
  export let modifiers: any[] = [];
  export let stateChanges: any = {};
  export let applied: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Dialog visibility
  let show = !applied;
  $: show = !applied;

  // Army selection (dropdown instead of global state)
  let selectedArmyId: string | null = null;
  
  // Filter armies with available equipment slots (< 4 upgrades)
  $: eligibleArmies = ($kingdomData?.armies || [])
    .filter((army: Army) => {
      const equipmentCount = army.equipment 
        ? Object.values(army.equipment).filter(Boolean).length 
        : 0;
      return equipmentCount < 4 && army.actorId;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Auto-select first army by default
  $: if (eligibleArmies.length > 0 && !selectedArmyId) {
    selectedArmyId = eligibleArmies[0].id;
  }
  
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

  // Get the selected army
  $: army = selectedArmyId 
    ? ($kingdomData?.armies || []).find((a: Army) => a.id === selectedArmyId)
    : null;

  // Check which equipment is already owned - make it fully reactive
  $: ownedEquipment = army?.equipment || {};
  
  // Create reactive ownership map for each equipment type
  $: equipmentOwnership = {
    armor: !!ownedEquipment?.armor,
    runes: !!ownedEquipment?.runes,
    weapons: !!ownedEquipment?.weapons,
    equipment: !!ownedEquipment?.equipment
  };

  // Clear selection when army changes (in case previously selected equipment is now owned)
  $: if (selectedArmyId && selectedEquipment) {
    const key = selectedEquipment as keyof typeof equipmentOwnership;
    if (equipmentOwnership[key]) {
      selectedEquipment = null;
    }
  }

  // Available equipment (not yet owned)
  $: availableEquipment = equipmentTypes.filter(
    eq => !equipmentOwnership[eq.id as keyof typeof equipmentOwnership]
  );

  // Handle confirm
  function handleConfirm() {
    if (selectedArmyId && selectedEquipment) {
      dispatch('selection', {
        armyId: selectedArmyId,
        equipmentType: selectedEquipment,
        outcome,
        armyName: army?.name || 'Unknown Army',
        equipmentName: equipmentTypes.find(e => e.id === selectedEquipment)?.name || selectedEquipment
      });
      show = false;
    }
  }
  
  // Handle cancel
  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
  
  // Disable confirm button if no equipment selected
  $: confirmDisabled = !selectedEquipment;
</script>

<Dialog
  bind:show
  title="Outfit Army"
  confirmLabel="Apply Equipment"
  cancelLabel="Cancel"
  {confirmDisabled}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="650px"
>
  <div class="outcome-message">
    {#if outcome === 'criticalSuccess'}
      <p>Army will receive +2 equipment bonus</p>
    {:else}
      <p>Army will receive +1 equipment bonus</p>
    {/if}
  </div>

  {#if eligibleArmies.length === 0}
    <p class="error">⚠️ No armies available with equipment slots</p>
  {:else}
    <!-- Army Selection Dropdown -->
    <div class="army-selection">
      <label for="army-select">Select Army:</label>
      <select 
        id="army-select"
        bind:value={selectedArmyId}
        disabled={applied}
        class="army-dropdown"
      >
        <option value={null}>-- Choose an army --</option>
        {#each eligibleArmies as army}
          {@const equipmentCount = army.equipment 
            ? Object.values(army.equipment).filter(Boolean).length 
            : 0}
          {@const slotsAvailable = 4 - equipmentCount}
          {@const supportText = (() => {
            // Allied armies (exempt from upkeep) - show faction name
            if (army.exemptFromUpkeep) {
              if (army.supportedBy === 'playerKingdom') return 'Player Kingdom';
              const faction = $kingdomData.factions?.find(f => f.id === army.supportedBy);
              return faction?.name || army.supportedBy;
            }
            // Regular armies - show settlement name or unsupported
            if (!army.supportedBySettlementId) {
              return army.turnsUnsupported > 0 
                ? `Unsupported (${army.turnsUnsupported} turns)`
                : 'Unsupported';
            }
            const settlement = $kingdomData.settlements.find(s => s.id === army.supportedBySettlementId);
            return settlement?.name || 'Unsupported (settlement lost)';
          })()}
          <option value={army.id}>
            {army.name} (Level {army.level}) - {slotsAvailable} slot{slotsAvailable !== 1 ? 's' : ''} available    •    {supportText}
          </option>
        {/each}
      </select>
    </div>

    {#if army}
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
            {@const isOwned = equipmentOwnership[equipment.id]}
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
    {/if}
  {/if}
</Dialog>

<style lang="scss">
  .outcome-message {
    margin-bottom: 1rem;
    
    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
      text-align: center;
    }
  }

  .army-selection {
    margin-bottom: 1rem;
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.95rem;
    }
  }

  .army-dropdown {
    width: 100%;
    /* Uses global form-controls.css styling */
  }

  .instruction {
    margin: 0 0 0.75rem 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .equipment-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
    margin-bottom: 0.75rem;
  }

  .equipment-box {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-12) var(--space-16);
    min-width: 140px;
    min-height: 120px;
    
    /* Choice button pattern - background */
    background: var(--hover-low);
    
    /* Choice button pattern - border (visible on all states) */
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    
    /* Choice button pattern - outline (overlay, doesn't affect size) */
    outline: 2px solid transparent;
    outline-offset: -1px;
    
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(.disabled):not(.owned):not(.selected) {
      background: var(--hover);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }

    &.selected {
      background: var(--surface-success-lower);
      outline-color: var(--border-success);
    }

    &.owned {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: transparent;
      outline-color: transparent;
    }

    &.disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: transparent;
      outline-color: transparent;
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
    background: transparent;
    border: 1px solid var(--border-success-subtle);
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-green);

    &.crit {
      border-color: var(--border-success-medium);
      color: var(--color-green-light);
    }
  }

  .owned-badge-inline {
    padding: 0.25rem 0.5rem;
    background: var(--hover);
    border: 1px solid var(--border-default);
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
    background: var(--surface-success-low);
    border: 1px solid var(--border-success-subtle);
    border-radius: 6px;
    color: var(--color-green);
    text-align: center;
    font-weight: 600;
  }

  .error {
    color: var(--color-red);
    text-align: center;
    padding: 1rem;
    background: var(--surface-primary-low);
    border: 1px solid var(--border-primary-subtle);
    border-radius: 6px;
  }
</style>
