<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { SettlementTierConfig } from '../../../../models/Settlement';
   
   export let settlement: Settlement;
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
         <span class="label">Army Support</span>
         <span class="value">
            <i class="fas fa-shield-alt"></i>
            {SettlementTierConfig[settlement.tier]?.armySupport || 0} armies
         </span>
      </div>
      <div class="detail-item">
         <span class="label">Stored Food</span>
         <span class="value">
            <i class="fas fa-warehouse"></i>
            {settlement.storedFood}
         </span>
      </div>
      <div class="detail-item">
         <span class="label">Imprisoned Unrest</span>
         <span class="value">
            <i class="fas fa-dungeon"></i>
            {settlement.imprisonedUnrest}
         </span>
      </div>
   </div>
</div>

<style lang="scss">
   @import './settlements-shared.scss';
   
</style>
