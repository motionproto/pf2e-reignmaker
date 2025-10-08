<script lang="ts">
   import { kingdomData } from '../../../stores/KingdomStore';
   import type { Army } from '../../../models/BuildProject';
   import { SettlementTierConfig } from '../../../models/Settlement';

   // Table state
   let searchTerm = '';
   let filterSupport = 'all'; // 'all', 'supported', 'unsupported'
   let currentPage = 1;
   const itemsPerPage = 25;
   
   // Inline editing state
   let editingArmyId: string | null = null;
   let editingField: 'name' | 'level' | 'settlement' | null = null;
   let editedValue: string | number = '';
   let editedSettlementId: string = '';
   let isSaving = false;
   
   // Create army state
   let isCreating = false;
   let newArmyName = '';
   let newArmyLevel = 1;
   let isCreatingArmy = false;
   
   // Get party level for validation (fail-fast)
   $: partyLevel = (() => {
      const game = (globalThis as any).game;
      
      if (!game?.actors) {
         throw new Error('Foundry VTT not initialized - cannot access actors');
      }
      
      const partyActors = Array.from(game.actors).filter((a: any) => 
         a.type === 'character' && a.hasPlayerOwner
      );
      
      if (partyActors.length === 0) {
         throw new Error('No party characters found - cannot determine party level');
      }
      
      const level = (partyActors[0] as any).level;
      
      if (typeof level !== 'number' || level < 1) {
         throw new Error(`Invalid party level: ${level}`);
      }
      
      return level;
   })();
   
   // Apply filters
   $: filteredArmies = (() => {
      let armies = [...$kingdomData.armies];
      
      // Search filter
      if (searchTerm) {
         const term = searchTerm.toLowerCase();
         armies = armies.filter(a => 
            a.name.toLowerCase().includes(term) ||
            `level ${a.level}`.includes(term)
         );
      }
      
      // Support filter
      if (filterSupport === 'supported') {
         armies = armies.filter(a => a.isSupported);
      } else if (filterSupport === 'unsupported') {
         armies = armies.filter(a => !a.isSupported);
      }
      
      return armies;
   })();
   
   // Pagination
   $: totalPages = Math.ceil(filteredArmies.length / itemsPerPage);
   $: paginatedArmies = filteredArmies.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
   );
   
   // Reset to page 1 when filters change
   $: if (searchTerm || filterSupport) {
      currentPage = 1;
   }
   
   // Calculate army statistics
   $: totalArmies = $kingdomData.armies.length;
   $: supportedArmies = $kingdomData.armies.filter(a => a.isSupported).length;
   $: unsupportedArmies = totalArmies - supportedArmies;
   
   // Helper functions
   function getSupportStatusIcon(army: Army): string {
      return army.isSupported ? 'fa-check-circle' : 'fa-exclamation-triangle';
   }
   
   function getSupportStatusColor(army: Army): string {
      return army.isSupported ? 'status-supported' : 'status-unsupported';
   }
   
   function getSupportStatusText(army: Army): string {
      if (!army.supportedBySettlementId) {
         return army.turnsUnsupported > 0 
            ? `Unsupported (${army.turnsUnsupported} turns)`
            : 'Unsupported';
      }
      
      const settlement = $kingdomData.settlements.find(
         s => s.id === army.supportedBySettlementId
      );
      
      if (!settlement) {
         return 'Unsupported (settlement lost)';
      }
      
      const capacity = SettlementTierConfig[settlement.tier].armySupport;
      const current = settlement.supportedUnits.length;
      
      return `${settlement.name} (${settlement.tier} ${current}/${capacity})`;
   }
   
   // Get settlements with available capacity (or currently supporting this army)
   function getAvailableSettlements(armyId: string) {
      return $kingdomData.settlements.filter(s => {
         const capacity = SettlementTierConfig[s.tier].armySupport;
         const current = s.supportedUnits.length;
         
         // Either has space OR is currently supporting this army
         return current < capacity || s.supportedUnits.includes(armyId);
      });
   }
   
   // Get capacity text for settlement in dropdown
   function getSettlementCapacityText(settlement: any, armyId: string): string {
      const capacity = SettlementTierConfig[settlement.tier].armySupport;
      const current = settlement.supportedUnits.filter((id: string) => id !== armyId).length;
      
      if (current >= capacity) {
         return 'Full';
      }
      return `${current + 1}/${capacity}`;
   }
   
   // Inline editing functions
   function startEdit(army: Army, field: 'name' | 'level') {
      editingArmyId = army.id;
      editingField = field;
      editedValue = army[field];
   }
   
   function startEditingSettlement(army: Army) {
      editingArmyId = army.id;
      editingField = 'settlement';
      editedSettlementId = army.supportedBySettlementId || '';
   }
   
   function cancelEdit() {
      editingArmyId = null;
      editingField = null;
      editedValue = '';
   }
   
   async function saveEdit(armyId: string) {
      if (!editedValue && editingField !== 'settlement') return;
      
      isSaving = true;
      try {
         const { armyService } = await import('../../../services/army');
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         if (editingField === 'name') {
            // Update name and sync to actor
            await updateKingdom(k => {
               const army = k.armies.find(a => a.id === armyId);
               if (army) {
                  army.name = String(editedValue).trim();
               }
            });
            await armyService.syncArmyToActor(armyId);
         } else if (editingField === 'level') {
            // Update level
            await armyService.updateArmyLevel(armyId, Number(editedValue));
         } else if (editingField === 'settlement') {
            // Update settlement assignment
            await armyService.assignArmyToSettlement(
               armyId,
               editedSettlementId || null
            );
            // @ts-ignore
            ui.notifications?.info('Army support assignment updated');
         }
         
         cancelEdit();
      } catch (error) {
         console.error('Failed to save edit:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to save changes');
      } finally {
         isSaving = false;
      }
   }
   
   function handleKeydown(event: KeyboardEvent, armyId: string) {
      if (event.key === 'Enter') {
         saveEdit(armyId);
      } else if (event.key === 'Escape') {
         cancelEdit();
      }
   }
   
   // Create army functions
   function startCreating() {
      isCreating = true;
      newArmyName = '';
      newArmyLevel = partyLevel;
   }
   
   function cancelCreating() {
      isCreating = false;
      newArmyName = '';
      newArmyLevel = 1;
   }
   
   async function createArmy() {
      if (!newArmyName.trim()) {
         // @ts-ignore
         ui.notifications?.warn('Army name is required');
         return;
      }
      
      isCreatingArmy = true;
      try {
         const { armyService } = await import('../../../services/army');
         await armyService.createArmy(newArmyName.trim(), newArmyLevel);
         cancelCreating();
         // @ts-ignore
         ui.notifications?.info(`Created ${newArmyName}`);
      } catch (error) {
         console.error('Failed to create army:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create army');
      } finally {
         isCreatingArmy = false;
      }
   }
   
   // Open NPC actor sheet or offer to recreate if missing
   async function openActorSheet(army: Army) {
      const game = (globalThis as any).game;
      
      // Check if actor exists
      if (army.actorId) {
         const actor = game?.actors?.get(army.actorId);
         
         if (actor) {
            // Actor exists - open it
            actor.sheet.render(true);
            return;
         }
      }
      
      // Actor missing or not linked - offer to create/recreate
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: 'Missing NPC Actor',
         content: army.actorId 
            ? `<p>The NPC actor for <strong>${army.name}</strong> was not found (may have been deleted).</p><p>Would you like to create a new NPC actor?</p>`
            : `<p><strong>${army.name}</strong> has no linked NPC actor.</p><p>Would you like to create one?</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
         const { armyService } = await import('../../../services/army');
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         // Create new NPC actor
         const newActorId = await armyService.createNPCActor(army.name, army.level);
         
         // Update army with new actor ID
         await updateKingdom(k => {
            const armyToUpdate = k.armies.find(a => a.id === army.id);
            if (armyToUpdate) {
               armyToUpdate.actorId = newActorId;
            }
         });
         
         // Open the newly created actor
         const newActor = game?.actors?.get(newActorId);
         if (newActor) {
            newActor.sheet.render(true);
            // @ts-ignore
            ui.notifications?.info(`Created new NPC actor for ${army.name}`);
         }
      } catch (error) {
         console.error('Failed to create NPC actor:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create NPC actor');
      }
   }
   
   // Delete army
   async function deleteArmy(armyId: string) {
      const army = $kingdomData.armies.find(a => a.id === armyId);
      if (!army) return;
      
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: 'Disband Army',
         content: `<p>Are you sure you want to disband <strong>${army.name}</strong>?</p><p>This will refund some gold.</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
         const { armyService } = await import('../../../services/army');
         const result = await armyService.disbandArmy(armyId);
         // @ts-ignore
         ui.notifications?.info(`Disbanded ${result.armyName}, refunded ${result.refund} gold`);
      } catch (error) {
         console.error('Failed to disband army:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to disband army');
      }
   }
   
   // Pagination
   function nextPage() {
      if (currentPage < totalPages) {
         currentPage++;
      }
   }
   
   function prevPage() {
      if (currentPage > 1) {
         currentPage--;
      }
   }
   
   function goToPage(page: number) {
      currentPage = Math.max(1, Math.min(page, totalPages));
   }
