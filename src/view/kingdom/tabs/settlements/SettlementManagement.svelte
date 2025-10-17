<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { settlementService } from '../../../../services/settlements';
   import { getMaxStructures, getMaxAllowedLevel } from './settlements.utils';
   
   export let settlement: Settlement;
   
   let isProcessing = false;
   
   // Upgrade validation with individual requirement tracking
   $: upgradeValidation = settlement 
      ? settlementService.canUpgradeSettlement(settlement)
      : null;
   
   // Track individual requirement states for checkbox display
   $: requirementStates = settlement ? (() => {
      const states: Array<{ text: string; met: boolean }> = [];
      
      switch (settlement.tier) {
         case 'Village':
            states.push({ text: 'Settlement level 2 required', met: settlement.level >= 2 });
            states.push({ text: '2 structures required', met: settlement.structureIds.length >= 2 });
            break;
         case 'Town':
            states.push({ text: 'Settlement level 5 required', met: settlement.level >= 5 });
            states.push({ text: '4 structures required', met: settlement.structureIds.length >= 4 });
            break;
         case 'City':
            states.push({ text: 'Settlement level 8 required', met: settlement.level >= 8 });
            states.push({ text: '8 structures required', met: settlement.structureIds.length >= 8 });
            break;
         case 'Metropolis':
            // Max tier, no requirements
            break;
      }
      
      return states;
   })() : [];
   
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
</script>

<div class="detail-section">
   <!-- Upgrade Settlement -->
   {#if upgradeValidation}
      <div class="upgrade-section">
         {#if upgradeValidation.nextTier}
            <div class="requirements-container">
               <div class="upgrade-button-column">
                  <button 
                     on:click={upgradeSettlement} 
                     disabled={!upgradeValidation.canUpgrade || isProcessing}
                     class="upgrade-secondary-btn"
                  >
                     <i class="fas fa-arrow-up"></i>
                     Upgrade Settlement
                  </button>
               </div>
               <div class="requirements-list">
                  {#each requirementStates as req}
                     <div class="requirement" class:met={req.met}>
                        <i class="fas {req.met ? 'fa-check-square' : 'fa-square'}"></i>
                        <span>{req.text}</span>
                     </div>
                  {/each}
               </div>
            </div>
         {:else}
            <div class="max-tier-notice">
               <i class="fas fa-crown"></i>
               Maximum tier reached
            </div>
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   .detail-section {
      margin-bottom: 1.5rem;
      
      h4 {
         margin: 0 0 0.75rem 0;
         color: var(--color-accent);
         font-size: var(--font-lg);
         font-weight: var(--font-weight-semibold);
      }
   }
   
   .level-warning {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
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
      
      .requirements-container {
         display: grid;
         grid-template-columns: 1fr 1fr;
         gap: 1rem;
         align-items: center;
         padding: 0.75rem;
         background: transparent;
         border-radius: var(--radius-lg);
         border: 1px solid var(--border-default);
         box-sizing: border-box;
      }
      
      .upgrade-button-column {
         display: flex;
         align-items: center;
         justify-content: center;
      }
      
      .upgrade-secondary-btn {
         padding: 0.5rem 1rem;
         border: 1px solid var(--border-default);
         border-radius: var(--radius-md);
         background: var(--bg-elevated);
         color: var(--text-primary);
         cursor: pointer;
         transition: var(--transition-base);
         font-weight: var(--font-weight-medium);
         font-size: var(--font-sm);
         white-space: nowrap;
         
         &:hover:not(:disabled) {
            background: var(--bg-overlay);
            border-color: var(--color-primary);
         }
         
         &:disabled {
            opacity: var(--opacity-disabled);
            cursor: not-allowed;
         }
         
         i {
            margin-right: 0.5rem;
         }
      }
      
      .requirements-list {
         display: flex;
         flex-direction: column;
         gap: 0.5rem;
         
         .requirement {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: var(--font-md);
            color: var(--text-secondary);
            transition: var(--transition-base);
            
            &.met {
               color: var(--color-success);
            }
            
            i {
               font-size: var(--font-md);
               flex-shrink: 0;
            }
            
            span {
               flex: 1;
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
</style>
