<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import type { Province } from '../../../actors/KingdomActor';
   import { provinces, addProvince, removeProvince, updateProvinceName } from '../../../stores/KingdomStore';

   const dispatch = createEventDispatcher<{
      editProvinces: void;
   }>();

   // Local state for adding new province
   let isAddingNew = false;
   let newProvinceName = '';
   let newProvinceInputRef: HTMLInputElement | null = null;

   // Editing state
   let editingProvinceId: string | null = null;
   let editingName = '';
   let editInputRef: HTMLInputElement | null = null;

   function startAddingProvince() {
      isAddingNew = true;
      newProvinceName = '';
      editingProvinceId = null;
      setTimeout(() => {
         newProvinceInputRef?.focus();
      }, 10);
   }

   async function confirmAddProvince() {
      if (!newProvinceName.trim()) return;
      await addProvince(newProvinceName.trim());
      isAddingNew = false;
      newProvinceName = '';
   }

   function cancelAddProvince() {
      isAddingNew = false;
      newProvinceName = '';
   }

   async function handleRemoveProvince(provinceId: string) {
      await removeProvince(provinceId);
   }

   function startEditingName(province: Province) {
      editingProvinceId = province.id;
      editingName = province.name;
      isAddingNew = false;
      setTimeout(() => {
         editInputRef?.focus();
         editInputRef?.select();
      }, 10);
   }

   async function confirmEditName() {
      if (editingProvinceId && editingName.trim()) {
         await updateProvinceName(editingProvinceId, editingName.trim());
      }
      editingProvinceId = null;
      editingName = '';
   }

   function cancelEditName() {
      editingProvinceId = null;
      editingName = '';
   }

   function handleEditProvinces() {
      dispatch('editProvinces');
   }

   function handleKeydown(event: KeyboardEvent, action: 'add' | 'edit') {
      if (event.key === 'Enter') {
         if (action === 'add') {
            confirmAddProvince();
         } else {
            confirmEditName();
         }
      } else if (event.key === 'Escape') {
         if (action === 'add') {
            cancelAddProvince();
         } else {
            cancelEditName();
         }
      }
   }
</script>

<section class="provinces-section">
   <div class="section-header">
      <h3><i class="fas fa-map"></i> Provinces</h3>
      <div class="header-actions">
         <button
            class="action-btn edit"
            on:click={handleEditProvinces}
            title="Edit province hexes"
         >
            <i class="fas fa-edit"></i>
         </button>
      </div>
   </div>

   <div class="provinces-content">
      <div class="stat-row">
         <span class="stat-label">Total Provinces</span>
         <span class="stat-value">{$provinces.length}</span>
      </div>

      {#if $provinces.length > 0 || isAddingNew}
         <div class="provinces-list">
            {#each $provinces as province}
               <div class="province-item">
                  {#if editingProvinceId === province.id}
                     <input
                        type="text"
                        bind:value={editingName}
                        bind:this={editInputRef}
                        class="province-name-input"
                        placeholder="Province name..."
                        on:keydown={(e) => handleKeydown(e, 'edit')}
                        on:blur={confirmEditName}
                     />
                  {:else}
                     <span
                        class="province-name"
                        on:dblclick={() => startEditingName(province)}
                        title="Double-click to rename"
                     >
                        {province.name}
                     </span>
                  {/if}
                  <span class="province-hex-count">
                     {province.hexIds.length} hex{province.hexIds.length !== 1 ? 'es' : ''}
                  </span>
                  <button
                     class="action-btn danger"
                     on:click={() => handleRemoveProvince(province.id)}
                     title="Remove province"
                  >
                     <i class="fas fa-minus"></i>
                  </button>
               </div>
            {/each}

            <!-- Add row -->
            {#if isAddingNew}
               <div class="province-item add-row">
                  <input
                     type="text"
                     bind:value={newProvinceName}
                     bind:this={newProvinceInputRef}
                     class="province-name-input"
                     placeholder="Province name..."
                     on:keydown={(e) => handleKeydown(e, 'add')}
                  />
                  <button
                     class="action-btn primary"
                     on:click={confirmAddProvince}
                     title="Confirm"
                  >
                     <i class="fas fa-check"></i>
                  </button>
                  <button
                     class="action-btn"
                     on:click={cancelAddProvince}
                     title="Cancel"
                  >
                     <i class="fas fa-times"></i>
                  </button>
               </div>
            {:else}
               <div class="province-item add-row">
                  <span class="add-prompt">Add Province</span>
                  <button
                     class="action-btn primary"
                     on:click={startAddingProvince}
                     title="Add new province"
                  >
                     <i class="fas fa-plus"></i>
                  </button>
               </div>
            {/if}
         </div>
      {:else}
         <div class="empty-state">
            <span>No provinces defined</span>
            <button
               class="action-btn primary"
               on:click={startAddingProvince}
               title="Add new province"
            >
               <i class="fas fa-plus"></i>
            </button>
         </div>
      {/if}
   </div>
</section>

<style lang="scss">
   .provinces-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }

   .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: var(--space-12);
      border-bottom: 2px solid var(--color-primary);

      h3 {
         margin: 0;
         display: flex;
         align-items: center;
         gap: var(--space-8);
         font-size: var(--font-lg);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);

         i {
            font-size: var(--font-xl);
            color: var(--color-primary);
         }
      }

      .header-actions {
         display: flex;
         gap: var(--space-4);
      }
   }

   .provinces-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
   }

   .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-6) 0;

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

   .provinces-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      margin-top: var(--space-8);
   }

   .province-item {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-8) var(--space-10);
      background: var(--overlay);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);

      &.add-row {
         background: var(--overlay-low);
      }
   }

   .province-name {
      flex: 1;
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      cursor: pointer;

      &:hover {
         text-decoration: underline;
         text-decoration-style: dotted;
      }
   }

   .province-name-input {
      flex: 1;
      padding: var(--space-4) var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-md);

      &::placeholder {
         color: var(--text-tertiary);
         font-style: italic;
      }

      &:focus {
         outline: none;
         background: var(--overlay-high);
         border-color: var(--color-primary);
      }
   }

   .province-hex-count {
      color: var(--text-secondary);
      font-size: var(--font-sm);
      min-width: 4rem;
      text-align: right;
   }

   .add-prompt {
      flex: 1;
      color: var(--text-tertiary);
      font-weight: var(--font-weight-thin);
   }

   .empty-state {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-12);
      background: var(--overlay-low);
      border-radius: var(--radius-md);
      color: var(--text-tertiary);
      font-style: italic;
   }

   .action-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      background: var(--hover);
      color: var(--text-primary);
      flex-shrink: 0;

      &:hover {
         background: rgba(255, 255, 255, 0.2);
      }

      &.primary {
         background: rgba(144, 238, 144, 0.2);
         color: var(--color-success);

         &:hover {
            background: rgba(144, 238, 144, 0.3);
         }
      }

      &.danger {
         background: rgba(255, 107, 107, 0.2);
         color: var(--color-danger);

         &:hover {
            background: rgba(255, 107, 107, 0.3);
         }
      }

      &.edit {
         background: rgba(100, 149, 237, 0.2);
         color: var(--color-info, #6495ed);

         &:hover {
            background: rgba(100, 149, 237, 0.3);
         }
      }
   }
</style>
