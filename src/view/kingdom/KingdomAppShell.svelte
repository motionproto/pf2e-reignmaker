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
   
   // Tab components
   import TurnTab         from './tabs/TurnTab.svelte';
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
      console.log('🔍 [KingdomAppShell REACTIVE DEBUG] Kingdom data changed:', {
         currentPhase: $kingdomData.currentPhase,
         currentTurn: $kingdomData.currentTurn,
         currentPhaseSteps: $kingdomData.currentPhaseSteps,
         hasData: !!$kingdomData
      });
   }
   
   // Perform initial sync when the app opens
   onMount(async () => {
      // First ensure we have a kingdom actor
      try {
         const { ensureKingdomActor } = await import('../../hooks/kingdomSync');
         const { initializeKingdomActor } = await import('../../stores/KingdomStore');
         const { KingdomActor } = await import('../../actors/KingdomActor');
         
         console.log('[KingdomAppShell] Ensuring kingdom actor exists...');
         console.log('[KingdomAppShell] About to call ensureKingdomActor()...');
         let foundryActor = null;
         try {
            foundryActor = await ensureKingdomActor();
            console.log('[KingdomAppShell] ensureKingdomActor returned:', !!foundryActor, foundryActor?.name);
         } catch (error) {
            console.error('[KingdomAppShell] ensureKingdomActor threw error:', error);
         }
         
         if (foundryActor) {
            console.log('[KingdomAppShell] Initializing kingdom actor store...');
            
            // Create a kingdom actor wrapper that adds our methods to the foundry actor
            const kingdomActor = foundryActor;
            
            // Add our kingdom methods to the actor
            kingdomActor.getKingdom = function() {
               return this.getFlag('pf2e-reignmaker', 'kingdom-data') || null;
            };
            kingdomActor.setKingdom = async function(kingdom: any) {
               await this.setFlag('pf2e-reignmaker', 'kingdom-data', kingdom);
            };
            kingdomActor.updateKingdom = async function(updater: any) {
               const kingdom = this.getKingdom();
               if (!kingdom) {
                  console.warn('[KingdomActor] No kingdom data found, cannot update');
                  return;
               }
               updater(kingdom);
               await this.setKingdom(kingdom);
            };
            kingdomActor.initializeKingdom = async function(name = 'New Kingdom') {
               const { createDefaultKingdom } = await import('../../actors/KingdomActor');
               const defaultKingdom = createDefaultKingdom(name);
               await this.setKingdom(defaultKingdom);
            };
            kingdomActor.isCurrentPhaseComplete = function() {
               const kingdom = this.getKingdom();
               if (!kingdom) return false;
               return kingdom.phasesCompleted?.includes(kingdom.currentPhase) || false;
            };
            kingdomActor.modifyResource = async function(resource: any, amount: any) {
               await this.updateKingdom((kingdom: any) => {
                  const current = kingdom.resources[resource] || 0;
                  kingdom.resources[resource] = Math.max(0, current + amount);
               });
            };
            kingdomActor.setResource = async function(resource: any, amount: any) {
               await this.updateKingdom((kingdom: any) => {
                  kingdom.resources[resource] = Math.max(0, amount);
               });
            };
            kingdomActor.addSettlement = async function(settlement: any) {
               await this.updateKingdom((kingdom: any) => {
                  kingdom.settlements.push(settlement);
               });
            };
            kingdomActor.removeSettlement = async function(settlementId: any) {
               await this.updateKingdom((kingdom: any) => {
                  kingdom.settlements = kingdom.settlements.filter((s: any) => s.id !== settlementId);
               });
            };
            kingdomActor.updateSettlement = async function(settlementId: any, updates: any) {
               await this.updateKingdom((kingdom: any) => {
                  const index = kingdom.settlements.findIndex((s: any) => s.id === settlementId);
                  if (index >= 0) {
                     kingdom.settlements[index] = { ...kingdom.settlements[index], ...updates };
                  }
               });
            };
            kingdomActor.addArmy = async function(army: any) {
               await this.updateKingdom((kingdom: any) => {
                  kingdom.armies.push(army);
               });
            };
            kingdomActor.removeArmy = async function(armyId: any) {
               await this.updateKingdom((kingdom: any) => {
                  kingdom.armies = kingdom.armies.filter((a: any) => a.id !== armyId);
               });
            };
            kingdomActor.addModifier = async function(modifier: any) {
               await this.updateKingdom((kingdom: any) => {
                  kingdom.modifiers.push(modifier);
               });
            };
            kingdomActor.removeModifier = async function(modifierId: any) {
               await this.updateKingdom((kingdom: any) => {
                  kingdom.modifiers = kingdom.modifiers.filter((m: any) => m.id !== modifierId);
               });
            };
            
            // Initialize the kingdom data if it doesn't exist
            if (!kingdomActor.getKingdom()) {
               await kingdomActor.initializeKingdom('New Kingdom');
            } else {
               // Migration: Ensure diplomaticCapacity is set (for kingdoms created before this was added)
               const kingdom = kingdomActor.getKingdom();
               if (kingdom && kingdom.resources && kingdom.resources.diplomaticCapacity === 0) {
                  console.log('[KingdomAppShell] Migrating diplomaticCapacity from 0 to 1');
                  await kingdomActor.updateKingdom((k) => {
                     if (!k.resources.diplomaticCapacity || k.resources.diplomaticCapacity === 0) {
                        k.resources.diplomaticCapacity = 1;
                     }
                  });
               }
            }
            
            // Initialize the store FIRST
            console.log('[KingdomAppShell] Setting kingdom actor in store...');
            initializeKingdomActor(kingdomActor);
            
            // Wait for next tick to ensure store is reactive
            await tick();
            
            // Verify actor is available in store
            const { getKingdomActor } = await import('../../stores/KingdomStore');
            const storeActor = getKingdomActor();
            console.log('[KingdomAppShell] Actor available in store:', !!storeActor);
            
            // Initialize all players for kingdom actions
            const { initializeAllPlayers } = await import('../../stores/KingdomStore');
            initializeAllPlayers();
            
            // Setup Foundry synchronization hooks
            const { setupFoundrySync } = await import('../../stores/KingdomStore');
            setupFoundrySync();
            
            // Now sync territory data from Kingmaker if available
            if (territoryService.isKingmakerAvailable()) {
               console.log('[KingdomAppShell] Syncing territory data...');
               const result = await territoryService.syncFromKingmaker();
               
               if (result.success) {
                  console.log(`[KingdomAppShell] Territory sync successful: ${result.hexesSynced} hexes, ${result.settlementsSynced} settlements`);
                  // Only show notification if there's actual data
                  if (result.hexesSynced > 0 || result.settlementsSynced > 0) {
                     // @ts-ignore
                     ui.notifications?.info(`Territory loaded: ${result.hexesSynced} hexes, ${result.settlementsSynced} settlements`);
                  }
               } else if (result.error) {
                  console.warn('[KingdomAppShell] Territory sync failed:', result.error);
                  // Don't show error notification on initial load unless there's a real error
                  if (!result.error.includes('not available')) {
                     // @ts-ignore
                     ui.notifications?.warn(`Territory sync failed: ${result.error}`);
                  }
               }
            }
            
            // Debug current phase after initialization
            setTimeout(() => {
               console.log('🔍 [KingdomAppShell DEBUG] Initial kingdom state after mount:', {
                  currentPhase: $kingdomData?.currentPhase,
                  currentTurn: $kingdomData?.currentTurn,
                  currentPhaseSteps: $kingdomData?.currentPhaseSteps,
                  isUpkeepPhase: $kingdomData?.currentPhase === TurnPhase.UPKEEP,
                  hexes: $kingdomData?.hexes?.length || 0,
                  settlements: $kingdomData?.settlements?.length || 0
               });
            }, 500);
            
            // Run settlement skill bonuses migration if needed
            const { autoMigrateSettlements } = await import('../../services/migrations/SettlementSkillBonusesMigration');
            await autoMigrateSettlements();
            
            // Recalculate all settlement derived properties to ensure consistency
            console.log('[KingdomAppShell] Recalculating settlement properties...');
            const { settlementService } = await import('../../services/settlements');
            const kingdom = kingdomActor.getKingdom();
            if (kingdom?.settlements) {
               for (const settlement of kingdom.settlements) {
                  await settlementService.updateSettlementDerivedProperties(settlement.id);
               }
               console.log('[KingdomAppShell] Settlement properties recalculated successfully');
            }
         } else {
            console.error('[KingdomAppShell] No kingdom actor found! This is the problem - initialization stopped here.');
            console.error('[KingdomAppShell] Please ensure your party actor has kingdom data initialized.');
         }
      } catch (error) {
         console.error('[KingdomAppShell] Error during initialization:', error);
         console.error('[KingdomAppShell] Error stack:', error.stack);
      }
   });

   // Reactive statement for refresh
   $: if (refreshTrigger) {
      // console.log('Refreshing kingdom data...');
      
      // Sync territory data from Kingmaker if available (async)
      (async () => {
         if (territoryService.isKingmakerAvailable()) {
            const result = await territoryService.syncFromKingmaker();
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
      })();
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
