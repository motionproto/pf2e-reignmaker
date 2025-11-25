<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import type { Army } from '../../../models/Army';
  import type { ActiveCheckInstance } from '../../../models/CheckInstance';
  import Dialog from './baseComponents/Dialog.svelte';

  // Props required by pipeline interface but not used in this component
  export const instance: ActiveCheckInstance | null = null;
  export let outcome: 'success' | 'criticalSuccess' | 'criticalFailure' = 'success';
  export const modifiers: any[] = [];
  export const stateChanges: any = {};
  export let applied: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Dialog visibility
  let show = !applied;
  $: show = !applied;

  // Army selection (dropdown)
  let selectedArmyId: string | null = null;
  
  // ✅ FIX: Get party level from PF2e party actor
  // Uses PF2e's built-in party actor system.details.level property
  function getPartyLevel(): number {
    const game = (globalThis as any).game;
    if (!game?.actors) return 1;
    
    // Get party level directly from PF2e party actor
    const partyActors = Array.from(game.actors as any[]).filter((a: any) => a.type === 'party');
    
    if (partyActors.length === 0) return 1;
    
    // Use the first party actor (there should only be one)
    const partyActor = partyActors[0] as any;
    
    // Get level from PF2e party actor structure
    if (partyActor.system?.details?.level !== undefined) {
      // Could be a number or an object with a value property
      const level = typeof partyActor.system.details.level === 'number' 
        ? partyActor.system.details.level 
        : partyActor.system.details.level.value || 1;
      return level;
    }
    
    return 1;
  }
  
  $: partyLevel = getPartyLevel();
  
  // Filter armies based on outcome
  // For success/critical success: only armies below party level (need to level up)
  // For critical failure: all armies (just applying negative effect)
  $: eligibleArmies = (outcome === 'criticalFailure')
    ? ($kingdomData?.armies || []).sort((a, b) => a.name.localeCompare(b.name))
    : ($kingdomData?.armies || [])
        .filter((army: Army) => army.level < partyLevel)
        .sort((a, b) => a.name.localeCompare(b.name));

  // Auto-select first army by default
  $: if (eligibleArmies.length > 0 && !selectedArmyId) {
    selectedArmyId = eligibleArmies[0].id;
  }
  
  // Get the selected army
  $: army = selectedArmyId 
    ? ($kingdomData?.armies || []).find((a: Army) => a.id === selectedArmyId)
    : null;

  // Handle confirm
  function handleConfirm() {
    if (selectedArmyId && army) {
      dispatch('selection', {
        armyId: selectedArmyId,
        armyName: army.name,
        currentLevel: army.level,
        targetLevel: partyLevel,
        outcome
      });
      show = false;
    }
  }
  
  // Handle cancel
  function handleCancel() {
    dispatch('cancel');
    show = false;
  }
  
  // Disable confirm button if no army selected
  $: confirmDisabled = !selectedArmyId;
</script>

<Dialog
  bind:show
  title="Train Army"
  confirmLabel="Apply Training"
  cancelLabel="Cancel"
  {confirmDisabled}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="500px"
>
  <div class="outcome-message">
    {#if outcome === 'criticalSuccess'}
      <p>Army will receive Well Trained: +1 to all saving throws</p>
    {:else if outcome === 'success'}
      <p>Army will be trained to party level</p>
    {:else if outcome === 'criticalFailure'}
      <p>Army will receive Poorly Trained: -1 to all saving throws</p>
    {/if}
  </div>

  {#if eligibleArmies.length === 0}
    <p class="error">⚠️ {outcome === 'criticalFailure' ? 'No armies available' : 'No armies available below party level'}</p>
  {:else}
    <!-- Army Selection Dropdown -->
    <div class="form-field-vertical army-selection">
      <label for="army-select">Select Army:</label>
      <select 
        id="army-select"
        bind:value={selectedArmyId}
        disabled={applied}
      >
        <option value={null}>-- Choose an army --</option>
        {#each eligibleArmies as army}
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
            {army.name} [{army.level}] - {supportText}
          </option>
        {/each}
      </select>
    </div>

        {#if army}
      <div class="training-summary">
        {#if outcome === 'criticalFailure'}
          <p><strong>{army.name}</strong> will receive Poorly Trained: -1 to all saving throws</p>
        {:else if outcome === 'criticalSuccess'}
          <p><strong>{army.name}</strong> will be trained from level <strong>{army.level}</strong> to level <strong>{partyLevel}</strong></p>
          <p class="bonus-info">
            <i class="fa-solid fa-star"></i> Well Trained: +1 to all saving throws
          </p>
        {:else}
          <p><strong>{army.name}</strong> will be trained from level <strong>{army.level}</strong> to level <strong>{partyLevel}</strong></p>
        {/if}
      </div>
    {/if}
  {/if}
</Dialog>

<style lang="scss">
  @import '../../../styles/variables.css';

  .outcome-message {
    margin-bottom: var(--space-16);
    
    p {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--font-md);
      text-align: start;
    }
  }

  .army-selection {
    margin-bottom: var(--space-16);
    gap: var(--space-8); /* Increase spacing between label and select */
    
    /* Override label styling from form-field-vertical - keep design system colors */
    label {
      font-weight: var(--font-weight-semibold);
      color: var(--text-muted); /* Match form-controls.css */
      margin-bottom: var(--space-4);
    }
    
    /* Ensure select uses medium font size and design system colors */
    select {
      font-size: var(--font-md);
      color: var(--text-primary); /* Match form-controls.css */
    }
  }

  .training-summary {
    margin-top: var(--space-16);
    padding: var(--space-16);
    background: var(--surface-success-low);
    border: 1px solid var(--border-success-subtle);
    border-radius: var(--radius-lg);
    
    p {
      margin: var(--space-8) 0;
      color: var(--text-primary);
      font-size: var(--font-md);
      
      &:first-child {
        margin-top: 0;
      }
      
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    strong {
      color: var(--text-primary);
      font-weight: var(--font-weight-semibold);
    }
  }

  .bonus-info {
    color: var(--color-green);
    font-weight: var(--font-weight-semibold);
    display: flex;
    align-items: center;
    gap: var(--space-8);
    
    i {
      font-size: var(--font-md);
    }
  }

  .error {
    color: var(--color-red);
    text-align: center;
    padding: var(--space-16);
    background: var(--surface-primary-low);
    border: 1px solid var(--border-primary-subtle);
    border-radius: var(--radius-lg);
    font-size: var(--font-md);
  }
</style>

