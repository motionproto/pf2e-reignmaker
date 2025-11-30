<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import type { Army } from '../../../models/Army';
  import type { OutcomePreview } from '../../../models/OutcomePreview';
  import Dialog from './baseComponents/Dialog.svelte';
  import { PLAYER_KINGDOM } from '../../../types/ownership';

  export let instance: OutcomePreview | null = null;
  export let outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' = 'success';
  export let modifiers: any[] = [];
  export let stateChanges: any = {};
  export let applied: boolean = false;

  const dispatch = createEventDispatcher();
  const game = (globalThis as any).game;

  // Dialog visibility
  let show = !applied;
  $: show = !applied;

  // Army selection (dropdown)
  let selectedArmyId: string | null = null;
  let selectedOption: 'heal' | string = 'heal'; // 'heal' or condition slug
  
  // Cache for actor data (refreshes when dialog opens)
  let actorDataCache = new Map();
  
  // Helper to get fresh actor data
  function getActorData(actorId: string) {
    if (actorDataCache.has(actorId)) {
      return actorDataCache.get(actorId);
    }
    
    const npcActor = game?.actors?.get(actorId);
    if (!npcActor) return null;
    
    const items = Array.from(npcActor.items.values()) as any[];
    const conditions = items
      .filter((i: any) => i.type === 'condition' || i.type === 'effect')
      .map((i: any) => ({
        name: i.name,
        slug: i.system?.slug || '',
        badge: i.system?.badge?.value || null,
        img: i.img
      }));
    
    // Deduplicate by slug+badge
    const uniqueConditions = new Map();
    conditions.forEach(c => {
      const key = `${c.slug}${c.badge ? `-${c.badge}` : ''}`;
      if (!uniqueConditions.has(key)) {
        uniqueConditions.set(key, c);
      }
    });
    
    const data = {
      hp: {
        current: npcActor.system?.attributes?.hp?.value || 0,
        max: npcActor.system?.attributes?.hp?.max || 0
      },
      conditions: Array.from(uniqueConditions.values())
    };
    
    actorDataCache.set(actorId, data);
    return data;
  }
  
  // Refresh actor data when dialog shows
  $: if (show && !applied) {
    actorDataCache.clear();
  }
  
  // Filter armies to only show wounded/afflicted player armies
  $: eligibleArmies = ($kingdomData?.armies || [])
    .filter((army: Army) => {
      if (army.ledBy !== PLAYER_KINGDOM) return false;
      if (!army.actorId) return false;
      
      const actorData = getActorData(army.actorId);
      if (!actorData) return false;

      // Check if wounded
      if (actorData.hp.current < actorData.hp.max) return true;

      // Check if has conditions
      return actorData.conditions.length > 0;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Auto-select first army by default
  $: if (eligibleArmies.length > 0 && !selectedArmyId) {
    selectedArmyId = eligibleArmies[0].id;
  }

  // Get the selected army
  $: army = selectedArmyId 
    ? ($kingdomData?.armies || []).find((a: Army) => a.id === selectedArmyId)
    : null;

  // Get army HP and conditions - use cached data
  $: actorData = army?.actorId ? getActorData(army.actorId) : null;
  $: armyHP = actorData?.hp || { current: 0, max: 0 };
  $: isWounded = armyHP.current < armyHP.max;
  $: armyConditions = actorData?.conditions || [];

  // Auto-select first available option when army changes
  $: if (selectedArmyId) {
    if (isWounded) {
      selectedOption = 'heal';
    } else if (armyConditions.length > 0) {
      selectedOption = armyConditions[0].slug;
    }
  }

  // Handle confirm
  function handleConfirm() {
    if (selectedArmyId && army) {
      if (selectedOption === 'heal') {
        dispatch('selection', {
          armyId: selectedArmyId,
          armyName: army.name,
          selectedOption: 'heal',
          conditionToRemove: undefined
        });
      } else {
        const condition = armyConditions.find(c => c.slug === selectedOption);
        dispatch('selection', {
          armyId: selectedArmyId,
          armyName: army.name,
          selectedOption: 'remove-condition',
          conditionToRemove: selectedOption,
          conditionName: condition?.name || selectedOption
        });
      }
      show = false;
    }
  }

  // Handle cancel
  function handleCancel() {
    dispatch('cancel');
    show = false;
  }

  // Disable confirm button if no army or option selected
  $: confirmDisabled = !selectedArmyId || !selectedOption;
</script>

<Dialog
  bind:show
  title="Tend Wounded"
  confirmLabel="Apply Recovery"
  cancelLabel="Cancel"
  {confirmDisabled}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="600px"
>
  {#if eligibleArmies.length === 0}
    <p class="error">⚠️ No wounded or afflicted armies available</p>
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
          {@const npcActor = game?.actors?.get(army.actorId)}
          {@const hp = npcActor ? {
            current: npcActor.system?.attributes?.hp?.value || 0,
            max: npcActor.system?.attributes?.hp?.max || 0
          } : { current: 0, max: 0 }}
          {@const items = npcActor ? Array.from(npcActor.items.values()) : []}
          {@const conditionCount = items.filter((i) => i.type === 'condition' || i.type === 'effect').length}
          <option value={army.id}>
            {army.name} (Level {army.level}) - HP: {hp.current}/{hp.max}, Conditions: {conditionCount}
          </option>
        {/each}
      </select>
    </div>

    {#if army}
      <p class="instruction">
        Select recovery option:
      </p>

      <div class="options-grid">
        <!-- Heal option (only if wounded) -->
        {#if isWounded}
          <button
            class="option-box"
            class:selected={selectedOption === 'heal'}
            disabled={applied}
            on:click={() => selectedOption = 'heal'}
          >
            <i class="fa fa-heart option-icon"></i>
            <div class="option-name">Heal to full hit points</div>
            <div class="option-detail">Restore {armyHP.max - armyHP.current} HP</div>
          </button>
        {/if}

        <!-- Condition removal options -->
        {#each armyConditions as condition}
          <button
            class="option-box"
            class:selected={selectedOption === condition.slug}
            disabled={applied}
            on:click={() => selectedOption = condition.slug}
          >
            {#if condition.img}
              <img src={condition.img} alt={condition.name} class="option-icon" />
            {:else}
              <i class="fa fa-shield-alt option-icon"></i>
            {/if}
            <div class="option-name">Remove {condition.name}{condition.badge ? ` ${condition.badge}` : ''}</div>
          </button>
        {/each}
      </div>

      {#if selectedOption}
        <div class="selection-summary">
          {#if selectedOption === 'heal'}
            ✓ Selected: Heal to full HP
          {:else}
            {@const selectedCondition = armyConditions.find(c => c.slug === selectedOption)}
            ✓ Selected: Remove {selectedCondition?.name || selectedOption}
          {/if}
        </div>
      {/if}
    {/if}
  {/if}
</Dialog>

<style lang="scss">
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

  .options-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
    margin-bottom: 0.75rem;
  }

  .option-box {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-12) var(--space-16);
    min-width: 160px;
    min-height: 120px;
    
    background: var(--hover-low);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    outline: 2px solid transparent;
    outline-offset: -1px;
    
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(.disabled):not(:disabled):not(.selected) {
      background: var(--hover);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }

    &.selected {
      background: var(--surface-success-lower);
      outline-color: var(--border-success);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .option-icon {
    font-size: 2rem;
    line-height: 1;
    color: #ffffff;
    width: 2rem;
    height: 2rem;
    object-fit: contain;
  }

  .option-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.95rem;
    text-align: center;
  }

  .option-detail {
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-align: center;
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

  .error {
    color: var(--color-red);
    text-align: center;
    padding: 1rem;
    background: var(--surface-primary-low);
    border: 1px solid var(--border-primary-subtle);
    border-radius: 6px;
  }
</style>
