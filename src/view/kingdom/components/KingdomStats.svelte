<script lang="ts">
   import { kingdomData, resources, updateKingdom, modifyResource } from '../../../stores/KingdomStore';
   import type { KingdomState } from '../../../models/KingdomState';
   import { tick } from 'svelte';
   import EditableStat from './EditableStat.svelte';
   
   // Kingdom name state
   let isEditingName = false;
   let kingdomName = localStorage.getItem('kingdomName') || 'Kingdom Name';
   let editNameInput = kingdomName;
   let nameInputElement: HTMLInputElement;
   
   // Save kingdom name
   function saveKingdomName() {
      if (editNameInput.trim()) {
         kingdomName = editNameInput.trim();
         localStorage.setItem('kingdomName', kingdomName);
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
      const newFame = $kingdomData.fame + delta;
      if (newFame >= 0 && newFame <= 3) {
         updateKingdom(k => { k.fame = newFame; });
      }
   }
   
   // War status
   $: isAtWar = $kingdomData.isAtWar || false;
   
   function toggleWarStatus() {
      const newWarStatus = !$kingdomData.isAtWar;
      updateKingdom(k => { k.isAtWar = newWarStatus; });
      localStorage.setItem('kingdomWarStatus', newWarStatus ? 'war' : 'peace');
   }
   
   // Calculate unrest sources
   $: sizeUnrest = Math.floor($kingdomData.size / 8);
   $: warUnrest = isAtWar ? 1 : 0;
   $: structureBonus = 0; // TODO: Calculate from actual structures
   
   // Calculate event-based unrest from modifiers
   $: eventUnrest = (() => {
      let unrest = 0;
      for (const modifier of $kingdomData.modifiers) {
         if (modifier.effects?.unrest) {
            unrest += modifier.effects.unrest;
         }
      }
      return unrest;
   })();
   
   // Total unrest per turn
   $: totalUnrestPerTurn = sizeUnrest + warUnrest + eventUnrest - structureBonus;
   
   // Get production values from the kingdom data
   $: actualFoodIncome = $kingdomData.cachedProduction.food || 0;
   $: actualLumberIncome = $kingdomData.cachedProduction.lumber || 0;
   $: actualStoneIncome = $kingdomData.cachedProduction.stone || 0;
   $: actualOreIncome = $kingdomData.cachedProduction.ore || 0;
   
   // Calculate worksite counts from kingdom state
   $: foodProduction = $kingdomData.worksiteCount.farmlands || 0;
   $: lumberProduction = $kingdomData.worksiteCount.lumberCamps || 0;
   $: stoneProduction = $kingdomData.worksiteCount.quarries || 0;
   $: oreProduction = $kingdomData.worksiteCount.mines || 0;
   
   // Total worksites
   $: totalWorksites = foodProduction + lumberProduction + stoneProduction + oreProduction;
   
   // Track which field is being edited
   let editingField: string | null = null;
   
   function startEditing(field: string) {
      editingField = field;
   }
   
   function stopEditing() {
      editingField = null;
   }
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
               if (e.key === 'Enter') saveKingdomName();
               if (e.key === 'Escape') cancelEditName();
            }}
            on:blur={saveKingdomName}
            aria-label="Kingdom name"
         />
      {/if}
   </div>
   
   <div class="kingdom-stats-scrollable">
      <div class="kingdom-stats-content">
         
         <!-- Core Trackers -->
         <div class="stat-group">
            <h4 class="stat-group-header">Turn {$kingdomData.currentTurn}</h4>
            <div class="stat-item">
               <span class="stat-label">Fame:</span>
               <div class="fame-controls">
                  <button 
                     class="stat-adjust-button" 
                     on:click={() => adjustFame(-1)}
                     disabled={$kingdomData.fame <= 0}
                     title="Decrease Fame"
                  >
                     <i class="fas fa-minus"></i>
                  </button>
                  <span class="stat-value fame-value">{$kingdomData.fame}</span>
                  <button 
                     class="stat-adjust-button" 
                     on:click={() => adjustFame(1)}
                     disabled={$kingdomData.fame >= 3}
                     title="Increase Fame"
                  >
                     <i class="fas fa-plus"></i>
                  </button>
               </div>
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div 
               class="stat-item editable" 
               class:editing={editingField === 'gold'}
               on:click={() => startEditing('gold')}
            >
               <span class="stat-label">Gold:</span>
               <EditableStat 
                  value={$resources.gold || 0}
                  onChange={(newValue) => modifyResource('gold', newValue)}
                  isExternallyControlled={true}
                  isEditing={editingField === 'gold'}
                  onStartEdit={() => startEditing('gold')}
                  onStopEdit={stopEditing}
               />
            </div>
            <div class="stat-item">
               <label for="war-status-select" class="stat-label">War Status:</label>
               <select id="war-status-select" class="kingdom-select" on:change={toggleWarStatus} value={isAtWar ? 'war' : 'peace'}>
                  <option value="peace">Peace</option>
                  <option value="war">War</option>
               </select>
            </div>
         </div>
         
         <!-- Unrest -->
         <div class="stat-group">
            <h4 class="stat-group-header">Unrest</h4>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div 
               class="stat-item editable"
               class:editing={editingField === 'unrest'}
               on:click={() => startEditing('unrest')}
            >
               <span class="stat-label">Current Unrest:</span>
               <EditableStat 
                  value={$kingdomData.unrest}
                  onChange={(newValue) => updateKingdom(k => { k.unrest = newValue; })}
                  className={$kingdomData.unrest > 5 ? 'danger' : ''}
                  isExternallyControlled={true}
                  isEditing={editingField === 'unrest'}
                  onStartEdit={() => startEditing('unrest')}
                  onStopEdit={stopEditing}
               />
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div 
               class="stat-item editable"
               class:editing={editingField === 'imprisoned'}
               on:click={() => startEditing('imprisoned')}
            >
               <span class="stat-label">Imprisoned:</span>
               <EditableStat 
                  value={$kingdomData.imprisonedUnrest}
                  onChange={(newValue) => updateKingdom(k => { k.imprisonedUnrest = newValue; })}
                  className="imprisoned"
                  isExternallyControlled={true}
                  isEditing={editingField === 'imprisoned'}
                  onStartEdit={() => startEditing('imprisoned')}
                  onStopEdit={stopEditing}
               />
            </div>
            <div class="stat-item">
               <span class="stat-label">From Size:</span>
               <span class="stat-value">+{sizeUnrest}</span>
            </div>
            {#if isAtWar}
               <div class="stat-item">
                  <span class="stat-label">From War:</span>
                  <span class="stat-value danger">+{warUnrest}</span>
               </div>
            {/if}
            {#if eventUnrest > 0}
               <div class="stat-item">
                  <span class="stat-label">From Events:</span>
                  <span class="stat-value danger">+{eventUnrest}</span>
               </div>
            {/if}
            {#if structureBonus > 0}
               <div class="stat-item">
                  <span class="stat-label">Structure Bonus:</span>
                  <span class="stat-value positive">-{structureBonus}</span>
               </div>
            {/if}
            <div class="stat-item">
               <span class="stat-label">Total Per Turn:</span>
               <span class="stat-value" class:danger={totalUnrestPerTurn > 0} class:positive={totalUnrestPerTurn < 0}>
                  {totalUnrestPerTurn >= 0 ? '+' : ''}{totalUnrestPerTurn}
               </span>
            </div>
         </div>
         
         <!-- Kingdom Size -->
         <div class="stat-group">
            <h4 class="stat-group-header">Kingdom Size</h4>
            <div class="stat-item">
               <span class="stat-label">Hexes Claimed:</span>
               <span class="stat-value">{$kingdomData.size}</span>
            </div>
            <div class="stat-item">
               <span class="stat-label">Villages:</span>
               <span class="stat-value">{$kingdomData.settlements.filter(s => s.tier === 'Village').length}</span>
            </div>
            <div class="stat-item">
               <span class="stat-label">Towns:</span>
               <span class="stat-value">{$kingdomData.settlements.filter(s => s.tier === 'Town').length}</span>
            </div>
            <div class="stat-item">
               <span class="stat-label">Cities:</span>
               <span class="stat-value">{$kingdomData.settlements.filter(s => s.tier === 'City').length}</span>
            </div>
            <div class="stat-item">
               <span class="stat-label">Metropolises:</span>
               <span class="stat-value">{$kingdomData.settlements.filter(s => s.tier === 'Metropolis').length}</span>
            </div>
         </div>
         
         <!-- Resources -->
         <div class="stat-group">
            <h4 class="stat-group-header">Resources</h4>
            <div class="resource-section">
               <div class="resource-header">Food</div>
               <!-- svelte-ignore a11y-click-events-have-key-events -->
               <!-- svelte-ignore a11y-no-static-element-interactions -->
               <div 
                  class="stat-item editable"
                  class:editing={editingField === 'food'}
                  on:click={() => startEditing('food')}
               >
                  <span class="stat-label">Current:</span>
                  <EditableStat 
                     value={$resources.food || 0}
                     onChange={(newValue) => modifyResource('food', newValue)}
                     isExternallyControlled={true}
                     isEditing={editingField === 'food'}
                     onStartEdit={() => startEditing('food')}
                     onStopEdit={stopEditing}
                  />
               </div>
               <div class="stat-item">
                  <span class="stat-label">Farmlands:</span>
                  <span class="stat-value">{foodProduction}</span>
               </div>
            <div class="stat-item">
               <span class="stat-label">Production:</span>
               <span class="stat-value">{actualFoodIncome}</span>
            </div>
            </div>
            
            <div class="resource-section">
               <div class="resource-header">Resource Income</div>
               <div class="resource-grid">
                  <div class="resource-item">
                     <span class="resource-label">Lumber</span>
                     <span>{actualLumberIncome}</span>
                  </div>
                  <div class="resource-item">
                     <span class="resource-label">Stone</span>
                     <span>{actualStoneIncome}</span>
                  </div>
                  <div class="resource-item">
                     <span class="resource-label">Ore</span>
                     <span>{actualOreIncome}</span>
                  </div>
               </div>
               <div class="stat-item">
                  <span class="stat-label">Total Worksites:</span>
                  <span class="stat-value">{totalWorksites}</span>
               </div>
            </div>
         </div>
         
      </div>
   </div>
</div>

<style>
   /* Import our CSS variables for consistent theming */
   @import '../../../styles/variables.css';
   
   /* Standard Svelte component styling using CSS variables */
   .kingdom-stats-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: var(--bg-surface);
      border-radius: 0.5rem;
      overflow: hidden;
      color: var(--text-primary);
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
      font-size: var(--font-4xl);
      font-weight: var(--font-weight-bold);
      flex: 1;
      font-family: var(--header-font);
      text-shadow: var(--text-shadow-sm);
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
      font-family: var(--display-font);
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
      padding: 1rem 0 0 0;
   }
   
   .kingdom-stats-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
   }
   
   .stat-group {
      background: var(--bg-elevated);
      border-radius: 0.5rem;
      padding: 0 0 0.5rem 0;
      box-shadow: var(--shadow-card);
   }
   
   .stat-group-header {
      margin-bottom: .5rem;
      padding: 0.5rem 1rem;
      background: #333333;
      border-bottom: 1px solid var(--border-subtle);
      border-radius: 0.5rem 0.5rem 0 0;
      color: var(--text-primary);
      font-size: var(--font-3xl);
      font-weight: var(--font-weight-bold);
      font-family: var(--header-font);
      letter-spacing: 0.025em;
   }
   
   .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-subtle);
   }
   
   .stat-item:last-child {
      border-bottom: none;
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
   
   .stat-value.imprisoned {
      color: var(--color-gray-500);
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
   
   .resource-section {

      padding: 1.5rem .75rem 1rem .75rem;
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
