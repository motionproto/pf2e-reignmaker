<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import type { Army } from '../../../models/Army';
  import type { OutcomePreview } from '../../../models/OutcomePreview';
  import Dialog from './baseComponents/Dialog.svelte';
  import { PLAYER_KINGDOM } from '../../../types/ownership';

  // Props required by pipeline interface but not used in this component
  export const instance: OutcomePreview | null = null;
  export let outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' = 'success';
  export const modifiers: any[] = [];
  export const stateChanges: any = {};
  export let applied: boolean = false;

  const dispatch = createEventDispatcher();

  // Dialog visibility
  let show = !applied;
  $: show = !applied;

  // Army selection (dropdown)
  let selectedArmyId: string | null = null;

  // Delete actor checkbox state
  let deleteActor: boolean = true;

  // Filter armies to only show those led by player
  $: eligibleArmies = ($kingdomData?.armies || [])
    .filter((army: Army) => army.ledBy === PLAYER_KINGDOM)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Auto-select first army by default
  $: if (eligibleArmies.length > 0 && !selectedArmyId) {
    selectedArmyId = eligibleArmies[0].id;
  }

  // Get the selected army
  $: army = selectedArmyId 
    ? ($kingdomData?.armies || []).find((a: Army) => a.id === selectedArmyId)
    : null;

  $: hasLinkedActor = !!army?.actorId;
  $: isSupported = army?.isSupported || false;
  $: supportedBySettlement = army?.supportedBySettlementId 
    ? ($kingdomData?.settlements || []).find(s => s.id === army?.supportedBySettlementId)?.name || ''
    : '';

  // Handle confirm
  function handleConfirm() {
    if (selectedArmyId && army) {
      dispatch('selection', {
        armyId: selectedArmyId,
        armyName: army.name,
        deleteActor: deleteActor
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
  title="Disband Army"
  confirmLabel="Disband Army"
  cancelLabel="Cancel"
  {confirmDisabled}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  width="500px"
>
  {#if eligibleArmies.length === 0}
    <p class="error">⚠️ No player armies available to disband</p>
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
      <div class="army-info">
        <div class="info-row">
          <span class="label">Level:</span>
          <span class="value">{army.level}</span>
        </div>
        <div class="info-row">
          <span class="label">Support:</span>
          <span class="value {isSupported ? 'supported' : 'unsupported'}">
            {#if isSupported && supportedBySettlement}
              Supported by {supportedBySettlement}
            {:else}
              Unsupported
            {/if}
          </span>
        </div>
      </div>

      {#if hasLinkedActor}
        <div class="actor-option">
          <label class="actor-choice">
            <input
              type="checkbox"
              bind:checked={deleteActor}
              disabled={applied}
            />
            <span>Delete NPC Actor</span>
          </label>
          <p class="actor-note">
            If unchecked, the NPC actor will be unlinked but not deleted from Foundry.
          </p>
        </div>
      {:else}
        <div class="no-actor">
          <i class="fas fa-info-circle"></i>
          <span>No linked NPC actor to delete</span>
        </div>
      {/if}
    {/if}

    <div class="warning">
      <i class="fas fa-exclamation-triangle"></i>
      <span>This action cannot be undone.</span>
    </div>
  {/if}
</Dialog>

<style lang="scss">
  @import '../../../styles/variables.css';

  .army-selection {
    margin-bottom: var(--space-16);
    gap: var(--space-8);
    
    label {
      font-weight: var(--font-weight-semibold);
      color: var(--text-muted);
      margin-bottom: var(--space-4);
    }
    
    select {
      font-size: var(--font-md);
      color: var(--text-primary);
    }
  }

  .army-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    margin: var(--space-16) 0;
    padding: var(--space-12);
    background: var(--hover-low);
    border-radius: var(--radius-md);
  }

  .info-row {
    display: flex;
    gap: var(--space-8);
    font-size: var(--font-md);

    .label {
      color: var(--text-secondary);
      font-weight: var(--font-weight-medium);
      min-width: 70px;
    }

    .value {
      color: var(--text-primary);
      font-weight: var(--font-weight-semibold);

      &.supported {
        color: var(--color-green);
      }

      &.unsupported {
        color: var(--color-orange);
      }
    }
  }

  .actor-option {
    padding: var(--space-12);
    background: var(--overlay-low);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    margin-bottom: var(--space-12);
  }

  .actor-choice {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    font-size: var(--font-md);

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
  }

  .actor-note {
    margin: var(--space-8) 0 0 26px;
    font-size: var(--font-md);
    color: var(--text-secondary);
    font-style: italic;
  }

  .no-actor {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-12);
    background: var(--hover-low);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--font-md);
    margin-bottom: var(--space-12);

    i {
      color: var(--color-blue);
    }
  }

  .warning {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-10);
    background: rgba(255, 107, 107, 0.1);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary-medium);
    color: #ff6b6b;
    font-size: var(--font-md);
    margin-top: var(--space-12);

    i {
      font-size: 14px;
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

