<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { armyTypesService } from '../../../../services/armyTypes';
  import type { ArmyTypeConfig, ArmyTypesConfig } from '../../../../types/armyTypes';
  import { invalidateArmyTypesCache } from '../../../../utils/armyHelpers';
  import { logger } from '../../../../utils/Logger';
  import Button from '../../components/baseComponents/Button.svelte';
  import Dialog from '../../components/baseComponents/Dialog.svelte';

  const dispatch = createEventDispatcher();

  let armyTypes: ArmyTypesConfig = {};
  let isLoading = true;
  let isSaving = false;

  // Dialog state
  let showEditDialog = false;
  let editedType: ArmyTypeConfig | null = null;
  let isCreatingNew = false;

  onMount(async () => {
    await loadArmyTypes();
  });

  async function loadArmyTypes() {
    isLoading = true;
    try {
      armyTypes = await armyTypesService.getArmyTypes();
    } catch (error) {
      logger.error('[ArmyTypeEditor] Failed to load army types:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleBack() {
    dispatch('back');
  }

  function startEdit(key: string) {
    editedType = { ...armyTypes[key] };
    isCreatingNew = false;
    showEditDialog = true;
  }

  function startCreate() {
    editedType = {
      key: crypto.randomUUID(),
      name: '',
      portraitImage: '',
      tokenImage: '',
      enabledForPlayers: true
    };
    isCreatingNew = true;
    showEditDialog = true;
  }

  function cancelEdit() {
    showEditDialog = false;
    editedType = null;
    isCreatingNew = false;
  }

  async function saveType() {
    if (!editedType) return;

    // Validate
    if (!editedType.name.trim()) {
      // @ts-ignore
      ui.notifications?.error('Type name is required');
      return;
    }

    isSaving = true;
    try {
      await armyTypesService.upsertArmyType(editedType);
      invalidateArmyTypesCache();
      await loadArmyTypes();
      showEditDialog = false;
      editedType = null;
      isCreatingNew = false;
      // @ts-ignore
      ui.notifications?.info('Army type saved');
    } catch (error) {
      logger.error('[ArmyTypeEditor] Failed to save type:', error);
      // @ts-ignore
      ui.notifications?.error('Failed to save army type');
    } finally {
      isSaving = false;
    }
  }

  async function deleteType(key: string) {
    // @ts-ignore - Foundry Dialog
    const confirmed = await Dialog.confirm({
      title: 'Delete Army Type',
      content: `<p>Are you sure you want to delete the "${armyTypes[key].name}" army type?</p>
                <p><strong>Warning:</strong> Existing armies of this type will retain their type, but the type will no longer be available for recruitment.</p>`,
      yes: () => true,
      no: () => false
    });

    if (!confirmed) return;

    try {
      await armyTypesService.removeArmyType(key);
      invalidateArmyTypesCache();
      await loadArmyTypes();
      // @ts-ignore
      ui.notifications?.info('Army type deleted');
    } catch (error) {
      logger.error('[ArmyTypeEditor] Failed to delete type:', error);
      // @ts-ignore
      ui.notifications?.error('Failed to delete army type');
    }
  }

  async function resetToDefaults() {
    // @ts-ignore - Foundry Dialog
    const confirmed = await Dialog.confirm({
      title: 'Reset Army Types',
      content: '<p>Reset all army types to default configuration?</p><p>This will remove any custom types you have added.</p>',
      yes: () => true,
      no: () => false
    });

    if (!confirmed) return;

    try {
      await armyTypesService.resetToDefaults();
      invalidateArmyTypesCache();
      await loadArmyTypes();
      // @ts-ignore
      ui.notifications?.info('Army types reset to defaults');
    } catch (error) {
      logger.error('[ArmyTypeEditor] Failed to reset types:', error);
      // @ts-ignore
      ui.notifications?.error('Failed to reset army types');
    }
  }

  // FilePicker for image selection
  function selectPortraitImage() {
    if (!editedType) return;

    // @ts-ignore - Foundry FilePicker
    const fp = new FilePicker({
      type: 'image',
      current: editedType.portraitImage || '',
      callback: (path: string) => {
        if (editedType) {
          editedType.portraitImage = path;
          editedType = { ...editedType }; // Trigger reactivity
        }
      }
    });
    fp.browse();
  }

  function selectTokenImage() {
    if (!editedType) return;

    // @ts-ignore - Foundry FilePicker
    const fp = new FilePicker({
      type: 'image',
      current: editedType.tokenImage || '',
      callback: (path: string) => {
        if (editedType) {
          editedType.tokenImage = path;
          editedType = { ...editedType }; // Trigger reactivity
        }
      }
    });
    fp.browse();
  }
</script>

<!-- Edit/Create Dialog -->
<Dialog
  bind:show={showEditDialog}
  title={isCreatingNew ? 'Create New Army Type' : `Edit: ${editedType?.name || ''}`}
  confirmLabel={isSaving ? 'Saving...' : 'Save'}
  confirmDisabled={isSaving}
  onConfirm={saveType}
  onCancel={cancelEdit}
  width="650px"
>
  {#if editedType}
    <div class="edit-form">
      <div class="form-group">
        <label for="type-name">Name:</label>
        <input
          id="type-name"
          type="text"
          bind:value={editedType.name}
          placeholder="e.g., Cavalry, Archers"
        />
      </div>

      <div class="form-group">
        <label>Portrait Image:</label>
        <div class="image-picker">
          {#if editedType.portraitImage}
            <img src={editedType.portraitImage} alt={editedType.name} class="type-preview portrait" />
          {:else}
            <div class="no-image">No image</div>
          {/if}
          <Button variant="secondary" icon="fas fa-folder-open" on:click={selectPortraitImage}>
            Browse...
          </Button>
          {#if editedType.portraitImage}
            <button class="clear-btn" on:click={() => { if (editedType) { editedType.portraitImage = ''; editedType = {...editedType}; } }} title="Clear image">
              <i class="fas fa-times"></i>
            </button>
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label>Token Image:</label>
        <div class="image-picker">
          {#if editedType.tokenImage}
            <img src={editedType.tokenImage} alt={editedType.name} class="type-preview token" />
          {:else}
            <div class="no-image">No image</div>
          {/if}
          <Button variant="secondary" icon="fas fa-folder-open" on:click={selectTokenImage}>
            Browse...
          </Button>
          {#if editedType.tokenImage}
            <button class="clear-btn" on:click={() => { if (editedType) { editedType.tokenImage = ''; editedType = {...editedType}; } }} title="Clear image">
              <i class="fas fa-times"></i>
            </button>
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={editedType.enabledForPlayers} />
          <span>Available for player recruitment</span>
        </label>
      </div>
    </div>
  {/if}
</Dialog>

<div class="army-type-editor">
  <header class="editor-header">
    <button class="back-btn" on:click={handleBack}>
      <i class="fas fa-arrow-left"></i>
      Back to Armies
    </button>
    <h2>Customize Army Types</h2>
  </header>

  {#if isLoading}
    <div class="loading">Loading army types...</div>
  {:else}
    <div class="editor-actions">
      <Button variant="primary" icon="fas fa-plus" on:click={startCreate}>
        Add New Type
      </Button>
      <Button variant="secondary" icon="fas fa-undo" on:click={resetToDefaults}>
        Reset to Defaults
      </Button>
    </div>

    <!-- Types List -->
    <div class="types-list">
      <table class="types-table">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Name</th>
            <th>Player Access</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each Object.entries(armyTypes) as [key, config]}
            <tr>
              <td>
                {#if config.tokenImage || config.portraitImage}
                  <img src={config.tokenImage || config.portraitImage} alt={config.name} class="type-icon" />
                {:else}
                  <i class="fas fa-shield-alt placeholder-icon"></i>
                {/if}
              </td>
              <td>{config.name}</td>
              <td>
                {#if config.enabledForPlayers}
                  <i class="fas fa-check status-enabled" title="Enabled for players"></i>
                {:else}
                  <i class="fas fa-lock status-disabled" title="GM only"></i>
                {/if}
              </td>
              <td>
                <div class="action-row">
                  <button class="action-btn" on:click={() => startEdit(key)} title="Edit">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="action-btn delete-btn" on:click={() => deleteType(key)} title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style lang="scss">
  .army-type-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    height: 100%;
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: var(--space-16);

    .back-btn {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-8) var(--space-12);
      background: var(--overlay);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      cursor: pointer;

      &:hover {
        background: var(--hover);
      }
    }

    h2 {
      margin: 0;
      color: var(--text-primary);
    }
  }

  .loading {
    padding: var(--space-24);
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
  }

  .editor-actions {
    display: flex;
    gap: var(--space-12);
  }

  .edit-form {

    h3 {
      margin: 0 0 var(--space-16) 0;
      color: var(--text-primary);
    }

    .form-group {
      margin-bottom: var(--space-16);

      label {
        display: block;
        margin-bottom: var(--space-4);
        color: var(--text-secondary);
        font-weight: 500;
      }

      input[type="text"] {
        width: 100%;
        padding: var(--space-8);
        background: var(--overlay);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        color: var(--text-primary);

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      small {
        display: block;
        margin-top: var(--space-4);
        color: var(--text-tertiary);
        font-size: var(--font-sm);
      }
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      cursor: pointer;

      input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
      }
    }

    .image-picker {
      display: flex;
      align-items: center;
      gap: var(--space-12);

      .type-preview {
        width: 4rem;
        height: 4rem;
        object-fit: contain;
        border-radius: var(--radius-md);
        background: var(--overlay);

        &.portrait {
          border-radius: var(--radius-sm);
        }

        &.token {
          border-radius: 50%;
        }
      }

      .no-image {
        width: 4rem;
        height: 4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--overlay);
        border: 1px dashed var(--border-subtle);
        border-radius: var(--radius-md);
        color: var(--text-tertiary);
        font-size: var(--font-xs);
        text-align: center;
      }

      .clear-btn {
        padding: var(--space-4) var(--space-8);
        background: transparent;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        color: var(--text-secondary);
        cursor: pointer;

        &:hover {
          color: #ff6b6b;
          border-color: #ff6b6b;
        }
      }
    }

    .form-actions {
      display: flex;
      gap: var(--space-12);
      margin-top: var(--space-24);
    }
  }

  .types-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: var(--overlay-low);
    border-radius: var(--radius-lg);
    overflow: hidden;

    thead th {
      padding: var(--space-12) var(--space-16);
      text-align: left;
      background: var(--overlay);
      color: var(--text-primary);
      font-weight: 600;
      border-bottom: 1px solid var(--border-subtle);
    }

    tbody tr {
      &:hover {
        background: var(--hover-low);
      }
    }

    td {
      padding: var(--space-12) var(--space-16);
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-faint);
    }

    .type-icon {
      width: 2.5rem;
      height: 2.5rem;
      object-fit: contain;
    }

    .placeholder-icon {
      font-size: var(--font-2xl);
      color: var(--text-tertiary);
    }

    code {
      padding: var(--space-2) var(--space-4);
      background: var(--overlay);
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
    }

    .status-enabled {
      color: var(--color-green);
    }

    .status-disabled {
      color: var(--text-tertiary);
    }

    .action-row {
      display: flex;
      gap: var(--space-4);
    }

    .action-btn {
      padding: var(--space-4) var(--space-8);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;

      &:hover {
        color: var(--text-primary);
      }

      &.delete-btn:hover {
        color: #ff6b6b;
      }
    }
  }
</style>
