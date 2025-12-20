<script lang="ts">
   import { onMount, onDestroy } from 'svelte';
   import { Chart, registerables } from 'chart.js';
   import { kingdomData, currentFaction, allSettlements, ownedSettlements, claimedWorksites, selectSettlement } from '../../../stores/KingdomStore';
   import { setSelectedTab } from '../../../stores/ui';
   import { WorksiteConfig } from '../../../models/Hex';
   import { getResourceIcon, getResourceColor, getTerrainIcon, getTerrainColor } from '../utils/presentation';
   import { filterVisibleHexes } from '../../../utils/visibility-filter';

   // Register Chart.js components
   Chart.register(...registerables);

   // View mode toggle
   let viewMode: 'territory' | 'world' | 'overview' = 'overview';
   
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
               // Try to find hex ownership (settlement ownership is derived from hex)
               // If no hex exists, ownership is unknown (null)
               const existingHex = $kingdomData.hexes?.find((h: any) => 
                  h.row === settlement.location.x && h.col === settlement.location.y
               );
               
               // Create a minimal hex entry for this settlement
               hexes.push({
                  id: hexId,
                  row: settlement.location.x,
                  col: settlement.location.y,
                  terrain: 'Unknown',
                  claimedBy: existingHex?.claimedBy ?? null,
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

   // Apply sorting to source hexes
   $: filteredAndSortedHexes = (() => {
      let hexes = [...sourceHexes];
      
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
   
   // Get claimed hexes for overview statistics
   $: claimedHexes = ($kingdomData.hexes || []).filter((h: any) => h.claimedBy === $currentFaction);

   // Calculate terrain breakdown - use claimed hexes for overview, sourceHexes for other views
   $: terrainBreakdown = (viewMode === 'overview' ? claimedHexes : sourceHexes).reduce((acc, hex) => {
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

   // Chart.js terrain pie chart
   let terrainChartCanvas: HTMLCanvasElement;
   let terrainChart: Chart | null = null;

   // Create/update terrain chart
   function updateTerrainChart() {
      if (!terrainChartCanvas || Object.keys(terrainBreakdown).length === 0) return;

      const sortedTerrains = Object.entries(terrainBreakdown).sort(([,a], [,b]) => b - a);
      const labels = sortedTerrains.map(([terrain]) => terrain);
      const data = sortedTerrains.map(([, count]) => count);
      const backgroundColors = sortedTerrains.map(([terrain]) => getTerrainColor(terrain));

      if (terrainChart) {
         // Update existing chart
         terrainChart.data.labels = labels;
         terrainChart.data.datasets[0].data = data;
         terrainChart.data.datasets[0].backgroundColor = backgroundColors;
         terrainChart.update();
      } else {
         // Create new chart
         terrainChart = new Chart(terrainChartCanvas, {
            type: 'pie',
            data: {
               labels: labels,
               datasets: [{
                  data: data,
                  backgroundColor: backgroundColors,
                  borderColor: 'rgba(0, 0, 0, 0.3)',
                  borderWidth: 2
               }]
            },
            options: {
               responsive: true,
               maintainAspectRatio: true,
               plugins: {
                  legend: {
                     display: false
                  },
                  tooltip: {
                     callbacks: {
                        label: function(context) {
                           const label = context.label || '';
                           const value = context.parsed;
                           const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
                           const percentage = Math.round((value / total) * 100);
                           return `${label}: ${value} (${percentage}%)`;
                        }
                     }
                  }
               }
            }
         });
      }
   }

   // Update chart when data changes
   $: if (terrainChartCanvas && viewMode === 'overview') {
      updateTerrainChart();
   }

   onDestroy(() => {
      if (terrainChart) {
         terrainChart.destroy();
         terrainChart = null;
      }
   });

   // Handle settlement name click - navigate to settlements tab with that settlement selected
   function handleSettlementClick(settlementId: string) {
      selectSettlement(settlementId);
      setSelectedTab('settlements');
   }
</script>

<div class="territory-tab">
   <!-- View Mode Toggle -->
   <div class="territory-filters">
      <div class="view-mode-group">
         <div class="radio-group" role="radiogroup" aria-label="View mode">
            <label class="radio-option" class:selected={viewMode === 'overview'}>
               <input
                  type="radio"
                  name="viewMode"
                  value="overview"
                  bind:group={viewMode}
                  class="radio-input"
               />
               <span class="radio-content">
                  <span class="radio-label">Overview</span>
                  <span class="radio-icon-count">
                     <i class="fas fa-chart-bar"></i>
                  </span>
               </span>
            </label>

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

   <!-- Kingdom Overview -->
   {#if viewMode === 'overview'}
      <div class="kingdom-overview">
         <!-- Territory Statistics - Full Width -->
         <div class="stat-card territory-card">
            <div class="stat-header">
               <i class="fas fa-map-marked-alt"></i>
               <h3>Claimed Territory</h3>
            </div>
            <div class="territory-content">
               <div class="territory-stats">
                  <div class="stat-row">
                     <span class="stat-label">Claimed Hexes</span>
                     <span class="stat-value">{claimedHexCount}</span>
                  </div>
                  <div class="stat-row">
                     <span class="stat-label">Kingdom Size</span>
                     <span class="stat-value">{$kingdomData.size || 0}</span>
                  </div>
                  <div class="stat-row">
                     <span class="stat-label">Roads Built</span>
                     <span class="stat-value">{($kingdomData.roadsBuilt || []).length}</span>
                  </div>
               </div>

               {#if Object.keys(terrainBreakdown).length > 0}
                  {@const sortedTerrains = Object.entries(terrainBreakdown).sort(([,a], [,b]) => b - a)}
                  <div class="terrain-chart-center">
                     <div class="chart-wrapper">
                        <canvas bind:this={terrainChartCanvas} class="terrain-pie-chart"></canvas>
                     </div>
                     <h4 class="chart-title">Terrain Distribution</h4>
                  </div>

                  <div class="terrain-legend-column">
                     {#each sortedTerrains as [terrain, count]}
                        <div class="terrain-legend-item">
                           <span class="terrain-color-box" style="background-color: {getTerrainColor(terrain)}"></span>
                           <span class="terrain-legend-label">{terrain}</span>
                           <span class="terrain-legend-count">{count}</span>
                        </div>
                     {/each}
                  </div>
               {/if}
            </div>
         </div>

         <!-- Bottom Row: Settlements and Worksites/Production -->
         <div class="bottom-row">
            <!-- Settlements -->
            <div class="stat-card settlements-card">
               <div class="stat-header">
                  <i class="fas fa-city"></i>
                  <h3>Settlements</h3>
               </div>
               <div class="stat-content">
                  <div class="stat-row">
                     <span class="stat-label">Total Settlements</span>
                     <span class="stat-value">{$ownedSettlements.length}</span>
                  </div>

                  {#if $ownedSettlements.length > 0}
                     {@const sortedSettlements = [...$ownedSettlements].sort((a, b) => {
                        // Capital always first
                        if (a.isCapital && !b.isCapital) return -1;
                        if (!a.isCapital && b.isCapital) return 1;
                        // Then by name
                        return a.name.localeCompare(b.name);
                     })}
                     <div class="settlements-list">
                        {#each sortedSettlements as settlement}
                           <div class="settlement-item">
                              {#if settlement.isCapital}
                                 <i class="fas fa-crown capital-icon" title="Capital"></i>
                              {/if}
                              <span
                                 class="settlement-name-link"
                                 on:click={() => handleSettlementClick(settlement.id)}
                                 on:keydown={(e) => e.key === 'Enter' && handleSettlementClick(settlement.id)}
                                 tabindex="0"
                                 role="link"
                                 title="View in Settlements tab"
                              >
                                 {settlement.name}
                              </span>
                              <span class="settlement-tier">{settlement.tier}</span>
                              <span class="settlement-level">Level {settlement.level}</span>
                              <span class="settlement-structures">
                                 <i class="fas fa-building"></i> {settlement.structureIds.length}
                              </span>
                           </div>
                        {/each}
                     </div>
                  {:else}
                     <div class="stat-row empty">
                        <span class="stat-label">No settlements founded</span>
                     </div>
                  {/if}
               </div>
            </div>

            <!-- Worksites & Production Combined -->
            <div class="stat-card worksites-production-card">
               <div class="stat-header">
                  <i class="fas fa-industry"></i>
                  <h3>Worksites & Production</h3>
               </div>
               <div class="stat-content">
                  <div class="stat-row">
                     <span class="stat-label">Total Worksites</span>
                     <span class="stat-value">{Object.values($claimedWorksites).reduce((sum, count) => sum + count, 0)}</span>
                  </div>

                  {#if Object.keys(totalProduction).length > 0 || Object.values($claimedWorksites).reduce((sum, count) => sum + count, 0) > 0}
                     <div class="worksite-production-grid">
                        {#if $claimedWorksites.farmlands}
                           <div class="worksite-row">
                              <span class="worksite-name">
                                 <i class="fas {getResourceIcon('food')}" style="color: {getResourceColor('food')}"></i>
                                 Farmlands
                              </span>
                              <span class="worksite-count">{$claimedWorksites.farmlands}</span>
                              <span class="production-value">
                                 {totalProduction.food || 0} <i class="fas {getResourceIcon('food')}" style="color: {getResourceColor('food')}"></i>
                              </span>
                           </div>
                        {/if}
                        {#if $claimedWorksites.lumberCamps}
                           <div class="worksite-row">
                              <span class="worksite-name">
                                 <i class="fas {getResourceIcon('lumber')}" style="color: {getResourceColor('lumber')}"></i>
                                 Lumber Camps
                              </span>
                              <span class="worksite-count">{$claimedWorksites.lumberCamps}</span>
                              <span class="production-value">
                                 {totalProduction.lumber || 0} <i class="fas {getResourceIcon('lumber')}" style="color: {getResourceColor('lumber')}"></i>
                              </span>
                           </div>
                        {/if}
                        {#if $claimedWorksites.quarries}
                           <div class="worksite-row">
                              <span class="worksite-name">
                                 <i class="fas {getResourceIcon('stone')}" style="color: {getResourceColor('stone')}"></i>
                                 Quarries
                              </span>
                              <span class="worksite-count">{$claimedWorksites.quarries}</span>
                              <span class="production-value">
                                 {totalProduction.stone || 0} <i class="fas {getResourceIcon('stone')}" style="color: {getResourceColor('stone')}"></i>
                              </span>
                           </div>
                        {/if}
                        {#if $claimedWorksites.mines}
                           <div class="worksite-row">
                              <span class="worksite-name">
                                 <i class="fas {getResourceIcon('ore')}" style="color: {getResourceColor('ore')}"></i>
                                 Mines
                              </span>
                              <span class="worksite-count">{$claimedWorksites.mines}</span>
                              <span class="production-value">
                                 {totalProduction.ore || 0} <i class="fas {getResourceIcon('ore')}" style="color: {getResourceColor('ore')}"></i>
                              </span>
                           </div>
                        {/if}
                        {#if totalProduction.gold}
                           <div class="worksite-row">
                              <span class="worksite-name">
                                 <i class="fas {getResourceIcon('gold')}" style="color: {getResourceColor('gold')}"></i>
                                 Gold Bonus
                              </span>
                              <span class="worksite-count">-</span>
                              <span class="production-value">
                                 {totalProduction.gold} <i class="fas {getResourceIcon('gold')}" style="color: {getResourceColor('gold')}"></i>
                              </span>
                           </div>
                        {/if}
                     </div>
                  {:else}
                     <div class="stat-row empty">
                        <span class="stat-label">No worksites or production yet</span>
                     </div>
                  {/if}
               </div>
            </div>
         </div>
      </div>
   {/if}

   <!-- Territory Table -->
   {#if viewMode !== 'overview'}
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
   {/if}
</div>

<style lang="scss">
   .territory-tab {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      height: 100%;
   }
   
   .territory-filters {
      padding: var(--space-12);
      background: var(--overlay-lower);
      border-radius: var(--radius-lg);
      display: flex;
      justify-content: center;
   }

   .view-mode-group {
      
      .radio-group {
         display: flex;
         gap: var(--space-8);
         padding: var(--space-4);
         background: var(--overlay);
         border-radius: var(--radius-xl);
         border: 1px solid var(--border-default);
      }
      
      .radio-option {
         display: flex;
         align-items: center;
         padding: var(--space-8) var(--space-12);
         border-radius: var(--radius-lg);
         cursor: pointer;
         transition: all 0.2s;
         background: transparent;
         border: 2px solid transparent;
         user-select: none;
         
         &:hover {
            background: var(--hover-low);
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
         gap: var(--space-4);
         color: var(--text-secondary);
         transition: color 0.2s;
      }
      
      .radio-label {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-medium);
         text-transform: uppercase;
         letter-spacing: 0.05rem;
      }
      
      .radio-icon-count {
         display: flex;
         align-items: center;
         gap: var(--space-6);
         font-size: var(--font-sm);
         font-weight: var(--font-weight-medium);
         
         i {
            font-size: var(--font-md);
         }
      }
   }
   
   .territory-table-container {
      flex: 1;
      overflow-y: auto;
      background: var(--overlay-lower);
      border-radius: var(--radius-lg);
      padding: var(--space-8);
   }
   
   .territory-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      
      thead {
         position: sticky;
         top: 0;
         background: var(--overlay);
         z-index: 10;
         
         th {
            padding: var(--space-12);
            text-align: left;
            color: var(--text-primary);
            font-weight: var(--font-weight-semibold);
            border-bottom: 2px solid var(--color-primary);
            
            &.sortable {
               cursor: pointer;
               user-select: none;
               
               &:hover {
                  background: var(--hover-low);
               }
               
               span {
                  margin-right: var(--space-8);
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
               background: var(--overlay-lower);
            }
         }
         
         td {
            padding: var(--space-6) var(--space-12);
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-faint);
            
            &.hex-id {
               font-weight: var(--font-weight-semibold);
               color: var(--text-primary);
               
               i {
                  margin-right: var(--space-8);
                  color: var(--color-primary);
               }
            }
            
            .terrain-badge {
               display: inline-block;
               padding: var(--space-4) var(--space-8);
               border-radius: var(--radius-md);
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
               gap: var(--space-8);
               padding: var(--space-4) var(--space-8);
               border-radius: var(--radius-md);
               font-size: var(--font-sm);
            }
            
            .commodity-icons {
               display: flex;
               gap: var(--space-4);
               flex-wrap: wrap;
               
               .commodity-icon {
                  font-size: var(--font-sm);
                  opacity: 0.9;
               }
            }
            
            .production-list {
               display: flex;
               flex-direction: column;
               gap: var(--space-4);
               
               .production-item {
                  display: inline-flex;
                  align-items: center;
                  gap: var(--space-4);
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
               gap: var(--space-4);
               
               .feature-badge {
                  display: inline-flex;
                  align-items: center;
                  gap: var(--space-4);
                  padding: var(--space-2) var(--space-6);
                  border-radius: var(--radius-md);
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
                  margin-right: var(--space-4);
               }
            }
            
            .has-road {
               color: var(--color-success);
               font-size: var(--font-base);
               
               i {
                  font-size: var(--font-md);
               }
            }
            
            .settlement-info {
               display: flex;
               flex-direction: column;
               gap: var(--space-4);
            }
            
            .settlement-badge {
               display: inline-flex;
               align-items: center;
               gap: var(--space-6);
               padding: var(--space-6) var(--space-10);
               border-radius: var(--radius-lg);
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
                  background: var(--surface-special);
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
      padding: var(--space-24);
      text-align: center;
      
      i {
         font-size: var(--font-3xl);
         color: var(--text-disabled);
         margin-bottom: var(--space-16);
      }
      
      p {
         margin: var(--space-8) 0;
         color: var(--text-secondary);
         
         &.hint {
            font-size: var(--font-sm);
            font-style: italic;
            color: var(--text-muted);
         }
      }
   }

   // Kingdom Overview Styles
   .kingdom-overview {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      padding: var(--space-16);
   }

   .bottom-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-16);
   }

   .stat-card {
      background: var(--overlay-lower);
      border-radius: var(--radius-lg);
      padding: var(--space-16);
      border: 1px solid var(--border-default);
      display: flex;
      flex-direction: column;
      gap: var(--space-12);

      .stat-header {
         display: flex;
         align-items: center;
         gap: var(--space-8);
         padding-bottom: var(--space-12);
         border-bottom: 2px solid var(--color-primary);

         i {
            font-size: var(--font-xl);
            color: var(--color-primary);
         }

         h3 {
            margin: 0;
            font-size: var(--font-lg);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
         }
      }

      .stat-content {
         display: flex;
         flex-direction: column;
         gap: var(--space-8);
      }

      .stat-row {
         display: flex;
         justify-content: space-between;
         align-items: center;
         padding: var(--space-6) 0;

         &.tier-row {
            padding-left: var(--space-16);
            font-size: var(--font-sm);
         }

         &.production-row {
            .stat-label {
               display: flex;
               align-items: center;
               gap: var(--space-8);

               i {
                  font-size: var(--font-md);
               }
            }
         }

         &.empty {
            justify-content: center;
            color: var(--text-muted);
            font-style: italic;
            font-size: var(--font-sm);
         }

         .stat-label {
            color: var(--text-secondary);
            font-size: var(--font-md);
         }

         .stat-value {
            color: var(--text-primary);
            font-size: var(--font-lg);
            font-weight: var(--font-weight-semibold);
         }
      }
   }

   // Territory card with pie chart - three column layout
   .territory-card {
      .territory-content {
         display: grid;
         grid-template-columns: auto 1fr auto;
         gap: var(--space-24);
         align-items: flex-start;

         .territory-stats {
            min-width: 200px;
         }

         .terrain-chart-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--space-12);

            .chart-wrapper {
               width: 250px;
               height: 250px;
               position: relative;
               flex-shrink: 0;

               .terrain-pie-chart {
                  width: 100% !important;
                  height: 100% !important;
               }
            }

            .chart-title {
               margin: 0;
               font-size: var(--font-md);
               font-weight: var(--font-weight-semibold);
               color: var(--text-primary);
               text-align: center;
            }
         }

         .terrain-legend-column {
            display: flex;
            flex-direction: column;
            gap: var(--space-8);
            min-width: 180px;
            padding-top: var(--space-8);

            .terrain-legend-item {
               display: flex;
               align-items: center;
               gap: var(--space-8);
               font-size: var(--font-sm);

               .terrain-color-box {
                  width: 16px;
                  height: 16px;
                  border-radius: var(--radius-sm);
                  flex-shrink: 0;
                  border: 1px solid var(--border-subtle);
               }

               .terrain-legend-label {
                  flex: 1;
                  color: var(--text-secondary);
               }

               .terrain-legend-count {
                  color: var(--text-primary);
                  font-weight: var(--font-weight-medium);
               }
            }
         }
      }
   }

   // Settlements card with single-row items
   .settlements-card {
      .settlements-list {
         margin-top: var(--space-12);
         display: flex;
         flex-direction: column;
         gap: var(--space-8);

         .settlement-item {
            display: flex;
            align-items: center;
            gap: var(--space-10);
            padding: var(--space-8) var(--space-10);
            background: var(--overlay);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-subtle);
            font-size: var(--font-sm);

            .capital-icon {
               color: #ffd700;
               font-size: var(--font-sm);
               flex-shrink: 0;
            }

            .settlement-name-link {
               font-weight: var(--font-weight-semibold);
               color: var(--color-text-dark-primary, #b5b3a4);
               font-size: var(--font-md);
               cursor: pointer;
               transition: all 0.2s;
               flex: 1;
               text-decoration: underline;
               text-decoration-style: dotted;
               text-underline-offset: 0.1875rem;

               &:hover {
                  background: var(--hover);
                  text-decoration-style: solid;
               }

               &:focus {
                  outline: 2px solid var(--color-primary);
                  outline-offset: 2px;
                  border-radius: 2px;
               }
            }

            .settlement-tier {
               color: var(--text-secondary);
               font-weight: var(--font-weight-medium);
               flex-shrink: 0;
            }

            .settlement-level {
               color: var(--text-secondary);
               flex-shrink: 0;
            }

            .settlement-structures {
               display: flex;
               align-items: center;
               gap: var(--space-4);
               color: var(--text-secondary);
               flex-shrink: 0;

               i {
                  font-size: var(--font-xs);
               }
            }
         }
      }
   }

   // Worksites & Production combined card
   .worksites-production-card {
      .worksite-production-grid {
         margin-top: var(--space-12);
         display: flex;
         flex-direction: column;
         gap: var(--space-8);

         .worksite-row {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: var(--space-12);
            align-items: center;
            padding: var(--space-8);
            background: var(--overlay);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-subtle);

            .worksite-name {
               display: flex;
               align-items: center;
               gap: var(--space-8);
               color: var(--text-secondary);
               font-size: var(--font-sm);

               i {
                  font-size: var(--font-sm);
               }
            }

            .worksite-count {
               color: var(--text-primary);
               font-weight: var(--font-weight-semibold);
               font-size: var(--font-md);
               text-align: right;
               min-width: 2rem;
            }

            .production-value {
               display: flex;
               align-items: center;
               gap: var(--space-6);
               color: var(--color-success);
               font-weight: var(--font-weight-semibold);
               font-size: var(--font-md);
               min-width: 4rem;
               justify-content: flex-end;

               i {
                  font-size: var(--font-sm);
               }
            }
         }
      }
   }
</style>
