<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../stores/KingdomStore';
  import { structuresService } from '../../services/structures';

  export let show: boolean = false;

  const dispatch = createEventDispatcher();

  // Get settlements with imprisoned unrest, sorted by imprisoned unrest descending
  $: settlementsWithPrisoners = ($kingdomData?.settlements || [])
    .map(settlement => {
      const imprisonedUnrest = settlement.imprisonedUnrest || 0;
      const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
      return { ...settlement, imprisonedUnrest, capacity };
    })
    .filter(s => s.imprisonedUnrest > 0 && s.capacity > 0)
    .sort((a, b) => {
      // Sort by imprisoned unrest descending
      if (b.imprisonedUnrest !== a.imprisonedUnrest) {
        return b.imprisonedUnrest - a.imprisonedUnrest;
      }
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });

  function handleSelect(settlementId: string) {
    dispatch('settlementSelected', { settlementId });
    show = false;
  }

  function handleCancel() {
    show = false;
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click={handleCancel}>
    <div class="dialog-content" on:click|stopPropagation>
      <div class="dialog-header">
        <h2>Execute or Pardon Prisoners</h2>
        <button class="close-btn" on:click={handleCancel}>
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="guidance">
        <i class="fas fa-gavel"></i>
        <p>Choose the settlement where you will pass judgment on imprisoned dissidents. Your choice will determine the outcome through execution or clemency.</p>
      </div>

      <div class="settlements-list">
        {#each settlementsWithPrisoners as settlement}
          <button class="settlement-item" on:click={() => handleSelect(settlement.id)}>
            <div class="settlement-header">
              <span class="settlement-name">{settlement.name}</span>
              <span class="settlement-level">Level {settlement.level}</span>
            </div>
            <div class="settlement-info">
              <div class="info-item">
                <i class="fas fa-users"></i>
                <span>{settlement.imprisonedUnrest} imprisoned unrest</span>
              </div>
              <div class="info-item capacity">
                <i class="fas fa-dungeon"></i>
                <span>{settlement.capacity} capacity</span>
              </div>
            </div>
          </button>
        {/each}

        {#if settlementsWithPrisoners.length === 0}
          <div class="no-settlements">
            <i class="fas fa-exclamation-triangle"></i>
            <p>No settlements with imprisoned unrest found. Use the Arrest Dissidents action first to imprison unrest.</p>
          </div>
        {/if}
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" on:click={handleCancel}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
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
    background: var(--color-gray-900, #1f1f23);
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.2));
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border-medium, rgba(255, 255, 255, 0.1));

    h2 {
      margin: 0;
      font-size: var(--font-2xl);
      color: var(--text-primary, #e0e0e0);
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary, #a0a0a0);
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.2s;

    &:hover {
      color: var(--text-primary, #e0e0e0);
    }
  }

  .guidance {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px 20px;
    background: rgba(139, 92, 246, 0.1);
    border-bottom: 1px solid rgba(139, 92, 246, 0.2);

    i {
      color: var(--color-purple, #8b5cf6);
      margin-top: 2px;
    }

    p {
      margin: 0;
      font-size: var(--font-md);
      color: var(--text-secondary, #a0a0a0);
      line-height: 1.5;
    }
  }

  .settlements-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .settlement-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-medium, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--color-purple, #8b5cf6);
      transform: translateY(-1px);
    }
  }

  .settlement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .settlement-name {
    font-size: var(--font-lg);
    font-weight: 600;
    color: var(--text-primary, #e0e0e0);
  }

  .settlement-level {
    font-size: var(--font-sm);
    color: var(--text-secondary, #a0a0a0);
  }

  .settlement-info {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-md);
    color: var(--color-red, #ef4444);

    i {
      font-size: 14px;
    }

    &.capacity {
      color: var(--text-secondary, #a0a0a0);
    }
  }

  .no-settlements {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    background: rgba(249, 115, 22, 0.1);
    border: 1px solid rgba(249, 115, 22, 0.2);
    border-radius: 6px;
    color: var(--text-secondary, #a0a0a0);

    i {
      color: var(--color-orange, #f97316);
      font-size: 20px;
    }

    p {
      margin: 0;
      font-size: var(--font-md);
    }
  }

  .dialog-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border-medium, rgba(255, 255, 255, 0.1));
    display: flex;
    justify-content: flex-end;
  }

  .cancel-btn {
    background: var(--color-gray-700, #3f3f46);
    color: var(--text-primary, #e0e0e0);
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: var(--font-md);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-gray-600, #52525b);
    }
  }
</style>
