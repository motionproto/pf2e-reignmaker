<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { kingdomData, updateKingdom } from '../../../../stores/KingdomStore';
   import { createEventDispatcher } from 'svelte';
   
   export let settlement: Settlement;
   
   const dispatch = createEventDispatcher();
   
   let isOpen = false;
   let dropdownElement: HTMLElement;
   
   // Get current settlement from store to ensure we always have the latest data
   $: currentSettlement = $kingdomData.settlements?.find(s => s.id === settlement.id) || settlement;
   
   // Get all hexes from the map that have settlement features
   $: availableLocations = ($kingdomData.hexes || [])
      .filter(h => {
         // Only include hexes in claimed territory
         const isClaimed = (h as any).claimedBy === 1;
         if (!isClaimed) return false;
         
         // Only include hexes with settlement features
         const features = (h as any).features || [];
         if (!features || features.length === 0) return false;
         
         return features.some((f: any) => 
            f.type && ['village', 'town', 'city', 'metropolis'].includes(f.type.toLowerCase())
         );
      })
      .map(h => {
         // Parse hex coordinates from ID (e.g., "40.12" -> x: 40, y: 12)
         const [xStr, yStr] = h.id.split('.');
         const x = parseInt(xStr) || 0;
         const y = parseInt(yStr) || 0;
         
         // Get settlement type from features
         const features = (h as any).features || [];
         const settlementFeature = features.find((f: any) => 
            f.type && ['village', 'town', 'city', 'metropolis'].includes(f.type.toLowerCase())
         );
         
         // Capitalize settlement type for display
         const settlementType = settlementFeature?.type 
            ? settlementFeature.type.charAt(0).toUpperCase() + settlementFeature.type.slice(1).toLowerCase()
            : 'Settlement';
         
         // Get settlement name (if available)
         const settlementName = (settlementFeature as any)?.name || null;
         
         // Check if this hex already has a settlement assigned
         const assignedSettlement = $kingdomData.settlements.find(s => 
            s.location.x === x && s.location.y === y && s.id !== currentSettlement.id
         );
         
         return {
            id: h.id,
            x,
            y,
            settlementType,
            settlementName,
            isAssigned: !!assignedSettlement,
            assignedTo: assignedSettlement?.name
         };
      })
      .sort((a, b) => {
         // Sort by x first, then y
         if (a.x !== b.x) return a.x - b.x;
         return a.y - b.y;
      });
   
   // Check if current settlement has a valid location (use currentSettlement from store)
   $: hasLocation = currentSettlement.location.x !== 0 || currentSettlement.location.y !== 0;
   
   // Get current location string
   $: locationString = hasLocation 
      ? `${currentSettlement.location.x}:${currentSettlement.location.y.toString().padStart(2, '0')}`
      : 'No location';
   
   function toggleDropdown() {
      isOpen = !isOpen;
   }
   
   function closeDropdown() {
      isOpen = false;
   }
   
   async function selectLocation(x: number, y: number, isAssigned: boolean, isSelected: boolean) {
      // Prevent assigning to a hex assigned to another settlement
      if (isAssigned) {
         return;
      }
      
      // If clicking the currently selected location, unlink it
      if (isSelected) {
         await clearLocation();
         return;
      }
      
      // Update settlement's rmLocation (usage location) to link it
      let updatedSettlement: typeof settlement | undefined;
      await updateKingdom(k => {
         const s = k.settlements.find(s => s.id === settlement.id);
         if (s) {
            // Update rmLocation to mark as actively used
            s.location = { x, y };
            updatedSettlement = s;
         }
      });
      
      // Write settlement name to Kingmaker map and refresh territory data
      if (updatedSettlement) {
         const { territoryService } = await import('../../../../services/territory');
         await territoryService.updateKingmakerSettlement(updatedSettlement);
         
         // Re-sync territory to update hex features with new settlement name
         territoryService.syncFromKingmaker();
      }
      
      // Recalculate kingdom capacities since settlement is now mapped
      const { settlementService } = await import('../../../../services/settlements');
      await settlementService.updateKingdomCapacities();
      
      closeDropdown();
      dispatch('locationChanged', { x, y });
   }
   
   async function clearLocation() {
      // Use kingmakerLocation if available, otherwise use current location
      const kmLocation = currentSettlement.kingmakerLocation || currentSettlement.location;
      
      // Update settlement's rmLocation to (0,0) to mark as unlinked
      await updateKingdom(k => {
         const s = k.settlements.find(s => s.id === settlement.id);
         if (s) {
            s.location = { x: 0, y: 0 }; // rmLocation
            // kingmakerLocation stays unchanged - it's the source of truth
         }
      });
      
      // Clear settlement name from Kingmaker map (keep the feature, set name to empty/vacant)
      const { territoryService } = await import('../../../../services/territory');
      await territoryService.clearKingmakerSettlementName(kmLocation);
      
      // Re-sync territory to update hex features
      territoryService.syncFromKingmaker();
      
      // Recalculate kingdom capacities since settlement is now unmapped
      const { settlementService } = await import('../../../../services/settlements');
      await settlementService.updateKingdomCapacities();
      
      closeDropdown();
      dispatch('locationChanged', { x: 0, y: 0 });
   }
   
   // Close dropdown when clicking outside
   function handleClickOutside(event: MouseEvent) {
      if (isOpen && dropdownElement && !dropdownElement.contains(event.target as Node)) {
         closeDropdown();
      }
   }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="location-picker" bind:this={dropdownElement}>
   <button 
      class="hex-button"
      class:has-location={hasLocation}
      on:click|stopPropagation={toggleDropdown}
      title={locationString}
   >
      <svg 
         class="hex-icon" 
         viewBox="0 0 24 24" 
         xmlns="http://www.w3.org/2000/svg"
      >
         <path 
            d="M12 2L3 7v10l9 5 9-5V7l-9-5z" 
            fill={hasLocation ? 'currentColor' : 'none'}
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
         />
      </svg>
   </button>
   
   {#if isOpen}
      <div class="location-dropdown">
         <div class="dropdown-header">
            <span>Map Locations</span>
            {#if hasLocation}
               <button class="clear-btn" on:click|stopPropagation={clearLocation}>
                  <i class="fas fa-times"></i> Clear
               </button>
            {/if}
         </div>
         
         <div class="location-list">
            {#if availableLocations.length === 0}
               <div class="empty-state">
                  No map settlements found
               </div>
            {:else}
               {#each availableLocations as location}
                  {@const isSelected = currentSettlement.location.x === location.x && currentSettlement.location.y === location.y}
                  <button
                     class="location-item"
                     class:selected={isSelected}
                     class:assigned={location.isAssigned}
                     disabled={location.isAssigned}
                     on:click|stopPropagation={() => selectLocation(location.x, location.y, location.isAssigned, isSelected)}
                     title={location.isAssigned ? `Already assigned to ${location.assignedTo}` : ''}
                  >
                     {#if location.settlementName}
                        <span class="location-name">{location.settlementName}</span>
                     {/if}
                     <span class="location-type">{location.settlementType}</span>
                     <span class="location-coords">
                        {location.x}:{location.y.toString().padStart(2, '0')}
                     </span>
                     {#if isSelected}
                        <i class="fas fa-check selected-icon"></i>
                     {:else if location.isAssigned}
                        <i class="fas fa-link assigned-icon"></i>
                     {/if}
                  </button>
               {/each}
            {/if}
         </div>
      </div>
   {/if}
</div>

<style lang="scss">
   .location-picker {
      position: relative;
      display: inline-flex;
      align-items: center;
   }
   
   .hex-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0.25rem;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: var(--transition-base);
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
         color: var(--text-accent);
      }
      
      &.has-location {
         color: var(--color-success, #22c55e);
         
         &:hover {
            color: #16a34a;
         }
      }
   }
   
   .hex-icon {
      width: 1.25rem;
      height: 1.25rem;
   }
   
   .location-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 0.5rem;
      background: var(--bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      min-width: 20rem;
      max-width: 30rem;
      z-index: 1000;
      overflow: hidden;
   }
   
   .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-accent);
      
      .clear-btn {
         padding: 0.25rem 0.5rem;
         background: transparent;
         border: 1px solid var(--color-border);
         border-radius: var(--radius-md);
         color: var(--text-secondary);
         font-size: var(--font-xs);
         cursor: pointer;
         transition: var(--transition-base);
         
         &:hover {
            background: rgba(255, 0, 0, 0.1);
            border-color: var(--color-danger);
            color: var(--color-danger);
         }
         
         i {
            margin-right: 0.25rem;
         }
      }
   }
   
   .location-list {
      max-height: 20rem;
      overflow-y: auto;
      padding: 0.25rem;
   }
   
   .location-item {
      display: grid;
      grid-template-columns: 1fr auto auto 2rem;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 0;
      color: var(--text-primary);
      cursor: pointer;
      transition: var(--transition-base);
      text-align: left;
      
      &:last-child {
         border-bottom: none;
      }
      
      &:hover {
         background: rgba(255, 255, 255, 0.05);
      }
      
      &.selected {
         background: rgba(34, 197, 94, 0.15);
         color: var(--color-success, #22c55e);
         
         &:hover {
            background: rgba(34, 197, 94, 0.2);
         }
      }
   }
   
   .location-name {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
   }
   
   .location-type {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
      white-space: nowrap;
      text-align: right;
      min-width: 5rem;
   }
   
   .location-coords {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      font-family: var(--font-mono, monospace);
      white-space: nowrap;
      text-align: right;
      min-width: 4rem;
   }
   
   .selected-icon {
      color: var(--color-success, #22c55e);
      font-size: var(--font-sm);
      text-align: center;
   }
   
   .assigned-icon {
      color: var(--text-tertiary);
      font-size: var(--font-sm);
      text-align: center;
   }
   
   .location-item.assigned {
      opacity: 0.5;
      cursor: not-allowed;
      
      &:hover {
         background: transparent;
      }
   }
   
   .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--text-tertiary);
      font-size: var(--font-sm);
   }
</style>
