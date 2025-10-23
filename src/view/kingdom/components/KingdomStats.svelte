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
  } from "../../../stores/KingdomStore";
  import type { KingdomData } from "../../../actors/KingdomActor";
  import { tick } from "svelte";
  import EditableStat from "./EditableStat.svelte";
  import ResourceCard from "./baseComponents/ResourceCard.svelte";
  import FameCard from "./baseComponents/FameCard.svelte";
  import { economicsService } from "../../../services/economics";
  import { calculateSizeUnrest } from "../../../services/domain/unrest/UnrestService";
  import { getResourceIcon, getResourceColor } from "../utils/presentation";

  // Kingdom name state
  let isEditingName = false;
  let editNameInput = "";
  let nameInputElement: HTMLInputElement;
  
  // Initialize kingdom name from actor or fallback to localStorage
  $: kingdomName = $kingdomData.name || localStorage.getItem("kingdomName") || "Kingdom Name";
  
  // Update edit input when kingdomName changes
  $: if (!isEditingName) {
    editNameInput = kingdomName;
  }

  // Save kingdom name to both actor and localStorage
  async function saveKingdomName() {
    if (editNameInput.trim()) {
      const newName = editNameInput.trim();
      
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

  // Get production values from the kingdom data
  $: actualFoodIncome = $kingdomData.worksiteProduction?.food || 0;
  $: actualLumberIncome = $kingdomData.worksiteProduction?.lumber || 0;
  $: actualStoneIncome = $kingdomData.worksiteProduction?.stone || 0;
  $: actualOreIncome = $kingdomData.worksiteProduction?.ore || 0;

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
      <h3>{kingdomName}</h3>
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
          <div class="stat-item">
            <label for="war-status-select" class="stat-label">War Status:</label
            >
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
          <div class="stat-item">
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
    background-color: var(--bg-base);
    border-radius: 0.5rem;
    overflow: hidden;
    color: var(--text-primary);
    position: relative; /* Required for absolute positioning of animations */
  }

  .kingdom-name-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--gradient-header);
    border-bottom: 2px solid var(--border-primary);
    min-height: 60px;
  }

  .kingdom-name-header h3 {
    margin: 0;
    color: white;
    font-size: var(--font-3xl);
    font-weight: var(--font-weight-bold);
    flex: 1;
    text-shadow: var(--text-shadow-sm);
    font-family: var(--font-serif-rm);
  }

  .kingdom-name-header input {
    flex: 1;
    max-width: calc(100% - 1rem);
    font-size: var(--font-xl);
    font-weight: var(--font-weight-bold);
    background-color: transparent;
    border: 1px solid white;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    outline: none;
      font-family: var(--font-serif-rm);
  }

  .kingdom-name-header .edit-btn {
    cursor: pointer;
    padding: 0.375rem 0.5rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    color: white;
    font-size: var(--font-sm);
    transition: background-color var(--transition-fast);
  }

  .kingdom-name-header .edit-btn:hover {
    background-color: var(--border-default);
  }

  .kingdom-stats-scrollable {
    flex: 1;
    overflow-y: auto;
    padding: 0 0 4rem 0;
  }

  .kingdom-stats-content {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

   .stat-group-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
   }
   
   .stat-group-wrapper:first-child {
      margin-top: 0;
   }

  .stat-group-card {
    background: var(--bg-elevated);
    border-radius: 0.5rem;
    padding: 0 0 0.5rem 0;
    box-shadow: var(--shadow-card);
    border: 1px solid var(--border-default);
    margin: 0 0.5rem 0 0.5rem;
  }

  .stat-group-header {
    padding: 0rem 1.25rem;
    color: var(--color-accent);
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.025em;
    background: transparent;
    margin-bottom: .25rem;
    margin-top: 1.5rem;
      font-family: var(--font-serif-rm);
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-default);
  }

  .stat-item:last-child {
    border-bottom: none;
  }

  /* Zebra striping for better row differentiation */
  .stat-item:nth-child(even) {
    background: rgba(0, 0, 0, 0.1);
  }

  /* Styles for editable rows */
  .stat-item.editable {
    cursor: pointer;
    transition: background-color var(--transition-fast);
    position: relative;
  }

  .stat-item.editable:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .stat-item.editable.editing {
    background: rgba(94, 0, 0, 0.1);
    border-color: var(--color-primary);
  }

  /* When editing, hide the value's hover effect */
  .stat-item.editable.editing :global(.stat-value.editable:hover) {
    background: transparent !important;
    padding: 0.125rem 0 !important;
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
    margin-right: 0.5rem;
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

  .fame-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .fame-controls .fame-value {
    min-width: 30px;
    text-align: center;
    color: var(--text-primary);
  }

  .stat-adjust-button {
    width: 24px;
    height: 24px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
    color: var(--text-primary);
  }

  .stat-adjust-button:hover:not(:disabled) {
    background: var(--bg-subtle);
    border-color: var(--border-primary);
    transform: scale(1.1);
  }

  .stat-adjust-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .stat-adjust-button i {
    font-size: var(--font-xs);
    color: var(--text-secondary);
  }

  .kingdom-select {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-default);
    border-radius: 0.25rem;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    width: auto;
    min-width: fit-content;
  }

  .kingdom-select:focus {
    outline: none;
    border-color: var(--border-primary);
    box-shadow: var(--shadow-focus);
  }

  /* Diplomatic Support Card - matches ResourceCard compact style */
  .diplomatic-support-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0.75rem 1rem;
    transition: all 0.2s ease;
  }

  .diplomatic-support-card.over-capacity {
    border-color: var(--color-danger);
    background: rgba(220, 38, 38, 0.1);
  }

  .diplomatic-icon {
    font-size: 1.25rem;
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
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .resource-divider {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.25rem 0;
  }

  .divider-label {
    font-size: var(--font-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .divider-line {
    flex: 1;
    height: 1px;
    background: var(--border-subtle);
  }

  .resource-section {
    padding: 1.5rem 0.75rem 1rem 0.75rem;
    border-top: 1px solid var(--border-default);
  }

  .resource-section:first-child {
    margin-top: 0;
    padding: 0.75rem 1rem;
    border-top: none;
  }

  .resource-header {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    margin-top: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .resource-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    background: var(--bg-surface);
    border-radius: 0.25rem;
  }

  .resource-label {
    font-size: var(--font-md);
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .resource-item > span:last-child {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
  }

  /* Custom Scrollbar - Dark Theme */
  .kingdom-stats-scrollable {
    scrollbar-width: thin;
    scrollbar-color: var(--color-primary) var(--bg-surface);
  }

  .kingdom-stats-scrollable::-webkit-scrollbar {
    width: 8px;
  }

  .kingdom-stats-scrollable::-webkit-scrollbar-track {
    background: var(--bg-surface);
    border-radius: 9999px;
  }

  .kingdom-stats-scrollable::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: 9999px;
  }

  .kingdom-stats-scrollable::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-hover);
  }
</style>
