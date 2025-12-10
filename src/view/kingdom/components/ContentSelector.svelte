<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   
   export let selectedTab: string = 'turn';
   
   const dispatch = createEventDispatcher();
   
   const tabs = [
      { id: 'turn', label: 'Turn', icon: 'fa-hourglass-half' },
      { id: 'settlements', label: 'Settlements', icon: 'fa-city' },
      { id: 'armies', label: 'Armies', icon: 'fa-shield-alt' },
      { id: 'factions', label: 'Factions', icon: 'fa-users' },
      { id: 'modifiers', label: 'Modifiers', icon: 'fa-magic' },
      { id: 'territory', label: 'Territory', icon: 'fa-map' },
      { id: 'structures', label: 'Structures', icon: 'fa-hammer' },
      { id: 'notes', label: 'Notes', icon: 'fa-book' },
      { id: 'visuals', label: 'Visuals', icon: 'fa-palette' }
   ];
   
   function selectTab(tabId: string) {
      dispatch('tabChange', tabId);
   }
   
   function openSettings() {
      dispatch('openSettings');
   }
</script>

<div class="content-selector-wrapper">
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
   
   <div class="header-actions">
      <button 
         class="tab-button icon-only" 
         class:active={selectedTab === 'setup'}
         on:click={() => selectTab('setup')}
         title="Kingdom Setup & Guide"
      >
         <i class="fas fa-question-circle"></i>
      </button>
      <button 
         class="action-button settings-button" 
         on:click={openSettings}
         title="Kingdom Settings"
      >
         <i class="fas fa-cog"></i>
      </button>
   </div>
</div>

<style lang="scss">
   /* Import CSS variables to ensure they're available in this component */
   @import '../../../styles/variables.css';
   
   .content-selector-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-20);
   }
   
   .content-selector {
      display: flex;
      gap: var(--space-16);
      flex-wrap: wrap;
      flex: 1;
   }
   
   .tab-button {
      padding: var(--space-8) var(--space-16);
      background: var(--overlay-low);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      &:hover {
         background: var(--overlay);
         color: rgba(255, 255, 255, 1);
         transform: translateY(-0.0625rem);
      }
      
      &.active {
         background: linear-gradient(to top, var(--color-primary-dark), var(--color-primary));
         color: white;
         border-color: var(--color-primary-light);
         box-shadow: 0 0.125rem 0.25rem var(--overlay);
         
         // Explicitly set white color for all child elements
         i, span {
            color: white;
         }
      }
      
      &.icon-only {
         padding: var(--space-8) var(--space-12);
         
         i {
            font-size: var(--font-xl);
         }
      }
      
      i {
         font-size: var(--font-lg);
      }
      
      span {
         font-weight: var(--font-weight-medium);
      }
   }
   
   .header-actions {
      display: flex;
      gap: var(--space-8);
      flex: 0 0 auto;
   }
   
   .action-button {
      padding: var(--space-8) var(--space-12);
      background: var(--overlay-low);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      
      &:hover {
         background: var(--overlay);
         color: rgba(255, 255, 255, 1);
      }
      
      i {
         font-size: var(--font-xl);
      }
      
      &.import-button:hover i {
        transform: translateY(-0.125rem);
      }
      
      &.settings-button i {
         transition: transform 0.3s ease;
      }
      
      &.settings-button:hover i {
         transform: rotate(90deg);
      }
   }
</style>
