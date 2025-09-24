<script lang="ts">
   import { kingdomState } from '../../../stores/kingdom';
   import { SettlementTierConfig } from '../../../models/Settlement';
   import type { Settlement } from '../../../models/Settlement';
   
   // Selected settlement for details view
   let selectedSettlement: Settlement | null = null;
   let searchTerm = '';
   let filterTier = 'all';
   
   // Get unique tiers from settlements
   $: settlementTiers = [...new Set($kingdomState.settlements.map(s => s.tier))].sort();
   
   // Apply filters
   $: filteredSettlements = (() => {
      let settlements = [...$kingdomState.settlements];
      
      // Search filter
      if (searchTerm) {
         const term = searchTerm.toLowerCase();
         settlements = settlements.filter(s => 
            s.name.toLowerCase().includes(term) ||
            `${s.location.x},${s.location.y}`.includes(term)
         );
      }
      
      // Tier filter
      if (filterTier !== 'all') {
         settlements = settlements.filter(s => s.tier === filterTier);
      }
      
      return settlements;
   })();
   
   // Select first settlement if none selected
   $: if (!selectedSettlement && filteredSettlements.length > 0) {
      selectedSettlement = filteredSettlements[0];
   }
   
   // Deselect if filtered out
   $: if (selectedSettlement && !filteredSettlements.find(s => s.id === selectedSettlement?.id)) {
      selectedSettlement = null;
   }
   
   // Calculate settlement statistics
   $: totalStructures = $kingdomState.settlements.reduce((acc, settlement) => 
      acc + settlement.structureIds.length, 0);
   
   $: totalArmySupport = $kingdomState.settlements.reduce((acc, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      return acc + (config?.armySupport || 0);
   }, 0);
   
   $: totalFoodConsumption = $kingdomState.settlements.reduce((acc, settlement) => {
      const config = SettlementTierConfig[settlement.tier];
      return acc + (config?.foodConsumption || 0);
   }, 0);
   
   // Helper functions
   function selectSettlement(settlement: Settlement) {
      selectedSettlement = settlement;
   }
   
   function getStructureCount(settlement: Settlement): number {
      return settlement.structureIds.length;
   }
   
   function getMaxStructures(settlement: Settlement): number {
      const config = SettlementTierConfig[settlement.tier];
      return config?.maxStructures || 0;
   }
   
   function getLocationString(settlement: Settlement): string {
      return `${settlement.location.x}, ${settlement.location.y}`;
   }
   
   function getTierIcon(tier: string): string {
      const icons: Record<string, string> = {
         'Village': 'fa-home',
         'Town': 'fa-building',
         'City': 'fa-city',
         'Metropolis': 'fa-landmark'
      };
      return icons[tier] || 'fa-building';
   }
   
   function getTierColor(tier: string): string {
      const colors: Record<string, string> = {
         'Village': 'tier-village',
         'Town': 'tier-town',
         'City': 'tier-city',
         'Metropolis': 'tier-metropolis'
      };
      return colors[tier] || '';
   }
</script>

