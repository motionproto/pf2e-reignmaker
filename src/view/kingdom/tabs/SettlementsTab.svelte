<script lang="ts">
   import { claimedSettlements } from '../../../stores/KingdomStore';
   import type { Settlement } from '../../../models/Settlement';
   import SettlementsList from './settlements/SettlementsList.svelte';
   import SettlementDetails from './settlements/SettlementDetails.svelte';
   
   // Selected settlement for details view
   let selectedSettlement: Settlement | null = null;
   
   // Keep selectedSettlement synchronized with store updates
   $: if (selectedSettlement) {
      const updated = $claimedSettlements.find(s => s.id === selectedSettlement?.id);
      if (updated) {
         selectedSettlement = updated;
      } else {
         // Settlement was deleted
         selectedSettlement = null;
      }
   }
   
   // Auto-select first settlement if none selected and settlements exist
   $: if (!selectedSettlement && $claimedSettlements.length > 0) {
      selectedSettlement = $claimedSettlements[0];
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
         settlements={$claimedSettlements}
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
