<script lang="ts">
  import {
    kingdomData,
    currentTurn,
    fame,
    unrest,
    imprisonedUnrest,
    settlements,
    claimedSettlements,
    resources,
    updateKingdom,
    getKingdomActor,
    currentFaction,
    availableFactions,
    currentProduction,
    doctrine,
  } from "../../../stores/KingdomStore";
  import type { KingdomData } from "../../../actors/KingdomActor";
  import { tick } from "svelte";
  import EditableStat from "./EditableStat.svelte";
  import ResourceCard from "./baseComponents/ResourceCard.svelte";
  import FameCard from "./baseComponents/FameCard.svelte";
  import Button from "./baseComponents/Button.svelte";
  import { economicsService } from "../../../services/economics";
  import { calculateSizeUnrest } from "../../../services/domain/unrest/UnrestService";
  import { getResourceIcon, getResourceColor, getDoctrineIcon } from "../utils/presentation";
  import { PLAYER_KINGDOM } from "../../../types/ownership";
  import { validateKingdomOrFactionName } from "../../../utils/reserved-names";

  // Kingdom name state
  let isEditingName = false;
  let editNameInput = "";
  let nameInputElement: HTMLInputElement;
  
  // Initialize kingdom name from actor or fallback to localStorage
  $: kingdomName = $kingdomData.name || localStorage.getItem("kingdomName") || "Kingdom Name";
  
  // Display name changes based on selected faction
  $: displayedName = $currentFaction === PLAYER_KINGDOM 
    ? kingdomName 
    : $currentFaction;
  
  // Update edit input when kingdomName changes
  $: if (!isEditingName) {
    editNameInput = kingdomName;
  }

  // Save kingdom name to both actor and localStorage
  async function saveKingdomName() {
    const newName = editNameInput.trim();
    
    // Validate name
    const validation = validateKingdomOrFactionName(newName);
    if (!validation.valid) {
      ui.notifications?.error(validation.error || 'Invalid kingdom name');
      return; // Don't save
    }
    
    if (newName) {
      // Save to actor
      await updateKingdom((k) => {
        k.name = newName;
      });
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem("kingdomName", newName);
    }
    isEditingName = false;
  }

  // Cancel name editing
  function cancelEditName() {
    editNameInput = kingdomName;
    isEditingName = false;
  }

  // Faction display name helper
  function getFactionDisplayName(factionId: string): string {
    if (factionId === PLAYER_KINGDOM) return 'Player Kingdom';
    return factionId;
  }
  
  // Only show faction switcher for GMs
  $: isGM = game.user?.isGM ?? false;

  // Fame adjustment
  function adjustFame(delta: number) {
    const newFame = $fame + delta;
    if (newFame >= 0 && newFame <= 3) {
      updateKingdom((k) => {
        k.fame = newFame;
      });
    }
  }

  // War status
  $: isAtWar = $kingdomData.isAtWar || false;

  function toggleWarStatus() {
    const newWarStatus = !$kingdomData.isAtWar;
    updateKingdom((k) => {
      k.isAtWar = newWarStatus;
    });
    localStorage.setItem("kingdomWarStatus", newWarStatus ? "war" : "peace");
  }

  // Diplomatic Support
  $: helpfulRelationships = ($kingdomData.factions || []).filter(f => f.attitude === 'Helpful').length;
  $: diplomaticCapacity = $resources.diplomaticCapacity || 0;
  $: isOverCapacity = helpfulRelationships > diplomaticCapacity;

  // Calculate unrest sources using centralized service
  $: sizeUnrest = calculateSizeUnrest($kingdomData.size);
  $: warUnrest = isAtWar ? 1 : 0;
  $: structureBonus = 0; // TODO: Calculate from actual structures

  // Calculate event-based unrest from active modifiers
  $: eventUnrest = (() => {
    let unrest = 0;
    const modifiers = $kingdomData.activeModifiers || [];
    for (const modifier of modifiers) {
      // Check if modifier has unrest effects in the modifiers array
      if (modifier.modifiers) {
        for (const mod of modifier.modifiers) {
          // Only count static modifiers that affect unrest
          if (mod.type === 'static' && mod.resource === "unrest") {
            unrest += Number(mod.value);
          }
        }
      }
    }
    return unrest;
  })();

  // Total unrest per turn
  $: totalUnrestPerTurn = sizeUnrest + warUnrest + eventUnrest - structureBonus;

  // Get production values from derived store (calculated directly from hexes)
  $: actualFoodIncome = $currentProduction.food || 0;
  $: actualLumberIncome = $currentProduction.lumber || 0;
  $: actualStoneIncome = $currentProduction.stone || 0;
  $: actualOreIncome = $currentProduction.ore || 0;

  // Calculate gold income from settlements using economics service
  $: actualGoldIncome =
    economicsService.calculateSettlementGoldIncome($settlements);

  // Calculate worksite counts from kingdom state
  $: foodProduction = $kingdomData.worksiteCount.farmlands || 0;
  $: lumberProduction = $kingdomData.worksiteCount.lumberCamps || 0;
  $: stoneProduction = $kingdomData.worksiteCount.quarries || 0;
  $: oreProduction = $kingdomData.worksiteCount.mines || 0;

  // Total worksites
  $: totalWorksites =
    foodProduction + lumberProduction + stoneProduction + oreProduction;

  // Use centralized claimedSettlements store (formerly mappedSettlements)
  $: mappedSettlements = $claimedSettlements;

  // Track which field is being edited
  let editingField: string | null = null;

  function startEditing(field: string) {
    editingField = field;
  }

  function stopEditing() {
    editingField = null;
  }

  // Calculate imprisoned unrest capacity (only from mapped settlements)
  $: imprisonedUnrestCapacity = mappedSettlements.reduce((sum, s) => {
    return sum + (s.imprisonedUnrestCapacityValue || 0);
  }, 0);

  // Additional stats configuration for unrest
  const statsConfig: Record<string, { icon: string; color: string }> = {
    unrest: { icon: "fa-hand-fist", color: "var(--color-danger)" },
    imprisoned: { icon: "fa-dungeon", color: "var(--color-warning)" },
  };

