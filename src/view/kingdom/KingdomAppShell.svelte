<script lang="ts">
   import { getContext, onMount } from 'svelte';
   import { ApplicationShell }   from '#runtime/svelte/component/application';
   
   // Stores
   import { kingdomData }                         from '../../stores/KingdomStore';
   import { uiState, setSelectedTab }             from '../../stores/ui';
   
   // Import territory service for syncing
   import { territoryService }                    from '../../services/territory';
   
   // Components
   import ContentSelector from './components/ContentSelector.svelte';
   import KingdomStats    from './components/KingdomStats.svelte';
   
   // Tab components
   import TurnTab         from './tabs/TurnTab.svelte';
   import TerritoryTab    from './tabs/TerritoryTab.svelte';
   import SettlementsTab  from './tabs/SettlementsTab.svelte';
   import StructuresTab   from './tabs/StructuresTab.svelte';
   import FactionsTab     from './tabs/FactionsTab.svelte';
   import ModifiersTab    from './tabs/ModifiersTab.svelte';
   import NotesTab        from './tabs/NotesTab.svelte';
   import SettingsTab     from './tabs/SettingsTab.svelte';
   
   import type { KingdomApp } from './KingdomApp';

   /**
    * Application shell contract. Export the `elementRoot` from `ApplicationShell`.
    */
   export let elementRoot: HTMLElement;

   /**
    * Trigger for refreshing data
    */
   export let refreshTrigger: number = 0;

   // Get external context
   const { actorId, application } = getContext<KingdomApp.External>('#external');
   
   // Perform initial sync when the app opens
   onMount(async () => {
      // First ensure we have a kingdom actor
      try {
         const { ensureKingdomActor } = await import('../../hooks/kingdomSync');
         const { initializeKingdomActor } = await import('../../stores/KingdomStore');
         const { KingdomActor } = await import('../../actors/KingdomActor');
         
         console.log('[KingdomAppShell] Ensuring kingdom actor exists...');
         let foundryActor = await ensureKingdomActor();
         
         if (foundryActor) {
            console.log('[KingdomAppShell] Initializing kingdom actor store...');
            
            // Create a kingdom actor wrapper that adds our methods to the foundry actor
            const kingdomActor = Object.assign(foundryActor, {
               getKingdom: function() {
                  return this.getFlag('pf2e-reignmaker', 'kingdom-data') || null;
               },
               setKingdom: async function(kingdom) {
                  await this.setFlag('pf2e-reignmaker', 'kingdom-data', kingdom);
               },
               updateKingdom: async function(updater) {
                  const kingdom = this.getKingdom();
                  if (!kingdom) {
                     console.warn('[KingdomActor] No kingdom data found, cannot update');
                     return;
                  }
                  updater(kingdom);
                  await this.setKingdom(kingdom);
               },
               initializeKingdom: async function(name = 'New Kingdom') {
                  const { createDefaultKingdom } = await import('../../actors/KingdomActor');
                  const defaultKingdom = createDefaultKingdom(name);
                  await this.setKingdom(defaultKingdom);
               },
               isCurrentPhaseComplete: function() {
                  const kingdom = this.getKingdom();
                  if (!kingdom) return false;
                  return kingdom.phasesCompleted?.includes(kingdom.currentPhase) || false;
               },
               advancePhase: async function() {
                  await this.updateKingdom((kingdom) => {
                     const { TurnPhase } = require('../../models/KingdomState');
                     const phases = [
                        TurnPhase.PHASE_I, 
                        TurnPhase.PHASE_II, 
                        TurnPhase.PHASE_III, 
                        TurnPhase.PHASE_IV, 
                        TurnPhase.PHASE_V, 
                        TurnPhase.PHASE_VI
                     ];
                     const currentIndex = phases.indexOf(kingdom.currentPhase);
                     
                     if (currentIndex < phases.length - 1) {
                        kingdom.currentPhase = phases[currentIndex + 1];
                     } else {
                        kingdom.currentTurn = (kingdom.currentTurn || 1) + 1;
                        kingdom.currentPhase = TurnPhase.PHASE_I;
                        kingdom.phaseStepsCompleted = {};
                        kingdom.phasesCompleted = [];
                     }
                  });
               },
               markPhaseStepCompleted: async function(stepId) {
                  await this.updateKingdom((kingdom) => {
                     if (!kingdom.phaseStepsCompleted) kingdom.phaseStepsCompleted = {};
                     kingdom.phaseStepsCompleted[stepId] = true;
                  });
               }
            });
            
            // Initialize the kingdom data if it doesn't exist
            if (!kingdomActor.getKingdom()) {
               await kingdomActor.initializeKingdom('New Kingdom');
            }
            
            // Initialize the store
            initializeKingdomActor(kingdomActor);
            
            // Wait a bit for the store to be ready
            setTimeout(() => {
               // Now sync territory data from Kingmaker if available
               if (territoryService.isKingmakerAvailable()) {
                  console.log('[KingdomAppShell] Syncing territory data...');
                  const result = territoryService.syncFromKingmaker();
                  
                  if (result.success) {
                     // Only show notification if there's actual data
                     if (result.hexesSynced > 0 || result.settlementsSynced > 0) {
                        // @ts-ignore
                        ui.notifications?.info(`Territory loaded: ${result.hexesSynced} hexes, ${result.settlementsSynced} settlements`);
                     }
                  } else if (result.error) {
                     // Don't show error notification on initial load unless there's a real error
                     if (!result.error.includes('not available')) {
                        // @ts-ignore
                        ui.notifications?.warn(`Territory sync failed: ${result.error}`);
                     }
                  }
               }
            }, 200);
         } else {
            console.warn('[KingdomAppShell] No kingdom actor available');
         }
      } catch (error) {
         console.error('[KingdomAppShell] Error during initialization:', error);
      }
   });

   // Reactive statement for refresh
   $: if (refreshTrigger) {
      // console.log('Refreshing kingdom data...');
      
      // Sync territory data from Kingmaker if available
      if (territoryService.isKingmakerAvailable()) {
         const result = territoryService.syncFromKingmaker();
         // console.log('Kingmaker sync result:', result);
         
         if (result.success) {
            // console.log(`Successfully synced ${result.hexesSynced} hexes and ${result.settlementsSynced} settlements`);
            // Show success notification
            // @ts-ignore
            ui.notifications?.info(`Territory synced: ${result.hexesSynced} hexes, ${result.settlementsSynced} settlements`);
         } else {
            // console.error('Failed to sync from Kingmaker:', result.error);
            // @ts-ignore
            ui.notifications?.warn(`Territory sync failed: ${result.error}`);
         }
      } else {
         // console.log('Kingmaker module not available for sync');
      }
   }

   // Settings view state
   let showSettingsView = false;
   
   // Handle tab selection
   function handleTabChange(tab: string) {
      showSettingsView = false;
      setSelectedTab(tab as any);
   }
   
   // Handle settings button click
   function handleOpenSettings() {
      showSettingsView = true;
   }
