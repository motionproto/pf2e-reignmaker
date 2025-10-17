<script lang="ts">
   import { kingdomData } from '../../../stores/KingdomStore';
   import { WorksiteConfig } from '../../../models/Hex';
   import { getResourceIcon, getResourceColor } from '../utils/presentation';
   
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
   
   // Get unique terrain types from hexes
   $: terrainTypes = [...new Set(($kingdomData.hexes || []).map(h => h.terrain))].sort();
   
   // Get unique worksite types from hexes
   $: worksiteTypes = [...new Set(($kingdomData.hexes || [])
      .filter(h => h.worksite)
      .map(h => h.worksite!.type))].sort();
   
   // Apply filters and sorting
   $: filteredAndSortedHexes = (() => {
      let hexes = [...($kingdomData.hexes || [])];
      
      // Apply filters
      if (filterTerrain !== 'all') {
         hexes = hexes.filter(h => h.terrain === filterTerrain);
      }
      if (filterWorksite !== 'all') {
         hexes = hexes.filter(h => h.worksite && h.worksite.type === filterWorksite);
      }
      
      // Apply sorting
      hexes.sort((a, b) => {
         let aValue: any;
         let bValue: any;
         
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
               break;
            case 'production':
               aValue = getProductionString(a);
               bValue = getProductionString(b);
               break;
            default:
               aValue = a.id;
               bValue = b.id;
         }
         
         if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
         if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
         return 0;
      });
      
      return hexes;
   })();
   
   // Calculate territory statistics
   $: terrainBreakdown = ($kingdomData.hexes || []).reduce((acc, hex) => {
      acc[hex.terrain] = (acc[hex.terrain] || 0) + 1;
      return acc;
   }, {} as Record<string, number>);
   
   $: totalProduction = ($kingdomData.hexes || []).reduce((acc, hex) => {
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
      
      // Apply special trait bonus
      if (hex.hasSpecialTrait) {
         production.forEach((amount, resource) => {
            production.set(resource, amount + 1);
         });
      }
      
      return production;
   }
</script>

<div class="territory-tab">
   <!-- Filters -->
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
   </div>
   
   <!-- Territory Table -->
   <div class="territory-table-container">
      {#if filteredAndSortedHexes.length > 0}
         <table class="territory-table">
            <thead>
               <tr>
                  <th class="sortable" on:click={() => handleSort('id')}>
                     <span>Hex Coordinate</span>
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
                  <th>Commodities</th>
                  <th class="sortable" on:click={() => handleSort('production')}>
                     <span>Production</span>
                     {#if sortColumn === 'production'}
                        <i class="fas fa-sort-{sortDirection === 'asc' ? 'up' : 'down'}"></i>
                     {:else}
                        <i class="fas fa-sort"></i>
                     {/if}
                  </th>
                  <th>Features</th>
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
                              <i class="fas {WorksiteConfig[hex.worksite.type]?.icon || 'fa-tools'}" style="color: {getWorksiteColor(hex.worksite.type)};"></i>
                              {WorksiteConfig[hex.worksite.type]?.displayName || hex.worksite.type}
                           </span>
                        {:else}
                           <span class="no-worksite">-</span>
                        {/if}
                     </td>
                     <td class="commodities">
                        {#if hex.hasSpecialTrait}
                           <span class="commodity-bonus" title="This hex has a commodity bonus">
                              <i class="fas fa-plus-circle"></i>
                              +1 Bonus
                           </span>
                        {:else}
                           <span class="no-commodity">-</span>
                        {/if}
                     </td>
                     <td class="production">
                        {#if calculateHexProduction(hex).size > 0}
                           <div class="production-list">
                              {#each Array.from(calculateHexProduction(hex).entries()) as [resource, amount]}
                                 <span class="production-item">
                                    <i class="fas {getResourceIcon(resource)}" style="color: {getResourceColor(resource)};"></i>
                                    +{amount} {resource}
                                 </span>
                              {/each}
                           </div>
                        {:else}
                           <span class="no-production">-</span>
                        {/if}
                     </td>
                     <td class="features">
                        {#if hex.features && hex.features.length > 0}
                           <div class="features-list">
                              {#each hex.features as feature}
                                 {#if feature.type}
                                    {@const featureType = feature.type.toLowerCase()}
                                    {@const isSettlement = featureType === 'village' || featureType === 'town' || featureType === 'city' || featureType === 'metropolis'}
                                    <span class="feature-badge" class:settlement={isSettlement}>
                                       {#if isSettlement}
                                          <i class="fas fa-city"></i>
                                       {:else if featureType === 'farmland'}
                                          <i class="fas fa-wheat-awn"></i>
                                       {:else}
                                          <i class="fas fa-landmark"></i>
                                       {/if}
                                       {feature.type.charAt(0).toUpperCase() + feature.type.slice(1)}
                                    </span>
                                 {/if}
                              {/each}
                           </div>
                        {:else if hex.name}
                           <span class="feature-name">
                              <i class="fas fa-landmark"></i>
                              {hex.name}
                           </span>
                        {:else}
                           <span class="no-features">-</span>
                        {/if}
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
            color: var(--color-text-dark-secondary, #7a7971);
            font-size: 0.875rem;
         }
         
         select {
            padding: 0.25rem 0.5rem;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.25rem;
            color: var(--color-text-dark-primary, #b5b3a4);
            
            &:focus {
               outline: none;
               border-color: var(--color-primary, #5e0000);
            }
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
            color: var(--color-text-dark-primary, #b5b3a4);
            font-weight: var(--font-weight-semibold);
            border-bottom: 2px solid var(--color-primary, #5e0000);
            
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
                  font-size: 0.75rem;
                  opacity: 0.5;
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
            padding: 0.75rem;
            color: var(--color-text-dark-secondary, #7a7971);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            
            &.hex-id {
               font-weight: var(--font-weight-semibold);
               color: var(--color-text-dark-primary, #b5b3a4);
               
               i {
                  margin-right: 0.5rem;
                  color: var(--color-primary, #5e0000);
               }
            }
            
            .terrain-badge {
               display: inline-block;
               padding: 0.25rem 0.5rem;
               border-radius: 0.25rem;
               font-size: 0.875rem;
               font-weight: var(--font-weight-medium);
               
               &.terrain-plains {
                  // Food color (brown-light)
                  background: rgba(160, 110, 70, 0.2);
                  color: #a06e46;
               }
               
               &.terrain-forest {
                  // Lumber color (green)
                  background: rgba(34, 139, 34, 0.2);
                  color: #228b22;
               }
               
               &.terrain-hills {
                  // Stone color (gray)
                  background: rgba(128, 128, 128, 0.2);
                  color: #808080;
               }
               
               &.terrain-mountains {
                  // Ore color (blue)
                  background: rgba(70, 130, 180, 0.2);
                  color: #4682b4;
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
                  background: rgba(70, 130, 180, 0.2);
                  color: #4682b4;
               }
            }
            
            .worksite-badge {
               display: inline-flex;
               align-items: center;
               gap: 0.5rem;
               padding: 0.25rem 0.5rem;
               border-radius: 0.25rem;
               font-size: 0.875rem;
            }
            
            .commodity-bonus {
               color: #90ee90;
               font-size: 0.875rem;
               
               i {
                  margin-right: 0.25rem;
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
                  font-size: 0.875rem;
                  color: #90ee90;
                  
                  i {
                     font-size: 0.75rem;
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
                  font-size: 0.75rem;
                  font-weight: var(--font-weight-medium);
                  background: rgba(255, 215, 0, 0.1);
                  color: #ffd700;
                  
                  &.settlement {
                     background: rgba(94, 0, 0, 0.2);
                     color: var(--color-primary);
                     border: 1px solid var(--color-primary);
                  }
                  
                  i {
                     font-size: 0.625rem;
                  }
               }
            }
            
            .feature-name {
               color: #ffd700;
               font-weight: var(--font-weight-medium);
               
               i {
                  margin-right: 0.25rem;
               }
            }
            
            .no-worksite,
            .no-commodity,
            .no-production,
            .no-features {
               color: rgba(255, 255, 255, 0.3);
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
         font-size: 3rem;
         color: rgba(255, 255, 255, 0.2);
         margin-bottom: 1rem;
      }
      
      p {
         margin: 0.5rem 0;
         color: var(--color-text-dark-secondary, #7a7971);
         
         &.hint {
            font-size: 0.875rem;
            font-style: italic;
            color: rgba(255, 255, 255, 0.4);
         }
      }
   }
</style>
