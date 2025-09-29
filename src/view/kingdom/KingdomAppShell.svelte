<script lang="ts">
   import { getContext, onMount } from 'svelte';
   import { ApplicationShell }   from '#runtime/svelte/component/application';
   
   // Stores
   import { kingdomState, updateKingdomStat }     from '../../stores/kingdom';
   import { uiState, setSelectedTab }             from '../../stores/ui';
   
   // Import territory service for syncing
   import { territoryService }                    from '../../services/territory';
   // Import persistence service to ensure data is loaded
   import { persistenceService }                  from '../../services/persistence';
   
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
      // console.log('Kingdom UI opened - performing initial sync...');
      
      // First, ensure persisted data is loaded
      try {
         await persistenceService.loadData();
         console.log('[KingdomAppShell] Loaded persisted kingdom data');
      } catch (error) {
         console.error('[KingdomAppShell] Failed to load persisted data:', error);
      }
      
      // Then sync territory data from Kingmaker if available
      if (territoryService.isKingmakerAvailable()) {
         const result = territoryService.syncFromKingmaker();
         // console.log('Initial Kingmaker sync result:', result);
         
         if (result.success) {
            // console.log(`Successfully synced ${result.hexesSynced} hexes and ${result.settlementsSynced} settlements`);
            // Only show notification if there's actual data
            if (result.hexesSynced > 0 || result.settlementsSynced > 0) {
               // @ts-ignore
               ui.notifications?.info(`Territory loaded: ${result.hexesSynced} hexes, ${result.settlementsSynced} settlements`);
            }
         } else if (result.error) {
            // console.error('Failed to sync from Kingmaker:', result.error);
            // Don't show error notification on initial load unless there's a real error
            // (not just "module not available")
            if (!result.error.includes('not available')) {
               // @ts-ignore
               ui.notifications?.warn(`Territory sync failed: ${result.error}`);
            }
         }
      } else {
         // console.log('Kingmaker module not available - running without territory sync');
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