</script>

<div class="kingdom-stats-container">
  <!-- Kingdom Name Header -->
  <div class="kingdom-name-header">
    {#if !isEditingName}
      <h3 class:faction-title={$currentFaction !== PLAYER_KINGDOM}>{displayedName}</h3>
      {#if $currentFaction === PLAYER_KINGDOM}
        <button
          class="edit-btn"
          on:click={async () => {
            isEditingName = true;
            await tick();
            nameInputElement?.focus();
            nameInputElement?.select();
          }}
          title="Edit kingdom name"
        >
          <i class="fa-solid fa-pen-fancy"></i>
        </button>
      {/if}
    {:else}
      <input
        bind:this={nameInputElement}
        bind:value={editNameInput}
        on:keydown={(e) => {
          if (e.key === "Enter") saveKingdomName();
          if (e.key === "Escape") cancelEditName();
        }}
        on:blur={saveKingdomName}
        aria-label="Kingdom name"
      />
    {/if}
  </div>

  <div class="kingdom-stats-scrollable">
    <div class="kingdom-stats-content">
      <!-- Resource Dashboard -->
      <div class="stat-group-wrapper">
        {#if isGM && $availableFactions.all.length > 1}
          <div class="gm-only-panel">
            <div class="form-field-vertical faction-selector">
              <label for="faction-select">Faction</label>
              <select 
                id="faction-select"
                class="faction-select"
                bind:value={$currentFaction}
              >
                {#if $availableFactions.withTerritories.length > 0}
                  <optgroup label="With Territories">
                    {#each $availableFactions.withTerritories as faction}
                      <option value={faction}>
                        {getFactionDisplayName(faction)}
                      </option>
                    {/each}
                  </optgroup>
                {/if}
                {#if $availableFactions.withoutTerritories.length > 0}
                  <optgroup label="Without Territories">
                    {#each $availableFactions.withoutTerritories as faction}
                      <option value={faction}>
                        {getFactionDisplayName(faction)}
                      </option>
                    {/each}
                  </optgroup>
                {/if}
              </select>
            </div>
          </div>
        {/if}
        <h4 class="stat-group-header">Turn {$currentTurn}</h4>
        <div class="stat-group-card">
          <div class="resource-dashboard-grid">
            <!-- Fame Card -->
            <FameCard
                value={$fame}
                icon="fa-star"
                color="var(--color-amber)"
                size="compact"
                minValue={0}
                maxValue={3}
                onChange={(newValue) =>
                  updateKingdom((k) => {
                    k.fame = newValue;
                  })}
              />
            <!-- Gold Card -->
            <ResourceCard
                resource="gold"
                value={$resources.gold || 0}
                icon={getResourceIcon('gold')}
                color={getResourceColor('gold')}
                size="compact"
              />

            <!-- Unrest Divider -->
            <div class="resource-divider">
              <span class="divider-label">Unrest</span>
              <div class="divider-line"></div>
            </div>

            <!-- Unrest Card -->
            <ResourceCard
                resource="unrest"
                value={$unrest}
                icon={statsConfig.unrest.icon}
                color={statsConfig.unrest.color}
                size="compact"
                onChange={(newValue) =>
                  updateKingdom((k) => {
                    k.unrest = newValue;
                  })}
              />
            <!-- Imprisoned Unrest Card (Display only - edit in Settlements tab) -->
            <ResourceCard
                resource="prison"
                value={$imprisonedUnrest}
                icon={statsConfig.imprisoned.icon}
                color={statsConfig.imprisoned.color}
                size="compact"
                editable={false}
                tooltip="{$imprisonedUnrest} / {imprisonedUnrestCapacity}"
              />

            <!-- Resources Divider -->
            <div class="resource-divider">
              <span class="divider-label">Resources</span>
              <div class="divider-line"></div>
            </div>

            <!-- Food Card -->
            <ResourceCard
                resource="food"
                value={$resources.food || 0}
                icon={getResourceIcon('food')}
                color={getResourceColor('food')}
                size="compact"
              />
            <!-- Lumber Card -->
            <ResourceCard
                resource="lumber"
                value={$resources.lumber || 0}
                icon={getResourceIcon('lumber')}
                color={getResourceColor('lumber')}
                size="compact"
              />
            <!-- Stone Card -->
            <ResourceCard
                resource="stone"
                value={$resources.stone || 0}
                icon={getResourceIcon('stone')}
                color={getResourceColor('stone')}
                size="compact"
              />
            <!-- Ore Card -->
            <ResourceCard
                resource="ore"
                value={$resources.ore || 0}
                icon={getResourceIcon('ore')}
                color={getResourceColor('ore')}
                size="compact"
              />
          </div>
          <div class="stat-item form-field-vertical">
            <label for="war-status-select" class="stat-label">War Status</label>
            <select
              id="war-status-select"
              class="kingdom-select"
              on:change={toggleWarStatus}
              value={isAtWar ? "war" : "peace"}
            >
              <option value="peace">Peace</option>
              <option value="war">War</option>
            </select>
          </div>
          <!-- Diplomatic Support Card (matches ResourceCard style) -->
          <div class="diplomatic-support-card" class:over-capacity={isOverCapacity}>
            <div class="tooltip">
              Helpful factions may provide assistance. Gain additional capacity by building diplomacy structures.
            </div>
            <i class="fas fa-handshake diplomatic-icon"></i>
            <div class="diplomatic-info">
              <div class="diplomatic-value">{helpfulRelationships} / {diplomaticCapacity}</div>
              <div class="diplomatic-label">Diplomatic Support</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kingdom Size -->
      <div class="stat-group-wrapper">
        <h4 class="stat-group-header">Kingdom Size</h4>
        <div class="stat-group-card">
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-hexagon stat-icon"></i>Hexes Claimed:</span
            >
            <span class="stat-value">{$kingdomData.size}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-house stat-icon"></i>Villages:</span
            >
            <span class="stat-value"
              >{mappedSettlements.filter((s) => s.tier === "Village").length}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-building stat-icon"></i>Towns:</span
            >
            <span class="stat-value"
              >{mappedSettlements.filter((s) => s.tier === "Town").length}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-city stat-icon"></i>Cities:</span
            >
            <span class="stat-value"
              >{mappedSettlements.filter((s) => s.tier === "City").length}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-city stat-icon"></i>Metropolises:</span
            >
            <span class="stat-value"
              >{mappedSettlements.filter((s) => s.tier === "Metropolis")
                .length}</span
            >
          </div>
        </div>
      </div>

      <!-- Production -->
      <div class="stat-group-wrapper">
        <h4 class="stat-group-header">Production</h4>
        <div class="stat-group-card">
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-wheat-awn stat-icon"></i>Food:</span
            >
            <span class="stat-value"
              >{actualFoodIncome > 0 ? "+" : ""}{actualFoodIncome}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-tree stat-icon"></i>Lumber:</span
            >
            <span class="stat-value"
              >{actualLumberIncome > 0 ? "+" : ""}{actualLumberIncome}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-cube stat-icon"></i>Stone:</span
            >
            <span class="stat-value"
              >{actualStoneIncome > 0 ? "+" : ""}{actualStoneIncome}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-mountain stat-icon"></i>Ore:</span
            >
            <span class="stat-value"
              >{actualOreIncome > 0 ? "+" : ""}{actualOreIncome}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label"
              ><i class="fa-solid fa-coins stat-icon"></i>Gold:</span
            >
            <span class="stat-value"
              >{actualGoldIncome > 0 ? "+" : ""}{actualGoldIncome}</span
            >
          </div>
          <div class="stat-item has-tooltip">
            <div class="stat-tooltip">
              Unrest gain per turn. Reduce with the Deal with Unrest action or by building structures that lower unrest.
            </div>
            <span class="stat-label"
              ><i class="fa-solid fa-hand-fist stat-icon"></i>Unrest:</span
            >
            <span
              class="stat-value"
              class:danger={totalUnrestPerTurn > 0}
              class:positive={totalUnrestPerTurn < 0}
            >
              {totalUnrestPerTurn >= 0 ? "+" : ""}{totalUnrestPerTurn}
            </span>
          </div>
        </div>
      </div>

      <!-- Doctrine -->
      <div class="stat-group-wrapper">
        <h4 class="stat-group-header">Doctrine</h4>
        <div class="stat-group-card">
          <div class="stat-item has-tooltip">
            <div class="stat-tooltip">
              Accumulated from choosing idealist approaches to events. Represents compassionate and principled leadership.
            </div>
            <span class="stat-label"
              ><i class="fa-solid {getDoctrineIcon('idealist')} stat-icon"></i>Idealist:</span
            >
            <span class="stat-value">{$doctrine.idealist}</span>
          </div>
          <div class="stat-item has-tooltip">
            <div class="stat-tooltip">
              Accumulated from choosing practical approaches to events. Represents balanced and lawful leadership.
            </div>
            <span class="stat-label"
              ><i class="fa-solid {getDoctrineIcon('practical')} stat-icon"></i>Practical:</span
            >
            <span class="stat-value">{$doctrine.practical}</span>
          </div>
          <div class="stat-item has-tooltip">
            <div class="stat-tooltip">
              Accumulated from choosing ruthless approaches to events. Represents expedient and self-serving leadership.
            </div>
            <span class="stat-label"
              ><i class="fa-solid {getDoctrineIcon('ruthless')} stat-icon"></i>Ruthless:</span
            >
            <span class="stat-value">{$doctrine.ruthless}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Import our CSS variables for consistent theming */
  @import "../../../styles/variables.css";

  /* Standard Svelte component styling using CSS variables */
  .kingdom-stats-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--empty);
    border-radius: var(--radius-xl);
    overflow: hidden;
    color: var(--text-primary);
    position: relative; /* Required for absolute positioning of animations */
  }

  .kingdom-name-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-12) var(--space-16);
    background: var(--gradient-header);
    border-bottom: 2px solid var(--border-primary);
    min-height: var(--space-24);
  }

  .kingdom-name-header h3 {
    margin: 0;
    color: white;
    font-size: var(--font-3xl);
    font-weight: var(--font-weight-bold);
    flex: 1;
    text-shadow: var(--text-shadow-sm);
    font-family: var(--font-serif-rm);
    line-height: 1.3;
  }

  .kingdom-name-header h3.faction-title {
    font-size: var(--font-xl);
    line-height: 1.4;
  }

  .kingdom-name-header input {
    flex: 1;
    max-width: calc(100% - var(--space-16));
    font-size: var(--font-xl);
    font-weight: var(--font-weight-bold);
    background-color: transparent;
    border: 1px solid white;
    color: white;
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-md);
    outline: none;
      font-family: var(--font-serif-rm);
  }

  .kingdom-name-header .edit-btn {
    cursor: pointer;
    padding: var(--space-6) var(--space-8);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    color: white;
    font-size: var(--font-sm);
    transition: background-color var(--transition-fast);
  }

  .kingdom-name-header .edit-btn:hover {
    background-color: var(--border-subtle);
  }

  .kingdom-stats-scrollable {
    flex: 1;
    overflow-y: auto;
    padding: 0 0 var(--space-24) 0;
  }

  .kingdom-stats-content {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

   .stat-group-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      overflow: visible;
   }
   
   .stat-group-wrapper:first-child {
      margin-top: 0;
   }

  .stat-group-card {
    background: var(--surface-lowest);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
    border: 1px solid var(--border-subtle);
    margin: 0 var(--space-8) var(--space-16) var(--space-8);
    overflow: visible;
  }

  .stat-group-header {
    padding: 0 var(--space-20);
    color: var(--color-accent);
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.025rem;
    background: transparent;
    margin-top: var(--space-12);
    font-family: var(--font-serif-rm);
  }

  .gm-only-panel {
    background: var(--surface-special-low);
    border-radius: var(--radius-lg);
    padding: var(--space-16);
    margin: var(--space-24) var(--space-8) var(--space-8) var(--space-8);
     border: 1px solid var(--border-subtle);
  }

  .faction-selector {
    /* No additional styling needed - uses form-field-vertical from global */
  }


  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-12) var(--space-16);
    border-bottom: 1px solid var(--border-subtle);
  }


  .stat-item:last-child {
    border-bottom: none;
  }

  /* Zebra striping for better row differentiation */
  .stat-item:nth-child(even) {
    background: var(--overlay-low);
  }

  .stat-item label,
  .stat-label {
    font-size: var(--font-md);
    color: var(--text-muted);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
  }

  .stat-icon {
    display: inline-block;
    width: 1.25rem;
    margin-right: var(--space-8);
    text-align: center;
    color: var(--text-muted);
  }

  .stat-value {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
  }

  .stat-value.danger {
    color: var(--color-danger);
  }

  .stat-value.positive {
    color: var(--color-success);
  }

  /* Diplomatic Support Card - matches ResourceCard compact style */
  .diplomatic-support-card {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    background: var(--overlay-low);
    padding: var(--space-8);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);
    margin: var(--space-12) var(--space-16);
    transition: all 0.2s ease;
    position: relative;
    cursor: help;
  }
  
  .diplomatic-support-card:hover {
    outline: 2px solid var(--color-info);
    outline-offset: 0.125rem;
    background: var(--overlay);
  }

  .diplomatic-support-card.over-capacity {
    border-color: var(--color-danger);
    background: rgba(220, 38, 38, 0.1);
  }

  .diplomatic-icon {
    font-size: var(--font-xl);
    color: var(--color-info);
    flex-shrink: 0;
  }

  .diplomatic-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    align-items: center;
  }

  .diplomatic-value {
    font-size: var(--font-xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
  }

  .diplomatic-support-card.over-capacity .diplomatic-value {
    color: var(--color-danger);
  }

  .diplomatic-label {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    text-transform: capitalize;
  }

  .resource-dashboard-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-8);
    padding: var(--space-12);
  }

  .resource-divider {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: var(--space-8);
    margin: var(--space-4) 0;
  }

  .divider-label {
    font-size: var(--font-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05rem;
    white-space: nowrap;
  }

  .divider-line {
    flex: 1;
    height: 0.0625rem;
    background: var(--border-faint);
  }

  /* Custom Scrollbar - Dark Theme */
  .kingdom-stats-scrollable {
    scrollbar-width: thin;
    scrollbar-color: var(--color-primary) var(--surface-lowest);
  }

  .kingdom-stats-scrollable::-webkit-scrollbar {
    width: var(--space-8);
  }

  .kingdom-stats-scrollable::-webkit-scrollbar-track {
    background: var(--surface-lowest);
    border-radius: var(--radius-full);
  }

  .kingdom-stats-scrollable::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: var(--radius-full);
  }

  .kingdom-stats-scrollable::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-hover);
  }
  
  /* Tooltip styles for diplomatic support and stats */
  .diplomatic-support-card .tooltip,
  .stat-item .stat-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-0.5rem);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: var(--space-12) var(--space-16);
    border-radius: var(--radius-md);
    font-size: var(--font-sm);
    line-height: 1.5;
    white-space: normal;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 1001;
    min-width: 15rem;
    max-width: 20rem;
    text-align: left;
    box-shadow: var(--shadow-lg);
  }
  
  .diplomatic-support-card .tooltip::after,
  .stat-item .stat-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.95);
  }
  
  .diplomatic-support-card:hover .tooltip,
  .stat-item.has-tooltip:hover .stat-tooltip {
    opacity: 1;
  }
  
  .tooltip .warning-text {
    color: var(--color-warning);
    font-weight: var(--font-weight-semibold);
  }
  
  .stat-item.has-tooltip {
    position: relative;
    cursor: help;
  }

  .stat-item.has-tooltip:hover {
    background: var(--overlay);
  }

</style>
