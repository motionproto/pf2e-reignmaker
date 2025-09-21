<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomState } from '../../../stores/kingdom';
   import { TurnPhase } from '../../../models/KingdomState';
   import { KingdomSettings } from '../../../api/foundry';
   import { isKingmakerInstalled, getKingmakerRealmData } from '../../../api/kingmaker';
   
   // Local state for settings
   let autoAdvancePhase = localStorage.getItem('autoAdvancePhase') === 'true';
   let showTutorialHints = localStorage.getItem('showTutorialHints') !== 'false';
   let confirmActions = localStorage.getItem('confirmActions') !== 'false';
   
   // Scene selection
   let allScenes: any[] = [];
   let selectedSceneId: string | null = null;
   let currentScene: any = null;
   
   // Kingdom data from Kingmaker module
   let hasKingmaker = false;
   let realmData: any = null;
   
   // Load scenes and kingdom data on mount
   onMount(async () => {
      // Get all available scenes
      allScenes = KingdomSettings.getAllScenes();
      
      // Get current selected scene
      selectedSceneId = KingdomSettings.getKingdomSceneId();
      currentScene = KingdomSettings.getKingdomScene();
      
      // Check for Kingmaker module and get realm data
      hasKingmaker = isKingmakerInstalled();
      if (hasKingmaker) {
         realmData = getKingmakerRealmData();
      }
   });
   
   // Handle scene selection
   async function handleSceneChange(e: Event) {
      const target = e.target as HTMLSelectElement;
      const sceneId = target.value;
      
      if (sceneId) {
         try {
            await KingdomSettings.setKingdomSceneId(sceneId);
            selectedSceneId = sceneId;
            currentScene = allScenes.find(s => s.id === sceneId);
            console.log(`Kingdom scene updated to: ${currentScene?.name}`);
            
            // Refresh realm data if Kingmaker is installed
            if (hasKingmaker) {
               realmData = getKingmakerRealmData();
            }
         } catch (error) {
            console.error('Failed to save kingdom scene:', error);
         }
      }
   }
   
   // Save settings to localStorage
   function saveSetting(key: string, value: boolean) {
      localStorage.setItem(key, value.toString());
   }
   
   // Handle settings changes
   function handleAutoAdvance(e: Event) {
      const target = e.target as HTMLInputElement;
      autoAdvancePhase = target.checked;
      saveSetting('autoAdvancePhase', autoAdvancePhase);
   }
   
   function handleTutorialHints(e: Event) {
      const target = e.target as HTMLInputElement;
      showTutorialHints = target.checked;
      saveSetting('showTutorialHints', showTutorialHints);
   }
   
   function handleConfirmActions(e: Event) {
      const target = e.target as HTMLInputElement;
      confirmActions = target.checked;
      saveSetting('confirmActions', confirmActions);
   }
   
   // Reset kingdom data
   function resetKingdom() {
      if (confirm('Are you sure you want to reset all kingdom data? This cannot be undone!')) {
         // Reset kingdom state
         $kingdomState.currentTurn = 1;
         $kingdomState.currentPhase = TurnPhase.PHASE_I;
         $kingdomState.fame = 0;
         $kingdomState.unrest = 0;
         $kingdomState.imprisonedUnrest = 0;
         $kingdomState.resources.clear();
         $kingdomState.resources.set('gold', 0);
         $kingdomState.resources.set('food', 0);
         $kingdomState.resources.set('lumber', 0);
         $kingdomState.resources.set('stone', 0);
         $kingdomState.resources.set('ore', 0);
         $kingdomState.hexes = [];
         $kingdomState.settlements = [];
         $kingdomState.armies = [];
         $kingdomState.buildQueue = [];
         $kingdomState.phaseStepsCompleted.clear();
         
         // Clear localStorage
         localStorage.removeItem('kingdomWarStatus');
         localStorage.removeItem('kingdomName');
         
         alert('Kingdom data has been reset.');
      }
   }
</script>

