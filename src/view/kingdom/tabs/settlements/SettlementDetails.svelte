<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { SettlementTier as SettlementTierEnum } from '../../../../models/Settlement';
   import { updateKingdom } from '../../../../stores/KingdomStore';
   import { settlementService } from '../../../../services/settlements';
   import SettlementTier from './SettlementTier.svelte';
   import SettlementBasicInfo from './SettlementBasicInfo.svelte';
   import SettlementStructures from './SettlementStructures.svelte';
   import SettlementStatus from './SettlementStatus.svelte';
   import SettlementImage from './SettlementImage.svelte';
   import SettlementManagement from './SettlementManagement.svelte';
   import SettlementLocationPicker from './SettlementLocationPicker.svelte';
   import Button from '../../components/baseComponents/Button.svelte';
   import Dialog from '../../components/baseComponents/Dialog.svelte';
   import Notification from '../../components/baseComponents/Notification.svelte';
   import { createEventDispatcher } from 'svelte';
   
   export let settlement: Settlement | null;
   
   const dispatch = createEventDispatcher();
   
   let isEditingName = false;
   let editedName = '';
   let isEditingLevel = false;
   let editedLevel = 1;
   let showDeleteConfirm = false;
   let isDeleting = false;
   
   // Calculate next tier tooltip
   $: nextTierTooltip = settlement ? getNextTierTooltip(settlement) : '';
   
   function getNextTierTooltip(settlement: Settlement): string {
      let nextTier: string;
      let requiredLevel: number;
      let requiredStructures: number;
      
      switch (settlement.tier) {
         case SettlementTierEnum.VILLAGE:
            nextTier = 'Town';
            requiredLevel = 2;
            requiredStructures = 3;
            break;
         case SettlementTierEnum.TOWN:
            nextTier = 'City';
            requiredLevel = 5;
            requiredStructures = 6;
            break;
         case SettlementTierEnum.CITY:
            nextTier = 'Metropolis';
            requiredLevel = 8;
            requiredStructures = 9;
            break;
         case SettlementTierEnum.METROPOLIS:
            return 'Maximum tier reached';
         default:
            return '';
      }
      
      const currentStructures = settlement.structureIds.length;
      
      return `${nextTier} at level ${requiredLevel}\n` +
             `${currentStructures}/${requiredStructures} structures required`;
   }
   
   // Auto-start editing for newly created settlements
   $: if (settlement && settlement.name.startsWith('Missing settlement at') && !isEditingName) {
      startEditingName();
   }
   
   function startEditingName() {
      if (settlement) {
         isEditingName = true;
         // Empty the field if it's a "Missing settlement at" placeholder
         editedName = settlement.name.startsWith('Missing settlement at') ? '' : settlement.name;
      }
   }
   
   async function saveSettlementName() {
      if (settlement && editedName.trim()) {
         // Use settlement service to trigger Kingmaker map sync
         await settlementService.updateSettlement(settlement.id, { name: editedName.trim() });
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
   
   function startEditingLevel() {
      if (settlement) {
         isEditingLevel = true;
         editedLevel = settlement.level;
      }
   }
   
   async function saveSettlementLevel() {
      if (settlement && editedLevel >= 1 && editedLevel <= 20) {
         await settlementService.updateSettlementLevel(settlement.id, editedLevel);
         isEditingLevel = false;
      }
   }
   
   function cancelEditingLevel() {
      isEditingLevel = false;
      editedLevel = 1;
   }
   
   function handleLevelKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
         saveSettlementLevel();
      } else if (event.key === 'Escape') {
         cancelEditingLevel();
      }
   }
   
   function openDeleteConfirm() {
      showDeleteConfirm = true;
   }
   
   function closeDeleteConfirm() {
      showDeleteConfirm = false;
   }
   
   async function confirmDelete() {
      if (!settlement || isDeleting) return;
      
      isDeleting = true;
      
      try {
         const result = await settlementService.deleteSettlement(settlement.id);
         
         // Show notification
         // @ts-ignore - Foundry global
         ui.notifications?.info(`Deleted settlement "${result.name}" (${result.structuresRemoved} structures removed, ${result.armiesMarkedUnsupported} armies unsupported)`);
         
         // Close dialog
         showDeleteConfirm = false;
         
         // Notify parent to deselect
         dispatch('settlementDeleted');
         
      } catch (error) {
         console.error('Failed to delete settlement:', error);
         // @ts-ignore - Foundry global
         ui.notifications?.error(`Failed to delete settlement: ${error.message}`);
      } finally {
         isDeleting = false;
      }
   }
</script>