</script>

<div class="armies-tab">
   <!-- Header -->
   <div class="armies-header">
      <div class="header-left">
         <h2>Armies</h2>
         <span class="army-count">({totalArmies} total)</span>
      </div>
      <button class="create-button" on:click={startCreating} disabled={isCreating}>
         <i class="fas fa-plus"></i>
         Create Army
      </button>
   </div>
   
   <!-- Summary Stats -->
   <div class="armies-summary">
      <div class="summary-card">
         <i class="fas fa-shield-alt"></i>
         <div>
            <div class="summary-value">{totalArmies}</div>
            <div class="summary-label">Total</div>
         </div>
      </div>
      <div class="summary-card">
         <i class="fas fa-check-circle status-supported"></i>
         <div>
            <div class="summary-value">{supportedArmies}</div>
            <div class="summary-label">Supported</div>
         </div>
      </div>
      <div class="summary-card">
         <i class="fas fa-exclamation-triangle status-unsupported"></i>
         <div>
            <div class="summary-value">{unsupportedArmies}</div>
            <div class="summary-label">Unsupported</div>
         </div>
      </div>
   </div>
   
   <!-- Filters -->
   <div class="table-controls">
      <input 
         type="text" 
         placeholder="Search armies..." 
         bind:value={searchTerm}
         class="search-input"
      />
      <select bind:value={filterSupport} class="filter-select">
         <option value="all">All Armies</option>
         <option value="supported">Supported Only</option>
         <option value="unsupported">Unsupported Only</option>
      </select>
   </div>
   
   <!-- Table (Desktop) -->
   <div class="armies-table-container desktop-only">
      <table class="armies-table">
         <thead>
            <tr>
               <th>Name</th>
               <th>Level</th>
               <th>Support Status</th>
               <th>NPC Actor</th>
               <th>Actions</th>
            </tr>
         </thead>
         <tbody>
            <!-- Create Row -->
            {#if isCreating}
               <tr class="create-row">
                  <td>
                     <input 
                        type="text" 
                        bind:value={newArmyName}
                        placeholder="Army name"
                        class="inline-input"
                        disabled={isCreatingArmy}
                     />
                  </td>
                  <td>
                     <input 
                        type="number" 
                        bind:value={newArmyLevel}
                        min="1"
                        max={partyLevel}
                        class="inline-input"
                        disabled={isCreatingArmy}
                     />
                  </td>
                  <td>—</td>
                  <td>—</td>
                  <td>
                     <div class="inline-actions">
                        <button 
                           class="save-btn" 
                           on:click={createArmy}
                           disabled={isCreatingArmy}
                           title="Create"
                        >
                           <i class="fas fa-check"></i>
                        </button>
                        <button 
                           class="cancel-btn" 
                           on:click={cancelCreating}
                           disabled={isCreatingArmy}
                           title="Cancel"
                        >
                           <i class="fas fa-times"></i>
                        </button>
                     </div>
                  </td>
               </tr>
            {/if}
            
            <!-- Data Rows -->
            {#each paginatedArmies as army}
               <tr>
                  <!-- Name Column -->
                  <td>
                     {#if editingArmyId === army.id && editingField === 'name'}
                        <div class="inline-edit">
                           <input 
                              type="text" 
                              bind:value={editedValue}
                              on:keydown={(e) => handleKeydown(e, army.id)}
                              class="inline-input"
                              disabled={isSaving}
                           />
                           <button 
                              class="save-btn" 
                              on:click={() => saveEdit(army.id)}
                              disabled={isSaving}
                              title="Save"
                           >
                              <i class="fas fa-check"></i>
                           </button>
                           <button 
                              class="cancel-btn" 
                              on:click={cancelEdit}
                              disabled={isSaving}
                              title="Cancel"
                           >
                              <i class="fas fa-times"></i>
                           </button>
                        </div>
                     {:else}
                        <button
                           class="editable-cell" 
                           on:click={() => startEdit(army, 'name')}
                           title="Click to edit"
                        >
                           {army.name}
                        </button>
                     {/if}
                  </td>
                  
                  <!-- Level Column -->
                  <td>
                     {#if editingArmyId === army.id && editingField === 'level'}
                        <div class="inline-edit">
                           <input 
                              type="number" 
                              bind:value={editedValue}
                              on:keydown={(e) => handleKeydown(e, army.id)}
                              min="1"
                              max={partyLevel}
                              class="inline-input"
                              disabled={isSaving}
                           />
                           <button 
                              class="save-btn" 
                              on:click={() => saveEdit(army.id)}
                              disabled={isSaving}
                              title="Save"
                           >
                              <i class="fas fa-check"></i>
                           </button>
                           <button 
                              class="cancel-btn" 
                              on:click={cancelEdit}
                              disabled={isSaving}
                              title="Cancel"
                           >
                              <i class="fas fa-times"></i>
                           </button>
                        </div>
                     {:else}
                        <button
                           class="editable-cell" 
                           on:click={() => startEdit(army, 'name')}
                           title="Click to edit"
                        >
                           {army.name}
                        </button>
                        <button
                           class="editable-cell level-badge" 
                           on:click={() => startEdit(army, 'level')}
                           title="Click to edit"
                        >
                           {army.level}
                        </button>
                     {/if}
                  </td>
                  
                  <!-- Support Status Column -->
                  <td>
                     {#if editingArmyId === army.id && editingField === 'settlement'}
                        <!-- Editing: Show dropdown -->
                        <div class="inline-edit">
                           <select 
                              bind:value={editedSettlementId}
                              class="settlement-dropdown"
                              disabled={isSaving}
                           >
                              <option value="">Unsupported</option>
                              {#each getAvailableSettlements(army.id) as settlement}
                                 <option value={settlement.id}>
                                    {settlement.name} ({settlement.tier} {getSettlementCapacityText(settlement, army.id)})
                                 </option>
                              {/each}
                           </select>
                           <button 
                              class="save-btn" 
                              on:click={() => saveEdit(army.id)}
                              disabled={isSaving}
                              title="Save"
                           >
                              <i class="fas fa-check"></i>
                           </button>
                           <button 
                              class="cancel-btn" 
                              on:click={cancelEdit}
                              disabled={isSaving}
                              title="Cancel"
                           >
                              <i class="fas fa-times"></i>
                           </button>
                        </div>
                     {:else}
                        <!-- Display: Click to edit -->
                        <button
                           class="support-status-btn {getSupportStatusColor(army)}"
                           on:click={() => startEditingSettlement(army)}
                           title="Click to change settlement"
                        >
                           <i class="fas {getSupportStatusIcon(army)}"></i>
                           {getSupportStatusText(army)}
                        </button>
                     {/if}
                  </td>
                  
                  <!-- NPC Actor Column -->
                  <td>
                     {#if army.actorId}
                        <button 
                           class="actor-link" 
                           on:click={() => openActorSheet(army)}
                           title="Open character sheet"
                        >
                           <i class="fas fa-external-link-alt"></i>
                           Open Sheet
                        </button>
                     {:else}
                        <span class="no-actor">—</span>
                     {/if}
                  </td>
                  
                  <!-- Actions Column -->
                  <td>
                     <button 
                        class="delete-btn" 
                        on:click={() => deleteArmy(army.id)}
                        title="Disband army"
                     >
                        <i class="fas fa-trash"></i>
                     </button>
                  </td>
               </tr>
            {/each}
            
            <!-- Empty State -->
            {#if paginatedArmies.length === 0 && !isCreating}
               <tr>
                  <td colspan="5" class="empty-state">
                     {#if searchTerm || filterSupport !== 'all'}
                        <i class="fas fa-search"></i>
                        <p>No armies match your filters</p>
                     {:else}
                        <i class="fas fa-shield-alt"></i>
                        <p>No armies recruited yet</p>
                        <p class="hint">Click "Create Army" to get started</p>
                     {/if}
                  </td>
               </tr>
            {/if}
         </tbody>
      </table>
   </div>
   
   <!-- Card List (Mobile) -->
   <div class="armies-cards mobile-only">
      {#if isCreating}
         <div class="army-card create-card">
            <div class="card-header">
               <h4>New Army</h4>
            </div>
            <div class="card-body">
               <div class="card-field">
                  <label for="new-army-name">Name</label>
                  <input 
                     id="new-army-name"
                     type="text" 
                     bind:value={newArmyName}
                     placeholder="Army name"
                     class="inline-input"
                     disabled={isCreatingArmy}
                  />
               </div>
               <div class="card-field">
                  <label for="new-army-level">Level</label>
                  <input 
                     id="new-army-level"
                     type="number" 
                     bind:value={newArmyLevel}
                     min="1"
                     max={partyLevel}
                     class="inline-input"
                     disabled={isCreatingArmy}
                  />
               </div>
            </div>
            <div class="card-actions">
               <button class="save-btn" on:click={createArmy} disabled={isCreatingArmy}>
                  <i class="fas fa-check"></i> Create
               </button>
               <button class="cancel-btn" on:click={cancelCreating} disabled={isCreatingArmy}>
                  <i class="fas fa-times"></i> Cancel
               </button>
            </div>
         </div>
      {/if}
      
      {#each paginatedArmies as army}
         <div class="army-card">
            <div class="card-header">
               <h4>{army.name}</h4>
               <span class="level-badge">Level {army.level}</span>
            </div>
            <div class="card-body">
               <div class="card-field">
                  <span class="card-field-label">Support Status</span>
                  <span class="support-status {getSupportStatusColor(army)}">
                     <i class="fas {getSupportStatusIcon(army)}"></i>
                     {getSupportStatusText(army)}
                  </span>
               </div>
               {#if army.actorId}
                  <div class="card-field">
                     <button class="actor-link full-width" on:click={() => openActorSheet(army)}>
                        <i class="fas fa-external-link-alt"></i>
                        Open Character Sheet
                     </button>
                  </div>
               {/if}
            </div>
            <div class="card-actions">
               <button class="edit-btn" on:click={() => startEdit(army, 'name')}>
                  <i class="fas fa-edit"></i> Edit
               </button>
               <button class="delete-btn" on:click={() => deleteArmy(army.id)}>
                  <i class="fas fa-trash"></i> Disband
               </button>
            </div>
         </div>
      {/each}
      
      {#if paginatedArmies.length === 0 && !isCreating}
         <div class="empty-state">
            {#if searchTerm || filterSupport !== 'all'}
               <i class="fas fa-search"></i>
               <p>No armies match your filters</p>
            {:else}
               <i class="fas fa-shield-alt"></i>
               <p>No armies recruited yet</p>
               <p class="hint">Click "Create Army" to get started</p>
            {/if}
         </div>
      {/if}
   </div>
   
   <!-- Pagination -->
   {#if totalPages > 1}
      <div class="pagination">
         <button 
            class="page-btn" 
            on:click={prevPage}
            disabled={currentPage === 1}
         >
            <i class="fas fa-chevron-left"></i>
         </button>
         
         <span class="page-info">
            Page {currentPage} of {totalPages}
         </span>
         
         <button 
            class="page-btn" 
            on:click={nextPage}
            disabled={currentPage === totalPages}
         >
            <i class="fas fa-chevron-right"></i>
         </button>
      </div>
   {/if}
</div>

<style lang="scss">
   .armies-tab {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
      padding: 1rem;
   }
   
   .armies-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .header-left {
         display: flex;
         align-items: baseline;
         gap: 0.5rem;
         
         h2 {
            margin: 0;
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .army-count {
            font-size: 0.875rem;
            color: var(--color-text-dark-secondary, #7a7971);
         }
      }
      
      .create-button {
         padding: 0.5rem 1rem;
         background: var(--color-primary, #5e0000);
         border: none;
         border-radius: 0.375rem;
         color: white;
         cursor: pointer;
         display: flex;
         align-items: center;
         gap: 0.5rem;
         font-weight: var(--font-weight-medium);
         transition: all 0.2s;
         
         &:hover:not(:disabled) {
            background: rgba(94, 0, 0, 0.8);
         }
         
         &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
         }
      }
   }
   
   .armies-summary {
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
            
            &.status-supported {
               color: #90ee90;
            }
            
            &.status-unsupported {
               color: #ffa500;
            }
         }
         
         .summary-value {
            font-size: 1.25rem;
            font-weight: var(--font-weight-bold);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: 0.875rem;
            color: var(--color-text-dark-secondary, #7a7971);
         }
      }
   }
   
   .table-controls {
      display: flex;
      gap: 1rem;
      
      .search-input,
      .filter-select {
         padding: 0.5rem;
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid rgba(255, 255, 255, 0.2);
         border-radius: 0.375rem;
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            border-color: var(--color-primary, #5e0000);
         }
      }
      
      .search-input {
         flex: 1;
      }
   }
   
   .armies-table-container {
      flex: 1;
      overflow: auto;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.375rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
   }
   
   .armies-table {
      width: 100%;
      border-collapse: collapse;
      
      thead {
         background: rgba(0, 0, 0, 0.3);
         position: sticky;
         top: 0;
         z-index: 1;
         
         th {
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-dark-primary, #b5b3a4);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
         }
      }
      
      tbody {
         tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            
            &:hover:not(.create-row) {
               background: rgba(255, 255, 255, 0.05);
            }
            
            &.create-row {
               background: rgba(94, 0, 0, 0.1);
            }
         }
         
         td {
            padding: 0.75rem 1rem;
            color: var(--color-text-dark-primary, #b5b3a4);
            
            &.empty-state {
               padding: 3rem;
               text-align: center;
               color: var(--color-text-dark-secondary, #7a7971);
               
               i {
                  font-size: 2rem;
                  margin-bottom: 1rem;
                  opacity: 0.5;
                  display: block;
               }
               
               p {
                  margin: 0.5rem 0;
                  
                  &.hint {
                     font-size: 0.875rem;
                     font-style: italic;
                  }
               }
            }
         }
      }
   }
   
   .editable-cell {
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
      display: inline-block;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
      
      &.level-badge {
         background: rgba(94, 0, 0, 0.2);
         color: var(--color-primary, #5e0000);
         font-weight: var(--font-weight-medium);
      }
   }
   
   .inline-edit {
      display: flex;
      gap: 0.5rem;
      align-items: center;
   }
   
   .inline-input {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--color-primary, #5e0000);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 150px;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .inline-actions {
      display: flex;
      gap: 0.5rem;
   }
   
   .save-btn,
   .cancel-btn,
   .delete-btn,
   .actor-link,
   .edit-btn {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .save-btn {
      background: rgba(144, 238, 144, 0.2);
      color: #90ee90;
      
      &:hover:not(:disabled) {
         background: rgba(144, 238, 144, 0.3);
      }
   }
   
   .cancel-btn {
      background: rgba(255, 107, 107, 0.2);
      color: #ff6b6b;
      
      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.3);
      }
   }
   
   .delete-btn {
      background: transparent;
      color: #ff6b6b;
      
      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.1);
      }
   }
   
   .actor-link {
      background: rgba(94, 0, 0, 0.2);
      color: var(--color-primary, #5e0000);
      
      &:hover:not(:disabled) {
         background: rgba(94, 0, 0, 0.3);
      }
      
      &.full-width {
         width: 100%;
         justify-content: center;
      }
   }
   
   .edit-btn {
      background: rgba(94, 0, 0, 0.2);
      color: var(--color-primary, #5e0000);
      
      &:hover:not(:disabled) {
         background: rgba(94, 0, 0, 0.3);
      }
   }
   
   .support-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      &.status-supported {
         color: #90ee90;
      }
      
      &.status-unsupported {
         color: #ffa500;
      }
   }
   
   .support-status-btn {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.2);
      
      &.status-supported {
         color: #90ee90;
      }
      
      &.status-unsupported {
         color: #ffa500;
      }
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .settlement-dropdown {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--color-primary, #5e0000);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 200px;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .no-actor {
      color: var(--color-text-dark-secondary, #7a7971);
   }
   
   /* Mobile Cards */
   .armies-cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      
      .army-card {
         background: rgba(0, 0, 0, 0.2);
         border: 1px solid rgba(255, 255, 255, 0.1);
         border-radius: 0.375rem;
         padding: 1rem;
         
         &.create-card {
            border-color: var(--color-primary, #5e0000);
         }
         
         .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            
            h4 {
               margin: 0;
               color: var(--color-text-dark-primary, #b5b3a4);
            }
            
            .level-badge {
               padding: 0.25rem 0.5rem;
               background: rgba(94, 0, 0, 0.2);
               color: var(--color-primary, #5e0000);
               border-radius: 0.25rem;
               font-size: 0.875rem;
               font-weight: var(--font-weight-medium);
            }
         }
         
         .card-body {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 1rem;
            
               .card-field {
                  display: flex;
                  flex-direction: column;
                  gap: 0.25rem;
                  
                  label {
                     font-size: 0.875rem;
                     color: var(--color-text-dark-secondary, #7a7971);
                     cursor: pointer;
                  }
               }
         }
         
         .card-actions {
            display: flex;
            gap: 0.5rem;
            
            button {
               flex: 1;
               padding: 0.5rem;
               justify-content: center;
            }
         }
      }
      
      .empty-state {
         padding: 3rem;
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
            }
         }
      }
   }
   
   /* Pagination */
   .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      
      .page-btn {
         padding: 0.5rem 1rem;
         background: rgba(0, 0, 0, 0.2);
         border: 1px solid rgba(255, 255, 255, 0.1);
         border-radius: 0.375rem;
         color: var(--color-text-dark-primary, #b5b3a4);
         cursor: pointer;
         transition: all 0.2s;
         
         &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
         }
         
         &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
         }
      }
      
      .page-info {
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   /* Responsive */
   .desktop-only {
      display: block;
   }
   
   .mobile-only {
      display: none;
   }
   
   @media (max-width: 768px) {
      .desktop-only {
         display: none;
      }
      
      .mobile-only {
         display: flex;
      }
   }
</style>
