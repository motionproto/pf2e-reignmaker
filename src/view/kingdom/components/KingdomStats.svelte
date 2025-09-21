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

<style lang="scss">
   .kingdom-stats-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
   }
   
   .kingdom-name-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background-color: #2c3e50;
      border-bottom: 2px solid #34495e;
      min-height: 60px;
      
      h3 {
         margin: 0;
         color: #ecf0f1;
         font-size: 20px;
         font-weight: 600;
         flex: 1;
         font-family: 'Modesto Condensed', 'Eczar', serif;
      }
      
      input {
         flex: 1;
         font-size: 20px;
         font-weight: 600;
         background-color: transparent;
         border: 1px solid #ecf0f1;
         color: #ecf0f1;
         padding: 4px 8px;
         border-radius: 4px;
         outline: none;
         font-family: 'Modesto Condensed', 'Eczar', serif;
      }
      
      .edit-btn {
         cursor: pointer;
         padding: 6px 8px;
         border-radius: 4px;
         display: flex;
         align-items: center;
         background: transparent;
         border: none;
         color: #ecf0f1;
         font-size: 14px;
         transition: background-color 0.2s;
         
         &:hover {
            background-color: rgba(255, 255, 255, 0.1);
         }
      }
   }
   
   .kingdom-stats-scrollable {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
   }
   
   .kingdom-stats-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
   }
   
   .stat-group {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
   }
   
   .stat-group-header {
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #3498db;
      color: #2c3e50;
      font-size: 16px;
      font-weight: 600;
      font-family: 'Modesto Condensed', serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
   }
   
   .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
         border-bottom: none;
      }
      
      label {
         font-size: 14px;
         color: #6c757d;
         font-weight: 500;
      }
   }
   
   .stat-value {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      
      &.danger {
         color: #e74c3c;
      }
      
      &.positive {
         color: #27ae60;
      }
      
      &.imprisoned {
         color: #6c757d;
      }
   }
   
   .fame-controls {
      display: flex;
      align-items: center;
      gap: 8px;
   }
   
   .fame-value {
      min-width: 30px;
      text-align: center;
   }
   
   .stat-adjust-button {
      width: 24px;
      height: 24px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover:not(:disabled) {
         background: #f0f0f0;
         border-color: #999;
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
      
      i {
         font-size: 12px;
         color: #666;
      }
   }
   
   .kingdom-select {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      color: #2c3e50;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      
      &:focus {
         outline: none;
         border-color: #3498db;
      }
   }
   
   .resource-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      
      &:first-child {
         margin-top: 0;
         padding-top: 0;
         border-top: none;
      }
   }
   
   .resource-header {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
   }
   
   .resource-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 12px 0;
   }
   
   .resource-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      
      label {
         font-size: 12px;
         color: #6c757d;
         margin-bottom: 4px;
      }
      
      span {
         font-size: 16px;
         font-weight: 600;
         color: #2c3e50;
      }
   }
   
   /* Custom Scrollbar */
   .kingdom-stats-scrollable::-webkit-scrollbar {
      width: 8px;
   }
   
   .kingdom-stats-scrollable::-webkit-scrollbar-track {
      background: #f1f1f1;
   }
   
   .kingdom-stats-scrollable::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
   }
   
   .kingdom-stats-scrollable::-webkit-scrollbar-thumb:hover {
      background: #555;
   }
</style>
