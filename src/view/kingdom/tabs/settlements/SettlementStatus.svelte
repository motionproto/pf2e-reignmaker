<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { updateKingdom, kingdomData } from '../../../../stores/KingdomStore';
   import { settlementService } from '../../../../services/settlements';
   import { getSettlementStatusIcon } from '../../utils/presentation';
   import Dialog from '../../components/baseComponents/Dialog.svelte';
   
   export let settlement: Settlement;
   
   let showCapitalConfirm = false;
   let oldCapitalName = '';
   let isUpdatingCapital = false;
   
   // Get tier upgrade requirements
   $: upgradeValidation = settlement 
      ? settlementService.canUpgradeSettlement(settlement)
      : null;
   
   // Calculate structure progress towards next tier
   $: structureProgress = settlement ? (() => {
      const currentCount = settlement.structureIds.length;
      
      switch (settlement.tier) {
         case 'Village':
            return { current: currentCount, required: 3, nextTier: 'Town' };
         case 'Town':
            return { current: currentCount, required: 6, nextTier: 'City' };
         case 'City':
            return { current: currentCount, required: 9, nextTier: 'Metropolis' };
         case 'Metropolis':
            return null; // Max tier
         default:
            return null;
      }
   })() : null;
   
   
   async function handleCapitalToggle() {
      if (isUpdatingCapital) return;
      
      // If unchecking capital, just unset it
      if (settlement.isCapital) {
         isUpdatingCapital = true;
         try {
            await updateKingdom(k => {
               const s = k.settlements.find(s => s.id === settlement.id);
               if (s) {
                  s.isCapital = false;
               }
            });
            
            // Recalculate settlement gold income (affected by capital status)
            // @ts-ignore - recalculateSettlement is private but we need it here
            await settlementService['recalculateSettlement'](settlement.id);
            
            // @ts-ignore - Foundry global
            ui.notifications?.info(`${settlement.name} is no longer the capital`);
         } catch (error) {
            logger.error('Failed to update capital status:', error);
            // @ts-ignore - Foundry global
            ui.notifications?.error('Failed to update capital status');
         } finally {
            isUpdatingCapital = false;
         }
         return;
      }
      
      // If setting as capital, check for existing capital
      const existingCapital = $kingdomData.settlements.find(
         s => s.owned === settlement.owned && s.isCapital && s.id !== settlement.id
      );
      
      if (existingCapital) {
         // Show confirmation dialog
         oldCapitalName = existingCapital.name;
         showCapitalConfirm = true;
      } else {
         // No existing capital, just set it
         await setAsCapital();
      }
   }
   
   function closeCapitalConfirm() {
      showCapitalConfirm = false;
      oldCapitalName = '';
   }
   
   async function confirmCapitalChange() {
      await setAsCapital();
      closeCapitalConfirm();
   }
   
   async function setAsCapital() {
      if (isUpdatingCapital) return;
      
      isUpdatingCapital = true;
      try {
         // Track old capital ID to recalculate it as well
         const oldCapitalId = $kingdomData.settlements.find(
            s => s.owned === settlement.owned && s.isCapital && s.id !== settlement.id
         )?.id;
         
         await updateKingdom(k => {
            // Unset any existing capital for this faction
            const existingCapital = k.settlements.find(
               s => s.owned === settlement.owned && s.isCapital && s.id !== settlement.id
            );
            if (existingCapital) {
               existingCapital.isCapital = false;
            }
            
            // Set new capital
            const s = k.settlements.find(s => s.id === settlement.id);
            if (s) {
               s.isCapital = true;
            }
         });
         
         // Recalculate both settlements' gold income (affected by capital status)
         // @ts-ignore - recalculateSettlement is private but we need it here
         await settlementService['recalculateSettlement'](settlement.id);
         if (oldCapitalId) {
            // @ts-ignore
            await settlementService['recalculateSettlement'](oldCapitalId);
         }
         
         // @ts-ignore - Foundry global
         ui.notifications?.info(`${settlement.name} is now the capital`);
      } catch (error) {
         logger.error('Failed to update capital status:', error);
         // @ts-ignore - Foundry global
         ui.notifications?.error('Failed to update capital status');
      } finally {
         isUpdatingCapital = false;
      }
   }
</script>

