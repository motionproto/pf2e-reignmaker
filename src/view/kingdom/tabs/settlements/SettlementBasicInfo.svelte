<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { SettlementTierConfig } from '../../../../models/Settlement';
   import { kingdomData } from '../../../../stores/KingdomStore';
   
   export let settlement: Settlement;
   
   // Expandable state for army support
   let isArmySupportExpanded = false;
   
   // Calculate army support capacity and used
   $: armySupportCapacity = SettlementTierConfig[settlement.tier].armySupport;
   $: armiesSupportedCount = settlement.supportedUnits.length;
   
   // Calculate imprisoned unrest capacity
   $: imprisonedUnrestCapacity = settlement.imprisonedUnrestCapacityValue || 0;
   
   // Get actual army objects for this settlement
   $: supportedArmies = $kingdomData.armies.filter(army => 
      settlement.supportedUnits.includes(army.id)
   );
   
   function toggleArmySupport() {
      isArmySupportExpanded = !isArmySupportExpanded;
   }
   
   function openArmyActor(event: MouseEvent, actorId: string | undefined) {
      event.stopPropagation(); // Prevent triggering parent click handlers
      if (!actorId) return;
      
      const actor = game.actors?.get(actorId);
      if (actor) {
         actor.sheet?.render(true);
      }
   }
</script>

<div class="detail-section">
   <div class="detail-grid">
      <div class="detail-item">
         <span class="label">Food Consumption</span>
         <span class="value">
            <i class="fas fa-wheat-awn"></i>
            {SettlementTierConfig[settlement.tier]?.foodConsumption || 0} per turn
         </span>
      </div>
      <div class="detail-item">
         <span class="label">Stored Food</span>
         <span class="value">
            <i class="fas fa-warehouse"></i>
            {settlement.storedFood}
         </span>
      </div>
   </div>
   
   <div class="detail-item-full expandable" on:click={toggleArmySupport}>
      <span class="label">Army Support</span>
      <span class="value">
         <i class="fas fa-shield-alt"></i>
         {armiesSupportedCount} out of {armySupportCapacity}
         <i class="fas fa-chevron-{isArmySupportExpanded ? 'up' : 'down'} expand-icon"></i>
      </span>
   </div>
   {#if isArmySupportExpanded && supportedArmies.length > 0}
      <div class="army-list">
         {#each supportedArmies as army}
            <div class="army-item">
               <i class="fas fa-users"></i>
               {#if army.actorId}
                  <span class="army-link" on:click={(e) => openArmyActor(e, army.actorId)}>{army.name}</span>
               {:else}
                  <span>{army.name}</span>
               {/if}
            </div>
         {/each}
      </div>
   {/if}
   
   <div class="detail-item-full">
      <span class="label">Imprisoned Unrest</span>
      <span class="value">
         <i class="fas fa-dungeon"></i>
         {settlement.imprisonedUnrest} out of {imprisonedUnrestCapacity}
      </span>
   </div>
</div>

<style lang="scss">
   @use './settlements-shared.scss';
   
   .detail-item-full {
      margin-top: 1rem;
      
      &.expandable {
         cursor: pointer;
         padding: 0.5rem;
         margin-left: -0.5rem;
         margin-right: -0.5rem;
         transition: var(--transition-base);
         border-radius: var(--radius-md);
         
         &:hover {
            background: rgba(255, 255, 255, 0.05);
         }
      }
      
      .label {
         display: block;
         font-size: var(--font-md);
         color: var(--text-secondary);
         margin-bottom: 0.5rem;
         font-family: var(--base-font);
         font-weight: var(--font-weight-light);
      }
      
      .value {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         color: var(--text-primary);
         font-size: var(--font-lg);
         
         i {
            margin-right: 0.5rem;
         }
         
         .expand-icon {
            margin-left: auto;
            color: var(--text-secondary);
            font-size: var(--font-sm);
         }
      }
   }
   
   .army-list {
      margin-left: 1.5rem;
      margin-top: 0.5rem;
      padding: 0.5rem 0;
      border-left: 2px solid rgba(255, 255, 255, 0.1);
      
      .army-item {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         padding: 0.25rem 0 0.25rem 1rem;
         font-size: var(--font-md);
         color: var(--text-secondary);
         
         i {
            color: var(--text-tertiary);
            font-size: var(--font-md);
         }
         
         .army-link {
            color: var(--color-info);
            cursor: pointer;
            text-decoration: underline;
            transition: var(--transition-base);
            
            &:hover {
               opacity: 0.8;
               text-decoration: none;
            }
         }
      }
   }
</style>
