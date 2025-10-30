<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';
  import type { Army } from '../../models/Army';

  export let show: boolean = false;
  const dispatch = createEventDispatcher();

  // Filter armies with available equipment slots (< 4 upgrades)
  $: eligibleArmies = ($kingdomData?.armies || [])
    .filter((army: Army) => {
      const equipmentCount = army.equipment 
        ? Object.values(army.equipment).filter(Boolean).length 
        : 0;
      return equipmentCount < 4 && army.actorId; // Must have actor and available slots
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Get equipment count and available slots for an army
  function getEquipmentInfo(army: Army) {
    const equipped = army.equipment 
      ? Object.values(army.equipment).filter(Boolean).length 
      : 0;
    const available = 4 - equipped;
    return { equipped, available };
  }

  // Get list of equipped items
  function getEquippedList(army: Army): string[] {
    if (!army.equipment) return [];
    const equipped: string[] = [];
    if (army.equipment.armor) equipped.push('Armor');
    if (army.equipment.runes) equipped.push('Runes');
    if (army.equipment.weapons) equipped.push('Weapons');
    if (army.equipment.equipment) equipped.push('Gear');
    return equipped;
  }

  // Debug: Log when dialog opens
  $: if (show) {
    console.log(`[OutfitArmyDialog] Dialog opened`);
    console.log(`[OutfitArmyDialog] Eligible armies: ${eligibleArmies.length}`);
  }

  function handleSelect(armyId: string) {
    dispatch('armySelected', { armyId });
    show = false;
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={() => show = false} role="presentation">
    <div class="dialog-content" on:click|stopPropagation role="dialog">
      <h2>Select Army to Outfit</h2>
      
      {#if eligibleArmies.length === 0}
        <p class="no-armies">No armies available with equipment slots</p>
        <p class="hint">Armies must have fewer than 4 upgrades and a linked actor</p>
      {:else}
        <div class="army-list">
          {#each eligibleArmies as army}
            {@const info = getEquipmentInfo(army)}
            {@const equipped = getEquippedList(army)}
            <button class="army-item" on:click={() => handleSelect(army.id)}>
              <div class="army-header">
                <span class="army-name">{army.name}</span>
                <span class="army-level">Level {army.level}</span>
              </div>
              <div class="army-details">
                <span class="equipment-slots">
                  {info.available} slot{info.available !== 1 ? 's' : ''} available
                </span>
                {#if equipped.length > 0}
                  <span class="equipped-items">
                    Has: {equipped.join(', ')}
                  </span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}
      
      <button class="cancel-button" on:click={() => show = false}>Cancel</button>
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
    background: rgba(0, 0, 0, 0.7);
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
    min-width: 400px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }

  h2 {
    margin: 0 0 1rem 0;
    color: var(--color-text-primary, #ffffff);
    font-size: 1.5rem;
  }

  .no-armies {
    color: var(--color-text-secondary, #cccccc);
    margin: 1rem 0 0.5rem 0;
  }

  .hint {
    color: var(--color-text-tertiary, #999999);
    font-size: 0.9rem;
    font-style: italic;
  }

  .army-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .army-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0.75rem 1rem;
    background: var(--color-bg-secondary, #2a2a2a);
    border: 1px solid var(--color-border-secondary, #3a3a3a);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .army-item:hover {
    background: var(--color-bg-hover, #3a3a3a);
    border-color: var(--color-border-hover, #5a5a5a);
    transform: translateX(4px);
  }

  .army-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .army-name {
    font-weight: bold;
    color: var(--color-text-primary, #ffffff);
    font-size: 1rem;
  }

  .army-level {
    color: var(--color-text-accent, #4a9eff);
    font-size: 0.9rem;
  }

  .army-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .equipment-slots {
    color: var(--color-success, #4ade80);
    font-size: 0.85rem;
    font-weight: 500;
  }

  .equipped-items {
    color: var(--color-text-tertiary, #999999);
    font-size: 0.8rem;
  }

  .cancel-button {
    width: 100%;
    padding: 0.5rem;
    margin-top: 1rem;
    background: var(--color-bg-secondary, #2a2a2a);
    border: 1px solid var(--color-border-secondary, #3a3a3a);
    border-radius: 4px;
    color: var(--color-text-primary, #ffffff);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background: var(--color-bg-hover, #3a3a3a);
  }
</style>