</script>

<!-- This is necessary for Svelte to generate accessors TRL can access for `elementRoot` -->
<svelte:options accessors={true}/>

<!-- ApplicationShell provides the popOut / application shell frame, header bar, content areas -->
<ApplicationShell bind:elementRoot>
   <main class="kingdom-container">
      <!-- Kingdom Header with Tab Selection -->
      <div class="kingdom-header">
         <ContentSelector 
            selectedTab={showSettingsView ? 'settings' : $uiState.selectedTab} 
            on:tabChange={(e) => handleTabChange(e.detail)}
            on:openSettings={handleOpenSettings}
         />
      </div>
      
      <!-- Main Content Area -->
      <div class="kingdom-body">
         <!-- Left Sidebar: Kingdom Stats -->
         <div class="kingdom-sidebar">
            <KingdomStats />
         </div>
         
         <!-- Main Content Area with Tab Content -->
         <div class="kingdom-main">
            {#if showSettingsView}
               <SettingsTab />
            {:else if $uiState.selectedTab === 'turn'}
               <TurnTab />
            {:else if $uiState.selectedTab === 'territory'}
               <TerritoryTab />
            {:else if $uiState.selectedTab === 'settlements'}
               <SettlementsTab />
            {:else if $uiState.selectedTab === 'structures'}
               <StructuresTab />
            {:else if $uiState.selectedTab === 'factions'}
               <FactionsTab />
            {:else if $uiState.selectedTab === 'modifiers'}
               <ModifiersTab />
            {:else if $uiState.selectedTab === 'notes'}
               <NotesTab />
            {/if}
         </div>
      </div>

      <!-- Error/Success Messages -->
      {#if $uiState.errorMessage}
         <div class="message error">
            <i class="fas fa-exclamation-triangle"></i>
            {$uiState.errorMessage}
         </div>
      {/if}
      
      {#if $uiState.successMessage}
         <div class="message success">
            <i class="fas fa-check-circle"></i>
            {$uiState.successMessage}
         </div>
      {/if}
   </main>
</ApplicationShell>

<style>
   /* Import our CSS variables for consistent theming */
   @import '../../styles/variables.css';
   
   /* Standard Svelte component styling using CSS variables */
   .kingdom-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 0.5rem;
      padding: 0rem;
      background-color: var(--bg-base);
      color: var(--text-primary);
   }

   .kingdom-header {
      flex: 0 0 auto;
      padding: 0.5rem;
      background: var(--bg-elevated);
      border-radius: 0.375rem;
      color: var(--text-primary);
   }

   .kingdom-body {
      flex: 1;
      display: flex;
      gap: 0.5rem;
      min-height: 0; /* Important for scrolling */
   }

   .kingdom-sidebar {
      flex: 0 0 250px;
      background: var(--bg-surface);
      border-radius: 0.375rem;
      overflow-y: auto;
   }

   .kingdom-main {
      flex: 1;
      background: var(--bg-surface);
      border-radius: 0.375rem;
      padding: 0.5rem;
      overflow-y: auto;
   }

   .message {
      position: absolute;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease-out;
      z-index: 1000;
   }

   .message.error {
      background: var(--color-danger);
      opacity: 0.9;
      color: white;
   }

   .message.success {
      background: var(--color-success);
      opacity: 0.9;
      color: white;
   }

   .message i {
      font-size: 1.2em;
   }

   @keyframes slideIn {
      from {
         transform: translateX(100%);
         opacity: 0;
      }
      to {
         transform: translateX(0);
         opacity: 1;
      }
   }
   
   /* Override Foundry's window styles for our app specifically */
   :global(.pf2e-reignmaker .window-content) {
      background: var(--bg-base) !important;
      color: var(--text-primary) !important;

   }
   
   :global(.pf2e-reignmaker .window-header) {
      background: var(--gradient-header) !important;
   }
</style>
