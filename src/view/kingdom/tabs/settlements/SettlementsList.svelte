<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { createSettlement, SettlementTier } from '../../../../models/Settlement';
   import { kingdomData, updateKingdom, currentFaction, availableFactions } from '../../../../stores/KingdomStore';
   import { getTierIcon, getTierColor, getStructureCount, getMaxStructures, getLocationString } from './settlements.utils';
   import { getSettlementStatusIcon } from '../../utils/presentation';
   import { PLAYER_KINGDOM } from '../../../../types/ownership';
   import { get } from 'svelte/store';
   
   export let settlements: Settlement[] = [];
   export let selectedSettlement: Settlement | null = null;
   export let onSelectSettlement: (settlement: Settlement) => void;
   
   let searchTerm = '';
   let filterTier = 'all';
   
   // GM-only: Show all settlements (including unclaimed)
   let showAllSettlements = false;
   
   // Check if current user is GM
   $: isGM = (game as any)?.user?.isGM || false;
   
   // Edit state for unlinked features
   let editingHexId: string | null = null;
   let editForm = {
      name: '',
      tier: SettlementTier.VILLAGE,
      claimedBy: PLAYER_KINGDOM
   };
   
   // Get unique tiers from settlements
   $: settlementTiers = [...new Set(settlements.map(s => s.tier))].sort();
   
   // Detect unassigned hexes (hexes with unlinked settlement features)
   $: unassignedHexes = ($kingdomData.hexes || [])
      .filter((h: any) => {
         // If GM is showing all settlements, include unclaimed territory too
         if (showAllSettlements && isGM) {
            // Any hex with settlement features that are NOT linked
            const features = h.features || [];
            return features.some((f: any) => f.type === 'settlement' && !f.linked);
         }
         
         // Must be in claimed territory by current faction
         if (h.claimedBy !== $currentFaction) return false;
         
         // Must have unlinked settlement features
         // Use !f.linked to catch both undefined and false
         const features = h.features || [];
         const hasUnlinkedSettlement = features.some((f: any) => 
            f.type === 'settlement' && !f.linked
         );
         
         return hasUnlinkedSettlement;
      })
      .map((h: any) => {
         // Use stored row/col properties directly (already numbers)
         // Note: hexes use {row, col} but settlements use {x, y}
         // where x=row and y=col
         const row = h.row ?? 0;
         const col = h.col ?? 0;
         
         const features = h.features || [];
         // Use !f.linked to catch both undefined and false
         const settlementFeature = features.find((f: any) => 
            f.type === 'settlement' && !f.linked
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
            x: row,  // For settlement coordinate system
            y: col,  // For settlement coordinate system
            tier,
            name: settlementFeature?.name  // Use feature name (may be undefined)
         };
      })
      // CRITICAL: Filter out hexes that actually have settlements assigned
      // This catches stale data where linked flag isn't set but settlement exists
      .filter(hex => {
         // Check if ANY settlement has this location (cross-check with settlement data)
         const hasAssignedSettlement = $kingdomData.settlements.some(s => 
            s.location.x === hex.x && s.location.y === hex.y
         );
         // Only include if NO settlement is assigned to this location
         return !hasAssignedSettlement;
      });
   
   // Create new settlement handler (manual creation)
   async function handleCreateSettlement() {
      try {

         // Create a new settlement at (0,0) - unlinked, owned by current faction
         const newSettlement = createSettlement(
            'New Settlement',
            { x: 0, y: 0 },
            SettlementTier.VILLAGE,
            undefined, // kingmakerLocation
            get(currentFaction) // Use current faction
         );

         // Add to kingdom
         await updateKingdom(k => {
            if (!k.settlements) k.settlements = [];
            k.settlements.push(newSettlement);
         });

         // Calculate derived properties (goldIncome, capacities, etc.)
         const { settlementService } = await import('../../../../services/settlements');
         await settlementService.updateSettlementDerivedProperties(newSettlement.id);

         // Select the new settlement
         onSelectSettlement(newSettlement);

      } catch (error) {
         console.error('❌ Error creating settlement:', error);
         ui.notifications?.error('Failed to create settlement. Check console for details.');
      }
   }
   
   // Create settlement for unassigned hex
   async function handleCreateSettlementAtHex(hex: { x: number; y: number; tier: SettlementTier; name?: string }) {
      // Determine minimum level based on tier
      let initialLevel = 1;
      switch (hex.tier) {
         case SettlementTier.VILLAGE:
            initialLevel = 1;
            break;
         case SettlementTier.TOWN:
            initialLevel = 2;
            break;
         case SettlementTier.CITY:
            initialLevel = 5;
            break;
         case SettlementTier.METROPOLIS:
            initialLevel = 8;
            break;
      }
      
      // Create a settlement at the hex location, owned by current faction
      const newSettlement = createSettlement(
         hex.name || 'New Settlement',  // Use feature name if available
         { x: hex.x, y: hex.y },
         hex.tier,
         undefined, // kingmakerLocation
         get(currentFaction) // Use current faction
      );
      
      // Set the appropriate level for the tier
      newSettlement.level = initialLevel;
      
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
      
      // Calculate derived properties (goldIncome, capacities, etc.)
      const { settlementService } = await import('../../../../services/settlements');
      await settlementService.updateSettlementDerivedProperties(newSettlement.id);
      
      // Select the new settlement
      onSelectSettlement(newSettlement);
   }
   
   // Edit feature handlers (GM only)
   function startEditingFeature(hexId: string) {
      const hex = $kingdomData.hexes.find((h: any) => h.id === hexId) as any;
      if (!hex) return;
      
      const feature = hex.features?.find((f: any) => f.type === 'settlement' && !f.linked);
      if (!feature) return;
      
      editingHexId = hexId;
      editForm.name = feature.name || '';
      editForm.tier = feature.tier || SettlementTier.VILLAGE;
      editForm.claimedBy = hex.claimedBy || PLAYER_KINGDOM;
   }
   
   function cancelEditingFeature() {
      editingHexId = null;
      editForm = {
         name: '',
         tier: SettlementTier.VILLAGE,
         claimedBy: PLAYER_KINGDOM
      };
   }
   
   async function saveFeatureEdit() {
      if (!editingHexId) return;
      
      await updateKingdom(k => {
         const hex = k.hexes.find((h: any) => h.id === editingHexId) as any;
         if (!hex) return;
         
         // Update hex ownership
         hex.claimedBy = editForm.claimedBy;
         
         // Update settlement feature
         const feature = hex.features?.find((f: any) => f.type === 'settlement' && !f.linked);
         if (feature) {
            feature.name = editForm.name;
            feature.tier = editForm.tier;
         }
      });

      cancelEditingFeature();
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
      
      <!-- GM-only: Show all settlements checkbox -->
      {#if isGM}
         <div class="gm-filter">
            <label class="checkbox-label">
               <input 
                  type="checkbox" 
                  bind:checked={showAllSettlements}
               />
               <span>Show All Settlement Features</span>
            </label>
         </div>
      {/if}
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
                     </div>
                  </div>
                  <div class="settlement-right">
                     {#if settlement.location.x === 0 && settlement.location.y === 0}
                        <i class="{getSettlementStatusIcon('hex')} unmapped-icon" title="Not placed on map"></i>
                     {/if}
                     {#if settlement.wasFedLastTurn === false}
                        <i class="fas {getSettlementStatusIcon('unfed')} status-unfed" title="Not fed - No gold"></i>
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
                     {#if editingHexId === hex.id}
                        <!-- Edit Form -->
                        <div class="edit-form">
                           <div class="edit-header">
                              <span>Edit Settlement Feature</span>
                              <button 
                                 class="btn-close"
                                 on:click={cancelEditingFeature}
                                 title="Cancel"
                              >
                                 <i class="fas fa-times"></i>
                              </button>
                           </div>
                           
                           <div class="edit-fields">
                              <div class="edit-field">
                                 <label>Name:</label>
                                 <input 
                                    type="text" 
                                    bind:value={editForm.name}
                                    placeholder="Settlement name"
                                 />
                              </div>
                              
                              <div class="edit-field">
                                 <label>Tier:</label>
                                 <select bind:value={editForm.tier}>
                                    <option value={SettlementTier.VILLAGE}>Village</option>
                                    <option value={SettlementTier.TOWN}>Town</option>
                                    <option value={SettlementTier.CITY}>City</option>
                                    <option value={SettlementTier.METROPOLIS}>Metropolis</option>
                                 </select>
                              </div>
                              
                              <div class="edit-field">
                                 <label>Claimed By:</label>
                                 <select bind:value={editForm.claimedBy}>
                                    <option value={null}>Unclaimed</option>
                                    {#each $availableFactions.all as factionId}
                                       <option value={factionId}>{factionId === PLAYER_KINGDOM ? 'Player Kingdom' : factionId}</option>
                                    {/each}
                                 </select>
                              </div>
                           </div>
                           
                           <div class="edit-actions">
                              <button 
                                 class="btn-cancel"
                                 on:click={cancelEditingFeature}
                              >
                                 Cancel
                              </button>
                              <button 
                                 class="btn-save"
                                 on:click={saveFeatureEdit}
                              >
                                 <i class="fas fa-check"></i>
                                 Save
                              </button>
                           </div>
                        </div>
                     {:else}
                        <!-- Normal View -->
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
                           <div class="unassigned-actions">
                              {#if isGM}
                                 <button 
                                    class="btn-edit-feature"
                                    on:click|stopPropagation={() => startEditingFeature(hex.id)}
                                    title="Edit feature properties"
                                 >
                                    <i class="fas fa-edit"></i>
                                    Edit
                                 </button>
                              {/if}
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
                     {/if}
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
      
      .gm-filter {
         margin-top: 0.5rem;
         padding: 0.5rem 0.75rem;
         background: rgba(128, 0, 128, 0.15);
         border: 1px solid rgba(128, 0, 128, 0.3);
         border-radius: var(--radius-lg);
         
         .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            user-select: none;
            
            input[type="checkbox"] {
               width: 1rem;
               height: 1rem;
               cursor: pointer;
               accent-color: var(--color-primary);
            }
            
            span {
               color: var(--text-primary);
               font-size: var(--font-sm);
               font-weight: var(--font-weight-medium);
            }
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
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: center;
      outline: 2px solid transparent;
      
      &:hover {
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      &.selected {
         outline: 2px solid var(--color-accent);
         background: linear-gradient(135deg,
            rgba(20, 20, 23, 0.7),
            rgba(15, 15, 17, 0.5));
         box-shadow: 0 4px 12px rgba(var(--color-primary), 0.1);
         
         &:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(var(--color-primary), 0.15);
         }
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
         }
      }
      
      .settlement-right {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         flex-shrink: 0;
         
         .tier-badge {
            background: rgba(128, 128, 128, 0.2);
            color: var(--text-secondary);
         }
         
         .road-icon {
            color: var(--color-success);
            font-size: var(--font-md);
            flex-shrink: 0;
         }
         
         .unmapped-icon {
            color: var(--color-warning);
            font-size: var(--font-md);
            flex-shrink: 0;
         }
         
         .status-unfed {
            color: #dc3545; // Red color for unfed
            font-size: var(--font-md);
            flex-shrink: 0;
         }
         
         .level-number {
            font-size: var(--font-2xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-secondary);
            line-height: 1;
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
      
      .unassigned-actions {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         flex-shrink: 0;
      }
      
      .btn-edit-feature,
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
      
      .btn-edit-feature {
         background: rgba(100, 100, 255, 0.15);
         border-color: rgba(100, 100, 255, 0.4);
         
         &:hover {
            background: rgba(100, 100, 255, 0.25);
            border-color: rgba(100, 100, 255, 0.6);
         }
      }
      
      // Edit form styles
      .edit-form {
         display: flex;
         flex-direction: column;
         gap: 1rem;
         
         .edit-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            
            span {
               font-weight: var(--font-weight-semibold);
               color: var(--text-primary);
               font-size: var(--font-md);
            }
            
            .btn-close {
               padding: 0.25rem 0.5rem;
               background: transparent;
               border: none;
               color: var(--text-secondary);
               cursor: pointer;
               border-radius: var(--radius-md);
               transition: var(--transition-base);
               
               &:hover {
                  background: rgba(255, 255, 255, 0.1);
                  color: var(--text-primary);
               }
            }
         }
         
         .edit-fields {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            
            .edit-field {
               display: flex;
               flex-direction: column;
               gap: 0.25rem;
               
               label {
                  font-size: var(--font-sm);
                  color: var(--text-secondary);
                  font-weight: var(--font-weight-medium);
               }
               
               input,
               select {
                  padding: 0.5rem;
                  background: var(--bg-elevated);
                  border: 1px solid var(--border-default);
                  border-radius: var(--radius-md);
                  color: var(--text-primary);
                  font-size: var(--font-sm);
                  
                  &:focus {
                     outline: none;
                     border-color: var(--color-primary);
                  }
               }
            }
         }
         
         .edit-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            
            button {
               padding: 0.5rem 1rem;
               border-radius: var(--radius-md);
               font-size: var(--font-sm);
               font-weight: var(--font-weight-semibold);
               cursor: pointer;
               transition: var(--transition-base);
               display: flex;
               align-items: center;
               gap: 0.5rem;
            }
            
            .btn-cancel {
               background: transparent;
               border: 1px solid var(--border-default);
               color: var(--text-secondary);
               
               &:hover {
                  background: var(--bg-overlay);
                  color: var(--text-primary);
               }
            }
            
            .btn-save {
               background: var(--color-success);
               border: 1px solid var(--color-success);
               color: white;
               
               &:hover {
                  background: var(--color-success-dark, #1e7e34);
               }
            }
         }
      }
   }
</style>
