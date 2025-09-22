<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import type { KingdomState } from '../../../models/KingdomState';
   
   // Kingdom name state
   let isEditingName = false;
   let kingdomName = localStorage.getItem('kingdomName') || 'Kingdom Name';
   let editNameInput = kingdomName;
   
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
      const newFame = $kingdomState.fame + delta;
      if (newFame >= 0 && newFame <= 3) {
         $kingdomState.fame = newFame;
      }
   }
   
   // War status
   $: isAtWar = $kingdomState.isAtWar || false;
   
   function toggleWarStatus() {
      $kingdomState.isAtWar = !$kingdomState.isAtWar;
      localStorage.setItem('kingdomWarStatus', $kingdomState.isAtWar ? 'war' : 'peace');
   }
   
   // Calculate unrest sources
   $: sizeUnrest = Math.floor($kingdomState.size / 8);
   $: warUnrest = isAtWar ? 1 : 0;
   $: structureBonus = 0; // TODO: Calculate from actual structures
   $: unrestPerTurn = Math.max(0, sizeUnrest + warUnrest - structureBonus);
   
   // Calculate production (simplified for now)
   $: foodProduction = $kingdomState.worksiteCount.get('farmlands') || 0;
   $: lumberProduction = $kingdomState.worksiteCount.get('lumberCamps') || 0;
   $: stoneProduction = $kingdomState.worksiteCount.get('quarries') || 0;
   $: oreProduction = $kingdomState.worksiteCount.get('mines') || 0;
   
   // Total worksites
   $: totalWorksites = foodProduction + lumberProduction + stoneProduction + oreProduction;
</script>

