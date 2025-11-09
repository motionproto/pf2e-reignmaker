<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { SettlementTier } from '../../../../models/Settlement';
   import { settlementService } from '../../../../services/settlements';
   
   export let settlement: Settlement;
   
   const tierOptions = [
      SettlementTier.VILLAGE,
      SettlementTier.TOWN,
      SettlementTier.CITY,
      SettlementTier.METROPOLIS
   ];
   
   async function handleTierChange(event: Event) {
      const target = event.target as HTMLSelectElement;
      const newTier = target.value as SettlementTier;
      
      if (newTier !== settlement.tier) {
         await settlementService.updateSettlement(settlement.id, { tier: newTier });
      }
   }
</script>

<div class="settlement-tier">
   <select 
      class="tier-select"
      value={settlement.tier}
      on:change={handleTierChange}
   >
      {#each tierOptions as tierOption}
         <option value={tierOption}>{tierOption}</option>
      {/each}
   </select>
</div>

<style lang="scss">
   .settlement-tier {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      
      .tier-select {
         padding: var(--space-4) var(--space-12);
         background: var(--bg-elevated);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-md);
         color: var(--text-primary);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
         cursor: pointer;
         transition: var(--transition-base);
         line-height: 1.5;
         
         /* Hide default dropdown arrow */
         appearance: none;
         -webkit-appearance: none;
         -moz-appearance: none;
         
         &:hover {
            background: var(--bg-overlay);
            border-color: var(--color-primary);
         }
         
         &:focus {
            outline: none;
            border-color: var(--color-primary);
         }
      }
   }
</style>
