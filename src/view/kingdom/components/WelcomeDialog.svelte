<script lang="ts">
   import { createEventDispatcher, onMount } from 'svelte';
   import { territoryService } from '../../../services/territory';
   import { KingdomSettings } from '../../../api/foundry';
   
   const dispatch = createEventDispatcher();
   
   // Dialog state
   let step: 'select' | 'kingmaker-confirm' | 'importing' | 'complete' = 'select';
   let selectedType: 'stolen-lands' | 'custom' | null = null;
   let hasKingmakerData = false;
   let importResult: { success: boolean; hexesSynced: number; error?: string } | null = null;
   
   // Scene selection
   let allScenes: any[] = [];
   let selectedScene: any = null;
   
   // Check for Kingmaker data - reactive to selected scene
   let kingmakerAvailable = false;
   
   // Reactively check if the selected scene has Kingmaker data
   $: {
      if (selectedScene) {
         checkKingmakerAvailability(selectedScene);
      }
   }
   
   function checkKingmakerAvailability(scene: any) {
      try {
         // Check if Kingmaker module is available
         // @ts-ignore - Kingmaker global
         const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
         
         if (!km?.region?.hexes) {
            kingmakerAvailable = false;
            return;
         }
         
         // Check if this scene is a Kingmaker scene (Stolen Lands or similar)
         const isKingmakerScene = scene.name.toLowerCase().includes('stolen lands') ||
                                  scene.name.toLowerCase().includes('kingmaker') ||
                                  scene.flags?.kingmaker !== undefined;
         
         kingmakerAvailable = isKingmakerScene;
      } catch {
         kingmakerAvailable = false;
      }
   }
   
   onMount(() => {
      // Load all available scenes
      allScenes = KingdomSettings.getAllScenes();
      
      // Try to find Stolen Lands scene and auto-select it
      const stolenLandsScene = allScenes.find(s => 
         s.name.toLowerCase().includes('stolen lands')
      );
      
      if (stolenLandsScene) {
         selectedScene = stolenLandsScene;
      } else if (allScenes.length > 0) {
         // Default to first scene if no Stolen Lands found
         selectedScene = allScenes[0];
      }
   });
   
   // Handle scene type selection
   function selectSceneType(type: 'stolen-lands' | 'custom') {
      selectedType = type;
      
      if (type === 'stolen-lands') {
         if (!kingmakerAvailable) {
            // @ts-ignore
            ui.notifications?.error('Kingmaker data not available. Please enable the PF2E Kingmaker module or select Custom Hex Map.');
            return;
         }
         
         step = 'kingmaker-confirm';
      } else {
         // Custom map - validate hex grid
         // @ts-ignore
         const canvas = game.canvas;
         // @ts-ignore
         const isHexGrid = canvas?.grid?.type === CONST.GRID_TYPES.HEXODDR || 
                          canvas?.grid?.type === CONST.GRID_TYPES.HEXEVENR;
         
         if (!isHexGrid) {
            // @ts-ignore
            ui.notifications?.error('Active scene must use a hex grid! Please create or activate a hex grid scene.');
            return;
         }
         
         // Proceed to import custom map
         importCustomMap();
      }
   }
   
   // Import from Kingmaker
   async function importFromKingmaker() {
      step = 'importing';
      
      try {
         const result = await territoryService.syncFromKingmaker();
         importResult = result;
         
         if (result.success) {
            step = 'complete';
            // @ts-ignore
            ui.notifications?.info(`Successfully imported ${result.hexesSynced} hexes from Kingmaker!`);
         } else {
            // @ts-ignore
            ui.notifications?.error(`Failed to import: ${result.error}`);
            step = 'select';
         }
      } catch (error) {
         console.error('Import failed:', error);
         // @ts-ignore
         ui.notifications?.error('Import failed. See console for details.');
         step = 'select';
      }
   }
   
   // Import custom map grid
   async function importCustomMap() {
      step = 'importing';
      
      try {
         const result = await territoryService.importFromFoundryGrid();
         importResult = result;
         
         if (result.success) {
            step = 'complete';
            // @ts-ignore
            ui.notifications?.info(`Created empty kingdom with ${result.hexesSynced} hexes from scene grid!`);
         } else {
            // @ts-ignore
            ui.notifications?.error(`Failed to create kingdom: ${result.error}`);
            step = 'select';
         }
      } catch (error) {
         console.error('Custom map import failed:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create kingdom. See console for details.');
         step = 'select';
      }
   }
   
   // Skip and close dialog
   function skipForNow() {
      dispatch('close');
   }
   
   // Complete and close dialog
   function complete() {
      dispatch('close');
      dispatch('complete');
   }
