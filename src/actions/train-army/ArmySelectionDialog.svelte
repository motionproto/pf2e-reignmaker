<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';

  export let show: boolean = false;
  const dispatch = createEventDispatcher();

  // Get party level from kingdom data (synced by partyLevelHooks)
  $: partyLevel = $kingdomData?.partyLevel || 1;

  // Filter: Only armies below party level
  $: eligibleArmies = ($kingdomData?.armies || [])
    .filter(army => {
      console.log(`[ArmySelectionDialog] Checking army "${army.name}" - Level ${army.level} vs Party Level ${partyLevel}`);
      return army.level < partyLevel;
    })
    .sort((a, b) => a.level - b.level);
  
  // Debug: Log when dialog opens
  $: if (show) {
    console.log(`[ArmySelectionDialog] Dialog opened`);
    console.log(`[ArmySelectionDialog] Total armies: ${$kingdomData?.armies?.length || 0}`);
    console.log(`[ArmySelectionDialog] Armies data:`, $kingdomData?.armies);
    console.log(`[ArmySelectionDialog] Party level: ${partyLevel}`);
    console.log(`[ArmySelectionDialog] Eligible armies: ${eligibleArmies.length}`);
  }

  function handleSelect(armyId: string) {
    dispatch('armySelected', { armyId });
    show = false;
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={() => show = false} role="presentation">
    <div class="dialog-content" on:click|stopPropagation role="dialog">
      <h2>Select Army to Train</h2>
      
      {#if eligibleArmies.length === 0}
        <p class="no-armies">No armies available for training (all at party level)</p>
      {:else}
        <div class="army-list">
          {#each eligibleArmies as army}
            <button class="army-item" on:click={() => handleSelect(army.id)}>
              <span class="army-name">{army.name}</span>
              <span class="army-level">Level {army.level} → {partyLevel}</span>
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
    margin: 1rem 0;
  }

  .army-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .army-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-bg-secondary, #2a2a2a);
    border: 1px solid var(--color-border-secondary, #3a3a3a);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .army-item:hover {
    background: var(--color-bg-hover, #3a3a3a);
    border-color: var(--color-border-hover, #5a5a5a);
    transform: translateX(4px);
  }

  .army-name {
    font-weight: bold;
    color: var(--color-text-primary, #ffffff);
  }

  .army-level {
    color: var(--color-text-accent, #4a9eff);
    font-size: 0.9rem;
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
