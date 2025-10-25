<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { createSettlement, SettlementTier } from '../../../../models/Settlement';
   import { kingdomData, updateKingdom } from '../../../../stores/KingdomStore';
   import { getTierIcon, getTierColor, getStructureCount, getMaxStructures, getLocationString } from './settlements.utils';
   
   export let settlements: Settlement[] = [];
   export let selectedSettlement: Settlement | null = null;
   export let onSelectSettlement: (settlement: Settlement) => void;
   
   let searchTerm = '';
   let filterTier = 'all';
   
   // Get unique tiers from settlements
   $: settlementTiers = [...new Set(settlements.map(s => s.tier))].sort();
   
   // Detect unassigned hexes (hexes with unlinked settlement features)
   $: unassignedHexes = ($kingdomData.hexes || [])
      .filter((h: any) => {
         // Must be in claimed territory
         if (h.claimedBy !== 1) return false;
         
         // Must have unlinked settlement features
         const features = h.features || [];
         const hasUnlinkedSettlement = features.some((f: any) => 
            f.type === 'settlement' && f.linked === false
         );
         
         return hasUnlinkedSettlement;
      })
      .map((h: any) => {
         const [xStr, yStr] = h.id.split('.');
         const x = parseInt(xStr) || 0;
         const y = parseInt(yStr) || 0;
         
         const features = h.features || [];
         const settlementFeature = features.find((f: any) => 
            f.type === 'settlement' && f.linked === false
         );
         
         // Map feature tier to SettlementTier
         let tier = SettlementTier.VILLAGE;
         if (settlementFeature?.tier) {
            const tierStr = settlementFeature.tier;
            if (tierStr === 'Town') tier = SettlementTier.TOWN;
            else if (tierStr === 'City') tier = SettlementTier.CITY;
            else if (tierStr === 'Metropolis') tier = SettlementTier.METROPOLIS;
         }
         
         return {
            id: h.id,
            x,
            y,
            tier,
            name: settlementFeature?.name  // Use feature name (may be undefined)
         };
      });
   
   // Create new settlement handler (manual creation)
   async function handleCreateSettlement() {
      // Create a new settlement at (0,0) - unlinked
      const newSettlement = createSettlement(
         'New Settlement',
         { x: 0, y: 0 },
         SettlementTier.VILLAGE
      );
      
      // Add to kingdom
      await updateKingdom(k => {
         if (!k.settlements) k.settlements = [];
         k.settlements.push(newSettlement);
      });
      
      // Select the new settlement
      onSelectSettlement(newSettlement);
   }
   
   // Create settlement for unassigned hex
   async function handleCreateSettlementAtHex(hex: { x: number; y: number; tier: SettlementTier; name?: string }) {
      // Create a settlement at the hex location
      const newSettlement = createSettlement(
         hex.name || 'New Settlement',  // Use feature name if available
         { x: hex.x, y: hex.y },
         hex.tier
      );
      
      // Add to kingdom and link hex feature
      await updateKingdom(k => {
         if (!k.settlements) k.settlements = [];
         k.settlements.push(newSettlement);
         
         // Link the hex feature to this settlement
         const hexId = `${hex.x}.${String(hex.y).padStart(2, '0')}`;
         const hexData = k.hexes.find(h => h.id === hexId) as any;
         if (hexData?.features) {
            const feature = hexData.features.find((f: any) => f.type === 'settlement' && !f.linked);
            if (feature) {
               feature.linked = true;
               feature.settlementId = newSettlement.id;
            }
         }
      });
      
      // Select the new settlement
      onSelectSettlement(newSettlement);
   }
   
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
      {#if filteredSettlements.length === 0 && unassignedHexes.length === 0}
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
         
         {#if unassignedHexes.length > 0}
            <div class="unassigned-section">
               <div class="section-divider">
                  <span>Unassigned Locations</span>
               </div>
               
               {#each unassignedHexes as hex}
                  <div class="unassigned-item">
                     <div class="unassigned-content">
                        <div class="unassigned-left">
                           <i class="fas fa-exclamation-triangle unassigned-icon"></i>
                           <div class="unassigned-info">
                              <div class="unassigned-name">
                              {#if hex.name}
                                 <strong>{hex.name}</strong> at {hex.x}:{hex.y.toString().padStart(2, '0')}
                              {:else}
                                 Settlement at <strong>{hex.x}:{hex.y.toString().padStart(2, '0')}</strong>
                              {/if}
                           </div>
                           </div>
                        </div>
                        <button 
                           class="btn-create-at-hex"
                           on:click|stopPropagation={() => handleCreateSettlementAtHex(hex)}
                           title="Create settlement at this location"
                        >
                           <i class="fas fa-plus"></i>
                           Create
                        </button>
                     </div>
                  </div>
               {/each}
            </div>
         {/if}
      {/if}
   </div>
   
   <div class="panel-footer">
      <button 
         class="btn-create-settlement" 
         on:click={handleCreateSettlement}
         title="Create a new settlement manually"
      >
         <i class="fas fa-plus"></i>
         Create Settlement
      </button>
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
   
   .panel-footer {
      padding: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      
      .btn-create-settlement {
         width: 100%;
         padding: 0.5rem 1rem;
         background: transparent;
         border: 1px solid var(--border-default);
         border-radius: var(--radius-lg);
         color: var(--text-secondary);
         font-size: var(--font-md);
         cursor: pointer;
         transition: var(--transition-base);
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 0.5rem;
         
         &:hover {
            background: var(--bg-overlay);
            border-color: var(--border-medium);
            color: var(--text-primary);
         }
         
         &:active {
            transform: scale(0.98);
         }
         
         i {
            font-size: var(--font-sm);
         }
      }
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
   
   .unassigned-section {
      margin-top: 1rem;
      padding-top: 0.5rem;
   }
   
   .section-divider {
      text-align: center;
      margin-bottom: 0.75rem;
      
      span {
         display: inline-block;
         padding: 0.25rem 0.75rem;
         background: rgba(128, 128, 128, 0.15);
         border: 1px solid rgba(128, 128, 128, 0.3);
         border-radius: var(--radius-md);
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         color: var(--text-secondary);
         text-transform: uppercase;
         letter-spacing: 0.05em;
      }
   }
   
   .unassigned-item {
      background: rgba(128, 128, 128, 0.08);
      border: 1px dashed rgba(128, 128, 128, 0.3);
      border-radius: var(--radius-lg);
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      transition: var(--transition-base);
      
      &:hover {
         background: rgba(128, 128, 128, 0.12);
         border-color: rgba(128, 128, 128, 0.5);
      }
      
      .unassigned-content {
         display: flex;
         align-items: center;
         justify-content: space-between;
         gap: 1rem;
      }
      
      .unassigned-left {
         display: flex;
         align-items: center;
         gap: 0.75rem;
         flex: 1;
         min-width: 0;
         
         .unassigned-icon {
            font-size: 1.5rem;
            color: var(--text-secondary);
            flex-shrink: 0;
         }
         
         .unassigned-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            flex: 1;
            min-width: 0;
            
            .unassigned-name {
               font-weight: var(--font-weight-normal);
               color: var(--text-secondary);
               font-size: var(--font-lg);
            }
            
            .tier-badge {
               align-self: flex-start;
            }
         }
      }
      
      .btn-create-at-hex {
         padding: 0.5rem 1rem;
         background: rgba(128, 128, 128, 0.2);
         border: 1px solid rgba(128, 128, 128, 0.4);
         border-radius: var(--radius-md);
         color: var(--text-primary);
         font-size: var(--font-sm);
         font-weight: var(--font-weight-semibold);
         cursor: pointer;
         transition: var(--transition-base);
         display: flex;
         align-items: center;
         gap: 0.5rem;
         flex-shrink: 0;
         
         &:hover {
            background: rgba(128, 128, 128, 0.3);
            border-color: rgba(128, 128, 128, 0.6);
            transform: translateY(-1px);
         }
         
         &:active {
            transform: scale(0.98);
         }
         
         i {
            font-size: var(--font-xs);
         }
      }
   }
</style>
