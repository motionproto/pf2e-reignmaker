<script lang="ts">
   import { kingdomData } from '../../../stores/KingdomStore';
   import type { Settlement } from '../../../models/Settlement';
   import SettlementsList from './settlements/SettlementsList.svelte';
   import SettlementDetails from './settlements/SettlementDetails.svelte';
   
   // Selected settlement for details view
   let selectedSettlement: Settlement | null = null;
   
   // Keep selectedSettlement synchronized with store updates
   $: if (selectedSettlement) {
      const updated = $kingdomData.settlements.find(s => s.id === selectedSettlement?.id);
      if (updated) {
         selectedSettlement = updated;
      } else {
         // Settlement was deleted
         selectedSettlement = null;
      }
   }
   
   // Auto-select first settlement if none selected and settlements exist
   $: if (!selectedSettlement && $kingdomData.settlements.length > 0) {
      selectedSettlement = $kingdomData.settlements[0];
   }
   
   function handleSelectSettlement(settlement: Settlement) {
      selectedSettlement = settlement;
   }
   
   function handleSettlementDeleted() {
      // Clear selection - reactive statement will auto-select next settlement
      selectedSettlement = null;
   }
</script>

<div class="settlements-tab">
   <div class="settlements-container">
      <SettlementsList 
         settlements={$kingdomData.settlements}
         {selectedSettlement}
         onSelectSettlement={handleSelectSettlement}
      />
      <SettlementDetails settlement={selectedSettlement} on:settlementDeleted={handleSettlementDeleted} />
   </div>
</div>

<style lang="scss">
   .settlements-tab {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
   }
   
   .settlements-container {
      display: flex;
      flex: 1;
      gap: 1rem;
      min-height: 0;
   }
</style>
