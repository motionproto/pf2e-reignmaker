<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import { kingdomData } from '../../../../stores/KingdomStore';
   import type { Faction, AttitudeLevel } from '../../../../models/Faction';
   import { AttitudeLevelConfig, ATTITUDE_ORDER } from '../../../../models/Faction';
   import Button from '../../components/baseComponents/Button.svelte';
   import InlineEditActions from '../../components/baseComponents/InlineEditActions.svelte';
   import { validateKingdomOrFactionName } from '../../../../utils/reserved-names';

   const dispatch = createEventDispatcher();

   // Check if user is GM
   $: isGM = (globalThis as any).game?.user?.isGM ?? false;

   // Table state
   let searchTerm = '';
   let filterAttitude: AttitudeLevel | 'all' = 'all';
   let currentPage = 1;
   const itemsPerPage = 25;
   
   // Sorting state
   type SortColumn = 'name' | 'attitude' | null;
   type SortDirection = 'asc' | 'desc';
   let sortColumn: SortColumn = null;
   let sortDirection: SortDirection = 'asc';
   
   // Inline editing state
   let editingFactionId: string | null = null;
   let editingField: 'goal' | 'notes' | 'clockMax' | null = null;
   let editedValue: string | number = '';
   let isSaving = false;
   
   // Create faction state
   let isCreating = false;
   let newFactionName = '';
   let newFactionAttitude: AttitudeLevel = 'Indifferent';
   let isCreatingFaction = false;
   
   // Restore defaults state
   let isRestoringDefaults = false;
   
   // Apply filters and sorting
   $: filteredFactions = (() => {
      let factions = [...($kingdomData.factions || [])];
      
      // Search filter
      if (searchTerm) {
         const term = searchTerm.toLowerCase();
         factions = factions.filter(f => 
            f.name.toLowerCase().includes(term) ||
            f.attitude.toLowerCase().includes(term) ||
            f.goal.toLowerCase().includes(term)
         );
      }
      
      // Attitude filter
      if (filterAttitude !== 'all') {
         factions = factions.filter(f => f.attitude === filterAttitude);
      }
      
      // Sorting
      if (sortColumn === 'name') {
         factions.sort((a, b) => {
            const comparison = a.name.localeCompare(b.name);
            return sortDirection === 'asc' ? comparison : -comparison;
         });
      } else if (sortColumn === 'attitude') {
         // Sort by attitude using ATTITUDE_ORDER
         const attitudeIndex = (attitude: AttitudeLevel) => ATTITUDE_ORDER.indexOf(attitude);
         factions.sort((a, b) => {
            const comparison = attitudeIndex(a.attitude) - attitudeIndex(b.attitude);
            return sortDirection === 'asc' ? comparison : -comparison;
         });
      }
      
      return factions;
   })();
   
   // Pagination
   $: totalPages = Math.ceil(filteredFactions.length / itemsPerPage);
   $: paginatedFactions = filteredFactions.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
   );
   
   // Reset to page 1 when filters change
   $: if (searchTerm || filterAttitude) {
      currentPage = 1;
   }
   
   // Calculate faction statistics
   $: totalFactions = ($kingdomData.factions || []).length;
   $: factionsByAttitude = ATTITUDE_ORDER.reduce((acc, attitude) => {
      acc[attitude] = ($kingdomData.factions || []).filter(f => f.attitude === attitude).length;
      return acc;
   }, {} as Record<AttitudeLevel, number>);
   
   // View faction detail
   function viewFactionDetail(factionId: string) {
      dispatch('viewDetail', { factionId });
   }
   
   // Inline editing functions
   function startEdit(faction: Faction, field: 'goal' | 'notes') {
      editingFactionId = faction.id;
      editingField = field;
      editedValue = faction[field];
   }
   
   function startEditClockMax(faction: Faction) {
      editingFactionId = faction.id;
      editingField = 'clockMax';
      editedValue = faction.progressClock.max;
   }
   
   function cancelEdit() {
      editingFactionId = null;
      editingField = null;
      editedValue = '';
   }
   
   async function saveEdit(factionId: string) {
      if (editedValue === '' && editingField !== 'goal' && editingField !== 'notes') return;
      
      isSaving = true;
      try {
         const { factionService } = await import('../../../../services/factions');
         
         if (editingField === 'goal') {
            await factionService.updateFaction(factionId, { goal: String(editedValue) });
         } else if (editingField === 'notes') {
            await factionService.updateFaction(factionId, { notes: String(editedValue) });
         } else if (editingField === 'clockMax') {
            const faction = $kingdomData.factions?.find(f => f.id === factionId);
            if (faction) {
               await factionService.updateProgressClock(
                  factionId,
                  faction.progressClock.current,
                  Number(editedValue)
               );
            }
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
   
   function handleKeydown(event: KeyboardEvent, factionId: string) {
      if (event.key === 'Enter') {
         saveEdit(factionId);
      } else if (event.key === 'Escape') {
         cancelEdit();
      }
   }
   
   // Attitude change
   async function changeAttitude(factionId: string, attitude: AttitudeLevel) {
      try {
         const { factionService } = await import('../../../../services/factions');
         await factionService.updateAttitude(factionId, attitude);
      } catch (error) {
         console.error('Failed to change attitude:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to change attitude');
      }
   }
   
   // Progress clock functions
   async function incrementProgress(factionId: string) {
      try {
         const { factionService } = await import('../../../../services/factions');
         await factionService.incrementProgress(factionId);
      } catch (error) {
         console.error('Failed to increment progress:', error);
      }
   }
   
   async function decrementProgress(factionId: string) {
      try {
         const { factionService } = await import('../../../../services/factions');
         await factionService.decrementProgress(factionId);
      } catch (error) {
         console.error('Failed to decrement progress:', error);
      }
   }
   
   // Create faction functions
   function startCreating() {
      isCreating = true;
      newFactionName = '';
      newFactionAttitude = 'Indifferent';
   }
   
   function cancelCreating() {
      isCreating = false;
      newFactionName = '';
      newFactionAttitude = 'Indifferent';
   }
   
   async function createFaction() {
      if (!newFactionName.trim()) {
         // @ts-ignore
         ui.notifications?.warn('Faction name is required');
         return;
      }
      
      // Validate faction name (prevent reserved names like "player")
      const validation = validateKingdomOrFactionName(newFactionName.trim());
      if (!validation.valid) {
         // @ts-ignore
         ui.notifications?.error(validation.error || 'Invalid faction name');
         return;
      }
      
      isCreatingFaction = true;
      try {
         const { factionService } = await import('../../../../services/factions');
         await factionService.createFaction(newFactionName.trim(), newFactionAttitude);
         cancelCreating();
         // @ts-ignore
         ui.notifications?.info(`Created faction: ${newFactionName}`);
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Failed to create faction';
         // @ts-ignore
         ui.notifications?.error(errorMessage);
      } finally {
         isCreatingFaction = false;
      }
   }
   
   // Delete faction
   async function deleteFaction(factionId: string) {
      const faction = $kingdomData.factions?.find(f => f.id === factionId);
      if (!faction) return;
      
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: 'Remove Faction',
         content: `<p>Are you sure you want to remove <strong>${faction.name}</strong>?</p><p>This action cannot be undone.</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
         const { factionService } = await import('../../../../services/factions');
         await factionService.deleteFaction(factionId);
         // @ts-ignore
         ui.notifications?.info(`Removed ${faction.name}`);
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Failed to remove faction';
         // @ts-ignore
         ui.notifications?.error(errorMessage);
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
   
   // Sorting functions
   function toggleSort(column: SortColumn) {
      if (sortColumn === column) {
         // Toggle direction
         sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
         // New column, default to ascending
         sortColumn = column;
         sortDirection = 'asc';
      }
      // Reset to page 1 when sorting changes
      currentPage = 1;
   }
   
   // Restore defaults
   async function restoreDefaults() {
      isRestoringDefaults = true;
      try {
         const { factionService } = await import('../../../../services/factions');
         const result = await factionService.restoreDefaultFactions();
         
         if (result.added === 0) {
            // @ts-ignore
            ui.notifications?.info('All default factions are already present');
         } else {
            // @ts-ignore
            ui.notifications?.info(`Added ${result.added} default faction${result.added > 1 ? 's' : ''}: ${result.factionNames.join(', ')}`);
         }
      } catch (error) {
         console.error('Failed to restore defaults:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to restore default factions');
      } finally {
         isRestoringDefaults = false;
      }
   }
</script>

<div class="factions-list">
   <!-- Summary Stats -->
   <div class="factions-summary">
      {#each ATTITUDE_ORDER as attitude}
         <div class="summary-card" style="--attitude-color: {AttitudeLevelConfig[attitude].color}">
            <i class="fas {AttitudeLevelConfig[attitude].icon}" style="color: {AttitudeLevelConfig[attitude].color}"></i>
            <div>
               <div class="summary-value">{factionsByAttitude[attitude]}</div>
               <div class="summary-label">{attitude}</div>
            </div>
         </div>
      {/each}
      <Button 
         variant="primary" 
         icon="fas fa-plus" 
         iconPosition="left"
         disabled={isCreating}
         on:click={startCreating}
      >
         Add Faction
      </Button>
   </div>
   
   <!-- Filters -->
   <div class="table-controls">
      <select bind:value={filterAttitude} class="filter-select">
         <option value="all">All Attitudes</option>
         {#each ATTITUDE_ORDER as attitude}
            <option value={attitude}>{attitude}</option>
         {/each}
      </select>
   </div>
   
   <!-- Table -->
   <div class="factions-table-container">
      <table class="factions-table">
         <thead>
            <tr>
               <th class="sortable" on:click={() => toggleSort('name')}>
                  Name
                  {#if sortColumn === 'name'}
                     <i class="fas fa-chevron-{sortDirection === 'asc' ? 'up' : 'down'} sort-indicator"></i>
                  {/if}
               </th>
               <th colspan="5" class="attitude-header sortable" on:click={() => toggleSort('attitude')}>
                  Attitude
                  {#if sortColumn === 'attitude'}
                     <i class="fas fa-chevron-{sortDirection === 'asc' ? 'up' : 'down'} sort-indicator"></i>
                  {/if}
               </th>
               {#if isGM}
                  <th>Goal</th>
                  <th>Progress</th>
               {/if}
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
                        bind:value={newFactionName}
                        placeholder="Faction name"
                        class="inline-input"
                        disabled={isCreatingFaction}
                     />
                  </td>
                  <td colspan="5">
                     <select 
                        bind:value={newFactionAttitude}
                        class="attitude-select"
                        disabled={isCreatingFaction}
                     >
                        {#each ATTITUDE_ORDER as attitude}
                           <option value={attitude}>{attitude}</option>
                        {/each}
                     </select>
                  </td>
                  {#if isGM}
                     <td>—</td>
                     <td>—</td>
                  {/if}
                  <td>
                     <InlineEditActions
                        onSave={createFaction}
                        onCancel={cancelCreating}
                        disabled={isCreatingFaction}
                        saveTitle="Create"
                        cancelTitle="Cancel"
                     />
                  </td>
               </tr>
            {/if}
            
            <!-- Data Rows -->
            {#each paginatedFactions as faction}
               <tr>
                  <!-- Name Column - Now clickable to view detail -->
                  <td>
                     <button
                        class="faction-name-btn" 
                        on:click={() => viewFactionDetail(faction.id)}
                        title="View details"
                     >
                        {faction.name}
                     </button>
                  </td>
                  
                  <!-- Attitude Icons (5 columns) -->
                  {#each ATTITUDE_ORDER as attitude}
                     <td class="attitude-cell">
                        <button
                           class="attitude-icon {faction.attitude === attitude ? 'active' : ''}"
                           on:click={() => changeAttitude(faction.id, attitude)}
                           title={AttitudeLevelConfig[attitude].description}
                           style="color: {faction.attitude === attitude ? AttitudeLevelConfig[attitude].color : 'rgba(255,255,255,0.2)'}"
                        >
                           <i class="fas {AttitudeLevelConfig[attitude].icon}"></i>
                        </button>
                     </td>
                  {/each}
                  
                  {#if isGM}
                     <!-- Goal Column -->
                     <td>
                        {#if editingFactionId === faction.id && editingField === 'goal'}
                           <div class="inline-edit">
                              <input 
                                 type="text" 
                                 bind:value={editedValue}
                                 on:keydown={(e) => handleKeydown(e, faction.id)}
                                 class="inline-input"
                                 disabled={isSaving}
                              />
                              <InlineEditActions
                                 onSave={() => saveEdit(faction.id)}
                                 onCancel={cancelEdit}
                                 disabled={isSaving}
                              />
                           </div>
                        {:else}
                           <button
                              class="editable-cell" 
                              on:click={() => startEdit(faction, 'goal')}
                              title="Click to edit"
                           >
                              {faction.goal || '—'}
                           </button>
                        {/if}
                     </td>
                     
                     <!-- Progress Clock Column -->
                     <td>
                        <div class="progress-clock">
                           {#if editingFactionId === faction.id && editingField === 'clockMax'}
                              <label class="clock-edit-label">Number of Steps:</label>
                              <input 
                                 type="number" 
                                 bind:value={editedValue}
                                 on:keydown={(e) => handleKeydown(e, faction.id)}
                                 class="clock-max-input"
                                 min="1"
                                 disabled={isSaving}
                              />
                              <button 
                                 class="clock-btn small" 
                                 on:click={() => saveEdit(faction.id)} 
                                 title="Confirm"
                                 disabled={isSaving}
                              >
                                 <i class="fas fa-check"></i>
                              </button>
                              <button 
                                 class="clock-btn small" 
                                 on:click={cancelEdit} 
                                 title="Cancel"
                                 disabled={isSaving}
                              >
                                 <i class="fas fa-times"></i>
                              </button>
                           {:else}
                              <span class="clock-value">{faction.progressClock.current}</span>
                              
                              <span class="clock-separator">/</span>
                              
                              <button
                                 class="clock-max"
                                 on:click={() => startEditClockMax(faction)}
                                 title="Click to change max"
                              >
                                 {faction.progressClock.max}
                              </button>
                              
                              <div class="clock-arrows">
                                 <button 
                                    class="clock-arrow-btn up"
                                    on:click={() => incrementProgress(faction.id)}
                                    title="Increase progress"
                                 >
                                    <i class="fas fa-chevron-up"></i>
                                 </button>
                                 <button 
                                    class="clock-arrow-btn down"
                                    on:click={() => decrementProgress(faction.id)}
                                    title="Decrease progress"
                                 >
                                    <i class="fas fa-chevron-down"></i>
                                 </button>
                              </div>
                           {/if}
                        </div>
                     </td>
                  {/if}
                  
                  <!-- Actions Column -->
                  <td>
                     <button 
                        class="delete-btn" 
                        on:click={() => deleteFaction(faction.id)}
                        title="Remove faction"
                     >
                        <i class="fas fa-trash"></i>
                     </button>
                  </td>
               </tr>
            {/each}
            
            <!-- Empty State -->
            {#if paginatedFactions.length === 0 && !isCreating}
               <tr>
                  <td colspan={isGM ? 9 : 7} class="empty-state">
                     {#if searchTerm || filterAttitude !== 'all'}
                        <i class="fas fa-search"></i>
                        <p>No factions match your filters</p>
                     {:else}
                        <i class="fas fa-handshake"></i>
                        <p>No factions tracked yet</p>
                        <p class="hint">Click "Add Faction" to get started</p>
                     {/if}
                  </td>
               </tr>
            {/if}
         </tbody>
      </table>
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
   
   <!-- Restore Defaults Button -->
   <div class="restore-defaults-container">
      <Button 
         variant="secondary" 
         icon="fas fa-history" 
         iconPosition="left"
         disabled={isRestoringDefaults}
         on:click={restoreDefaults}
      >
         {isRestoringDefaults ? 'Restoring...' : 'Restore Default Factions'}
      </Button>
   </div>
</div>

<style lang="scss">
   .factions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
   }
   
   .factions-summary {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
      
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
         }
         
         .summary-value {
            font-size: 1.25rem;
            font-weight: var(--font-weight-bold);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: 0.875rem;
            color: var(--text-medium-light, #9e9b8f);
         }
      }
      
      :global(button) {
         margin-left: auto;
      }
   }
   
   .table-controls {
      display: flex;
      gap: 1rem;
      
      .filter-select {
         padding: 0.5rem;
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid rgba(255, 255, 255, 0.2);
         border-radius: 0.375rem;
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.4);
         }
      }
   }
   
   .factions-table-container {
      flex: 1;
      overflow: auto;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.375rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
   }
   
   .factions-table {
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
            
            &.attitude-header {
               text-align: center;
            }
            
            &.sortable {
               cursor: pointer;
               user-select: none;
               transition: all 0.2s;
               
               &:hover {
                  background: rgba(255, 255, 255, 0.05);
               }
               
               .sort-indicator {
                  margin-left: 0.5rem;
                  font-size: 0.75rem;
                  opacity: 0.7;
               }
            }
         }
      }
      
      tbody {
         tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            
            &:nth-child(even):not(.create-row) {
               background: rgba(255, 255, 255, 0.075);
            }
            
            &:hover:not(.create-row) {
               background: rgba(255, 255, 255, 0.15);
            }
            
            &.create-row {
               background: rgba(94, 0, 0, 0.2);
            }
         }
         
         td {
            padding: 0.5rem 1rem;
            color: var(--color-text-dark-primary, #b5b3a4);
            
            &.attitude-cell {
               text-align: center;
               padding: 0.25rem;
            }
            
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
   
   .faction-name-btn {
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
      display: inline-block;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-md);
      text-align: left;
      font-weight: var(--font-weight-semibold);
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 3px;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
         text-decoration-style: solid;
      }
   }
   
   .editable-cell {
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
      display: inline-block;
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      text-align: left;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .attitude-icon {
      cursor: pointer;
      padding: 0.25rem;
      border: 1px solid transparent;
      outline: none;
      background: transparent;
      font-size: 1.1rem;
      transition: all 0.2s;
      box-shadow: none;
      border-radius: 0.25rem;
      
      &:hover {
         transform: scale(1.15);
      }
      
      &.active {
         transform: scale(1.25);
         border-color: var(--border-strong)
      }
      
      &:focus {
         outline: none;
         border-color: transparent;
         box-shadow: none;
      }
      
      &:focus-visible {
         outline: none;
         border-color: transparent;
         box-shadow: none;
      }
   }
   
   .progress-clock {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
   }
   
   .clock-btn {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
      
      &.small {
         padding: 0.125rem 0.25rem;
         font-size: 0.75rem;
      }
   }
   
   .clock-edit-label {
      font-size: 0.875rem;
      font-weight: var(--font-weight-normal);
      color: var(--color-text-dark-secondary, #7a7971);
      white-space: nowrap;
   }
   
   .clock-value {
      font-weight: var(--font-weight-bold);
      min-width: 1.5rem;
      text-align: center;
   }
   
   .clock-arrows {
      display: flex;
      flex-direction: column;
      gap: 0;
   }
   
   .clock-arrow-btn {
      padding: 0.125rem 0.25rem;
      background: transparent;
      border: none;
      color: var(--color-text-dark-secondary, #7a7971);
      cursor: pointer;
      transition: all 0.2s;
      line-height: 0.5;
      font-size: 0.625rem;
      
      &:hover {
         color: var(--color-text-dark-primary, #b5b3a4);
         transform: scale(1.1);
      }
      
      &.up {
         margin-bottom: -2px;
      }
      
      &.down {
         margin-top: -2px;
      }
   }
   
   .clock-separator {
      color: var(--color-text-dark-secondary, #7a7971);
   }
   
   .clock-max {
      font-weight: var(--font-weight-bold);
      min-width: 1.5rem;
      text-align: center;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .clock-max-input {
      width: 3rem;
      padding: 0.25rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      text-align: center;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
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
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 150px;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .attitude-select {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .delete-btn {
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
   
   .delete-btn {
      background: transparent;
      color: #ff6b6b;
      
      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.1);
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
   
   /* Restore Defaults */
   .restore-defaults-container {
      display: flex;
      justify-content: center;
      padding: 1rem 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
   }
</style>
