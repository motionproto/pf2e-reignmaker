<script lang="ts">
   import { createEventDispatcher, onMount } from 'svelte';
   import { territoryService } from '../../../services/territory';
   import { KingdomSettings } from '../../../api/foundry';
   import { getKingdomActor } from '../../../stores/KingdomStore';
   import { initializeKingdomData } from '../../../services/KingdomInitializationService';
   
   const dispatch = createEventDispatcher();
   
   // Dialog state
   let step: 'select' | 'kingmaker-confirm' | 'importing' | 'complete' = 'select';
   let selectedType: 'stolen-lands' | 'custom' | null = null;
   let hasKingmakerData = false;
   let importResult: { success: boolean; hexesSynced: number; error?: string } | null = null;
   let isGM = false;
   let isInitializing = false;
   
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
      // Check if current user is GM
      isGM = (game as any)?.user?.isGM || false;
      
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
         // Step 1: Import hexes from Kingmaker
         const result = await territoryService.syncFromKingmaker();
         importResult = result;
         
         if (result.success) {
            // Step 2: Initialize all derived data (NEW - Stage 1 completion)
            isInitializing = true;
            const actor = getKingdomActor();
            if (actor) {
               await initializeKingdomData(actor);
            }
            isInitializing = false;
            
            step = 'complete';
            // @ts-ignore
            ui.notifications?.info(`Kingdom ready! Imported ${result.hexesSynced} hexes and initialized all data.`);
         } else {
            // @ts-ignore
            ui.notifications?.error(`Failed to import: ${result.error}`);
            step = 'select';
         }
      } catch (error) {
         console.error('Import failed:', error);
         isInitializing = false;
         // @ts-ignore
         ui.notifications?.error('Import failed. See console for details.');
         step = 'select';
      }
   }
   
   // Import custom map grid
   async function importCustomMap() {
      step = 'importing';
      
      try {
         // Step 1: Import from Foundry grid
         const result = await territoryService.importFromFoundryGrid();
         importResult = result;
         
         if (result.success) {
            // Step 2: Initialize all derived data (NEW - Stage 1 completion)
            isInitializing = true;
            const actor = getKingdomActor();
            if (actor) {
               await initializeKingdomData(actor);
            }
            isInitializing = false;
            
            step = 'complete';
            // @ts-ignore
            ui.notifications?.info(`Kingdom ready! Created ${result.hexesSynced} hexes and initialized all data.`);
         } else {
            // @ts-ignore
            ui.notifications?.error(`Failed to create kingdom: ${result.error}`);
            step = 'select';
         }
      } catch (error) {
         console.error('Custom map import failed:', error);
         isInitializing = false;
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

<div 
   class="welcome-dialog-backdrop" 
   on:click={skipForNow}
   on:keydown={(e) => e.key === 'Escape' && skipForNow()}
   role="button"
   tabindex="-1"
   aria-label="Close dialog"
>
   <div 
      class="welcome-dialog" 
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
   >
      
      {#if step === 'select'}
         <!-- Step 1: Scene Type Selection -->
         <div class="dialog-header">
            <h2>
               <i class="fas fa-chess-rook"></i>
               Welcome to ReignMaker
            </h2>
         </div>
         
         <div class="dialog-body">
            {#if isGM}
               <!-- GM: Show import controls -->
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
            {:else}
               <!-- Non-GM: Show waiting message -->
               <div class="player-waiting">
                  <div class="waiting-icon">
                     <i class="fas fa-hourglass-half"></i>
                  </div>
                  <h3>Waiting for GM</h3>
                  <p>
                     Your GM will import the kingdom map data to get started.
                     Once the import is complete, you'll be able to explore the kingdom and participate in turn phases.
                  </p>
               </div>
            {/if}
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
               {isInitializing ? 'Initializing Kingdom Data...' : 'Importing Territory Data...'}
            </h2>
         </div>
         
         <div class="dialog-body">
            <p class="importing-text">
               {#if isInitializing}
                  Calculating derived properties and building caches...
               {:else}
                  Please wait while ReignMaker imports your kingdom data.
               {/if}
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
                  ✅ Kingdom Data Ready!
               </p>
               
               <p class="success-summary">
                  Imported {importResult.hexesSynced} hexes and initialized all derived properties.
               </p>
               
               <p class="next-steps">
                  Your kingdom is fully initialized. You can now:
               </p>
               <ul>
                  <li>Review your territory in the <strong>Territory</strong> tab</li>
                  <li>Check settlements in the <strong>Settlements</strong> tab</li>
                  <li>Start Turn 1 from the <strong>Setup</strong> tab</li>
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
      border-radius: var(--radius-xl);
      box-shadow: 0 0.625rem 2.5rem rgba(0, 0, 0, 0.5);
      max-width: 37.5rem;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
   }
   
   @keyframes slideIn {
      from {
         transform: translateY(-1.25rem);
         opacity: 0;
      }
      to {
         transform: translateY(0);
         opacity: 1;
      }
   }
   
   .dialog-header {
      padding: var(--space-24);
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
      padding: var(--space-24);
      
      .campaign-prompt,
      .importing-text {
         margin: 0 0 var(--space-12) 0;
         font-size: var(--font-lg);
         color: var(--text-primary);
         line-height: var(--line-height-relaxed);
      }
      
      .campaign-prompt {
         margin-top: var(--space-16);
         margin-bottom: var(--space-12);
         font-weight: var(--font-weight-medium);
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
   
   .player-waiting {
      text-align: center;
      padding: var(--space-24);
      
      .waiting-icon {
         font-size: var(--font-6xl);
         color: var(--text-secondary);
         margin-bottom: var(--space-24);
         
         i {
            animation: pulse 2s ease-in-out infinite;
         }
      }
      
      h3 {
         margin: 0 0 var(--space-16) 0;
         color: var(--text-primary);
         font-size: var(--font-2xl);
      }
      
      p {
         margin: 0;
         color: var(--text-secondary);
         font-size: var(--font-lg);
         line-height: var(--line-height-relaxed);
      }
   }
   
   @keyframes pulse {
      0%, 100% {
         opacity: 0.6;
      }
      50% {
         opacity: 1;
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
      border: 1px solid var(--border-default);
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
      background-size: 0.75rem;
      
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
      gap: var(--space-12);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
   }
   
   .scene-option {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-16);
      padding: var(--space-24) var(--space-16);
      background: var(--bg-surface);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-xl);
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      width: 100%;
      box-sizing: border-box;
      flex-shrink: 0;
      overflow: hidden;
      
      &.available {
         border-color: var(--border-medium);
         background: var(--bg-subtle);
         color: rgba(255, 255, 255, 0.9);
         
         &:hover {
            border-color: var(--color-primary);
            background: var(--bg-surface);
            transform: translateY(-0.125rem);
            box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.3);
         }
      }
      
      &.unavailable {
         opacity: 0.4;
         cursor: not-allowed;
         background: rgba(0, 0, 0, 0.2);
         border-color: var(--border-faint);
         
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
         border-radius: var(--radius-xl);
         font-size: var(--font-4xl);
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
      padding: var(--space-16);
      border-radius: var(--radius-lg);
      margin-top: 0;
      
      ul {
         list-style: none;
         padding: 0;
         margin: 0 0 var(--space-16) 0;
         
         li {
            padding: var(--space-4) 0;
            color: var(--text-secondary);
            font-weight: var(--font-weight-medium);
            display: flex;
            align-items: center;
            gap: var(--space-8);
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
         margin: var(--space-16) 0 0 0;
         padding-top: var(--space-16);
         border-top: 1px solid var(--border-faint);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
         color: var(--text-muted);
         display: flex;
         align-items: flex-start;
         gap: var(--space-8);
         
         i {
            margin-top: var(--space-2);
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
      padding: var(--space-24);
      background: var(--bg-surface);
      border-top: 1px solid var(--border-faint);
      display: flex;
      justify-content: flex-end;
      gap: var(--space-16);
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
            transform: translateY(-0.0625rem);
            box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.3);
         }
      }
      
      &.btn-secondary {
         background: var(--bg-subtle);
         color: var(--text-secondary);
         border: 1px solid var(--border-default);
         
         &:hover {
            background: var(--bg-surface);
            color: var(--text-primary);
         }
      }
   }
</style>
