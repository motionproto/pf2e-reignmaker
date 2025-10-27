<script lang="ts">
   import { kingdomData, currentFaction, allSettlements } from '../../../stores/KingdomStore';
   import { WorksiteConfig } from '../../../models/Hex';
   import { getResourceIcon, getResourceColor } from '../utils/presentation';
   import { filterVisibleHexes } from '../../../utils/visibility-filter';
   
   // View mode toggle
   let viewMode: 'territory' | 'world' = 'territory';
   
   // Check if current user is GM
   $: isGM = (game as any)?.user?.isGM || false;
   
   // Calculate hex counts for view selector (reactive to currentFaction)
   $: claimedHexCount = ($kingdomData.hexes || []).filter((h: any) => h.claimedBy === $currentFaction).length;
   $: totalHexCount = ($kingdomData.hexes || []).length;
   
   // Get hex source based on view mode (reactive to currentFaction)
   $: sourceHexes = (() => {
      if (viewMode === 'territory') {
         // Territory view: only current faction's hexes
         return ($kingdomData.hexes || []).filter((h: any) => h.claimedBy === $currentFaction);
      } else {
         // Known World view: all hexes PLUS create entries for settlements without hexes
         let hexes = [...($kingdomData.hexes || [])];
         const hexIds = new Set(hexes.map(h => h.id));
         
         // Add virtual hex entries for settlements that don't have a hex
         $allSettlements.forEach(settlement => {
            const hexId = `${settlement.location.x}.${settlement.location.y}`;
            if (!hexIds.has(hexId)) {
               // Create a minimal hex entry for this settlement
               hexes.push({
                  id: hexId,
                  row: settlement.location.x,
                  col: settlement.location.y,
                  terrain: 'Unknown',
                  claimedBy: settlement.ownedBy || null,
                  worksite: null,
                  hasCommodityBonus: false,
                  features: []
               } as any);
            }
         });
         
         // Apply World Explorer visibility filter (GM sees all, players see only discovered)
         return filterVisibleHexes(hexes);
      }
   })();
   
   // Map worksite types to their resource colors
   function getWorksiteColor(worksiteType: string): string {
      switch(worksiteType) {
         case 'Farmstead':
         case 'Hunting/Fishing Camp':
         case 'Oasis Farm':
            return getResourceColor('food');
         case 'Logging Camp':
            return getResourceColor('lumber');
         case 'Quarry':
            return getResourceColor('stone');
         case 'Mine':
         case 'Bog Mine':
            return getResourceColor('ore');
         default:
            return 'var(--color-gray-400)';
      }
   }
   
   // Sorting state
   let sortColumn: string = 'id';
   let sortDirection: 'asc' | 'desc' = 'asc';
   
   // Filter state
   let filterTerrain: string = 'all';
   let filterWorksite: string = 'all';
   
   // Get unique terrain types from SOURCE hexes (filtered by view mode)
   $: terrainTypes = [...new Set(sourceHexes.map(h => h.terrain))].sort();
   
   // Get unique worksite types from SOURCE hexes (filtered by view mode)
   $: worksiteTypes = [...new Set(sourceHexes
      .filter(h => h.worksite)
      .map(h => h.worksite!.type))].sort();
   
   // Apply filters and sorting to source hexes
   $: filteredAndSortedHexes = (() => {
      let hexes = [...sourceHexes];
      
      // Apply filters
      if (filterTerrain !== 'all') {
         hexes = hexes.filter(h => h.terrain === filterTerrain);
      }
      if (filterWorksite !== 'all') {
         hexes = hexes.filter(h => h.worksite && h.worksite.type === filterWorksite);
      }
      
      // Helper function to get settlement name for a hex
      const getSettlementName = (hex: any): string => {
         const hexCoords = hex.id.split('.');
         const hexRow = parseInt(hexCoords[0]);
         const hexCol = parseInt(hexCoords[1]);
         const settlement = $allSettlements.find(s => s.location.x === hexRow && s.location.y === hexCol);
         if (settlement) return settlement.name;
         
         const hexAny = hex;
         const settlementFeature = hexAny.features && hexAny.features.find(f => f.type === 'settlement');
         if (settlementFeature) return settlementFeature.name || 'Settlement';
         
         return '';
      };
      
      // Apply sorting
      hexes.sort((a, b) => {
         let aValue: any;
         let bValue: any;
         let aIsEmpty = false;
         let bIsEmpty = false;
         
         switch(sortColumn) {
            case 'id':
               aValue = a.id;
               bValue = b.id;
               break;
            case 'terrain':
               aValue = a.terrain;
               bValue = b.terrain;
               break;
            case 'worksite':
               aValue = a.worksite?.type || '';
               bValue = b.worksite?.type || '';
               aIsEmpty = !a.worksite;
               bIsEmpty = !b.worksite;
               break;
            case 'commodities':
               // Sort by total commodity count
               const aCommodities = getCommoditiesForDisplay(a);
               const bCommodities = getCommoditiesForDisplay(b);
               aValue = aCommodities.reduce((sum, c) => sum + c.amount, 0);
               bValue = bCommodities.reduce((sum, c) => sum + c.amount, 0);
               aIsEmpty = aCommodities.length === 0;
               bIsEmpty = bCommodities.length === 0;
               break;
            case 'production':
               aValue = getProductionString(a);
               bValue = getProductionString(b);
               aIsEmpty = aValue === '-';
               bIsEmpty = bValue === '-';
               break;
            case 'roads':
               // Sort by road presence (has road = 1, no road = 0)
               aValue = ($kingdomData.roadsBuilt && $kingdomData.roadsBuilt.includes(a.id)) ? 1 : 0;
               bValue = ($kingdomData.roadsBuilt && $kingdomData.roadsBuilt.includes(b.id)) ? 1 : 0;
               aIsEmpty = aValue === 0;
               bIsEmpty = bValue === 0;
               break;
            case 'settlement':
               aValue = getSettlementName(a);
               bValue = getSettlementName(b);
               aIsEmpty = aValue === '';
               bIsEmpty = bValue === '';
               break;
            default:
               aValue = a.id;
               bValue = b.id;
         }
         
         // Empty values always go to the bottom
         if (aIsEmpty && !bIsEmpty) return 1;
         if (!aIsEmpty && bIsEmpty) return -1;
         
         // Normal sorting for non-empty values
         if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
         if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
         return 0;
      });
      
      return hexes;
   })();
   
   // Calculate territory statistics from SOURCE hexes
   $: terrainBreakdown = sourceHexes.reduce((acc, hex) => {
      acc[hex.terrain] = (acc[hex.terrain] || 0) + 1;
      return acc;
   }, {} as Record<string, number>);
   
   $: totalProduction = sourceHexes.reduce((acc, hex) => {
      const production = calculateHexProduction(hex);
      production.forEach((amount: number, resource: string) => {
         acc[resource] = (acc[resource] || 0) + amount;
      });
      return acc;
   }, {} as Record<string, number>);
   
   // Helper functions
   function handleSort(column: string) {
      if (sortColumn === column) {
         sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
         sortColumn = column;
         sortDirection = 'asc';
      }
   }
   
   function getProductionString(hex: any): string {
      const production = calculateHexProduction(hex);
      
      if (production.size === 0) return '-';
      
      const items: string[] = [];
      production.forEach((amount: number, resource: string) => {
         items.push(`${amount} ${resource}`);
      });
      return items.join(', ');
   }
   
   function calculateHexProduction(hex: any): Map<string, number> {
      const production = new Map<string, number>();
      
      if (!hex.worksite) return production;
      
      // Basic production based on worksite type and terrain
      const terrain = hex.terrain.toLowerCase();
      const worksiteType = hex.worksite.type;
      
      switch (worksiteType) {
         case 'Farmstead':
            if (terrain === 'plains' || terrain === 'forest') production.set('food', 2);
            else if (terrain === 'hills' || terrain === 'swamp' || terrain === 'desert') production.set('food', 1);
            break;
         case 'Logging Camp':
            if (terrain === 'forest') production.set('lumber', 2);
            break;
         case 'Quarry':
            if (terrain === 'hills' || terrain === 'mountains') production.set('stone', 1);
            break;
         case 'Mine':
         case 'Bog Mine':
            if (terrain === 'mountains' || terrain === 'swamp') production.set('ore', 1);
            break;
         case 'Hunting/Fishing Camp':
            if (terrain === 'swamp') production.set('food', 1);
            break;
         case 'Oasis Farm':
            if (terrain === 'desert') production.set('food', 1);
            break;
      }
      
      // Apply commodity bonuses (new system)
      // Handle both Map and plain object formats
      const commodities = hex.commodities || {};
      const commodityEntries = commodities instanceof Map 
         ? Array.from(commodities.entries())
         : Object.entries(commodities);
      
      for (const [resource, amount] of commodityEntries) {
         const numAmount = Number(amount);
         if (resource === 'gold') {
            // Gold commodities are always collected
            production.set('gold', (production.get('gold') || 0) + numAmount);
         } else {
            // Other commodities only apply to matching resources
            if (production.has(resource)) {
               production.set(resource, production.get(resource)! + numAmount);
            }
         }
      }
      
      return production;
   }
   
   // Get commodities for display (returns array of {resource, amount} objects)
   function getCommoditiesForDisplay(hex: any): Array<{resource: string, amount: number}> {
      const commodities = hex.commodities || {};
      const result: Array<{resource: string, amount: number}> = [];
      
      // Handle both Map and plain object formats
      const commodityEntries = commodities instanceof Map 
         ? Array.from(commodities.entries())
         : Object.entries(commodities);
      
      for (const [resource, amount] of commodityEntries) {
         result.push({ resource, amount: Number(amount) });
      }
      
      return result;
   }
