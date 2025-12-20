<script lang="ts">
   import { kingdomData, currentFaction } from '../../../stores/KingdomStore';
   import type { Settlement } from '../../../models/Settlement';
   import SettlementsList from './settlements/SettlementsList.svelte';
   import SettlementDetails from './settlements/SettlementDetails.svelte';

   // Selected settlement for details view
   let selectedSettlement: Settlement | null = null;

   // Get all settlements that should be shown:
   // 1. Settlements where the hex is owned by the current faction (attached)
   // 2. Settlements owned by the faction but not yet attached to a hex (unattached)
   $: allSettlements = $kingdomData.settlements.filter(s => {
      // Find the hex at this settlement's location
      const hex = $kingdomData.hexes.find(h =>
         h.row === s.location.x && h.col === s.location.y
      );

      // Include if hex is owned by current faction (attached)
      if (hex?.claimedBy === $currentFaction) {
         return true;
      }

      // Include if settlement is owned by current faction (whether or not there's a hex)
      if (s.ownedBy === $currentFaction) {
         return true;
      }

      return false;
   });

   // Keep selectedSettlement synchronized with store updates
   $: if (selectedSettlement) {
      const updated = allSettlements.find(s => s.id === selectedSettlement?.id);
      if (updated) {
         selectedSettlement = updated;
      } else {
         // Settlement was deleted
         selectedSettlement = null;
      }
   }

   // Auto-select first settlement if none selected and settlements exist
   $: if (!selectedSettlement && allSettlements.length > 0) {
      selectedSettlement = allSettlements[0];
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
         settlements={allSettlements}
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
      gap: var(--space-16);
      height: 100%;
   }
   
   .settlements-container {
      display: flex;
      flex: 1;
      gap: var(--space-16);
      min-height: 0;
   }
</style>
