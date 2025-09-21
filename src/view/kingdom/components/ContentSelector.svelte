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

<div class="tw-flex tw-justify-between tw-items-center tw-gap-5">
   <div class="tw-flex tw-gap-1 tw-flex-wrap tw-flex-1">
      {#each tabs as tab}
         <button 
            class="
               tw-px-4 tw-py-2 
               tw-bg-black/20 
               tw-border tw-border-white/10 
               tw-rounded-foundry 
               tw-text-white/80 
               tw-cursor-pointer 
               tw-transition-all tw-duration-200
               tw-flex tw-items-center tw-gap-2
               hover:tw-bg-black/30 
               hover:tw-text-white 
               hover:-tw-translate-y-px
               {selectedTab === tab.id ? 
                  'tw-bg-foundry-primary tw-text-white tw-border-white/30 tw-shadow-foundry' : 
                  ''
               }
            "
            on:click={() => selectTab(tab.id)}
            title={tab.label}
         >
            <i class="fas {tab.icon} tw-text-base"></i>
            <span class="tw-font-medium">{tab.label}</span>
         </button>
      {/each}
   </div>
   
   <button 
      class="
         tw-px-3 tw-py-2 
         tw-bg-black/20 
         tw-border tw-border-white/10 
         tw-rounded-foundry 
         tw-text-white/80 
         tw-cursor-pointer 
         tw-transition-all tw-duration-200
         tw-flex tw-items-center tw-justify-center
         hover:tw-bg-black/30 
         hover:tw-text-white 
         hover:tw-rotate-90
      "
      on:click={openSettings}
      title="Kingdom Settings"
   >
      <i class="fas fa-cog tw-text-xl"></i>
   </button>
</div>
