<script lang="ts">
   import { onMount } from 'svelte';
   import { KingdomSettings } from '../../../api/foundry';
   import { SaveLoadService } from '../../../services/SaveLoadService';
   import { kingdomData } from '../../../stores/KingdomStore';
   import { logger } from '../../../utils/Logger';
   import Button from '../components/baseComponents/Button.svelte';
   import Notification from '../components/baseComponents/Notification.svelte';

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

         await actor.setKingdomData(importedData);
         ui.notifications?.success('Kingdom data imported successfully!');
      } catch (error) {
         logger.error('[SettingsTab] Import failed:', error);
      } finally {
         // Clear the file input
         input.value = '';
      }
   }
</script>

{#if !isGM}
   <div class="settings-locked">
      <i class="fas fa-lock"></i>
      <p>Settings are only available to the Game Master.</p>
   </div>
{:else}
   <div class="settings-tab">
      <div class="settings-grid">
         <!-- Left Column -->
         <div class="settings-column">
            <!-- Kingdom Map Scene Section -->
            <section class="settings-section">
               <h3 class="section-title">
                  <i class="fas fa-map"></i>
                  Kingdom Map Scene
               </h3>

               <div class="section-content">
                  <select
                     id="kingdom-scene-select"
                     class="settings-select"
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
            </section>

            <!-- Gameplay Options Section -->
            <section class="settings-section">
               <h3 class="section-title">
                  <i class="fas fa-gamepad"></i>
                  Gameplay Options
               </h3>

               <div class="section-content">
                  <div class="settings-option">
                     <label class="option-checkbox">
                        <input
                           type="checkbox"
                           checked={autoAdvancePhase}
                           on:change={handleAutoAdvance}
                        />
                        <span class="checkmark"></span>
                        <div class="option-text">
                           <span class="option-label">Auto-advance Phases</span>
                           <span class="option-description">Automatically advance to the next phase when all steps are completed</span>
                        </div>
                     </label>
                  </div>

                  <div class="settings-option">
                     <label class="option-checkbox">
                        <input
                           type="checkbox"
                           checked={showTutorialHints}
                           on:change={handleTutorialHints}
                        />
                        <span class="checkmark"></span>
                        <div class="option-text">
                           <span class="option-label">Tutorial Hints</span>
                           <span class="option-description">Display helpful tips and explanations for game mechanics</span>
                        </div>
                     </label>
                  </div>

                  <div class="settings-option">
                     <label class="option-checkbox">
                        <input
                           type="checkbox"
                           checked={confirmActions}
                           on:change={handleConfirmActions}
                        />
                        <span class="checkmark"></span>
                        <div class="option-text">
                           <span class="option-label">Confirm Important Actions</span>
                           <span class="option-description">Ask for confirmation before performing irreversible actions</span>
                        </div>
                     </label>
                  </div>
               </div>
            </section>
         </div>

         <!-- Right Column -->
         <div class="settings-column">
            <!-- Save/Load Section -->
            <section class="settings-section">
               <h3 class="section-title">
                  <i class="fas fa-save"></i>
                  Save / Load Kingdom
               </h3>

               <div class="section-content">
                  <div class="button-group">
                     <Button
                        variant="secondary"
                        icon="fas fa-download"
                        on:click={exportKingdom}
                        disabled={!$kingdomData}
                        fullWidth
                     >
                        Export Kingdom Data
                     </Button>

                     <Button
                        variant="secondary"
                        icon="fas fa-upload"
                        on:click={importKingdom}
                        fullWidth
                     >
                        Import Kingdom Data
                     </Button>
                  </div>

                  <!-- Hidden file input -->
                  <input
                     type="file"
                     accept=".json"
                     bind:this={fileInput}
                     on:change={handleFileSelected}
                     class="hidden-input"
                  />
               </div>
            </section>

            <!-- Unrest Scaling Section -->
            <section class="settings-section">
               <h3 class="section-title">
                  <i class="fas fa-balance-scale"></i>
                  Unrest Scaling
               </h3>

               <div class="section-content">
                  <div class="slider-container">
                     <input
                        id="hexes-per-unrest"
                        type="range"
                        min="4"
                        max="12"
                        step="1"
                        bind:value={hexesPerUnrest}
                        on:change={handleHexesPerUnrestChange}
                        class="settings-slider"
                     />
                     <div class="slider-value">{hexesPerUnrest}</div>
                  </div>

                  <div class="slider-labels">
                     <span class="label-left">
                        <strong>4 hexes</strong>
                        <small>More Unrest</small>
                     </span>
                     <span class="label-center">
                        <strong>8 hexes</strong>
                        <small>Default</small>
                     </span>
                     <span class="label-right">
                        <strong>12 hexes</strong>
                        <small>Less Unrest</small>
                     </span>
                  </div>

                  <Notification
                     variant="info"
                     title="Party Size Adjustment"
                     description="Larger parties should use lower values (more unrest), smaller parties should use higher values (less unrest)."
                     size="compact"
                  />
               </div>
            </section>
         </div>
      </div>
   </div>
{/if}

<style lang="scss">
   .settings-tab {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--space-16);
      overflow-y: auto;
   }

   .settings-locked {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: var(--space-32);
      gap: var(--space-16);

      i {
         font-size: 4rem;
         color: var(--text-muted);
      }

      p {
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-light);
         color: var(--text-secondary);
         text-align: center;
         margin: 0;
      }
   }

   .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-24);
      max-width: 60rem;
      margin: 0 auto;
   }

   .settings-column {
      display: flex;
      flex-direction: column;
      gap: var(--space-24);
   }

   .settings-section {
      background: var(--overlay-low);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      overflow: hidden;
   }

   .section-title {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      margin: 0;
      padding: var(--space-12) var(--space-16);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      background: var(--overlay);
      border-bottom: 1px solid var(--border-subtle);

      i {
         color: var(--text-accent-primary);
         font-size: var(--font-md);
      }
   }

   .section-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      padding: var(--space-16);
   }

   // Scene select
   .settings-select {
      width: 100%;
      padding: var(--space-10) var(--space-12);
      background: var(--surface-high);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
         border-color: var(--border-strong);
      }

      &:focus {
         outline: none;
         border-color: var(--border-primary);
      }

      option {
         background: var(--surface);
         color: var(--text-primary);
      }
   }

   // Checkbox options
   .settings-option {
      &:not(:last-child) {
         padding-bottom: var(--space-12);
         border-bottom: 1px solid var(--border-faint);
      }
   }

   .option-checkbox {
      display: flex;
      align-items: flex-start;
      gap: var(--space-12);
      cursor: pointer;
      position: relative;

      input[type="checkbox"] {
         position: absolute;
         opacity: 0;
         width: 0;
         height: 0;
      }

      .checkmark {
         width: 1.25rem;
         height: 1.25rem;
         flex-shrink: 0;
         background: var(--surface-high);
         border: 2px solid var(--border-default);
         border-radius: var(--radius-sm);
         display: flex;
         align-items: center;
         justify-content: center;
         transition: all var(--transition-fast);
         margin-top: 0.125rem;

         &::after {
            content: '\f00c';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            font-size: 0.75rem;
            color: var(--text-primary);
            opacity: 0;
            transition: opacity var(--transition-fast);
         }
      }

      input:checked + .checkmark {
         background: var(--surface-primary-high);
         border-color: var(--border-primary);

         &::after {
            opacity: 1;
         }
      }

      input:focus + .checkmark {
         border-color: var(--border-primary);
         box-shadow: 0 0 0 2px var(--surface-primary-low);
      }

      &:hover .checkmark {
         border-color: var(--border-strong);
      }
   }

   .option-text {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
   }

   .option-label {
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
   }

   .option-description {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      line-height: 1.4;
   }

   // Button group
   .button-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-10);
   }

   .hidden-input {
      display: none;
   }

   // Slider
   .slider-container {
      display: flex;
      align-items: center;
      gap: var(--space-16);
   }

   .settings-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 0.5rem;
      background: var(--surface-higher);
      border-radius: var(--radius-full);
      outline: none;

      &::-webkit-slider-thumb {
         -webkit-appearance: none;
         appearance: none;
         width: 1.25rem;
         height: 1.25rem;
         background: var(--surface-primary-higher);
         border: 2px solid var(--border-primary);
         border-radius: var(--radius-full);
         cursor: pointer;
         transition: all var(--transition-fast);

         &:hover {
            background: var(--surface-primary-highest);
            transform: scale(1.1);
         }
      }

      &::-moz-range-thumb {
         width: 1.25rem;
         height: 1.25rem;
         background: var(--surface-primary-higher);
         border: 2px solid var(--border-primary);
         border-radius: var(--radius-full);
         cursor: pointer;
         transition: all var(--transition-fast);

         &:hover {
            background: var(--surface-primary-highest);
            transform: scale(1.1);
         }
      }
   }

   .slider-value {
      min-width: 3rem;
      padding: var(--space-8) var(--space-12);
      background: var(--surface-primary-high);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      text-align: center;
   }

   .slider-labels {
      display: flex;
      justify-content: space-between;
      padding-top: var(--space-4);

      span {
         display: flex;
         flex-direction: column;
         gap: var(--space-2);

         strong {
            font-size: var(--font-sm);
            font-weight: var(--font-weight-semibold);
            color: var(--text-secondary);
         }

         small {
            font-size: var(--font-xs);
            color: var(--text-tertiary);
         }
      }

      .label-center {
         text-align: center;
      }

      .label-right {
         text-align: right;
      }
   }
</style>
