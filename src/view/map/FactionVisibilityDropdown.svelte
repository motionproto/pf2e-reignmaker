<script lang="ts">
  /**
   * FactionVisibilityDropdown - Multi-select dropdown for filtering territory visibility by faction
   *
   * Features:
   * - Small chevron button beside Territory overlay toggle
   * - Directly toggles PIXI container visibility for each faction
   * - Color swatch next to each faction name
   */
  import { kingdomData, allHexesByFaction, hiddenFactions } from '../../stores/KingdomStore';
  import { PLAYER_KINGDOM } from '../../types/ownership';
  import { setTerritoryFactionVisibility } from '../../services/map/overlays/TerritoryCompositeOverlay';

  // Dropdown open state
  let isOpen = false;
  let dropdownElement: HTMLDivElement;

  // Get all factions that have claimed hexes (excluding 'unclaimed')
  // Always include player kingdom even if they have no hexes yet
  $: factionsWithHexes = (() => {
    const fromHexes = Array.from($allHexesByFaction.keys()).filter(f => f !== 'unclaimed');
    // Ensure player kingdom is always included
    if (!fromHexes.includes(PLAYER_KINGDOM)) {
      fromHexes.push(PLAYER_KINGDOM);
    }
    return fromHexes.sort((a, b) => {
      // Player kingdom always first
      if (a === PLAYER_KINGDOM) return -1;
      if (b === PLAYER_KINGDOM) return 1;
      return a.localeCompare(b);
    });
  })();

  // Get faction display info
  function getFactionInfo(factionId: string) {
    const hexCount = $allHexesByFaction.get(factionId)?.length || 0;

    if (factionId === PLAYER_KINGDOM) {
      return {
        name: $kingdomData.name || 'Your Kingdom',
        color: $kingdomData.playerKingdomColor || '#5b9bd5',
        hexCount
      };
    }

    const faction = $kingdomData.factions?.find((f: any) => f.id === factionId);
    return {
      name: faction?.name || factionId,
      color: faction?.color || '#666666',
      hexCount
    };
  }

  // Toggle faction visibility - updates both store and PIXI containers
  function toggleFaction(factionId: string) {
    hiddenFactions.update($set => {
      const newSet = new Set($set);
      const willBeVisible = newSet.has(factionId);

      if (willBeVisible) {
        newSet.delete(factionId);
      } else {
        newSet.add(factionId);
      }

      // Directly toggle PIXI container visibility via composite overlay
      setTerritoryFactionVisibility(factionId, willBeVisible);

      return newSet;
    });
  }

  // Toggle dropdown
  function toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    isOpen = !isOpen;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="faction-dropdown" bind:this={dropdownElement}>
  <button
    class="dropdown-trigger"
    class:open={isOpen}
    on:click={toggleDropdown}
    title="Select visible factions"
  >
    <i class="fas fa-chevron-down" class:rotated={isOpen}></i>
  </button>

  {#if isOpen}
    <div class="dropdown-panel">
      <div class="faction-list">
        {#each factionsWithHexes as factionId (factionId)}
          {@const info = getFactionInfo(factionId)}
          <label class="faction-item">
            <input
              type="checkbox"
              checked={!$hiddenFactions.has(factionId)}
              on:change={() => toggleFaction(factionId)}
            />
            <span
              class="color-swatch"
              style="background-color: {info.color}"
            ></span>
            <span class="faction-name">{info.name}</span>
            <span class="hex-count">({info.hexCount})</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .faction-dropdown {
    position: relative;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    background: var(--hover-low);
    border: 2px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.625rem;
    flex-shrink: 0;

    &:hover {
      background: var(--hover);
      border-color: var(--border-default);
      color: #fff;
    }

    &.open {
      background: var(--hover);
      border-color: var(--color-primary, #8b0000);
      color: var(--color-primary, #8b0000);
    }

    i {
      transition: transform 0.2s;

      &.rotated {
        transform: rotate(180deg);
      }
    }
  }

  .dropdown-panel {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: var(--space-4);
    background: rgba(20, 20, 20, 0.98);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: 0 0.25rem 1rem var(--overlay-high);
    z-index: 100;
    min-width: 14rem;
    overflow: hidden;
  }

  .faction-list {
    max-height: 15rem;
    overflow-y: auto;
    padding: var(--space-8);
  }

  .faction-item {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-8) var(--space-8);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: var(--hover);
    }

    input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
      accent-color: var(--color-primary, #8b0000);
      cursor: pointer;
    }
  }

  .color-swatch {
    width: 1rem;
    height: 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }

  .faction-name {
    flex: 1;
    font-size: var(--font-md);
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hex-count {
    font-size: var(--font-sm);
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
  }
</style>
