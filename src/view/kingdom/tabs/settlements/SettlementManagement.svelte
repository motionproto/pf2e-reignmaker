<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { settlementService } from '../../../../services/settlements';
   import { getMaxStructures, getMaxAllowedLevel } from './settlements.utils';
   
   export let settlement: Settlement;
   
   let isProcessing = false;
   
   // Upgrade validation
   $: upgradeValidation = settlement 
      ? settlementService.canUpgradeSettlement(settlement)
      : null;
   
   // Level cap based on tier + structure requirements
   $: maxAllowedLevel = settlement ? getMaxAllowedLevel(settlement) : 20;
   
   // Level controls
   async function incrementLevel() {
      if (!settlement || isProcessing) return;
      
      isProcessing = true;
      try {
         await settlementService.updateSettlementLevel(
            settlement.id, 
            Math.min(settlement.level + 1, 20)
         );
      } catch (error) {
         console.error('Failed to increment level:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to update level: ${error.message}`);
      } finally {
         isProcessing = false;
      }
   }
   
   async function decrementLevel() {
      if (!settlement || isProcessing) return;
      
      isProcessing = true;
      try {
         await settlementService.updateSettlementLevel(
            settlement.id, 
            Math.max(settlement.level - 1, 1)
         );
      } catch (error) {
         console.error('Failed to decrement level:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to update level: ${error.message}`);
      } finally {
         isProcessing = false;
      }
   }
   
   // Upgrade settlement
   async function upgradeSettlement() {
      if (!settlement || isProcessing || !upgradeValidation?.canUpgrade) return;
      
      isProcessing = true;
      try {
         await settlementService.upgradeSettlement(settlement.id);
         // @ts-ignore
         ui.notifications?.info(`${settlement.name} upgraded to ${upgradeValidation.nextTier}!`);
      } catch (error) {
         console.error('Failed to upgrade settlement:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to upgrade: ${error.message}`);
      } finally {
         isProcessing = false;
      }
   }
   
   // Delete settlement
   async function confirmDeleteSettlement() {
      if (!settlement || isProcessing) return;
      
      const structureCount = settlement.structureIds.length;
      const armyCount = settlement.supportedUnits.length;
      
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: `Delete ${settlement.name}?`,
         content: `
            <p>This will permanently delete this settlement.</p>
            <ul>
               <li>${structureCount} structure(s) will be removed</li>
               <li>${armyCount} army unit(s) will become unsupported</li>
            </ul>
            <p><strong>This action cannot be undone.</strong></p>
         `,
         yes: () => true,
         no: () => false,
         defaultYes: false
      });
      
      if (!confirmed) return;
      
      isProcessing = true;
      try {
         const result = await settlementService.deleteSettlement(settlement.id);
         // @ts-ignore
         ui.notifications?.info(`Deleted ${result.name}`);
      } catch (error) {
         console.error('Failed to delete settlement:', error);
         // @ts-ignore
         ui.notifications?.error(`Failed to delete: ${error.message}`);
      } finally {
         isProcessing = false;
      }
   }
</script>

<div class="detail-section">
   <h4>Management</h4>
   
   <!-- Level Controls -->
   <div class="level-controls">
      <span class="label">Settlement Level</span>
      <div class="level-adjuster">
         <button 
            on:click={decrementLevel} 
            disabled={settlement.level <= 1 || isProcessing}
            class="level-btn"
            title="Decrease level"
         >
            <i class="fas fa-minus"></i>
         </button>
         <span class="level-value">{settlement.level}</span>
         <button 
            on:click={incrementLevel} 
            disabled={settlement.level >= maxAllowedLevel || isProcessing}
            class="level-btn"
            title={settlement.level >= maxAllowedLevel 
               ? `Build ${getMaxStructures(settlement)} structures to unlock higher levels` 
               : 'Increase level'}
         >
            <i class="fas fa-plus"></i>
         </button>
      </div>
   </div>
   
   {#if settlement.level >= maxAllowedLevel && settlement.tier !== 'Metropolis'}
      <div class="level-warning">
         <i class="fas fa-exclamation-triangle"></i>
         <span>Build {getMaxStructures(settlement)} structures to unlock higher levels</span>
      </div>
   {/if}
   
   <!-- Upgrade Settlement -->
   {#if upgradeValidation}
      <div class="upgrade-section">
         {#if upgradeValidation.canUpgrade}
            <button 
               on:click={upgradeSettlement} 
               disabled={isProcessing}
               class="upgrade-btn"
            >
               <i class="fas fa-arrow-up"></i>
               Upgrade to {upgradeValidation.nextTier}
            </button>
         {:else if upgradeValidation.nextTier}
            <button class="upgrade-btn disabled" disabled title={upgradeValidation.requirements.join(', ')}>
               <i class="fas fa-lock"></i>
               Upgrade Locked
            </button>
            <div class="requirements-list">
               {#each upgradeValidation.requirements as req}
                  <div class="requirement">
                     <i class="fas fa-times"></i>
                     {req}
                  </div>
               {/each}
            </div>
         {:else}
            <div class="max-tier-notice">
               <i class="fas fa-crown"></i>
               Maximum tier reached
            </div>
         {/if}
      </div>
   {/if}
   
   <!-- Delete Settlement -->
   <button 
      on:click={confirmDeleteSettlement} 
      disabled={isProcessing}
      class="delete-btn"
   >
      <i class="fas fa-trash"></i>
      Delete Settlement
   </button>
</div>

<style lang="scss">
   @import './settlements-shared.scss';
   
   .level-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      padding: 0.75rem;
      background: var(--bg-elevated);
      border-radius: var(--radius-lg);
      
      .label {
         font-size: var(--font-sm);
         color: var(--text-secondary);
      }
      
      .level-adjuster {
         display: flex;
         align-items: center;
         gap: 1rem;
         
         .level-btn {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            background: var(--bg-elevated);
            color: var(--text-primary);
            cursor: pointer;
            transition: var(--transition-base);
            
            &:hover:not(:disabled) {
               background: var(--bg-overlay);
               border-color: var(--color-primary);
            }
            
            &:disabled {
               opacity: var(--opacity-disabled);
               cursor: not-allowed;
            }
         }
         
         .level-value {
            font-size: var(--font-md);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            min-width: 2rem;
            text-align: center;
         }
      }
   }
   
   .level-warning {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      margin-bottom: 1rem;
      background: var(--color-orange-bg);
      border-radius: var(--radius-lg);
      border-left: 3px solid var(--color-warning);
      color: var(--color-warning);
      font-size: var(--font-md);
   }
   
   .upgrade-section {
      margin-bottom: 1rem;
      
      .upgrade-btn {
         width: 100%;
         padding: 0.75rem 1rem;
         border: 1px solid var(--border-default);
         border-radius: var(--radius-md);
         background: var(--color-green-dark);
         color: var(--color-success);
         cursor: pointer;
         transition: var(--transition-base);
         font-weight: var(--font-weight-semibold);
         font-size: var(--font-md);
         
         &:hover:not(:disabled) {
            background: var(--color-green-darker);
            border-color: var(--color-success);
         }
         
         &.disabled {
            background: var(--bg-elevated);
            color: var(--text-disabled);
            cursor: not-allowed;
         }
         
         i {
            margin-right: 0.5rem;
         }
      }
      
      .requirements-list {
         margin-top: 0.75rem;
         padding: 0.75rem;
         background: var(--color-orange-bg);
         border-radius: var(--radius-md);
         border-left: 3px solid var(--color-warning);
         
         .requirement {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0;
            font-size: var(--font-sm);
            color: var(--color-warning);
            
            i {
               font-size: var(--font-xs);
            }
         }
      }
      
      .max-tier-notice {
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 0.5rem;
         padding: 0.75rem;
         background: var(--bg-elevated);
         border-radius: var(--radius-md);
         color: var(--color-gold);
         font-weight: var(--font-weight-medium);
         font-size: var(--font-md);
      }
   }
   
   .delete-btn {
      width: 100%;
      padding: 0.75rem 1rem;
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
</style>
