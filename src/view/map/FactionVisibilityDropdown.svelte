<script lang="ts">
  /**
   * FactionVisibilityDropdown - Multi-select dropdown for filtering territory visibility by faction
   * 
   * Features:
   * - Trigger button showing count of visible factions
   * - Dropdown list with checkboxes for each faction that has territory
   * - Color swatch next to each faction name
   * - "Show All" / "Hide All" quick actions
   */
  import { kingdomData, allHexesByFaction, hiddenFactions } from '../../stores/KingdomStore';
  import { PLAYER_KINGDOM } from '../../types/ownership';
  
  // Dropdown open state
  let isOpen = false;
  let dropdownElement: HTMLDivElement;
  
  // Get all factions that have claimed hexes (excluding 'unclaimed')
  $: factionsWithHexes = Array.from($allHexesByFaction.keys())
    .filter(f => f !== 'unclaimed')
    .sort((a, b) => {
      // Player kingdom always first
      if (a === PLAYER_KINGDOM) return -1;
      if (b === PLAYER_KINGDOM) return 1;
      return a.localeCompare(b);
    });
  
  // Count visible factions
  $: visibleCount = factionsWithHexes.filter(f => !$hiddenFactions.has(f)).length;
  $: totalCount = factionsWithHexes.length;
  
  // Get faction display info
  function getFactionInfo(factionId: string) {
    const hexCount = $allHexesByFaction.get(factionId)?.length || 0;
    
    if (factionId === PLAYER_KINGDOM) {
      return {
        name: 'Your Kingdom',
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
  
  // Toggle faction visibility
  function toggleFaction(factionId: string) {
    hiddenFactions.update($set => {
      const newSet = new Set($set);
      if (newSet.has(factionId)) {
        newSet.delete(factionId);
      } else {
        newSet.add(factionId);
      }
      return newSet;
    });
  }
  
  // Check if faction is visible
  function isVisible(factionId: string): boolean {
    return !$hiddenFactions.has(factionId);
  }
  
  // Show all factions
  function showAll() {
    hiddenFactions.set(new Set());
  }
  
  // Hide all factions
  function hideAll() {
    hiddenFactions.set(new Set(factionsWithHexes));
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
    title="Filter visible factions"
  >
    <i class="fas fa-filter"></i>
    <span class="count">{visibleCount}/{totalCount}</span>
    <i class="fas fa-chevron-down chevron" class:rotated={isOpen}></i>
  </button>
  
  {#if isOpen}
    <div class="dropdown-panel">
      <div class="dropdown-header">
        <span>Faction Visibility</span>
        <div class="quick-actions">
          <button on:click={showAll} title="Show all" class="quick-btn">
            <i class="fas fa-eye"></i>
          </button>
          <button on:click={hideAll} title="Hide all" class="quick-btn">
            <i class="fas fa-eye-slash"></i>
          </button>
        </div>
      </div>
      
      <div class="faction-list">
        {#each factionsWithHexes as factionId}
          {@const info = getFactionInfo(factionId)}
          <label class="faction-item" class:hidden={!isVisible(factionId)}>
            <input 
              type="checkbox" 
              checked={isVisible(factionId)}
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
    gap: var(--space-8);
    padding: var(--space-8) var(--space-12);
    background: var(--hover-low);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s;
    font-size: var(--font-sm);
    
    &:hover {
      background: var(--hover);
      border-color: var(--border-default);
      color: #fff;
    }
    
    &.open {
      background: var(--hover);
      border-color: var(--color-primary, #8b0000);
    }
    
    .count {
      font-weight: 600;
    }
    
    .chevron {
      font-size: 0.625rem;
      transition: transform 0.2s;
      
      &.rotated {
        transform: rotate(180deg);
      }
    }
  }
  
  .dropdown-panel {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: var(--space-4);
    background: rgba(20, 20, 20, 0.98);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: 0 0.25rem 1rem var(--overlay-high);
    z-index: 100;
    min-width: 12rem;
    overflow: hidden;
  }
  
  .dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-8) var(--space-12);
    background: var(--overlay-low);
    border-bottom: 1px solid var(--border-subtle);
    
    span {
      font-size: var(--font-sm);
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.03rem;
    }
  }
  
  .quick-actions {
    display: flex;
    gap: var(--space-4);
  }
  
  .quick-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: var(--space-4);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    
    &:hover {
      color: white;
      background: var(--hover);
    }
    
    i {
      font-size: var(--font-sm);
    }
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
    
    &.hidden {
      opacity: 0.5;
      
      .color-swatch {
        opacity: 0.4;
      }
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

















