<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { getStructureCount, getMaxStructures } from './settlements.utils';
   
   export let settlement: Settlement;
</script>

<div class="detail-section">
   <h4>
      Structures 
      <span class="structure-count">
         ({getStructureCount(settlement)}/{getMaxStructures(settlement)})
      </span>
   </h4>
   {#if settlement.structureIds.length === 0}
      <div class="empty-structures">
         <i class="fas fa-tools"></i>
         <p>No structures built yet.</p>
         <p class="hint">Build structures to improve your settlement.</p>
      </div>
   {:else}
      <div class="structures-grid">
         {#each settlement.structureIds as structureId}
            <div class="structure-card">
               <i class="fas fa-building"></i>
               <span>{structureId}</span>
            </div>
         {/each}
      </div>
   {/if}
</div>

<style lang="scss">
   @import './settlements-shared.scss';
   
   .detail-section {
      h4 {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         
         .structure-count {
            font-size: var(--font-md);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
         }
      }
   }
   
   .empty-structures {
      @extend .empty-state;
   }
   
   .structures-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.5rem;
      
      .structure-card {
         padding: 0.5rem;
         background: var(--bg-elevated);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-md);
         display: flex;
         align-items: center;
         gap: 0.5rem;
         font-size: var(--font-sm);
         
         i {
            color: var(--color-primary);
         }
      }
   }
</style>