<div class="kingdom-stats-container">
   <!-- Kingdom Name Header -->
   <div class="kingdom-name-header">
      {#if !isEditingName}
         <h3>{kingdomName}</h3>
         <button 
            class="edit-btn"
            on:click={() => isEditingName = true}
            title="Edit kingdom name"
         >
            <i class="fa-solid fa-pen-fancy"></i>
         </button>
      {:else}
         <input
            bind:value={editNameInput}
            on:keydown={(e) => {
               if (e.key === 'Enter') saveKingdomName();
               if (e.key === 'Escape') cancelEditName();
            }}
            on:blur={saveKingdomName}
            autofocus
         />
      {/if}
   </div>
   
   <div class="kingdom-stats-scrollable">
      <div class="kingdom-stats-content">
         
         <!-- Core Trackers -->
         <div class="stat-group">
            <h4 class="stat-group-header">Turn {$kingdomState.currentTurn}</h4>
            <div class="stat-item">
               <label>Fame:</label>
               <div class="fame-controls">
                  <button 
                     class="stat-adjust-button" 
                     on:click={() => adjustFame(-1)}
                     disabled={$kingdomState.fame <= 0}
                     title="Decrease Fame"
                  >
                     <i class="fas fa-minus"></i>
                  </button>
                  <span class="stat-value fame-value">{$kingdomState.fame}</span>
                  <button 
                     class="stat-adjust-button" 
                     on:click={() => adjustFame(1)}
                     disabled={$kingdomState.fame >= 3}
                     title="Increase Fame"
                  >
                     <i class="fas fa-plus"></i>
                  </button>
               </div>
            </div>
            <div class="stat-item">
               <label>Gold:</label>
               <span class="stat-value">{$kingdomState.resources.get('gold') || 0}</span>
            </div>
            <div class="stat-item">
               <label>War Status:</label>
               <select class="kingdom-select" on:change={toggleWarStatus} value={isAtWar ? 'war' : 'peace'}>
                  <option value="peace">Peace</option>
                  <option value="war">War</option>
               </select>
            </div>
         </div>
         
         <!-- Unrest -->
         <div class="stat-group">
            <h4 class="stat-group-header">Unrest</h4>
            <div class="stat-item">
               <label>Current Unrest:</label>
               <span class="stat-value" class:danger={$kingdomState.unrest > 5}>
                  {$kingdomState.unrest}
               </span>
            </div>
            {#if $kingdomState.imprisonedUnrest > 0}
               <div class="stat-item">
                  <label>Imprisoned:</label>
                  <span class="stat-value imprisoned">{$kingdomState.imprisonedUnrest}</span>
               </div>
            {/if}
            <div class="stat-item">
               <label>From Size:</label>
               <span class="stat-value">+{sizeUnrest}</span>
            </div>
            {#if isAtWar}
               <div class="stat-item">
                  <label>From War:</label>
                  <span class="stat-value danger">+{warUnrest}</span>
               </div>
            {/if}
            <div class="stat-item">
               <label>Structure Bonus:</label>
               <span class="stat-value">-{structureBonus}</span>
            </div>
            <div class="stat-item">
               <label>Per Turn:</label>
               <span class="stat-value" class:danger={unrestPerTurn > 0} class:positive={unrestPerTurn < 0}>
                  {unrestPerTurn >= 0 ? '+' : ''}{unrestPerTurn}
               </span>
            </div>
         </div>
         
         <!-- Kingdom Size -->
         <div class="stat-group">
            <h4 class="stat-group-header">Kingdom Size</h4>
            <div class="stat-item">
               <label>Hexes Claimed:</label>
               <span class="stat-value">{$kingdomState.size}</span>
            </div>
            <div class="stat-item">
               <label>Total Settlements:</label>
               <span class="stat-value">{$kingdomState.settlements.length}</span>
            </div>
            <div class="stat-item">
               <label>Villages:</label>
               <span class="stat-value">{$kingdomState.settlements.filter(s => s.tier === 'Village').length}</span>
            </div>
            <div class="stat-item">
               <label>Towns:</label>
               <span class="stat-value">{$kingdomState.settlements.filter(s => s.tier === 'Town').length}</span>
            </div>
            <div class="stat-item">
               <label>Cities:</label>
               <span class="stat-value">{$kingdomState.settlements.filter(s => s.tier === 'City').length}</span>
            </div>
            <div class="stat-item">
               <label>Metropolises:</label>
               <span class="stat-value">{$kingdomState.settlements.filter(s => s.tier === 'Metropolis').length}</span>
            </div>
         </div>
         
         <!-- Resources -->
         <div class="stat-group">
            <h4 class="stat-group-header">Resources</h4>
            <div class="resource-section">
               <div class="resource-header">Food</div>
               <div class="stat-item">
                  <label>Current:</label>
                  <span class="stat-value">{$kingdomState.resources.get('food') || 0}</span>
               </div>
               <div class="stat-item">
                  <label>Farmlands:</label>
                  <span class="stat-value">{foodProduction}</span>
               </div>
               <div class="stat-item">
                  <label>Production:</label>
                  <span class="stat-value">{foodProduction * 2}/turn</span>
               </div>
            </div>
            
            <div class="resource-section">
               <div class="resource-header">Resource Income</div>
               <div class="resource-grid">
                  <div class="resource-item">
                     <label>Lumber:</label>
                     <span>{$kingdomState.resources.get('lumber') || 0}</span>
                  </div>
                  <div class="resource-item">
                     <label>Stone:</label>
                     <span>{$kingdomState.resources.get('stone') || 0}</span>
                  </div>
                  <div class="resource-item">
                     <label>Ore:</label>
                     <span>{$kingdomState.resources.get('ore') || 0}</span>
                  </div>
               </div>
               <div class="stat-item">
                  <label>Total Worksites:</label>
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
      font-size: 2rem;
      font-weight: 700;
      flex: 1;
      font-family: var(--header-font);
      text-shadow: var(--text-shadow-sm);
   }
   
   .kingdom-name-header input {
      flex: 1;
      max-width: calc(100% - 1rem);
      font-size: 1.25rem;
      font-weight: 700;
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
      font-size: 0.875rem;
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
      font-size: 1.5rem;
      font-weight: 700;
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
   
   .stat-item label {
      font-size: 1rem;
      color: var(--text-muted);
      font-weight: 500;
   }
   
   .stat-value {
      font-size: 1rem;
      font-weight: 700;
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
      color: var(--color-accent);
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
      font-size: 0.75rem;
      color: var(--text-secondary);
   }
   
   .kingdom-select {
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border-default);
      border-radius: 0.25rem;
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
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
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-accent);
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
   
   .resource-item label {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
   }
   
   .resource-item span {
      font-size: 1rem;
      font-weight: 700;
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
