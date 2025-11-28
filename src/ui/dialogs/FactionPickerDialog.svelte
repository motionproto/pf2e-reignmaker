<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from '../../view/kingdom/components/baseComponents/Dialog.svelte';
  import { getKingdomActor } from '../../stores/KingdomStore';
  import type { Faction, AttitudeLevel } from '../../models/Faction';
  import { ATTITUDE_ORDER } from '../../models/Faction';
  import { 
    FACTION_ATTITUDE_ICONS, 
    FACTION_ATTITUDE_COLORS, 
    FACTION_ATTITUDE_NAMES 
  } from '../../utils/presentation';
  import { logger } from '../../utils/Logger';
  
  // Props
  export let show: boolean = false;
  export let title: string = 'Select Faction';
  export let eligibleFactions: Faction[] = [];
  export let allowMultiple: boolean = false;
  export let count: number = 1;
  export let filter: ((faction: Faction, kingdom?: any) => boolean | { eligible: boolean; reason?: string }) | undefined = undefined;
  export let kingdom: any = undefined;
  
  const dispatch = createEventDispatcher();
  
  // UI State
  let selectedFactionIds: Set<string> = new Set();
  
  // Compute if confirm should be disabled
  $: confirmDisabled = selectedFactionIds.size !== count;
  
  // Check if a faction is eligible and get reason if not
  function checkEligibility(faction: Faction): { eligible: boolean; reason?: string } {
    if (!filter) return { eligible: true };
    
    const result = filter(faction, kingdom);
    
    // Handle boolean return (legacy compatibility)
    if (typeof result === 'boolean') {
      return { eligible: result };
    }
    
    // Handle object return with eligibility info
    return result;
  }
  
  function toggleFaction(faction: Faction) {
    // Check if faction is eligible
    const eligibility = checkEligibility(faction);
    if (!eligibility.eligible) {
      // @ts-ignore
      ui?.notifications?.warn(eligibility.reason || 'This faction cannot be selected');
      return;
    }
    
    if (selectedFactionIds.has(faction.id)) {
      // Deselect if already selected
      selectedFactionIds.delete(faction.id);
    } else {
      if (selectedFactionIds.size < count) {
        // Add if under limit
        selectedFactionIds.add(faction.id);
      } else if (count === 1) {
        // For single selection (count=1), replace the old selection with the new one
        selectedFactionIds.clear();
        selectedFactionIds.add(faction.id);
      } else {
        // For multiple selection, show error when limit reached
        // @ts-ignore
        ui?.notifications?.warn(`You can only select ${count} factions`);
      }
    }
    selectedFactionIds = selectedFactionIds; // Trigger reactivity
  }
  
  function handleConfirm() {
    if (selectedFactionIds.size === 0) {
      // @ts-ignore
      ui?.notifications?.warn('Please select at least one faction');
      return;
    }
    
    if (selectedFactionIds.size < count) {
      // @ts-ignore
      ui?.notifications?.warn(`Please select ${count} faction${count > 1 ? 's' : ''} (${selectedFactionIds.size}/${count} selected)`);
      return;
    }

    // Dispatch confirmation event with all selected factions
    const selectedFactions = Array.from(selectedFactionIds).map(id => 
      eligibleFactions.find(f => f.id === id)
    ).filter(Boolean);

    dispatch('confirm', {
      factionIds: Array.from(selectedFactionIds),
      factions: selectedFactions
    });
    
    // Reset and close
    selectedFactionIds = new Set();
    show = false;
  }
  
  function handleCancel() {
    selectedFactionIds = new Set();
    show = false;
    dispatch('cancel');
  }
  
  function getAttitudeConfig(attitude: AttitudeLevel) {
    return {
      displayName: FACTION_ATTITUDE_NAMES[attitude],
      icon: FACTION_ATTITUDE_ICONS[attitude],
      color: FACTION_ATTITUDE_COLORS[attitude]
    };
  }