{#if settlement.wasFedLastTurn !== undefined}
   <div class="detail-section">
      <div class="status-header">
         <h4>Status</h4>
         <!-- Capital Toggle -->
         <button 
            class="capital-toggle" 
            class:is-capital={settlement.isCapital}
            title="Mark this settlement as the faction's capital"
            on:click={handleCapitalToggle}
            disabled={isUpdatingCapital}
         >
            {#if settlement.isCapital}
               <i class="fas fa-crown"></i>
            {:else}
               <i class="far fa-square"></i>
            {/if}
            <span>Capital</span>
         </button>
      </div>
      <div class="status-list">
         <div class="status-item">
            {#if settlement.wasFedLastTurn}
               <i class="fas fa-check-circle status-good"></i>
               <span>Fed last turn ({settlement.goldIncome || 0} gold/turn)</span>
            {:else}
               <i class="fas {getSettlementStatusIcon('unfed')} status-unfed"></i>
               <span>Not fed last turn (no gold generation)</span>
            {/if}
         </div>
         
         <!-- Show capital status or road connection (read-only) -->
         {#if settlement.isCapital}
            <div class="status-item">
               <i class="fas fa-crown status-good"></i>
               <span>Is the Capital (2x gold income)</span>
            </div>
         {:else}
            <div class="status-item">
               {#if settlement.connectedByRoads}
                  <i class="fas fa-check-circle status-good"></i>
                  <span>Connected to capital by roads (2x gold income)</span>
               {:else}
                  <i class="fas fa-times-circle status-bad"></i>
                  <span>Not connected to capital by roads</span>
               {/if}
            </div>
         {/if}
         
         <!-- Structure Progress towards next tier -->
         {#if structureProgress}
            <div class="status-item" class:ready={structureProgress.current >= structureProgress.required}>
               {#if structureProgress.current >= structureProgress.required}
                  <i class="fas fa-hammer status-good"></i>
                  <span>{structureProgress.current}/{structureProgress.required} structures (ready for {structureProgress.nextTier})</span>
               {:else}
                  <i class="fas fa-hammer status-warning"></i>
                  <span>{structureProgress.current}/{structureProgress.required} structures required for {structureProgress.nextTier}</span>
               {/if}
            </div>
         {:else if settlement.tier === 'Metropolis'}
            <div class="status-item">
               <i class="fas fa-crown status-good"></i>
               <span>Maximum tier reached</span>
            </div>
         {/if}
      </div>
   </div>
   
   <!-- Capital Change Confirmation Dialog -->
   <Dialog
      bind:show={showCapitalConfirm}
      title="Change Capital?"
      confirmLabel={isUpdatingCapital ? 'Changing...' : 'Change Capital'}
      cancelLabel="Cancel"
      confirmDisabled={isUpdatingCapital}
      on:confirm={confirmCapitalChange}
      on:cancel={closeCapitalConfirm}
   >
      <p>
         This will change the capital from <strong>{oldCapitalName}</strong> to <strong>{settlement.name}</strong>.
      </p>
   </Dialog>
{/if}

<style lang="scss">
   .detail-section {
      margin-bottom: var(--space-24);
   }
   
   .status-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-8);
      
      h4 {
         margin: 0;
         color: var(--color-accent);
         font-size: var(--font-lg);
         font-weight: var(--font-weight-semibold);
      }
   }
   
   .capital-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-4) var(--space-8);
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: var(--transition-base);
      font-size: var(--font-xs);
      color: var(--text-tertiary);
      
      &:hover:not(:disabled) {
         background: var(--bg-overlay);
         border-color: var(--color-primary);
      }
      
      &:disabled {
         opacity: var(--opacity-disabled);
         cursor: not-allowed;
      }
      
      i {
         color: var(--text-tertiary);
         font-size: var(--font-sm);
      }
      
      span {
         font-weight: var(--font-weight-medium);
      }
      
      // Active state (is capital)
      &.is-capital {
         background: rgba(251, 191, 36, 0.1);
         border-color: var(--border-accent-subtle);
         color: var(--text-primary);
         
         i {
            color: #fbbf24;
         }
      }
   }
   
   .status-list {
      .status-item {
         display: flex;
         align-items: center;
         gap: var(--space-8);
         padding: var(--space-8) 0;
         font-size: var(--font-md);
         
         &.expandable {
            cursor: pointer;
            transition: var(--transition-base);
            
            &:hover {
               background: rgba(255, 255, 255, 0.05);
               border-radius: var(--radius-md);
            }
            
            .expand-icon {
               margin-left: auto;
               color: var(--text-secondary);
               font-size: var(--font-sm);
            }
         }
         
         &.toggleable {
            width: 100%;
            background: transparent;
            border: none;
            cursor: pointer;
            transition: var(--transition-base);
            text-align: left;
            color: var(--text-primary);
            padding: var(--space-8) 0;
            border-radius: var(--radius-md);
            
            &:hover:not(:disabled) {
               background: rgba(255, 255, 255, 0.08);
               
               .edit-indicator {
                  opacity: 1;
               }
            }
            
            &:disabled {
               opacity: var(--opacity-disabled);
               cursor: not-allowed;
            }
            
            .edit-indicator {
               margin-left: auto;
               color: var(--text-secondary);
               font-size: var(--font-xs);
               opacity: 0.5;
               transition: var(--transition-base);
            }
         }
         
         &.ready {
            span {
               color: var(--color-success);
            }
         }
         
         i {
            &.status-good {
               color: var(--color-success);
            }
            
            &.status-warning {
               color: var(--color-warning);
            }
            
            &.status-bad {
               color: var(--color-danger);
            }
            
            &.status-unfed {
               color: #dc3545; // Red color for unfed
            }
         }
      }
   }
</style>
