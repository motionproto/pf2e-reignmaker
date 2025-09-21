<script lang="ts">
   import { getContext }         from 'svelte';
   import { ApplicationShell }   from '#runtime/svelte/component/application';
   
   // Stores
   import { kingdomState, updateKingdomStat }     from '../../stores/kingdom';
   import { uiState, setSelectedTab }             from '../../stores/ui';
   
   // Components
   import ContentSelector from './components/ContentSelector.svelte';
   import KingdomStats    from './components/KingdomStats.svelte';
   
   // Tab components
   import TurnTab         from './tabs/TurnTab.svelte';
   import SettlementsTab  from './tabs/SettlementsTab.svelte';
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

// Settings view state is managed internally, removed unused export

   // Get external context
   const { actorId, application } = getContext<KingdomApp.External>('#external');

   // Reactive statement for refresh
   $: if (refreshTrigger) {
      console.log('Refreshing kingdom data...');
      // Trigger data refresh logic here
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
   <main class="kingdom-container" style="display: flex; flex-direction: column; height: 100%;">
      <!-- Kingdom Header with Tab Selection -->
      <div class="kingdom-header" style="background: rgba(35, 34, 30, 0.5); padding: 8px;">
         <ContentSelector 
            selectedTab={showSettingsView ? 'settings' : $uiState.selectedTab} 
            on:tabChange={(e) => handleTabChange(e.detail)}
            on:openSettings={handleOpenSettings}
         />
      </div>
      
      <!-- Main Content Area -->
      <div class="kingdom-body" style="display: flex; flex: 1; min-height: 0;">
         <!-- Left Sidebar: Kingdom Stats - Fixed 320px width -->
         <div class="kingdom-sidebar" style="width: 320px; background: rgba(35, 34, 30, 0.5); overflow-y: auto;">
            <KingdomStats />
         </div>
         
         <!-- Main Content Area with Tab Content -->
         <div class="kingdom-main" style="flex: 1; background: rgba(35, 34, 30, 0.5); padding: 12px; overflow-y: auto;">
            {#if showSettingsView}
               <SettingsTab />
            {:else if $uiState.selectedTab === 'turn'}
               <TurnTab />
            {:else if $uiState.selectedTab === 'settlements'}
               <SettlementsTab />
            {:else if $uiState.selectedTab === 'factions'}
               <FactionsTab />
            {:else if $uiState.selectedTab === 'modifiers'}
               <ModifiersTab />
            {:else if $uiState.selectedTab === 'notes'}
               <NotesTab />
            {/if}
         </div>
      </div>

      <!-- Error/Success Messages using DaisyUI alerts -->
      {#if $uiState.errorMessage}
         <div class="tw-alert tw-alert-error tw-fixed tw-bottom-5 tw-right-5 tw-w-auto tw-max-w-md tw-shadow-lg">
            <i class="fas fa-exclamation-triangle"></i>
            <span>{$uiState.errorMessage}</span>
         </div>
      {/if}
      
      {#if $uiState.successMessage}
         <div class="tw-alert tw-alert-success tw-fixed tw-bottom-5 tw-right-5 tw-w-auto tw-max-w-md tw-shadow-lg">
            <i class="fas fa-check-circle"></i>
            <span>{$uiState.successMessage}</span>
         </div>
      {/if}
   </main>
</ApplicationShell>
