<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   
   export let settlement: Settlement;
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
         <div class="status-item">
            {#if settlement.connectedByRoads}
               <i class="fas fa-check-circle status-good"></i>
               <span>Connected by roads</span>
            {:else}
               <i class="fas fa-times-circle status-bad"></i>
               <span>Not connected by roads</span>
            {/if}
         </div>
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