<div class="settings-container">
   <h2>Kingdom Settings</h2>
   
   <!-- Kingdom Map Scene Selector - MOST IMPORTANT -->
   <div class="settings-section scene-selector-section">
      <h3>Kingdom Map Scene</h3>
      <p class="setting-description">
         Select the scene that represents your kingdom map. This is typically called "Stolen Lands" in the Adventure Path.
      </p>
      
      <div class="scene-selector-control">
         <label for="kingdom-scene-select">Kingdom Scene:</label>
         <select 
            id="kingdom-scene-select" 
            class="kingdom-select wide-select"
            on:change={handleSceneChange}
            value={selectedSceneId || ''}
         >
            <option value="">-- Select a Scene --</option>
            {#each allScenes as scene}
               <option value={scene.id} selected={selectedSceneId === scene.id}>
                  {scene.name}
               </option>
            {/each}
         </select>
      </div>
      
      {#if currentScene}
         <div class="scene-info">
            <i class="fas fa-check-circle"></i>
            Currently selected: <strong>{currentScene.name}</strong>
         </div>
      {:else}
         <div class="scene-info warning">
            <i class="fas fa-exclamation-triangle"></i>
            No kingdom scene selected. Please choose a scene from the dropdown above.
         </div>
      {/if}
   </div>
   
   <!-- Kingdom Status (if Kingmaker module is installed) -->
   {#if hasKingmaker}
      <div class="settings-section kingdom-status-section">
         <h3>Kingdom Status</h3>
         {#if realmData}
            <div class="kingdom-data">
               <div class="data-row">
                  <span class="data-label">Kingdom Size:</span>
                  <span class="data-value">{realmData.size} hexes</span>
               </div>
               
               {#if realmData.settlements && realmData.settlements.total > 0}
                  <div class="data-row">
                     <span class="data-label">Total Settlements:</span>
                     <span class="data-value">{realmData.settlements.total}</span>
                  </div>
                  {#if realmData.settlements.villages > 0}
                     <div class="data-sub-row">
                        Villages: {realmData.settlements.villages}
                     </div>
                  {/if}
                  {#if realmData.settlements.towns > 0}
                     <div class="data-sub-row">
                        Towns: {realmData.settlements.towns}
                     </div>
                  {/if}
                  {#if realmData.settlements.cities > 0}
                     <div class="data-sub-row">
                        Cities: {realmData.settlements.cities}
                     </div>
                  {/if}
                  {#if realmData.settlements.metropolises > 0}
                     <div class="data-sub-row">
                        Metropolises: {realmData.settlements.metropolises}
                     </div>
                  {/if}
               {/if}
               
               {#if realmData.worksites}
                  <h4 class="subsection-header">Worksites & Camps</h4>
                  <div class="worksites-grid">
                     {#if realmData.worksites.farmlands?.quantity > 0}
                        <div class="worksite-item">
                           <span class="worksite-name">Farmlands:</span>
                           <span class="worksite-qty">{realmData.worksites.farmlands.quantity}</span>
                        </div>
                     {/if}
                     {#if realmData.worksites.lumberCamps?.quantity > 0}
                        <div class="worksite-item">
                           <span class="worksite-name">Lumber Camps:</span>
                           <span class="worksite-qty">{realmData.worksites.lumberCamps.quantity}</span>
                        </div>
                     {/if}
                     {#if realmData.worksites.mines?.quantity > 0}
                        <div class="worksite-item">
                           <span class="worksite-name">Mines:</span>
                           <span class="worksite-qty">{realmData.worksites.mines.quantity}</span>
                        </div>
                     {/if}
                     {#if realmData.worksites.quarries?.quantity > 0}
                        <div class="worksite-item">
                           <span class="worksite-name">Quarries:</span>
                           <span class="worksite-qty">{realmData.worksites.quarries.quantity}</span>
                        </div>
                     {/if}
                  </div>
               {/if}
            </div>
         {:else}
            <div class="scene-info warning">
               No kingdom data available. Make sure you have claimed hexes in the Kingmaker system.
            </div>
         {/if}
         
         <div class="refresh-info">
            <i class="fa fa-info-circle"></i>
            Kingdom data updates automatically when you make changes in the Kingmaker system
         </div>
      </div>
   {:else}
      <div class="settings-section">
         <div class="scene-info warning">
            <i class="fas fa-exclamation-triangle"></i>
            The PF2e Kingmaker module is not installed or not active.
            Kingdom information will be displayed here once the module is installed.
         </div>
      </div>
   {/if}
   
   <hr class="settings-divider" />
   
   <div class="settings-section">
      <h3>Gameplay Options</h3>
      
      <div class="setting-item">
         <label>
            <input 
               type="checkbox" 
               checked={autoAdvancePhase}
               on:change={handleAutoAdvance}
            />
            <span>Auto-advance phases</span>
         </label>
         <p class="setting-description">
            Automatically advance to the next phase when all steps are completed
         </p>
      </div>
      
      <div class="setting-item">
         <label>
            <input 
               type="checkbox" 
               checked={showTutorialHints}
               on:change={handleTutorialHints}
            />
            <span>Show tutorial hints</span>
         </label>
         <p class="setting-description">
            Display helpful tips and explanations for game mechanics
         </p>
      </div>
      
      <div class="setting-item">
         <label>
            <input 
               type="checkbox" 
               checked={confirmActions}
               on:change={handleConfirmActions}
            />
            <span>Confirm important actions</span>
         </label>
         <p class="setting-description">
            Ask for confirmation before performing irreversible actions
         </p>
      </div>
   </div>
   
   <div class="settings-section">
      <h3>Kingdom Information</h3>
      
      <div class="info-grid">
         <div class="info-item">
            <span class="info-label">Current Turn:</span>
            <span class="info-value">{$kingdomState.currentTurn}</span>
         </div>
         <div class="info-item">
            <span class="info-label">Fame:</span>
            <span class="info-value">{$kingdomState.fame}/3</span>
         </div>
         <div class="info-item">
            <span class="info-label">Total Hexes:</span>
            <span class="info-value">{$kingdomState.size}</span>
         </div>
         <div class="info-item">
            <span class="info-label">Settlements:</span>
            <span class="info-value">{$kingdomState.settlements.length}</span>
         </div>
         <div class="info-item">
            <span class="info-label">Armies:</span>
            <span class="info-value">{$kingdomState.armies.length}</span>
         </div>
         <div class="info-item">
            <span class="info-label">War Status:</span>
            <span class="info-value">{$kingdomState.isAtWar ? 'At War' : 'At Peace'}</span>
         </div>
      </div>
   </div>
   
   <div class="settings-section danger-zone">
      <h3>Danger Zone</h3>
      
      <button 
         class="danger-button"
         on:click={resetKingdom}
      >
         <i class="fas fa-exclamation-triangle"></i>
         Reset Kingdom Data
      </button>
      
      <p class="danger-warning">
         This will permanently delete all kingdom progress and cannot be undone!
      </p>
   </div>
</div>

<style lang="scss">
   .settings-container {
      max-width: 800px;
      margin: 0 auto;
      
      h2 {
         margin: 0 0 20px 0;
         color: var(--color-primary, #5e0000);
         border-bottom: 2px solid var(--color-primary, #5e0000);
         padding-bottom: 10px;
      }
   }
   
   .settings-section {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
      
      h3 {
         margin: 0 0 15px 0;
         color: var(--color-text-dark-primary, #b5b3a4);
         font-size: 1.2em;
      }
      
      &.scene-selector-section {
         background: rgba(94, 0, 0, 0.05);
         border: 1px solid rgba(94, 0, 0, 0.2);
      }
      
      &.kingdom-status-section {
         background: rgba(0, 50, 100, 0.05);
         border: 1px solid rgba(0, 50, 100, 0.2);
      }
      
      &.danger-zone {
         background: rgba(200, 50, 50, 0.1);
         border: 1px solid rgba(200, 50, 50, 0.3);
      }
   }
   
   .scene-selector-control {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 15px 0;
      
      label {
         font-weight: 500;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .wide-select {
      flex: 1;
      max-width: 400px;
   }
   
   .kingdom-select {
      padding: 4px 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.3);
      color: var(--color-text-dark-primary, #b5b3a4);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      
      &:focus {
         outline: none;
         border-color: var(--color-primary, #5e0000);
      }
   }
   
   .scene-info {
      padding: 10px;
      background: rgba(0, 100, 0, 0.1);
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &.warning {
         background: rgba(200, 100, 0, 0.1);
         color: #ff9800;
      }
      
      i {
         font-size: 1.1em;
      }
      
      strong {
         color: var(--color-primary, #5e0000);
      }
   }
   
   .kingdom-data {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
   }
   
   .data-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      
      &:last-child {
         border-bottom: none;
      }
      
      .data-label {
         font-weight: 500;
         color: var(--color-text-dark-secondary, #7a7971);
      }
      
      .data-value {
         font-weight: 600;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .data-sub-row {
      padding: 4px 0 4px 20px;
      color: var(--color-text-dark-secondary, #7a7971);
      font-size: 0.9em;
   }
   
   .subsection-header {
      margin: 15px 0 10px 0;
      color: var(--color-text-dark-primary, #b5b3a4);
      font-size: 1em;
      font-weight: 600;
   }
   
   .worksites-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
   }
   
   .worksite-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
      
      .worksite-name {
         color: var(--color-text-dark-secondary, #7a7971);
      }
      
      .worksite-qty {
         font-weight: 600;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .refresh-info {
      margin-top: 15px;
      padding: 8px;
      background: rgba(0, 100, 200, 0.1);
      border-radius: 3px;
      color: var(--color-text-dark-secondary, #7a7971);
      font-size: 0.9em;
      display: flex;
      align-items: center;
      gap: 8px;
      
      i {
         color: #2196F3;
      }
   }
   
   .settings-divider {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin: 30px 0;
   }
   
   .setting-item {
      margin-bottom: 20px;
      
      label {
         display: flex;
         align-items: center;
         gap: 10px;
         cursor: pointer;
         font-weight: 500;
         color: var(--color-text-dark-primary, #b5b3a4);
         
         input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
         }
         
         span {
            user-select: none;
         }
      }
      
      .setting-description {
         margin: 5px 0 0 28px;
         color: var(--color-text-dark-secondary, #7a7971);
         font-size: 0.9em;
         line-height: 1.4;
      }
   }
   
   .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
   }
   
   .info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      
      .info-label {
         color: var(--color-text-dark-secondary, #7a7971);
         font-weight: 500;
      }
      
      .info-value {
         color: var(--color-text-dark-primary, #b5b3a4);
         font-weight: 600;
      }
   }
   
   .danger-button {
      padding: 10px 20px;
      background: rgba(200, 50, 50, 0.8);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1em;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      
      &:hover {
         background: rgba(200, 50, 50, 1);
         transform: translateY(-1px);
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      
      i {
         font-size: 1.1em;
      }
   }
   
   .danger-warning {
      margin: 10px 0 0 0;
      color: rgba(200, 50, 50, 0.9);
      font-size: 0.9em;
      font-style: italic;
   }
</style>