</script>

<div class="territory-tab">
   <!-- Filters with View Mode Toggle -->
   <div class="territory-filters">
      <div class="filter-group">
         <label for="terrain-filter">Terrain:</label>
         <select id="terrain-filter" bind:value={filterTerrain}>
            <option value="all">All Terrains</option>
            {#each terrainTypes as terrain}
               <option value={terrain}>{terrain} ({terrainBreakdown[terrain] || 0})</option>
            {/each}
         </select>
      </div>
      
      <div class="filter-group">
         <label for="worksite-filter">Worksite:</label>
         <select id="worksite-filter" bind:value={filterWorksite}>
            <option value="all">All Worksites</option>
            {#each worksiteTypes as worksite}
               <option value={worksite}>{WorksiteConfig[worksite]?.displayName || worksite}</option>
            {/each}
         </select>
      </div>
      
      <!-- View Mode Radio Group (right side) -->
      <div class="filter-group view-mode-group">
         <div class="radio-group" role="radiogroup" aria-label="View mode">
            <label class="radio-option" class:selected={viewMode === 'territory'}>
               <input 
                  type="radio" 
                  name="viewMode" 
                  value="territory" 
                  bind:group={viewMode}
                  class="radio-input"
               />
               <span class="radio-content">
                  <span class="radio-label">Territory</span>
                  <span class="radio-icon-count">
                     <i class="fas fa-flag"></i>
                     ({claimedHexCount})
                  </span>
               </span>
            </label>
            
            <label class="radio-option" class:selected={viewMode === 'world'}>
               <input 
                  type="radio" 
                  name="viewMode" 
                  value="world" 
                  bind:group={viewMode}
                  class="radio-input"
               />
               <span class="radio-content">
                  <span class="radio-label">Known World</span>
                  <span class="radio-icon-count">
                     <i class="fas fa-globe"></i>
                     ({totalHexCount})
                  </span>
               </span>
            </label>
         </div>
      </div>
   </div>
   
   <!-- Territory Table -->
   <div class="territory-table-container">
      {#if filteredAndSortedHexes.length > 0}
         <table class="territory-table">
            <thead>
               <tr>
                  <th class="sortable" on:click={() => handleSort('id')}>
                     <span>Location</span>
                     {#if sortColumn === 'id'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
                  <th class="sortable" on:click={() => handleSort('terrain')}>
                     <span>Terrain</span>
                     {#if sortColumn === 'terrain'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
                  <th class="sortable" on:click={() => handleSort('worksite')}>
                     <span>Worksite</span>
                     {#if sortColumn === 'worksite'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
                  <th class="sortable" on:click={() => handleSort('commodities')}>
                     <span>Bounty</span>
                     {#if sortColumn === 'commodities'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
                  <th class="sortable" on:click={() => handleSort('production')}>
                     <span>Production</span>
                     {#if sortColumn === 'production'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
                  <th class="sortable" on:click={() => handleSort('roads')}>
                     <span>Roads</span>
                     {#if sortColumn === 'roads'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
                  <th class="sortable" on:click={() => handleSort('settlement')}>
                     <span>Settlement</span>
                     {#if sortColumn === 'settlement'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
               </tr>
            </thead>
            <tbody>
               {#each filteredAndSortedHexes as hex}
                  <tr>
                     <td class="hex-id">
                        <i class="fas fa-map-marker-alt"></i>
                        {hex.id}
                     </td>
                     <td class="terrain">
                        <span class="terrain-badge terrain-{hex.terrain.toLowerCase()}">
                           {hex.terrain}
                        </span>
                     </td>
                     <td class="worksite">
                        {#if hex.worksite}
                           <span class="worksite-badge" style="background: {getWorksiteColor(hex.worksite.type)}20; border-color: {getWorksiteColor(hex.worksite.type)}50;">
                              {WorksiteConfig[hex.worksite.type]?.displayName || hex.worksite.type}
                           </span>
                        {:else}
                           <span class="no-worksite">-</span>
                        {/if}
                     </td>
                     <td class="commodities">
                        {#if getCommoditiesForDisplay(hex).length > 0}
                           {@const commoditiesList = getCommoditiesForDisplay(hex)}
                           <div class="commodity-icons">
                              {#each commoditiesList as commodity}
                                 {#each Array(commodity.amount) as _, i}
                                    <i 
                                       class="fas {getResourceIcon(commodity.resource)} commodity-icon" 
                                       style="color: {getResourceColor(commodity.resource)}"
                                       title="{commodity.resource} bounty"
                                    ></i>
                                 {/each}
                              {/each}
                           </div>
                        {:else}
                           <span class="no-commodity">-</span>
                        {/if}
                     </td>
                     <td class="production">
                        {#if calculateHexProduction(hex).size > 0}
                           <div class="production-list">
                              {#each Array.from(calculateHexProduction(hex).entries()) as [resource, amount]}
                                 <span class="production-item">
                                    {amount} {resource}
                                 </span>
                              {/each}
                           </div>
                        {:else}
                           <span class="no-production">-</span>
                        {/if}
                     </td>
                     <td class="roads">
                        {#if $kingdomData.roadsBuilt && $kingdomData.roadsBuilt.includes(hex.id)}
                           <span class="has-road" title="Road built in this hex">
                              <i class="fas fa-check"></i>
                           </span>
                        {:else}
                           <span class="no-road">-</span>
                        {/if}
                     </td>
                     <td class="settlement">
                        {#each [hex.id] as hexId}
                           {@const hexCoords = hexId.split('.')}
                           {@const hexRow = parseInt(hexCoords[0])}
                           {@const hexCol = parseInt(hexCoords[1])}
                           {@const settlement = $allSettlements.find(s => s.location.x === hexRow && s.location.y === hexCol)}
                           {@const hexAny = hex}
                           {@const settlementFeature = hexAny.features && hexAny.features.find(f => f.type === 'settlement')}
                           
                           {#if settlement}
                              <div class="settlement-info">
                                 <div class="settlement-name">{settlement.name}</div>
                                 <div class="settlement-tier">{settlement.tier}</div>
                              </div>
                           {:else if settlementFeature}
                              <div class="settlement-info">
                                 <div class="settlement-name">{settlementFeature.name || 'Settlement'}</div>
                                 {#if settlementFeature.tier}
                                    <div class="settlement-tier">{settlementFeature.tier}</div>
                                 {/if}
                              </div>
                           {:else}
                              <span class="no-settlement">-</span>
                           {/if}
                        {/each}
                     </td>
                  </tr>
               {/each}
            </tbody>
         </table>
      {:else}
         <div class="no-territory">
            {#if ($kingdomData.hexes || []).length === 0}
               <i class="fas fa-map-marked-alt"></i>
               <p>No territory has been claimed yet.</p>
               <p class="hint">Claim hexes to expand your kingdom's territory.</p>
            {:else}
               <i class="fas fa-filter"></i>
               <p>No hexes match the current filters.</p>
            {/if}
         </div>
      {/if}
   </div>
</div>

<style lang="scss">
   .territory-tab {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
   }
   
   .territory-filters {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0.375rem;
      
      .filter-group {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         
         label {
            color: var(--text-secondary);
            font-size: var(--font-sm);
         }
         
         select {
            padding: 0.25rem 0.5rem;
            background: var(--bg-subtle);
            border: 1px solid var(--border-secondary);
            border-radius: 0.25rem;
            color: var(--text-primary);
            
            &:focus {
               outline: none;
               border-color: var(--color-primary);
            }
         }
      }
   }
   
   .view-mode-group {
      flex: 0 0 auto;
      margin-left: auto;
      
      .radio-group {
         display: flex;
         gap: 0.5rem;
         padding: 0.25rem;
         background: rgba(0, 0, 0, 0.3);
         border-radius: 0.5rem;
         border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .radio-option {
         display: flex;
         align-items: center;
         padding: 0.5rem 0.75rem;
         border-radius: 0.375rem;
         cursor: pointer;
         transition: all 0.2s;
         background: transparent;
         border: 2px solid transparent;
         user-select: none;
         
         &:hover {
            background: rgba(255, 255, 255, 0.05);
         }
         
         &.selected {
            background: rgba(94, 0, 0, 0.3);
            border-color: var(--color-primary);
            
            .radio-content {
               color: var(--text-primary);
            }
         }
      }
      
      .radio-input {
         position: absolute;
         opacity: 0;
         pointer-events: none;
      }
      
      .radio-content {
         display: flex;
         flex-direction: column;
         align-items: center;
         gap: 0.25rem;
         color: var(--text-secondary);
         transition: color 0.2s;
      }
      
      .radio-label {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         text-transform: uppercase;
         letter-spacing: 0.05em;
      }
      
      .radio-icon-count {
         display: flex;
         align-items: center;
         gap: 0.375rem;
         font-size: var(--font-sm);
         font-weight: var(--font-weight-medium);
         
         i {
            font-size: 1rem;
         }
      }
   }
   
   .territory-table-container {
      flex: 1;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0.375rem;
      padding: 0.5rem;
   }
   
   .territory-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      
      thead {
         position: sticky;
         top: 0;
         background: rgba(0, 0, 0, 0.3);
         z-index: 10;
         
         th {
            padding: 0.75rem;
            text-align: left;
            color: var(--text-primary);
            font-weight: var(--font-weight-semibold);
            border-bottom: 2px solid var(--color-primary);
            
            &.sortable {
               cursor: pointer;
               user-select: none;
               
               &:hover {
                  background: rgba(255, 255, 255, 0.05);
               }
               
               span {
                  margin-right: 0.5rem;
               }
               
               i {
                  font-size: var(--font-xs);
                  opacity: var(--opacity-muted);
               }
            }
         }
      }
      
      tbody {
         tr {
            &:hover {
               background: rgba(255, 255, 255, 0.03);
            }
            
            &:nth-child(even) {
               background: rgba(0, 0, 0, 0.1);
            }
         }
         
         td {
            padding: 0.35rem 0.75rem;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-subtle);
            
            &.hex-id {
               font-weight: var(--font-weight-semibold);
               color: var(--text-primary);
               
               i {
                  margin-right: 0.5rem;
                  color: var(--color-primary);
               }
            }
            
            .terrain-badge {
               display: inline-block;
               padding: 0.25rem 0.5rem;
               border-radius: 0.25rem;
               font-size: var(--font-sm);
               font-weight: var(--font-weight-medium);
               
               &.terrain-plains {
                  // Food color (brown-light)
                  background: var(--color-food-subtle);
                  color: (--color-food);
               }
               
               &.terrain-forest {
                  // Lumber color (green)
                  background: var(--color-lumber-subtle);
                  color: var(--color-lumber);
               }
               
               &.terrain-hills {
                  // Stone color (gray)
                  background: var(--color-stone-subtle);
                  color: var(--color-stone);
               }
               
               &.terrain-mountains {
                  // Ore color (blue)
                  background: var(--color-ore-subtle);
                  color: var(--color-ore);
               }
               
               &.terrain-swamp {
                  // Putrid green (keeping unique color since no dedicated worksite)
                  background: rgba(85, 107, 47, 0.2);
                  color: #556b2f;
               }
               
               &.terrain-desert {
                  background: rgba(238, 203, 173, 0.2);
                  color: #eecbad;
               }
               
               &.terrain-water {
                  background: var(--color-ore-subtle);
                  color: var(--color-ore);
               }
            }
            
            .worksite-badge {
               display: inline-flex;
               align-items: center;
               gap: 0.5rem;
               padding: 0.25rem 0.5rem;
               border-radius: 0.25rem;
               font-size: var(--font-sm);
            }
            
            .commodity-icons {
               display: flex;
               gap: 0.25rem;
               flex-wrap: wrap;
               
               .commodity-icon {
                  font-size: var(--font-sm);
                  opacity: 0.9;
               }
            }
            
            .production-list {
               display: flex;
               flex-direction: column;
               gap: 0.25rem;
               
               .production-item {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.25rem;
                  font-size: var(--font-sm);
                  color: var(--color-success);
                  
                  i {
                     font-size: var(--font-xs);
                  }
               }
            }
            
            .features-list {
               display: flex;
               flex-direction: column;
               gap: 0.25rem;
               
               .feature-badge {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.25rem;
                  padding: 0.125rem 0.375rem;
                  border-radius: 0.25rem;
                  font-size: var(--font-xs);
                  font-weight: var(--font-weight-medium);
                  background: var(--color-warning-subtle);
                  color: var(--color-warning);
                  
                  &.settlement {
                     background: var(--color-primary-subtle);
                     color: var(--color-primary);
                     border: 1px solid var(--color-primary);
                  }
                  
                  i {
                     font-size: var(--font-xs);
                  }
               }
            }
            
            .feature-name {
               color: var(--color-warning);
               font-weight: var(--font-weight-medium);
               
               i {
                  margin-right: 0.25rem;
               }
            }
            
            .has-road {
               color: var(--color-success);
               font-size: var(--font-base);
               
               i {
                  font-size: 1rem;
               }
            }
            
            .settlement-info {
               display: flex;
               flex-direction: column;
               gap: 0.25rem;
            }
            
            .settlement-badge {
               display: inline-flex;
               align-items: center;
               gap: 0.375rem;
               padding: 0.375rem 0.625rem;
               border-radius: 0.375rem;
               font-size: var(--font-sm);
               font-weight: var(--font-weight-semibold);
               border: 1px solid;
               
               &.tier-village {
                  background: rgba(139, 69, 19, 0.15);
                  border-color: rgba(139, 69, 19, 0.4);
                  color: #d2691e;
               }
               
               &.tier-town {
                  background: rgba(70, 130, 180, 0.15);
                  border-color: rgba(70, 130, 180, 0.4);
                  color: #87ceeb;
               }
               
               &.tier-city {
                  background: rgba(147, 112, 219, 0.15);
                  border-color: rgba(147, 112, 219, 0.4);
                  color: #ba8fd8;
               }
               
               &.tier-metropolis {
                  background: rgba(255, 215, 0, 0.15);
                  border-color: rgba(255, 215, 0, 0.4);
                  color: #ffd700;
               }
               
               i {
                  font-size: var(--font-sm);
               }
            }
            
            .settlement-tier {
               font-size: var(--font-xs);
               color: var(--text-muted);
               font-style: italic;
            }
            
            .settlement-note {
               font-size: var(--font-xs);
               color: var(--text-muted);
               font-style: italic;
               opacity: 0.7;
            }
            
            .no-worksite,
            .no-commodity,
            .no-production,
            .no-features,
            .no-road,
            .no-settlement {
               color: var(--text-disabled);
               font-style: italic;
            }
         }
      }
   }
   
   .no-territory {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      
      i {
         font-size: var(--font-3xl);
         color: var(--text-disabled);
         margin-bottom: 1rem;
      }
      
      p {
         margin: 0.5rem 0;
         color: var(--text-secondary);
         
         &.hint {
            font-size: var(--font-sm);
            font-style: italic;
            color: var(--text-muted);
         }
      }
   }
</style>