<div class="settlement-details-panel">
   {#if settlement}
      <div class="panel-header">
         <div class="settlement-title">
            {#if isEditingName}
               <div class="name-edit-wrapper">
                  <div class="name-input-row">
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
                  </div>
                  {#if editedName.trim() === ''}
                     <div class="name-hint">Enter settlement name</div>
                  {/if}
               </div>
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
            <div class="tier-and-actions">
               <SettlementLocationPicker settlement={settlement} />
               
               <SettlementTier {settlement} />
               
               <!-- Level Editor -->
               {#if isEditingLevel}
                  <div class="level-editor">
                     <span class="level-label">Level</span>
                     <input 
                        type="number" 
                        bind:value={editedLevel}
                        on:keydown={handleLevelKeydown}
                        class="level-input"
                        min="1"
                        max="20"
                        autofocus
                     />
                     <button 
                        on:click={saveSettlementLevel}
                        class="level-confirm-btn"
                        title="Save"
                     >
                        <i class="fas fa-check"></i>
                     </button>
                     <button 
                        on:click={cancelEditingLevel}
                        class="level-cancel-btn"
                        title="Cancel"
                     >
                        <i class="fas fa-times"></i>
                     </button>
                  </div>
               {:else}
                  <div class="level-display" on:click={startEditingLevel} title={nextTierTooltip}>
                     <span class="level-label">Level</span>
                     <span class="level-value">{settlement.level}</span>
                  </div>
               {/if}
            </div>
         </div>
      </div>
      
      <!-- Unmapped Settlement Alert -->
      {#if settlement.location.x === 0 && settlement.location.y === 0}
         <div class="unmapped-alert-wrapper">
            <Notification
               variant="warning"
               title="Settlement Not Placed"
               description="This settlement is not placed on the map. Please select a hex location."
            />
         </div>
      {/if}
      
      <div class="details-content">
         <SettlementImage {settlement} />
         <div class="status-wrapper">
            <SettlementStatus {settlement} />
         </div>
         <SettlementBasicInfo {settlement} />
         <SettlementManagement {settlement} />
         <SettlementStructures {settlement} />
         
         <!-- Delete Settlement Button -->
         <Button 
            on:click={openDeleteConfirm} 
            disabled={isDeleting}
            variant="danger"
            fullWidth={true}
            icon="fas fa-trash"
         >
            Delete Settlement
         </Button>
      </div>
   {:else}
      <div class="empty-selection">
         <i class="fas fa-city fa-3x"></i>
         <p>Select a settlement to view details</p>
      </div>
   {/if}
   
   <!-- Delete Confirmation Dialog -->
   {#if settlement}
      <Dialog 
         bind:show={showDeleteConfirm}
         title="Delete Settlement?"
         confirmLabel={isDeleting ? 'Deleting...' : 'Delete Settlement'}
         cancelLabel="Cancel"
         confirmDisabled={isDeleting}
         width="600px"
         on:confirm={confirmDelete}
         on:cancel={closeDeleteConfirm}
      >
         <div class="delete-dialog-content">
            <div class="warning-icon">
               <i class="fas fa-exclamation-triangle"></i>
            </div>
            <p class="warning-text">
               This will permanently remove:
            </p>
            <ul class="delete-details">
               <li><strong>{settlement.name}</strong> ({settlement.tier})</li>
               <li>{settlement.structureIds.length} structures</li>
               {#if settlement.supportedUnits.length > 0}
                  <li>{settlement.supportedUnits.length} armies will become unsupported</li>
               {/if}
               <li>All tributes and settlement data</li>
            </ul>
            <div class="warning-note">
               <i class="fas fa-exclamation-circle"></i>
               <strong>This action cannot be undone.</strong>
            </div>
         </div>
      </Dialog>
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
         align-items: flex-start;
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
         
         .name-edit-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
         }
         
         .name-input-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
         }
         
         .name-hint {
            font-size: var(--font-xs);
            color: var(--text-tertiary);
            font-style: italic;
            padding-left: 0.5rem;
         }
         
      }
   }
   
   .details-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
   }
   
   .status-wrapper {
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 0.75rem;
      margin-bottom: 1.5rem;
   }
   
   .empty-selection {
      @extend .empty-state;
      height: 100%;
   }
   
   .tier-and-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
   }
   
   .delete-button {
      padding: 0.5rem 0.75rem;
      background: rgba(220, 53, 69, 0.1);
      border: 1px solid rgba(220, 53, 69, 0.3);
      border-radius: var(--radius-md);
      color: #dc3545;
      cursor: pointer;
      transition: var(--transition-base);
      
      &:hover {
         background: rgba(220, 53, 69, 0.2);
         border-color: #dc3545;
      }
      
      i {
         font-size: var(--font-sm);
      }
   }
   
   /* Modal Styles */
   .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
   }
   
   .modal-dialog {
      background: var(--bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      min-width: 25rem;
      max-width: 35rem;
   }
   
   .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--color-border);
      
      h3 {
         margin: 0;
         color: #dc3545;
         font-size: var(--font-lg);
         display: flex;
         align-items: center;
         gap: 0.5rem;
         
         i {
            color: #ffc107;
         }
      }
      
      .close-button {
         padding: 0.25rem 0.5rem;
         background: transparent;
         border: none;
         color: var(--text-secondary);
         cursor: pointer;
         border-radius: var(--radius-md);
         
         &:hover {
            background: rgba(255, 255, 255, 0.1);
         }
      }
   }
   
   .modal-content {
      padding: 1.5rem;
      
      .warning-text {
         margin: 0 0 1rem 0;
         color: var(--text-primary);
      }
      
      .delete-details {
         margin: 0 0 1rem 0;
         padding-left: 1.5rem;
         
         li {
            margin: 0.5rem 0;
            color: var(--text-secondary);
         }
      }
      
      .warning-note {
         margin: 1rem 0 0 0;
         padding: 0.75rem;
         background: rgba(220, 53, 69, 0.1);
         border: 1px solid rgba(220, 53, 69, 0.3);
         border-radius: var(--radius-md);
         color: #dc3545;
         text-align: center;
      }
   }
   
   .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem;
      border-top: 1px solid var(--color-border);
   }
   
   .button {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: var(--transition-base);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .button-secondary {
      background: var(--bg-subtle);
      border: 1px solid var(--color-border);
      color: var(--text-primary);
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .button-danger {
      background: #dc3545;
      border: 1px solid #dc3545;
      color: white;
      
      &:hover:not(:disabled) {
         background: #c82333;
         border-color: #bd2130;
      }
   }
   
   .delete-settlement-btn {
      width: 100%;
      padding: 0.75rem 1rem;
      margin-top: 1.5rem;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--color-red-bg);
      color: var(--color-danger);
      cursor: pointer;
      transition: var(--transition-base);
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-md);
      
      &:hover:not(:disabled) {
         background: var(--btn-primary-bg);
         border-color: var(--color-danger);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
      }
      
      i {
         margin-right: 0.5rem;
      }
   }
   
   .level-display {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: var(--transition-base);
      
      &:hover {
         background: var(--bg-overlay);
         border-color: var(--color-primary);
      }
      
      .level-label {
         font-size: var(--font-sm);
         color: var(--text-secondary);
         font-weight: var(--font-weight-medium);
      }
      
      .level-value {
         font-size: var(--font-md);
         color: var(--text-primary);
         font-weight: var(--font-weight-semibold);
         min-width: 1.5rem;
         text-align: center;
      }
   }
   
   .level-editor {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background: var(--bg-elevated);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-md);
      
      .level-label {
         font-size: var(--font-sm);
         color: var(--text-secondary);
         font-weight: var(--font-weight-medium);
      }
      
      .level-input {
         width: 3rem;
         padding: 0.25rem 0.5rem;
         background: var(--bg-overlay);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-md);
         color: var(--text-primary);
         font-size: var(--font-md);
         font-weight: var(--font-weight-semibold);
         text-align: center;
         
         &:focus {
            outline: none;
            border-color: var(--color-primary);
         }
         
         /* Remove number input arrows */
         &::-webkit-inner-spin-button,
         &::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
         }
         -moz-appearance: textfield;
      }
      
      .level-confirm-btn,
      .level-cancel-btn {
         padding: 0.25rem 0.5rem;
         background: transparent;
         border: none;
         cursor: pointer;
         border-radius: var(--radius-md);
         transition: var(--transition-base);
         
         i {
            font-size: var(--font-sm);
         }
      }
      
      .level-confirm-btn {
         color: var(--color-success);
         
         &:hover {
            background: rgba(40, 167, 69, 0.1);
         }
      }
      
      .level-cancel-btn {
         color: var(--color-danger);
         
         &:hover {
            background: rgba(220, 53, 69, 0.1);
         }
      }
   }
   
   /* Unmapped Settlement Alert */
   .unmapped-alert-wrapper {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
   }
   
   /* Delete Dialog Content Styling */
   .delete-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      
      .warning-icon {
         text-align: center;
         
         i {
            font-size: 3rem;
            color: #fbbf24;
         }
      }
      
      .warning-text {
         margin: 0;
         color: var(--text-primary);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
      }
      
      .delete-details {
         margin: 0;
         padding-left: 1.5rem;
         list-style-type: disc;
         
         li {
            margin: 0.5rem 0;
            color: var(--text-secondary);
            font-size: var(--font-sm);
            line-height: 1.5;
         }
      }
      
      .warning-note {
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 0.5rem;
         padding: 0.75rem 1rem;
         background: rgba(220, 53, 69, 0.1);
         border: 1px solid rgba(220, 53, 69, 0.3);
         border-radius: var(--radius-md);
         color: #dc3545;
         font-size: var(--font-sm);
         
         i {
            font-size: var(--font-md);
         }
      }
   }
</style>
