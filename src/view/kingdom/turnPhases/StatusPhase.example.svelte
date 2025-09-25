<!-- Example integration of automatic structure effects into Status Phase -->
<!-- This shows how to use the enhanced structures service in turn phases -->

<script lang="ts">
   import { kingdomState, updateKingdomStat } from '../../../stores/kingdom';
   import { structuresService } from '../../../services/structures';
   
   function processStartOfTurnEffects() {
      // Process automatic structure effects
      const effects = structuresService.processAutomaticEffects($kingdomState.settlements);
      
      // Apply unrest reduction
      if (effects.unrestReduction > 0) {
         const newUnrest = Math.max(0, $kingdomState.unrest - effects.unrestReduction);
         updateKingdomStat('unrest', newUnrest);
         console.log(`Structures reduce unrest by ${effects.unrestReduction}`);
      }
      
      // Apply fame gain
      if (effects.fameGain > 0) {
         updateKingdomStat('fame', $kingdomState.fame + effects.fameGain);
         console.log(`Structures grant +${effects.fameGain} fame`);
      }
      
      // Convert regular unrest to imprisoned (Donjon)
      if (effects.convertedUnrest > 0 && $kingdomState.unrest > 0) {
         const toConvert = Math.min(effects.convertedUnrest, $kingdomState.unrest);
         
         // Find settlements with justice structures to hold the imprisoned unrest
         const totalCapacity = $kingdomState.settlements.reduce((total, settlement) => {
            return total + structuresService.calculateImprisonedUnrestCapacity(settlement);
         }, 0);
         
         const currentImprisoned = $kingdomState.settlements.reduce((total, settlement) => {
            return total + settlement.imprisonedUnrest;
         }, 0);
         
         const availableCapacity = totalCapacity - currentImprisoned;
         const actuallyConverted = Math.min(toConvert, availableCapacity);
         
         if (actuallyConverted > 0) {
            updateKingdomStat('unrest', $kingdomState.unrest - actuallyConverted);
            
            // Distribute imprisoned unrest to settlements with capacity
            let remaining = actuallyConverted;
            for (const settlement of $kingdomState.settlements) {
               if (remaining <= 0) break;
               
               const capacity = structuresService.calculateImprisonedUnrestCapacity(settlement);
               const available = capacity - settlement.imprisonedUnrest;
               
               if (available > 0) {
                  const toAdd = Math.min(remaining, available);
                  settlement.imprisonedUnrest += toAdd;
                  remaining -= toAdd;
               }
            }
            
            console.log(`Donjon converts ${actuallyConverted} unrest to imprisoned`);
         }
      }
   }
   
   // Check for food spoilage protection
   function handleFoodSpoilageEvent() {
      if (structuresService.hasFoodSpoilageProtection($kingdomState.settlements)) {
         // Roll DC 15 flat check
         const roll = Math.floor(Math.random() * 20) + 1;
         if (roll >= 15) {
            console.log('Strategic Reserves negates food spoilage!');
            return true; // Event negated
         }
      }
      return false; // Event proceeds
   }
   
   // Check for defender recovery in combat
   function getDefenderRecoverySettlements() {
      return structuresService.getSettlementsWithDefenderRecovery($kingdomState.settlements);
   }
</script>

<div class="status-phase">
   <h3>Example: Automatic Structure Effects</h3>
   
   <button on:click={processStartOfTurnEffects}>
      Process Start of Turn Effects
   </button>
   
   <div class="effects-summary">
      <h4>Active Special Abilities:</h4>
      {#each structuresService.getActiveSpecialAbilities($kingdomState.settlements) as [ability, settlements]}
         <div class="ability">
            {ability}: {settlements.length} settlement(s)
         </div>
      {/each}
   </div>
</div>

<style lang="scss">
   .status-phase {
      padding: 20px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: var(--radius-md);
   }
   
   .effects-summary {
      margin-top: 20px;
      padding: 15px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
   }
   
   .ability {
      padding: 5px 0;
      color: var(--text-secondary);
   }
</style>