</script>

<div class="welcome-dialog-backdrop" on:click={skipForNow}>
   <div class="welcome-dialog" on:click|stopPropagation>
      
      {#if step === 'select'}
         <!-- Step 1: Scene Type Selection -->
         <div class="dialog-header">
            <h2>
               <i class="fas fa-chess-rook"></i>
               Welcome to ReignMaker
            </h2>
         </div>
         
         <div class="dialog-body">
            <!-- Scene Selector (no wrapper) -->
            <label for="scene-select" class="scene-label">
               <i class="fas fa-map"></i>
               Select Kingdom Map Scene
            </label>
            <select 
               id="scene-select" 
               class="scene-dropdown"
               bind:value={selectedScene}
            >
               <option value={null}>-- Select a Scene --</option>
               {#each allScenes as scene}
                  <option value={scene}>
                     {scene.name}
                  </option>
               {/each}
            </select>
            
            <p class="campaign-prompt">
               Select your campaign setting:
            </p>
            
            <div class="scene-options">
               <button 
                  class="scene-option stolen-lands" 
                  class:available={kingmakerAvailable}
                  class:unavailable={!kingmakerAvailable}
                  disabled={!kingmakerAvailable}
                  on:click={() => selectSceneType('stolen-lands')}
               >
                  <div class="option-icon">
                     <i class="fas fa-crown"></i>
                  </div>
                  <div class="option-content">
                     <h3>Stolen Lands</h3>
                     <p>Pathfinder Kingmaker Adventure Path</p>
                  </div>
               </button>
               
               <button class="scene-option custom-map available" on:click={() => selectSceneType('custom')}>
                  <div class="option-icon">
                     <i class="fas fa-map-marked-alt"></i>
                  </div>
                  <div class="option-content">
                     <h3>Custom Hex Map</h3>
                     <p>Your own campaign world</p>
                  </div>
               </button>
            </div>
         </div>
         
         <div class="dialog-footer">
            <button class="btn-secondary" on:click={skipForNow}>
               Skip for Now
            </button>
         </div>
         
      {:else if step === 'kingmaker-confirm'}
         <!-- Step 2a: Kingmaker Import Confirmation -->
         <div class="dialog-header">
            <h2>
               <i class="fas fa-check-circle" style="color: white;"></i>
               Kingmaker Data Found!
            </h2>
         </div>
         
         <div class="dialog-body">
            
            <h4 class="import-heading">What will be imported:</h4>
            
            <div class="info-box">
               <ul>
                  <li><i class="fas fa-map"></i> All map hexes (~300 hexes from Stolen Lands)</li>
                  <li><i class="fas fa-flag"></i> Claimed territory and ownership data</li>
                  <li><i class="fas fa-hammer"></i> Worksites and features (farms, lumber camps, mines, quarries)</li>
                  <li><i class="fas fa-gem"></i> Commodity bonuses for enhanced production</li>
               </ul>
               
               <p class="note">
                  <i class="fas fa-info-circle"></i>
                  You'll be able to view all hexes or just your claimed territory in the Territory tab.
               </p>
            </div>
         </div>
         
         <div class="dialog-footer">
            <button class="btn-secondary" on:click={() => step = 'select'}>
               Back
            </button>
            <button class="btn-primary" on:click={importFromKingmaker}>
               <i class="fas fa-download"></i>
               Import Kingdom Data
            </button>
         </div>
         
      {:else if step === 'importing'}
         <!-- Step 3: Importing -->
         <div class="dialog-header">
            <h2>
               <i class="fas fa-spinner fa-spin"></i>
               Importing Territory Data...
            </h2>
         </div>
         
         <div class="dialog-body">
            <p class="importing-text">
               Please wait while ReignMaker imports your kingdom data.
            </p>
         </div>
         
      {:else if step === 'complete'}
         <!-- Step 4: Complete -->
         <div class="dialog-header">
            <h2>
               <i class="fas fa-check-circle" style="color: white;"></i>
               Import Complete!
            </h2>
         </div>
         
         <div class="dialog-body">
            {#if importResult}
               <p class="import-complete-text">
                  Successfully imported {importResult.hexesSynced} hexes!
               </p>
               
               <p class="next-steps">
                  Your kingdom is ready. You can now:
               </p>
               <ul>
                  <li>View and manage your territory in the <strong>Territory</strong> tab</li>
                  <li>Create and upgrade settlements in the <strong>Settlements</strong> tab</li>
                  <li>Progress through kingdom turns in the <strong>Turn</strong> tab</li>
               </ul>
            {/if}
         </div>
         
         <div class="dialog-footer">
            <button class="btn-primary" on:click={complete}>
               <i class="fas fa-chess-rook"></i>
               Start Building Your Kingdom
            </button>
         </div>
      {/if}
      
   </div>
</div>

<style lang="scss">
   @import '../../../styles/variables.css';
   
   .welcome-dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
   }
   
   @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
   }
   
   .welcome-dialog {
      background: var(--bg-elevated);
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
   }
   
   @keyframes slideIn {
      from {
         transform: translateY(-20px);
         opacity: 0;
      }
      to {
         transform: translateY(0);
         opacity: 1;
      }
   }
   
   .dialog-header {
      padding: 1.5rem;
      background: var(--gradient-header);
      border-bottom: 2px solid var(--color-primary);
      
      h2 {
         margin: 0;
         color: white;
         display: flex;
         align-items: center;
         gap: var(--space-6);
         font-size: var(--font-3xl);
         
         i {
            font-size: var(--font-4xl);
         }
      }
   }
   
   .dialog-body {
      padding: 2rem;
      
      .intro-text,
      .campaign-prompt,
      .success-text,
      .importing-text {
         margin: 0 0 var(--space-12) 0;
         font-size: var(--font-lg);
         color: var(--text-primary);
         line-height: var(--line-height-relaxed);
      }
      
      .campaign-prompt {
         margin-top: 1rem;
         margin-bottom: 0.75rem;
         font-weight: var(--font-weight-medium);
      }
      
      .success-text {
         color: var(--color-success);
         font-weight: var(--font-weight-semibold);
      }
      
      .import-complete-text {
         margin: 0 0 var(--space-12) 0;
         font-size: var(--font-4xl);
         color: white;
         font-weight: var(--font-weight-semibold);
         line-height: var(--line-height-normal);
      }
      
      .importing-text {
         text-align: center;
         color: var(--text-secondary);
      }
   }
   
   .scene-label {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      font-size: var(--font-sm);
      
      i {
         color: var(--text-primary);
      }
   }
   
   .scene-dropdown {
      width: 100%;
      padding: var(--space-5) 2.5rem var(--space-5) var(--space-6);
      margin-bottom: var(--space-8);
      background: var(--bg-surface);
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-md);
      line-height: var(--line-height-relaxed);
      height: auto;
      min-height: 2.5rem;
      overflow: visible;
      cursor: pointer;
      transition: all 0.2s;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1.25rem center;
      background-size: 12px;
      
      &:hover {
         border-color: var(--color-primary);
      }
      
      &:focus {
         outline: none;
         border-color: var(--color-primary);
         box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.15);
      }
      
      option {
         background: var(--bg-surface);
         color: var(--text-primary);
         padding: var(--space-4);
         line-height: var(--line-height-relaxed);
         height: auto;
         min-height: 1.5rem;
      }
   }
   
   .scene-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
   }
   
   .scene-option {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: 1rem;
      padding: 2.75rem 1rem;
      background: var(--bg-surface);
      border: 2px solid var(--border-secondary);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      width: 100%;
      box-sizing: border-box;
      flex-shrink: 0;
      overflow: hidden;
      
      &.available {
         border-color: rgba(255, 255, 255, 0.3);
         background: var(--bg-subtle);
         color: rgba(255, 255, 255, 0.9);
         
         &:hover {
            border-color: var(--color-primary);
            background: var(--bg-surface);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
         }
      }
      
      &.unavailable {
         opacity: 0.4;
         cursor: not-allowed;
         background: rgba(0, 0, 0, 0.2);
         border-color: rgba(255, 255, 255, 0.05);
         
         &:hover {
            transform: none;
            box-shadow: none;
         }
      }
      
      &:disabled {
         cursor: not-allowed;
      }
      
      .option-icon {
         flex: 0 0 auto;
         width: 4rem;
         height: 4rem;
         display: flex;
         align-items: center;
         justify-content: center;
         border-radius: 0.5rem;
         font-size: 2rem;
      }
      
      &.stolen-lands .option-icon {
         background: linear-gradient(135deg, #8B0000, #DC143C);
         color: white;
      }
      
      &.custom-map .option-icon {
         background: linear-gradient(135deg, #1e3a8a, #3b82f6);
         color: white;
      }
      
      .option-content {
         display: flex;
         flex-direction: column;
         align-items: flex-start;
         justify-content: center;
         flex: 1 1 auto;
         min-width: 0;
         overflow: hidden;
         
         h3 {
            margin: 0 0 var(--space-2) 0;
            color: var(--text-primary);
            font-size: var(--font-lg);
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
            width: 100%;
         }
         
         p {
            margin: 0;
            color: var(--text-secondary);
            font-size: var(--font-sm);
            line-height: var(--line-height-snug);
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
            width: 100%;
         }
      }
   }
   
   .import-heading {
      margin: 0 var(--space-6) 0;
      color: var(--text-primary);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-xl);
   }
   
   .info-box {
      background: var(--bg-base);
      padding: 1rem;
      border-radius: 0.375rem;
      margin-top: 0;
      
      h4 {
         margin: 0 0 1rem 0;
         color: var(--text-primary);
         font-weight: var(--font-weight-medium);
      }
      
      ul {
         list-style: none;
         padding: 0;
         margin: 0 0 1rem 0;
         
         li {
            padding: 0.25rem 0;
            color: var(--text-secondary);
            font-weight: var(--font-weight-medium);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: var(--font-md);
            
            i {
               color: var(--text-secondary);
               width: 1.25rem;
               opacity: .85;
               font-size: var(--font-md);
            }
         }
      }
      
      .note {
         margin: 1rem 0 0 0;
         padding-top: 1rem;
         border-top: 1px solid var(--border-subtle);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
         color: var(--text-muted);
         display: flex;
         align-items: flex-start;
         gap: 0.5rem;
         
         i {
            margin-top: 0.15rem;
            color: var(--text-secondary);
            opacity: 0.8;
         }
      }
   }
   
   .next-steps {
      margin: var(--space-8) 0 var(--space-4) 0;
      color: var(--text-primary);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-md);
   }
   
   ul {
      margin: 0;
      padding-left: var(--space-12);
      
      li {
         margin: var(--space-4) 0;
         color: var(--text-secondary);
         line-height: var(--line-height-relaxed);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
         
         strong {
            color: var(--color-info);
         }
      }
   }
   
   .dialog-footer {
      padding: 1.5rem;
      background: var(--bg-surface);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
   }
   
   button {
      padding: var(--space-6) var(--space-12);
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: var(--transition-base);
      display: flex;
      align-items: center;
      gap: var(--space-4);
      
      &.btn-primary {
         background: linear-gradient(to top, var(--color-primary-dark), var(--color-primary));
         color: white;
         
         &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
         }
      }
      
      &.btn-secondary {
         background: var(--bg-subtle);
         color: var(--text-secondary);
         border: 1px solid var(--border-secondary);
         
         &:hover {
            background: var(--bg-surface);
            color: var(--text-primary);
         }
      }
   }
</style>