</script>

<Dialog 
  bind:show 
  {title}
  confirmLabel="Select {count > 1 ? 'Factions' : 'Faction'}"
  cancelLabel="Cancel"
  {confirmDisabled}
  width="600px"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
>
  <div slot="footer-left" class="selection-count">
    {selectedFactionIds.size}/{count} selected
  </div>

  <div class="faction-table-container">
    {#if eligibleFactions.length === 0}
      <div class="no-factions">
        <i class="fas fa-exclamation-circle"></i>
        <p>No eligible factions available.</p>
      </div>
    {:else}
      <div class="faction-table">
      <div class="table-header">
        <div class="col-name">Faction</div>
        <div class="col-attitude">Current Attitude</div>
      </div>
      
      <div class="table-body">
        {#each eligibleFactions as faction (faction.id)}
          {@const config = getAttitudeConfig(faction.attitude)}
          {@const eligibility = checkEligibility(faction)}
          <div
            class="table-row"
            class:selected={selectedFactionIds.has(faction.id)}
            class:ineligible={!eligibility.eligible}
            on:click={() => toggleFaction(faction)}
          >
            <div class="col-name">
              <div class="name-text">{faction.name}</div>
              {#if !eligibility.eligible && eligibility.reason}
                <div class="ineligible-reason">{eligibility.reason}</div>
              {/if}
            </div>
            <div class="col-attitude">
              <div class="attitude-badge" style="border-color: {config.color};">
                <i class="fas {config.icon}" style="color: {config.color};"></i>
                <span>{config.displayName}</span>
              </div>
            </div>
          </div>
        {/each}
        </div>
      </div>
    {/if}
  </div>
</Dialog>

<style lang="scss">
  .faction-table-container {
    /* Remove Dialog's default body padding by using negative margins */
    margin: calc(-1 * var(--space-16)) calc(-1 * var(--space-24));
    /* Set explicit height to fill available space */
    height: 400px;
    display: flex;
    flex-direction: column;
  }

  .selection-count {
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
  }
  
  .no-factions {
    padding: 32px 24px;
    text-align: center;
    color: var(--text-tertiary);
    
    i {
      font-size: 32px;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    
    p {
      margin: 8px 0;
    }
  }
  
  .faction-table {
    border: 1px solid var(--border-medium);
    border-radius: 0; /* No radius since it fills the dialog body */
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%; /* Fill container */
  }
  
  .table-header {
    display: grid;
    grid-template-columns: 2fr 1.5fr;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(100, 116, 139, 0.15);
    border-bottom: 1px solid var(--border-medium);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .table-body {
    display: flex;
    flex-direction: column;
    overflow-y: scroll; /* Always show scrollbar */
    flex: 1;
  }
  
  .table-row {
    display: grid;
    grid-template-columns: 2fr 1.5fr;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border-medium);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-lg);
    align-items: center;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background: rgba(100, 116, 139, 0.15);
    }
    
    &.selected {
      background: var(--surface-info);
      border-left: 3px solid var(--color-primary);
      padding-left: 13px;
    }
    
    &.ineligible {
      opacity: 0.5;
      cursor: not-allowed;
      background: rgba(0, 0, 0, 0.1);
      
      &:hover {
        background: rgba(0, 0, 0, 0.15);
      }
      
      .name-text {
        color: var(--text-tertiary);
        text-decoration: line-through;
      }
    }
    
    .col-name {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .name-text {
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
      }
      
      .ineligible-reason {
        font-size: var(--font-sm);
        color: var(--text-tertiary);
        font-weight: var(--font-weight-normal);
        font-style: italic;
      }
    }
    
    .col-attitude {
      .attitude-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: var(--radius-sm);
        font-size: var(--font-sm);
        font-weight: var(--font-weight-medium);
        background: var(--surface);
        border: 1px solid var(--border-medium);
        color: var(--text-primary);
        
        i {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }
      }
    }
  }
</style>
