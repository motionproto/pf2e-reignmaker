<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { getTierIcon, getTierColor, getStructureCount, getMaxStructures, getLocationString } from './settlements.utils';
   
   export let settlements: Settlement[] = [];
   export let selectedSettlement: Settlement | null = null;
   export let onSelectSettlement: (settlement: Settlement) => void;
   
   let searchTerm = '';
   let filterTier = 'all';
   
   // Get unique tiers from settlements
   $: settlementTiers = [...new Set(settlements.map(s => s.tier))].sort();
   
   // Apply filters
   $: filteredSettlements = (() => {
      let filtered = [...settlements];
      
      // Search filter
      if (searchTerm) {
         const term = searchTerm.toLowerCase();
         filtered = filtered.filter(s => 
            s.name.toLowerCase().includes(term) ||
            `${s.location.x},${s.location.y}`.includes(term)
         );
      }
      
      // Tier filter
      if (filterTier !== 'all') {
         filtered = filtered.filter(s => s.tier === filterTier);
      }
      
      return filtered;
   })();
</script>

<div class="settlements-list-panel">
   <div class="panel-header">
      <div class="filters">
         <input 
            type="text" 
            placeholder="Search settlements..." 
            bind:value={searchTerm}
            class="search-input"
         />
         <select bind:value={filterTier} class="tier-filter">
            <option value="all">All Tiers</option>
            {#each settlementTiers as tier}
               <option value={tier}>{tier}</option>
            {/each}
         </select>
      </div>
   </div>
   
   <div class="settlements-list">
      {#if filteredSettlements.length === 0}
         <div class="empty-state">
            {#if searchTerm || filterTier !== 'all'}
               <i class="fas fa-search"></i>
               <p>No settlements match your filters.</p>
            {:else}
               <i class="fas fa-city"></i>
               <p>No settlements established yet.</p>
               <p class="hint">Use the Establish Settlement action to found your first settlement.</p>
            {/if}
         </div>
      {:else}
         {#each filteredSettlements as settlement}
            <div 
               class="settlement-item {selectedSettlement?.id === settlement.id ? 'selected' : ''}"
               on:click={() => onSelectSettlement(settlement)}
            >
               <div class="settlement-content">
                  <div class="settlement-left">
                     <i class="fas {getTierIcon(settlement.tier)} tier-icon {getTierColor(settlement.tier)}"></i>
                     <div class="settlement-info">
                        <div class="settlement-name">{settlement.name}</div>
                        {#if settlement.connectedByRoads}
                           <i class="fas fa-road road-icon" title="Connected by roads"></i>
                        {/if}
                     </div>
                  </div>
                  <div class="settlement-right">
                     {#if settlement.wasFedLastTurn === false}
                        <i class="fas fa-exclamation-triangle status-unfed" title="Not fed - No gold"></i>
                     {/if}
                     <span class="tier-badge {getTierColor(settlement.tier)}">{settlement.tier}</span>
                     <span class="level-number">{settlement.level}</span>
                  </div>
               </div>
            </div>
         {/each}
      {/if}
   </div>
</div>

<style lang="scss">
   @use './settlements-shared.scss';
   
   .settlements-list-panel {
      flex: 0 0 400px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0.375rem;
      display: flex;
      flex-direction: column;
      overflow: hidden;
   }
   
   .panel-header {
      padding: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      
      .filters {
         display: flex;
         gap: 0.5rem;
         width: 100%;
         
         .search-input,
         .tier-filter {
            flex: 1;
            min-width: 0;
            padding: 0.5rem;
            background: var(--bg-elevated);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            color: var(--text-primary);
            font-size: var(--font-md);
            line-height: 1.5;
            height: auto;
            
            &:focus {
               outline: none;
               border-color: var(--color-primary);
            }
         }
         
         .search-input::placeholder {
            color: var(--text-tertiary);
         }
         
         .tier-filter {
            padding: 0.5rem 1.5rem 0.5rem 0.75rem;
         }
      }
   }
   
   .settlements-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
   }
   
   .settlement-item {
      position: relative;
      background: var(--bg-color-gray-900);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: var(--transition-base);
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      &:hover {
         border-color: var(--border-medium);
         background: var(--bg-overlay);
      }
      
      &.selected {
         border-color: var(--color-primary);
         background: var(--color-gray-850);
      }
      
      .settlement-content {
         display: flex;
         align-items: center;
         justify-content: space-between;
         gap: 1rem;
         width: 100%;
      }
      
      .settlement-left {
         display: flex;
         align-items: center;
         gap: 0.75rem;
         flex: 1;
         min-width: 0;
         
         .tier-icon {
            font-size: 1.5rem;
            color: var(--text-secondary);
            flex-shrink: 0;
         }
         
         .settlement-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
            min-width: 0;
            
            .settlement-name {
               font-weight: var(--font-weight-semibold);
               color: var(--text-accent);
               font-size: var(--font-xl);
               white-space: nowrap;
               overflow: hidden;
               text-overflow: ellipsis;
            }
            
            .road-icon {
               color: var(--color-success);
               font-size: var(--font-md);
               flex-shrink: 0;
            }
         }
      }
      
      .settlement-right {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         flex-shrink: 0;
         
         .status-fed,
         .status-unfed {
            font-size: var(--font-md);
         }
         
         .status-fed {
            color: var(--color-success);
         }
         
         .status-unfed {
            color: var(--color-warning);
         }
         
         .level-number {
            font-size: var(--font-2xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-secondary);
            line-height: 1;
         }
         
         .tier-badge {
            background: rgba(128, 128, 128, 0.2);
            color: var(--text-secondary);
         }
      }
   }
</style>
