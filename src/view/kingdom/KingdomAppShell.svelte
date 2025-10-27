<script lang="ts">
   import { getContext, onMount, tick } from 'svelte';
   import { ApplicationShell }   from '#runtime/svelte/component/application';
   
   // Stores
   import { kingdomData }                         from '../../stores/KingdomStore';
   import { uiState, setSelectedTab }             from '../../stores/ui';
   import { TurnPhase } from '../../actors/KingdomActor';
   
   // Import territory service for syncing
   import { territoryService }                    from '../../services/territory';
   
   // Components
   import ContentSelector from './components/ContentSelector.svelte';
   import KingdomStats    from './components/KingdomStats.svelte';
   import WelcomeDialog   from './components/WelcomeDialog.svelte';
   
   // Tab components
   import TurnTab         from './tabs/TurnTab.svelte';
   import SetupTab        from './tabs/SetupTab.svelte';
   import TerritoryTab    from './tabs/TerritoryTab.svelte';
   import SettlementsTab  from './tabs/SettlementsTab.svelte';
   import ArmiesTab       from './tabs/ArmiesTab.svelte';
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
   
   // Debug kingdom data changes reactively
   $: if ($kingdomData) {

   }
   
   // Perform initial sync when the app opens
   onMount(async () => {
      // First ensure we have a kingdom actor
      try {
         const { ensureKingdomActor } = await import('../../hooks/kingdomSync');
         const { initializeKingdomActor } = await import('../../stores/KingdomStore');
         const { wrapKingdomActor } = await import('../../utils/kingdom-actor-wrapper');


         let foundryActor = null;
         try {
            foundryActor = await ensureKingdomActor();

         } catch (error) {
            logger.error('[KingdomAppShell] ensureKingdomActor threw error:', error);
         }
         
         if (foundryActor) {

            // Wrap the actor with kingdom methods (if not already wrapped)
            // Note: ensureKingdomActor() already wraps it, but this is safe (checks _kingdomWrapped flag)
            const kingdomActor = wrapKingdomActor(foundryActor);
            
            // Initialize the kingdom data if it doesn't exist
            if (!kingdomActor.getKingdomData()) {
               await kingdomActor.initializeKingdom('New Kingdom');
            } else {
               // Migration: Ensure diplomaticCapacity is set (for kingdoms created before this was added)
               const kingdom = kingdomActor.getKingdomData();
               if (kingdom && kingdom.resources && kingdom.resources.diplomaticCapacity === 0) {

                  await kingdomActor.updateKingdomData((k: any) => {
                     if (!k.resources.diplomaticCapacity || k.resources.diplomaticCapacity === 0) {
                        k.resources.diplomaticCapacity = 1;
                     }
                  });
               }
            }
            
            // Initialize the store FIRST

            initializeKingdomActor(kingdomActor);
            
            // Wait for next tick to ensure store is reactive
            await tick();
            
            // Verify actor is available in store
            const { getKingdomActor } = await import('../../stores/KingdomStore');
            const storeActor = getKingdomActor();

            // Initialize all players for kingdom actions
            const { initializeAllPlayers } = await import('../../stores/KingdomStore');
            initializeAllPlayers();
            
            // Setup Foundry synchronization hooks
            const { setupFoundrySync } = await import('../../stores/KingdomStore');
            setupFoundrySync();
            
            // Check if we should show welcome dialog BEFORE syncing
            // This allows users to choose their import method
            await tick();
            const kingdomState = kingdomActor.getKingdomData();
            const hasNoTerritoryData = !kingdomState?.hexes || kingdomState.hexes.length === 0;
            
            if (hasNoTerritoryData) {

               showWelcomeDialog = true;
               // Don't auto-sync - let the user choose via dialog
            }
            // NO automatic sync on app load - only manual imports or first-time setup
            
            // Debug current phase after initialization
            setTimeout(() => {

            }, 500);
            
            // Run settlement skill bonuses migration if needed
            const { autoMigrateSettlements } = await import('../../services/migrations/SettlementSkillBonusesMigration');
            await autoMigrateSettlements();
            
            // Recalculate all settlement derived properties to ensure consistency

            const { settlementService } = await import('../../services/settlements');
            const kingdom = kingdomActor.getKingdomData();
            if (kingdom?.settlements) {
               for (const settlement of kingdom.settlements) {
                  await settlementService.updateSettlementDerivedProperties(settlement.id);
               }

            }
         } else {
            logger.error('[KingdomAppShell] No kingdom actor found! This is the problem - initialization stopped here.');
            logger.error('[KingdomAppShell] Please ensure your party actor has kingdom data initialized.');
         }
      } catch (error: any) {
         logger.error('[KingdomAppShell] Error during initialization:', error);
         logger.error('[KingdomAppShell] Error stack:', error?.stack);
      }
   });

   // Reactive statement for refresh
   $: if (refreshTrigger) {

      // Sync territory data from Kingmaker if available (async)
      (async () => {
         if (territoryService.isKingmakerAvailable()) {
            const result = await territoryService.syncFromKingmaker();

            if (result.success) {

               // Show success notification
               // @ts-ignore
               ui.notifications?.info(`Territory synced: ${result.hexesSynced} hexes, ${result.settlementsSynced} settlements`);
            } else {

               // @ts-ignore
               ui.notifications?.warn(`Territory sync failed: ${result.error}`);
            }
         } else {

         }
      })();
   }

   // Settings view state
   let showSettingsView = false;
   
   // Welcome dialog state (exportable so it can be triggered from header button)
   export let showWelcomeDialog = false;
   
   // Handle tab selection
   function handleTabChange(tab: string) {
      showSettingsView = false;
      setSelectedTab(tab as any);
   }
   
   // Handle settings button click
   function handleOpenSettings() {
      showSettingsView = true;
   }
   
   // Handle welcome dialog close
   function handleWelcomeClose() {
      showWelcomeDialog = false;
   }
   
   // Handle welcome dialog complete
   function handleWelcomeComplete() {
      showWelcomeDialog = false;
      // Optionally refresh data or switch to Territory tab
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
            {:else if $uiState.selectedTab === 'setup'}
               <SetupTab />
            {:else if $uiState.selectedTab === 'territory'}
               <TerritoryTab />
            {:else if $uiState.selectedTab === 'settlements'}
               <SettlementsTab />
            {:else if $uiState.selectedTab === 'armies'}
               <ArmiesTab />
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
   
   <!-- Welcome Dialog (shown when no territory data) -->
   {#if showWelcomeDialog}
      <WelcomeDialog 
         on:close={handleWelcomeClose}
         on:complete={handleWelcomeComplete}
      />
   {/if}
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
