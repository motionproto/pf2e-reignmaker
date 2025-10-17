<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { updateKingdom } from '../../../../stores/KingdomStore';
   import { settlementService } from '../../../../services/settlements';
   
   export let settlement: Settlement;
   
   let isUpdating = false;
   
   // Get tier upgrade requirements
   $: upgradeValidation = settlement 
      ? settlementService.canUpgradeSettlement(settlement)
      : null;
   
   // Calculate structure progress towards next tier
   $: structureProgress = settlement ? (() => {
      const currentCount = settlement.structureIds.length;
      
      switch (settlement.tier) {
         case 'Village':
            return { current: currentCount, required: 2, nextTier: 'Town' };
         case 'Town':
            return { current: currentCount, required: 4, nextTier: 'City' };
         case 'City':
            return { current: currentCount, required: 8, nextTier: 'Metropolis' };
         case 'Metropolis':
            return null; // Max tier
         default:
            return null;
      }
   })() : null;
   
   async function toggleRoadConnection() {
      if (isUpdating) return;
      
      isUpdating = true;
      try {
         await updateKingdom(k => {
            const s = k.settlements.find(s => s.id === settlement.id);
            if (s) {
               s.connectedByRoads = !s.connectedByRoads;
            }
         });
         // @ts-ignore
         ui.notifications?.info(`Road connection ${settlement.connectedByRoads ? 'enabled' : 'disabled'} for ${settlement.name}`);
      } catch (error) {
         console.error('Failed to update road connection:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to update road connection');
      } finally {
         isUpdating = false;
      }
   }
</script>

{#if settlement.wasFedLastTurn !== undefined}
   <div class="detail-section">
      <h4>Status</h4>
      <div class="status-list">
         <div class="status-item">
            {#if settlement.wasFedLastTurn}
               <i class="fas fa-check-circle status-good"></i>
               <span>Fed last turn (generates gold)</span>
            {:else}
               <i class="fas fa-exclamation-triangle status-warning"></i>
               <span>Not fed last turn (no gold generation)</span>
            {/if}
         </div>
         <button 
            class="status-item toggleable"
            on:click={toggleRoadConnection}
            disabled={isUpdating}
            title="Click to toggle road connection (doubles gold income when connected)"
         >
            {#if settlement.connectedByRoads}
               <i class="fas fa-check-circle status-good"></i>
               <span>Connected by roads (2x gold income)</span>
            {:else}
               <i class="fas fa-times-circle status-bad"></i>
               <span>Not connected by roads</span>
            {/if}
            <i class="fas fa-pen edit-indicator"></i>
         </button>
         
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
{/if}

<style lang="scss">
   .detail-section {
      margin-bottom: .25rem;
      
      h4 {
         margin: 0 0 0.5rem 0;
         color: var(--color-accent);
         font-size: var(--font-lg);
         font-weight: var(--font-weight-semibold);
      }
   }
   
   .status-list {
      .status-item {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         padding: 0.5rem 0;
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
            padding: 0.5rem 0;
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
         }
      }
      
   }
</style>
