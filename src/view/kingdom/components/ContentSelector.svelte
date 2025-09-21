<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   
   export let selectedTab: string = 'turn';
   
   const dispatch = createEventDispatcher();
   
   const tabs = [
      { id: 'turn', label: 'Turn Management', icon: 'fa-hourglass-half' },
      { id: 'settlements', label: 'Settlements', icon: 'fa-city' },
      { id: 'factions', label: 'Factions', icon: 'fa-users' },
      { id: 'modifiers', label: 'Modifiers', icon: 'fa-magic' },
      { id: 'notes', label: 'Notes', icon: 'fa-book' }
   ];
   
   function selectTab(tabId: string) {
      dispatch('tabChange', tabId);
   }
   
   function openSettings() {
      dispatch('openSettings');
   }
</script>

<div data-theme="foundry" class="tw-flex tw-justify-between tw-items-center tw-gap-5">
   <!-- Tab buttons using DaisyUI -->
   <div class="tw-tabs tw-tabs-boxed tw-flex-1 tw-bg-base-200/50">
      {#each tabs as tab}
         <button 
            class="tw-tab tw-gap-2 {selectedTab === tab.id ? 'tw-tab-active' : ''}"
            on:click={() => selectTab(tab.id)}
            title={tab.label}
         >
            <i class="fas {tab.icon}"></i>
            <span class="tw-hidden sm:tw-inline">{tab.label}</span>
         </button>
      {/each}
   </div>
   
   <!-- Settings button using DaisyUI -->
   <button 
      class="tw-btn tw-btn-circle tw-btn-ghost tw-btn-sm"
      on:click={openSettings}
      title="Kingdom Settings"
   >
      <i class="fas fa-cog tw-text-xl"></i>
   </button>
</div>