<div class="settlements-tab">
   <div class="settlements-header">
      <h2>Settlement Management</h2>
      <div class="settlements-summary">
         <div class="summary-card">
            <i class="fas fa-city"></i>
            <div>
               <div class="summary-value">{$kingdomState.settlements.length}</div>
               <div class="summary-label">Settlements</div>
            </div>
         </div>
         
         <div class="summary-card">
            <i class="fas fa-building"></i>
            <div>
               <div class="summary-value">{totalStructures}</div>
               <div class="summary-label">Total Structures</div>
            </div>
         </div>
         
         <div class="summary-card">
            <i class="fas fa-shield-alt"></i>
            <div>
               <div class="summary-value">{totalArmySupport}</div>
               <div class="summary-label">Army Support</div>
            </div>
         </div>
         
         <div class="summary-card">
            <i class="fas fa-wheat-awn"></i>
            <div>
               <div class="summary-value">-{totalFoodConsumption}</div>
               <div class="summary-label">Food/Turn</div>
            </div>
         </div>
      </div>
   </div>
   
   <div class="settlements-container">
      <!-- Left Panel: Settlement List -->
      <div class="settlements-list-panel">
         <div class="panel-header">
            <h3>Settlements</h3>
            <div class="filters">
               <input 
                  type="text" 
                  placeholder="Search..." 
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
                     on:click={() => selectSettlement(settlement)}
                  >
                     <div class="settlement-header">
                        <i class="fas {getTierIcon(settlement.tier)} tier-icon {getTierColor(settlement.tier)}"></i>
                        <div class="settlement-info">
                           <div class="settlement-name">{settlement.name}</div>
                           <div class="settlement-meta">
                              <span class="tier-badge {getTierColor(settlement.tier)}">{settlement.tier}</span>
                              <span class="location">
                                 <i class="fas fa-map-marker-alt"></i>
                                 {getLocationString(settlement)}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div class="settlement-stats">
                        <div class="stat">
                           <span class="stat-label">Level</span>
                           <span class="stat-value">{settlement.level}</span>
                        </div>
                        <div class="stat">
                           <span class="stat-label">Structures</span>
                           <span class="stat-value">{getStructureCount(settlement)}/{getMaxStructures(settlement)}</span>
                        </div>
                        {#if settlement.connectedByRoads}
                           <div class="stat connected">
                              <i class="fas fa-road" title="Connected by roads"></i>
                           </div>
                        {/if}
                     </div>
                  </div>
               {/each}
            {/if}
         </div>
      </div>
      
      <!-- Right Panel: Settlement Details -->
      <div class="settlement-details-panel">
         {#if selectedSettlement}
            <div class="panel-header">
               <h3>{selectedSettlement.name}</h3>
               <div class="actions">
                  <button class="action-button" title="Build Structure">
                     <i class="fas fa-hammer"></i>
                     Build
                  </button>
                  <button class="action-button" title="Upgrade Settlement">
                     <i class="fas fa-arrow-up"></i>
                     Upgrade
                  </button>
               </div>
            </div>
            
            <div class="details-content">
               <!-- Basic Information -->
               <div class="detail-section">
                  <h4>Basic Information</h4>
                  <div class="detail-grid">
                     <div class="detail-item">
                        <span class="label">Tier</span>
                        <span class="value tier-badge {getTierColor(selectedSettlement.tier)}">{selectedSettlement.tier}</span>
                     </div>
                     <div class="detail-item">
                        <span class="label">Level</span>
                        <span class="value">{selectedSettlement.level}</span>
                     </div>
                     <div class="detail-item">
                        <span class="label">Location</span>
                        <span class="value">{getLocationString(selectedSettlement)}</span>
                     </div>
                     <div class="detail-item">
                        <span class="label">Roads</span>
                        <span class="value">
                           {#if selectedSettlement.connectedByRoads}
                              <i class="fas fa-check-circle connected"></i> Connected
                           {:else}
                              <i class="fas fa-times-circle disconnected"></i> Not Connected
                           {/if}
                        </span>
                     </div>
                  </div>
               </div>
               
               <!-- Consumption & Support -->
               <div class="detail-section">
                  <h4>Consumption & Support</h4>
                  <div class="detail-grid">
                     <div class="detail-item">
                        <span class="label">Food Consumption</span>
                        <span class="value">
                           <i class="fas fa-wheat-awn"></i>
                           {SettlementTierConfig[selectedSettlement.tier]?.foodConsumption || 0} per turn
                        </span>
                     </div>
                     <div class="detail-item">
                        <span class="label">Army Support</span>
                        <span class="value">
                           <i class="fas fa-shield-alt"></i>
                           {SettlementTierConfig[selectedSettlement.tier]?.armySupport || 0} armies
                        </span>
                     </div>
                     <div class="detail-item">
                        <span class="label">Stored Food</span>
                        <span class="value">
                           <i class="fas fa-warehouse"></i>
                           {selectedSettlement.storedFood}
                        </span>
                     </div>
                     <div class="detail-item">
                        <span class="label">Imprisoned Unrest</span>
                        <span class="value">
                           <i class="fas fa-lock"></i>
                           {selectedSettlement.imprisonedUnrest}
                        </span>
                     </div>
                  </div>
               </div>
               
               <!-- Structures -->
               <div class="detail-section">
                  <h4>
                     Structures 
                     <span class="structure-count">
                        ({getStructureCount(selectedSettlement)}/{getMaxStructures(selectedSettlement)})
                     </span>
                  </h4>
                  {#if selectedSettlement.structureIds.length === 0}
                     <div class="empty-structures">
                        <i class="fas fa-tools"></i>
                        <p>No structures built yet.</p>
                        <p class="hint">Build structures to improve your settlement.</p>
                     </div>
                  {:else}
                     <div class="structures-grid">
                        {#each selectedSettlement.structureIds as structureId}
                           <div class="structure-card">
                              <i class="fas fa-building"></i>
                              <span>{structureId}</span>
                           </div>
                        {/each}
                     </div>
                  {/if}
               </div>
               
               <!-- Status Information -->
               {#if selectedSettlement.wasFedLastTurn !== undefined}
                  <div class="detail-section">
                     <h4>Status</h4>
                     <div class="status-list">
                        <div class="status-item">
                           {#if selectedSettlement.wasFedLastTurn}
                              <i class="fas fa-check-circle status-good"></i>
                              <span>Fed last turn (generates gold)</span>
                           {:else}
                              <i class="fas fa-exclamation-triangle status-warning"></i>
                              <span>Not fed last turn (no gold generation)</span>
                           {/if}
                        </div>
                        {#if selectedSettlement.supportedUnits.length > 0}
                           <div class="status-item">
                              <i class="fas fa-shield-alt"></i>
                              <span>Supporting {selectedSettlement.supportedUnits.length} army unit(s)</span>
                           </div>
                        {/if}
                     </div>
                  </div>
               {/if}
            </div>
         {:else}
            <div class="empty-selection">
               <i class="fas fa-city fa-3x"></i>
               <p>Select a settlement to view details</p>
            </div>
         {/if}
      </div>
   </div>
</div>

<style lang="scss">
   .settlements-tab {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
   }
   
   .settlements-header {
      h2 {
         margin: 0 0 1rem 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .settlements-summary {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      
      .summary-card {
         display: flex;
         align-items: center;
         gap: 0.75rem;
         background: rgba(0, 0, 0, 0.2);
         padding: 0.75rem 1rem;
         border-radius: 0.375rem;
         border: 1px solid rgba(255, 255, 255, 0.1);
         
         i {
            font-size: 1.5rem;
            color: var(--color-primary, #5e0000);
         }
         
         .summary-value {
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: 0.875rem;
            color: var(--color-text-dark-secondary, #7a7971);
         }
      }
   }
   
   .settlements-container {
      display: flex;
      flex: 1;
      gap: 1rem;
      min-height: 0;
   }
   
   .settlements-list-panel,
   .settlement-details-panel {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0.375rem;
      display: flex;
      flex-direction: column;
      overflow: hidden;
   }
   
   .settlements-list-panel {
      flex: 0 0 400px;
   }
   
   .settlement-details-panel {
      flex: 1;
   }
   
   .panel-header {
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h3 {
         margin: 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      .filters {
         display: flex;
         gap: 0.5rem;
         
         .search-input,
         .tier-filter {
            padding: 0.25rem 0.5rem;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0.25rem;
            color: var(--color-text-dark-primary, #b5b3a4);
            font-size: 0.875rem;
            
            &:focus {
               outline: none;
               border-color: var(--color-primary, #5e0000);
            }
         }
      }
      
      .actions {
         display: flex;
         gap: 0.5rem;
         
         .action-button {
            padding: 0.5rem 1rem;
            background: var(--color-primary, #5e0000);
            color: white;
            border: none;
            border-radius: 0.25rem;
            cursor: pointer;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            
            &:hover {
               background: rgba(94, 0, 0, 0.8);
            }
         }
      }
   }
   
   .settlements-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
   }
   
   .settlement-item {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
         border-color: rgba(94, 0, 0, 0.5);
         background: rgba(0, 0, 0, 0.3);
      }
      
      &.selected {
         border-color: var(--color-primary, #5e0000);
         background: rgba(94, 0, 0, 0.1);
      }
      
      .settlement-header {
         display: flex;
         gap: 0.75rem;
         margin-bottom: 0.5rem;
         
         .tier-icon {
            font-size: 1.5rem;
            
            &.tier-village { color: #8b7355; }
            &.tier-town { color: #cd853f; }
            &.tier-city { color: #ffd700; }
            &.tier-metropolis { color: #ff6347; }
         }
         
         .settlement-info {
            flex: 1;
            
            .settlement-name {
               font-weight: 600;
               color: var(--color-text-dark-primary, #b5b3a4);
               margin-bottom: 0.25rem;
            }
            
            .settlement-meta {
               display: flex;
               gap: 0.5rem;
               align-items: center;
               font-size: 0.875rem;
               
               .tier-badge {
                  padding: 0.125rem 0.375rem;
                  border-radius: 0.25rem;
                  font-size: 0.75rem;
                  font-weight: 500;
                  
                  &.tier-village { 
                     background: rgba(139, 115, 85, 0.2); 
                     color: #8b7355;
                  }
                  &.tier-town { 
                     background: rgba(205, 133, 63, 0.2); 
                     color: #cd853f;
                  }
                  &.tier-city { 
                     background: rgba(255, 215, 0, 0.2); 
                     color: #ffd700;
                  }
                  &.tier-metropolis { 
                     background: rgba(255, 99, 71, 0.2); 
                     color: #ff6347;
                  }
               }
               
               .location {
                  color: var(--color-text-dark-secondary, #7a7971);
                  
                  i {
                     margin-right: 0.25rem;
                     font-size: 0.75rem;
                  }
               }
            }
         }
      }
      
      .settlement-stats {
         display: flex;
         gap: 1rem;
         padding-left: 2.25rem;
         
         .stat {
            display: flex;
            flex-direction: column;
            
            .stat-label {
               font-size: 0.75rem;
               color: var(--color-text-dark-secondary, #7a7971);
            }
            
            .stat-value {
               font-weight: 500;
               color: var(--color-text-dark-primary, #b5b3a4);
            }
            
            &.connected {
               justify-content: center;
               color: #90ee90;
            }
         }
      }
   }
   
   .details-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
   }
   
   .detail-section {
      margin-bottom: 1.5rem;
      
      h4 {
         margin: 0 0 0.75rem 0;
         color: var(--color-text-dark-primary, #b5b3a4);
         font-size: 1rem;
         display: flex;
         align-items: center;
         gap: 0.5rem;
         
         .structure-count {
            font-size: 0.875rem;
            color: var(--color-text-dark-secondary, #7a7971);
         }
      }
   }
   
   .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      
      .detail-item {
         .label {
            display: block;
            font-size: 0.875rem;
            color: var(--color-text-dark-secondary, #7a7971);
            margin-bottom: 0.25rem;
         }
         
         .value {
            color: var(--color-text-dark-primary, #b5b3a4);
            
            i {
               margin-right: 0.5rem;
               
               &.connected {
                  color: #90ee90;
               }
               
               &.disconnected {
                  color: #ff6b6b;
               }
            }
         }
      }
   }
   
   .empty-structures,
   .empty-state,
   .empty-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--color-text-dark-secondary, #7a7971);
      
      i {
         font-size: 2rem;
         margin-bottom: 1rem;
         opacity: 0.5;
      }
      
      p {
         margin: 0.5rem 0;
         
         &.hint {
            font-size: 0.875rem;
            font-style: italic;
            opacity: 0.7;
         }
      }
   }
   
   .empty-selection {
      height: 100%;
   }
   
   .structures-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.5rem;
      
      .structure-card {
         padding: 0.5rem;
         background: rgba(0, 0, 0, 0.2);
         border: 1px solid rgba(255, 255, 255, 0.1);
         border-radius: 0.25rem;
         display: flex;
         align-items: center;
         gap: 0.5rem;
         font-size: 0.875rem;
         
         i {
            color: var(--color-primary, #5e0000);
         }
      }
   }
   
   .status-list {
      .status-item {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         padding: 0.5rem 0;
         
         i {
            &.status-good {
               color: #90ee90;
            }
            
            &.status-warning {
               color: #ffa500;
            }
         }
      }
   }
</style>
