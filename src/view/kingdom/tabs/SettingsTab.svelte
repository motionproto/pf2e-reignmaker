<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData } from '../../../stores/KingdomStore';
   import { KingdomSettings } from '../../../api/foundry';
   import { isKingmakerInstalled, getKingmakerRealmData } from '../../../api/kingmaker';
   import { ResetKingdomDialog } from '../../../ui/ResetKingdomDialog';
   
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
   
   // Reset kingdom data - now uses the proper ResetKingdomDialog
   async function resetKingdom() {
      await ResetKingdomDialog.show();
   }
</script>

<div class="tw-max-w-4xl tw-mx-auto tw-p-4">
   <h2 class="tw-text-2xl tw-font-bold tw-text-primary tw-border-b-2 tw-border-primary tw-pb-2 tw-mb-6">
      Kingdom Settings
   </h2>
   
   <!-- Kingdom Map Scene Selector - MOST IMPORTANT -->
   <div class="tw-card tw-bg-primary/10 tw-border tw-border-primary/20 tw-mb-4">
      <div class="tw-card-body">
         <h3 class="tw-card-title tw-text-lg">Kingdom Map Scene</h3>
         <p class="tw-text-sm tw-text-base-content/70 tw-mb-4">
            Select the scene that represents your kingdom map. This is typically called "Stolen Lands" in the Adventure Path.
         </p>
         
         <div class="tw-form-control">
            <label class="tw-label" for="kingdom-scene-select">
               <span class="tw-label-text">Kingdom Scene:</span>
            </label>
            <select 
               id="kingdom-scene-select" 
               class="tw-select tw-select-bordered tw-w-full tw-max-w-md"
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
            <div class="tw-alert tw-alert-success tw-mt-4">
               <i class="fas fa-check-circle"></i>
               <span>Currently selected: <strong>{currentScene.name}</strong></span>
            </div>
         {:else}
            <div class="tw-alert tw-alert-warning tw-mt-4">
               <i class="fas fa-exclamation-triangle"></i>
               <span>No kingdom scene selected. Please choose a scene from the dropdown above.</span>
            </div>
         {/if}
      </div>
   </div>
   
   <!-- Kingdom Status (if Kingmaker module is installed) -->
   {#if hasKingmaker}
      <div class="tw-card tw-bg-info/10 tw-border tw-border-info/20 tw-mb-4">
         <div class="tw-card-body">
            <h3 class="tw-card-title tw-text-lg">Kingdom Status</h3>
            {#if realmData}
               <div class="tw-bg-base-100 tw-rounded-lg tw-p-4">
                  <div class="tw-flex tw-justify-between tw-py-2 tw-border-b tw-border-base-300">
                     <span class="tw-text-sm tw-text-base-content/70">Kingdom Size:</span>
                     <span class="tw-font-semibold">{realmData.size} hexes</span>
                  </div>
                  
                  {#if realmData.settlements && realmData.settlements.total > 0}
                     <div class="tw-flex tw-justify-between tw-py-2 tw-border-b tw-border-base-300">
                        <span class="tw-text-sm tw-text-base-content/70">Total Settlements:</span>
                        <span class="tw-font-semibold">{realmData.settlements.total}</span>
                     </div>
                     <div class="tw-pl-4 tw-space-y-1 tw-mt-2">
                        {#if realmData.settlements.villages > 0}
                           <div class="tw-text-sm tw-text-base-content/60">
                              Villages: {realmData.settlements.villages}
                           </div>
                        {/if}
                        {#if realmData.settlements.towns > 0}
                           <div class="tw-text-sm tw-text-base-content/60">
                              Towns: {realmData.settlements.towns}
                           </div>
                        {/if}
                        {#if realmData.settlements.cities > 0}
                           <div class="tw-text-sm tw-text-base-content/60">
                              Cities: {realmData.settlements.cities}
                           </div>
                        {/if}
                        {#if realmData.settlements.metropolises > 0}
                           <div class="tw-text-sm tw-text-base-content/60">
                              Metropolises: {realmData.settlements.metropolises}
                           </div>
                        {/if}
                     </div>
                  {/if}
                  
                  {#if realmData.worksites}
                     <h4 class="tw-font-semibold tw-mt-4 tw-mb-2">Worksites & Camps</h4>
                     <div class="tw-grid tw-grid-cols-2 tw-gap-2">
                        {#if realmData.worksites.farmlands?.quantity > 0}
                           <div class="tw-bg-base-200 tw-rounded tw-p-2 tw-flex tw-justify-between">
                              <span class="tw-text-sm">Farmlands:</span>
                              <span class="tw-font-bold">{realmData.worksites.farmlands.quantity}</span>
                           </div>
                        {/if}
                        {#if realmData.worksites.lumberCamps?.quantity > 0}
                           <div class="tw-bg-base-200 tw-rounded tw-p-2 tw-flex tw-justify-between">
                              <span class="tw-text-sm">Lumber Camps:</span>
                              <span class="tw-font-bold">{realmData.worksites.lumberCamps.quantity}</span>
                           </div>
                        {/if}
                        {#if realmData.worksites.mines?.quantity > 0}
                           <div class="tw-bg-base-200 tw-rounded tw-p-2 tw-flex tw-justify-between">
                              <span class="tw-text-sm">Mines:</span>
                              <span class="tw-font-bold">{realmData.worksites.mines.quantity}</span>
                           </div>
                        {/if}
                        {#if realmData.worksites.quarries?.quantity > 0}
                           <div class="tw-bg-base-200 tw-rounded tw-p-2 tw-flex tw-justify-between">
                              <span class="tw-text-sm">Quarries:</span>
                              <span class="tw-font-bold">{realmData.worksites.quarries.quantity}</span>
                           </div>
                        {/if}
                     </div>
                  {/if}
               </div>
            {:else}
               <div class="tw-alert tw-alert-warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span>No kingdom data available. Make sure you have claimed hexes in the Kingmaker system.</span>
               </div>
            {/if}
            
            <div class="tw-alert tw-alert-info tw-mt-4">
               <i class="fa fa-info-circle"></i>
               <span class="tw-text-sm">Kingdom data updates automatically when you make changes in the Kingmaker system</span>
            </div>
         </div>
      </div>
   {:else}
      <div class="tw-card tw-bg-warning/10 tw-border tw-border-warning/20 tw-mb-4">
         <div class="tw-card-body">
            <div class="tw-alert tw-alert-warning">
               <i class="fas fa-exclamation-triangle"></i>
               <span>The PF2e Kingmaker module is not installed or not active. Kingdom information will be displayed here once the module is installed.</span>
            </div>
         </div>
      </div>
   {/if}
   
   <div class="tw-divider"></div>
   
   <!-- Gameplay Options -->
   <div class="tw-card tw-bg-base-200 tw-mb-4">
      <div class="tw-card-body">
         <h3 class="tw-card-title tw-text-lg">Gameplay Options</h3>
         
         <div class="tw-form-control">
            <label class="tw-label tw-cursor-pointer">
               <span class="tw-label-text">
                  Auto-advance phases
                  <span class="tw-block tw-text-xs tw-text-base-content/60">
                     Automatically advance to the next phase when all steps are completed
                  </span>
               </span>
               <input 
                  type="checkbox" 
                  class="tw-checkbox tw-checkbox-primary"
                  checked={autoAdvancePhase}
                  on:change={handleAutoAdvance}
               />
            </label>
         </div>
         
         <div class="tw-form-control">
            <label class="tw-label tw-cursor-pointer">
               <span class="tw-label-text">
                  Show tutorial hints
                  <span class="tw-block tw-text-xs tw-text-base-content/60">
                     Display helpful tips and explanations for game mechanics
                  </span>
               </span>
               <input 
                  type="checkbox" 
                  class="tw-checkbox tw-checkbox-primary"
                  checked={showTutorialHints}
                  on:change={handleTutorialHints}
               />
            </label>
         </div>
         
         <div class="tw-form-control">
            <label class="tw-label tw-cursor-pointer">
               <span class="tw-label-text">
                  Confirm important actions
                  <span class="tw-block tw-text-xs tw-text-base-content/60">
                     Ask for confirmation before performing irreversible actions
                  </span>
               </span>
               <input 
                  type="checkbox" 
                  class="tw-checkbox tw-checkbox-primary"
                  checked={confirmActions}
                  on:change={handleConfirmActions}
               />
            </label>
         </div>
      </div>
   </div>
   
   <!-- Kingdom Information -->
   <div class="tw-card tw-bg-base-200 tw-mb-4">
      <div class="tw-card-body">
         <h3 class="tw-card-title tw-text-lg">Kingdom Information</h3>
         
         <div class="tw-grid tw-grid-cols-2 md:tw-grid-cols-3 tw-gap-3">
            <div class="tw-stat tw-bg-base-300 tw-rounded tw-p-3">
               <div class="tw-stat-title tw-text-xs">Current Turn</div>
               <div class="tw-stat-value tw-text-lg">{$kingdomData.currentTurn}</div>
            </div>
            <div class="tw-stat tw-bg-base-300 tw-rounded tw-p-3">
               <div class="tw-stat-title tw-text-xs">Fame</div>
               <div class="tw-stat-value tw-text-lg">{$kingdomData.fame}/3</div>
            </div>
            <div class="tw-stat tw-bg-base-300 tw-rounded tw-p-3">
               <div class="tw-stat-title tw-text-xs">Total Hexes</div>
               <div class="tw-stat-value tw-text-lg">{$kingdomData.size}</div>
            </div>
            <div class="tw-stat tw-bg-base-300 tw-rounded tw-p-3">
               <div class="tw-stat-title tw-text-xs">Settlements</div>
               <div class="tw-stat-value tw-text-lg">{$kingdomData.settlements.length}</div>
            </div>
            <div class="tw-stat tw-bg-base-300 tw-rounded tw-p-3">
               <div class="tw-stat-title tw-text-xs">Armies</div>
               <div class="tw-stat-value tw-text-lg">{$kingdomData.armies.length}</div>
            </div>
            <div class="tw-stat tw-bg-base-300 tw-rounded tw-p-3">
               <div class="tw-stat-title tw-text-xs">War Status</div>
               <div class="tw-stat-value tw-text-lg">
                  {#if $kingdomData.isAtWar}
                     <span class="tw-text-error">At War</span>
                  {:else}
                     <span class="tw-text-success">At Peace</span>
                  {/if}
               </div>
            </div>
         </div>
      </div>
   </div>
   
   <!-- Danger Zone -->
   <div class="tw-card tw-bg-error/10 tw-border tw-border-error/20">
      <div class="tw-card-body">
         <h3 class="tw-card-title tw-text-lg tw-text-error">Danger Zone</h3>
         
         <button 
            class="tw-btn tw-btn-error"
            on:click={resetKingdom}
         >
            <i class="fas fa-exclamation-triangle"></i>
            Reset Kingdom Data
         </button>
         
         <p class="tw-text-sm tw-text-error/80 tw-mt-2">
            This will permanently delete all kingdom progress and cannot be undone!
         </p>
      </div>
   </div>
</div>
