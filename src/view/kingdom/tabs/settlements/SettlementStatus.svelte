<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { updateKingdom } from '../../../../stores/KingdomStore';
   
   export let settlement: Settlement;
   
   let isUpdating = false;
   
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
      </div>
   </div>
{/if}

<style lang="scss">
   .detail-section {
      margin-bottom: .25rem;
      
      h4 {
         margin: 0 0 0.75rem 0;
         color: var(--color-accent);
         font-size: var(--font-lg);
         font-weight: var(--font-weight-semibold);
         font-family: var(--base-font);
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
            padding: 0.75rem;
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
