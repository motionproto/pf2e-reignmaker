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
   
   // Filter settlements to only show those in claimed hexes (claimedBy === 1)
   $: claimedSettlements = $kingdomData.settlements.filter(settlement => {
      // Find the hex at this settlement's location
      const hex = $kingdomData.hexes?.find(h => {
         const hexCoords = h.id.split('.');
         const hexRow = parseInt(hexCoords[0]);
         const hexCol = parseInt(hexCoords[1]);
         return hexRow === settlement.location.x && hexCol === settlement.location.y;
      });
      
      // Only include if hex is claimed by player kingdom (claimedBy === 1)
      return hex && (hex as any).claimedBy === 1;
   });
   
   // Auto-select first settlement if none selected and settlements exist
   $: if (!selectedSettlement && claimedSettlements.length > 0) {
      selectedSettlement = claimedSettlements[0];
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
         settlements={claimedSettlements}
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
