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
</script>

<div class="content-selector">
   {#each tabs as tab}
      <button 
         class="tab-button" 
         class:active={selectedTab === tab.id}
         on:click={() => selectTab(tab.id)}
         title={tab.label}
      >
         <i class="fas {tab.icon}"></i>
         <span>{tab.label}</span>
      </button>
   {/each}
</div>

<style lang="scss">
   .content-selector {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
   }
   
   .tab-button {
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      
      &:hover {
         background: rgba(0, 0, 0, 0.3);
         color: rgba(255, 255, 255, 1);
         transform: translateY(-1px);
      }
      
      &.active {
         background: var(--color-primary, #5e0000);
         color: white;
         border-color: rgba(255, 255, 255, 0.3);
         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      i {
         font-size: 1.1em;
      }
      
      span {
         font-weight: 500;
      }
   }
</style>
