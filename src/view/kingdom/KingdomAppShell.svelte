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
   
   import type { KingdomApp } from './KingdomApp';

   /**
    * Application shell contract. Export the `elementRoot` from `ApplicationShell`.
    */
   export let elementRoot: HTMLElement;

   /**
    * Trigger for refreshing data
    */
   export let refreshTrigger: number = 0;

   /**
    * Show settings panel
    */
   export let showSettings: boolean = false;

   // Get external context
   const { actorId, application } = getContext<KingdomApp.External>('#external');

   // Reactive statement for refresh
   $: if (refreshTrigger) {
      console.log('Refreshing kingdom data...');
      // Trigger data refresh logic here
   }

   // Handle tab selection
   function handleTabChange(tab: string) {
      setSelectedTab(tab as any);
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
            selectedTab={$uiState.selectedTab} 
            on:tabChange={(e) => handleTabChange(e.detail)}
         />
      </div>
      
      <!-- Main Content Area -->
      <div class="kingdom-body">
         <!-- Left Sidebar: Kingdom Stats -->
         <div class="kingdom-sidebar">
            <KingdomStats state={$kingdomState} />
         </div>
         
         <!-- Main Content Area with Tab Content -->
         <div class="kingdom-main">
            {#if $uiState.selectedTab === 'turn'}
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

<style lang="scss">
   .kingdom-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 10px;
      padding: 10px;
   }

   .kingdom-header {
      flex: 0 0 auto;
      padding: 10px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 5px;
   }

   .kingdom-body {
      flex: 1;
      display: flex;
      gap: 10px;
      min-height: 0; // Important for scrolling
   }

   .kingdom-sidebar {
      flex: 0 0 250px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 5px;
      padding: 10px;
      overflow-y: auto;
   }

   .kingdom-main {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 5px;
      padding: 15px;
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

      &.error {
         background: rgba(200, 50, 50, 0.9);
         color: white;
      }

      &.success {
         background: rgba(50, 200, 50, 0.9);
         color: white;
      }

      i {
         font-size: 1.2em;
      }
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
</style>
