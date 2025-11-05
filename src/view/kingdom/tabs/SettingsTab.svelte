<script lang="ts">
   import { onMount } from 'svelte';
   import { KingdomSettings } from '../../../api/foundry';
   import { SaveLoadService } from '../../../services/SaveLoadService';
   import { kingdomData } from '../../../stores/KingdomStore';
   import { logger } from '../../../utils/Logger';
   
   // Check if user is GM
   let isGM = false;
   
   // Local state for settings
   let autoAdvancePhase = localStorage.getItem('autoAdvancePhase') === 'true';
   let showTutorialHints = localStorage.getItem('showTutorialHints') !== 'false';
   let confirmActions = localStorage.getItem('confirmActions') !== 'false';
   
   // Scene selection
   let allScenes: any[] = [];
   let selectedSceneId: string | null = null;
   let currentScene: any = null;
   
   // Hexes per unrest setting
   let hexesPerUnrest: number = 8;
   
   // Load scenes and settings on mount
   onMount(async () => {
      // Check if user is GM
      // @ts-ignore - Foundry globals
      isGM = game.user?.isGM || false;
      
      // Get all available scenes
      allScenes = KingdomSettings.getAllScenes();
      
      // Get current selected scene
      selectedSceneId = KingdomSettings.getKingdomSceneId();
      currentScene = KingdomSettings.getKingdomScene();
      
      // Load hexes per unrest setting
      try {
         // @ts-ignore - Foundry globals
         hexesPerUnrest = (game.settings.get('pf2e-reignmaker', 'hexesPerUnrest') as number) || 8;
      } catch (error) {
         logger.warn('Failed to load hexesPerUnrest setting:', error);
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

         } catch (error) {
            logger.error('Failed to save kingdom scene:', error);
         }
      }
   }
   
   // Handle hexes per unrest change
   async function handleHexesPerUnrestChange(e: Event) {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      
      if (!isNaN(value) && value >= 4 && value <= 12) {
         try {
            // @ts-ignore - Foundry globals
            await game.settings.set('pf2e-reignmaker', 'hexesPerUnrest', value);
            hexesPerUnrest = value;

         } catch (error) {
            logger.error('Failed to save hexes per unrest:', error);
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
   
   // Export kingdom data
   async function exportKingdom() {
      if (!$kingdomData) {
         ui.notifications?.error('No kingdom data to export');
         return;
      }
      
      try {
         await SaveLoadService.exportKingdom($kingdomData);
      } catch (error) {
         logger.error('[SettingsTab] Export failed:', error);
      }
   }
   
   // Import kingdom data
   let fileInput: HTMLInputElement;
   
   async function importKingdom() {
      fileInput.click();
   }
   
   async function handleFileSelected(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      
      if (!file) return;
      
      try {
         // Create backup before importing
         if ($kingdomData) {
            const createBackup = confirm('Create a backup of current kingdom data before importing?');
            if (createBackup) {
               await SaveLoadService.createBackup($kingdomData);
            }
         }
         
         // Import the kingdom data
         const importedData = await SaveLoadService.importKingdom(file);
         
         // Validate the imported data
         if (!SaveLoadService.validateKingdomData(importedData)) {
            throw new Error('Imported data failed validation');
         }
         
         // Get kingdom actor and update it
         const { getKingdomActor } = await import('../../../stores/KingdomStore');
         const actor = getKingdomActor();
         
         if (!actor) {
            throw new Error('No kingdom actor found');
         }
         
         // Confirm before overwriting
         const confirmed = confirm(
            `This will replace your current kingdom data with:\n\n` +
            `Kingdom: ${importedData.name || 'Unknown'}\n` +
            `Turn: ${importedData.currentTurn}\n` +
            `Fame: ${importedData.fame}\n` +
            `Unrest: ${importedData.unrest}\n\n` +
            `Are you sure you want to continue?`
         );
         
         if (confirmed) {
            await actor.setKingdomData(importedData);
            ui.notifications?.success('Kingdom data imported successfully!');
         }
      } catch (error) {
         logger.error('[SettingsTab] Import failed:', error);
      } finally {
         // Clear the file input
         input.value = '';
      }
   }
</script>

{#if !isGM}
   <div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-full tw-p-8 tw-gap-4">
      <i class="fas fa-lock tw-text-6xl tw-text-base-content/30"></i>
      <p class="tw-text-3xl tw-font-light tw-text-center tw-text-base-content/60">
         Settings are only available to the Game Master.
      </p>
   </div>
{:else}
   <div class="tw-max-w-5xl tw-mx-auto tw-p-6">
      <div class="tw-grid tw-grid-cols-2 tw-gap-8">
         <!-- Left Column -->
         <div class="tw-space-y-8">
            <!-- Kingdom Map Scene Selector -->
            <section class="tw-space-y-4">
               <h3 class="tw-text-xl tw-font-bold tw-text-accent">Kingdom Map Scene</h3>
               
               <select 
                  id="kingdom-scene-select" 
                  class="tw-select tw-select-bordered tw-w-full"
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
               
               {#if currentScene}
                  <div class="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-success">
                     <i class="fas fa-check-circle"></i>
                     <span>Currently using: <strong>{currentScene.name}</strong></span>
                  </div>
               {:else}
                  <div class="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-warning">
                     <i class="fas fa-exclamation-triangle"></i>
                     <span>No scene selected</span>
                  </div>
               {/if}
            </section>
            
            <!-- Gameplay Options -->
            <section class="tw-space-y-4">
               <h3 class="tw-text-xl tw-font-bold tw-text-accent">Gameplay Options</h3>
               
               <div class="tw-space-y-4">
                  <div class="tw-space-y-2">
                     <div class="tw-font-semibold tw-text-base-content">Auto-advance Phases</div>
                     <label class="tw-flex tw-items-start tw-gap-3 tw-cursor-pointer">
                        <input 
                           type="checkbox" 
                           class="tw-checkbox tw-checkbox-primary tw-mt-0.5"
                           checked={autoAdvancePhase}
                           on:change={handleAutoAdvance}
                        />
                        <div class="tw-text-sm tw-text-base-content/70">
                           Automatically advance to the next phase when all steps are completed
                        </div>
                     </label>
                  </div>
                  
                  <div class="tw-space-y-2">
                     <div class="tw-font-semibold tw-text-base-content">Tutorial Hints</div>
                     <label class="tw-flex tw-items-start tw-gap-3 tw-cursor-pointer">
                        <input 
                           type="checkbox" 
                           class="tw-checkbox tw-checkbox-primary tw-mt-0.5"
                           checked={showTutorialHints}
                           on:change={handleTutorialHints}
                        />
                        <div class="tw-text-sm tw-text-base-content/70">
                           Display helpful tips and explanations for game mechanics
                        </div>
                     </label>
                  </div>
                  
                  <div class="tw-space-y-2">
                     <div class="tw-font-semibold tw-text-base-content">Confirm Important Actions</div>
                     <label class="tw-flex tw-items-start tw-gap-3 tw-cursor-pointer">
                        <input 
                           type="checkbox" 
                           class="tw-checkbox tw-checkbox-primary tw-mt-0.5"
                           checked={confirmActions}
                           on:change={handleConfirmActions}
                        />
                        <div class="tw-text-sm tw-text-base-content/70">
                           Ask for confirmation before performing irreversible actions
                        </div>
                     </label>
                  </div>
               </div>
            </section>
         </div>
         
         <!-- Right Column -->
         <div class="tw-space-y-8">
            <!-- Save/Load Kingdom Data -->
            <section class="tw-space-y-4">
               <h3 class="tw-text-xl tw-font-bold tw-text-accent">Save / Load Kingdom</h3>
               
               <div class="tw-space-y-3">
                  <button 
                     class="tw-btn tw-btn-primary tw-btn-sm tw-w-full"
                     on:click={exportKingdom}
                     disabled={!$kingdomData}
                  >
                     <i class="fas fa-download"></i>
                     Export Kingdom Data
                  </button>
                  
                  <button 
                     class="tw-btn tw-btn-secondary tw-btn-sm tw-w-full"
                     on:click={importKingdom}
                  >
                     <i class="fas fa-upload"></i>
                     Import Kingdom Data
                  </button>
                  
                  <!-- Hidden file input -->
                  <input 
                     type="file" 
                     accept=".json"
                     bind:this={fileInput}
                     on:change={handleFileSelected}
                     style="display: none;"
                  />
                  
                  <div class="tw-bg-base-200/50 tw-rounded-lg tw-p-3 tw-text-sm tw-text-base-content/70">
                     <i class="fas fa-info-circle tw-mr-1.5"></i>
                     Export saves your kingdom to a JSON file. Import loads kingdom data from a file.
                  </div>
               </div>
            </section>
            
            <!-- Hexes Per Unrest -->
            <section class="tw-space-y-4">
               <h3 class="tw-text-xl tw-font-bold tw-text-accent">Unrest Scaling</h3>
               
               <div class="tw-space-y-3">
                  <div class="tw-flex tw-items-center tw-gap-4">
                     <input 
                        id="hexes-per-unrest"
                        type="range" 
                        min="4" 
                        max="12" 
                        step="1"
                        bind:value={hexesPerUnrest}
                        on:change={handleHexesPerUnrestChange}
                        class="tw-range tw-range-primary tw-flex-1"
                     />
                     <div class="tw-badge tw-badge-primary tw-badge-lg tw-font-bold tw-min-w-[3.5rem] tw-justify-center tw-text-base">
                        {hexesPerUnrest}
                     </div>
                  </div>
                  
                  <div class="tw-flex tw-justify-between tw-text-xs tw-text-base-content/50">
                     <span>4 hexes<br/>(More Unrest)</span>
                     <span class="tw-text-center">8 hexes<br/>(Default)</span>
                     <span class="tw-text-right">12 hexes<br/>(Less Unrest)</span>
                  </div>
                  
                  <div class="tw-bg-base-200/50 tw-rounded-lg tw-p-3 tw-text-sm tw-text-base-content/70">
                     <i class="fas fa-info-circle tw-mr-1.5"></i>
                     Larger parties should use lower values, smaller parties should use higher values
                  </div>
               </div>
            </section>
            
         </div>
      </div>
   </div>
{/if}
