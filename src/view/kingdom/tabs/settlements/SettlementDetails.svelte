<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { updateKingdom } from '../../../../stores/KingdomStore';
   import SettlementTier from './SettlementTier.svelte';
   import SettlementBasicInfo from './SettlementBasicInfo.svelte';
   import SettlementStructures from './SettlementStructures.svelte';
   import SettlementStatus from './SettlementStatus.svelte';
   import SettlementImage from './SettlementImage.svelte';
   import SettlementManagement from './SettlementManagement.svelte';
   
   export let settlement: Settlement | null;
   
   let isEditingName = false;
   let editedName = '';
   
   function startEditingName() {
      if (settlement) {
         isEditingName = true;
         editedName = settlement.name;
      }
   }
   
   function saveSettlementName() {
      if (settlement && editedName.trim()) {
         // Use the new store's update method to ensure proper state management and persistence
         updateKingdom(k => {
            const s = k.settlements.find(s => s.id === settlement!.id);
            if (s) {
               s.name = editedName.trim();
            }
         });
         isEditingName = false;
      }
   }
   
   function cancelEditingName() {
      isEditingName = false;
      editedName = '';
   }
   
   function handleNameKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
         saveSettlementName();
      } else if (event.key === 'Escape') {
         cancelEditingName();
      }
   }
</script>

<div class="settlement-details-panel">
   {#if settlement}
      <div class="panel-header">
         <div class="settlement-title">
            {#if isEditingName}
               <input 
                  type="text" 
                  bind:value={editedName}
                  on:keydown={handleNameKeydown}
                  on:blur={saveSettlementName}
                  class="name-input"
                  autofocus
               />
               <button 
                  on:click={saveSettlementName}
                  class="save-button"
                  title="Save"
               >
                  <i class="fas fa-check"></i>
               </button>
               <button 
                  on:click={cancelEditingName}
                  class="cancel-button"
                  title="Cancel"
               >
                  <i class="fas fa-times"></i>
               </button>
            {:else}
               <div class="name-wrapper">
                  <h3>{settlement.name}</h3>
                  <button 
                     on:click={startEditingName}
                     class="edit-button"
                     title="Edit settlement name"
                  >
                     <i class="fa-solid fa-pen-fancy"></i>
                  </button>
               </div>
            {/if}
            <SettlementTier tier={settlement.tier} level={settlement.level} />
         </div>
      </div>
      
      <div class="details-content">
         <SettlementImage {settlement} />
         <div class="status-wrapper">
            <SettlementStatus {settlement} />
         </div>
         <SettlementBasicInfo {settlement} />
         <SettlementStructures {settlement} />
         <SettlementManagement {settlement} />
      </div>
   {:else}
      <div class="empty-selection">
         <i class="fas fa-city fa-3x"></i>
         <p>Select a settlement to view details</p>
      </div>
   {/if}
</div>

<style lang="scss">
   @use './settlements-shared.scss';
   
   .settlement-details-panel {
      flex: 1;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0.375rem;
      display: flex;
      flex-direction: column;
      overflow: hidden;
   }
   
   .panel-header {
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      
      .settlement-title {
         display: flex;
         align-items: center;
         justify-content: space-between;
         gap: 0.5rem;
         width: 100%;
         
         .name-wrapper {
            display: flex;
            align-items: center;
            gap: 0.25rem;
         }
         
         h3 {
            margin: 0;
            color: var(--text-accent);
            font-size: var(--font-3xl);
            font-weight: var(--font-weight-semibold);
         }
         
         .name-input {
            flex: 1;
            padding: 0.5rem;
            background: var(--bg-elevated);
            border: 1px solid var(--color-primary);
            border-radius: var(--radius-lg);
            color: var(--text-accent);
            font-size: var(--font-3xl);
            font-weight: var(--font-weight-semibold);
            
            &:focus {
               outline: none;
               border-color: var(--color-primary);
               background: var(--bg-overlay);
            }
         }
         
         .edit-button {
            padding: 0.375rem 0.5rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            transition: var(--transition-base);
            font-size: var(--font-sm);
            
            &:hover {
               background: rgba(255, 255, 255, 0.1);
               border-radius: var(--radius-md);
            }
         }
         
      }
   }
   
   .details-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
   }
   
   .status-wrapper {
      border: 2px solid var(--color-accent);
      border-radius: var(--radius-lg);
      padding: 0.75rem;
      margin-bottom: 1rem;
   }
   
   .empty-selection {
      @extend .empty-state;
      height: 100%;
   }
</style>
