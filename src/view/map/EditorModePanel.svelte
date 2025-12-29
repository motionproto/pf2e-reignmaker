<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { getEditorModeService, type EditorTool, type EditorMode } from '../../services/map/core/EditorModeService';
  import { cellRiverEditorHandlers } from '../../services/map/editors/CellRiverEditorHandlers';
  import { cellLakeEditorHandlers } from '../../services/map/editors/CellLakeEditorHandlers';
  import { cellCrossingEditorHandlers } from '../../services/map/editors/CellCrossingEditorHandlers';
  import SettlementEditorDialog from './SettlementEditorDialog.svelte';
  import { settlementEditorDialog } from '../../stores/SettlementEditorDialogStore';
  import { kingdomData } from '../../stores/KingdomStore';
  
  // Props
  export let onClose: () => void;
  
  // State
  const currentTool = writable<EditorTool>('inactive');
  const editorService = getEditorModeService();
  
  // Panel positioning
  let position = { x: 100, y: 100 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let panelElement: HTMLDivElement;
  
  // Minimize state
  let isMinimized = false;
  let selectedSection = 'settlements';
  let isChangingSection = false;
  
  // Territory claim state ('null' string for unclaimed, 'player' for player kingdom, or faction.id)
  let selectedClaimOwner: string = 'player';
  
  onMount(async () => {
    // Load saved position
    const savedPosition = localStorage.getItem('reignmaker-editor-panel-position');
    if (savedPosition) {
      position = JSON.parse(savedPosition);
    }
    
    // Load saved minimize state
    const savedMinimized = localStorage.getItem('reignmaker-editor-panel-minimized');
    if (savedMinimized) {
      isMinimized = savedMinimized === 'true';
    }
    
    // Load saved selected section (defaults to 'settlements' if not set)
    const savedSection = localStorage.getItem('reignmaker-editor-panel-section');
    if (savedSection) {
      selectedSection = savedSection;
    }
    
    // Enter editor mode (automatically clears all stale overlays)
    await editorService.enterEditorMode();
    
    // Set initial tool and overlay to match the selected section (await to ensure overlays are set)
    await selectSection(selectedSection);
  });
  
  onDestroy(() => {
    // Clean up subscriptions
    unsubscribeSettlementDialog();

    // Exit editor mode on unmount (cleanup)
    editorService.exitEditorMode();
  });
  
  // Tool selection
  async function setTool(tool: EditorTool): Promise<void> {
    currentTool.set(tool);
    await editorService.setTool(tool);
  }
  
  // Toggle minimize state
  function toggleMinimize() {
    isMinimized = !isMinimized;
    localStorage.setItem('reignmaker-editor-panel-minimized', String(isMinimized));
  }
  
  // Handle section selection from dropdown
  async function handleSectionChange(event: Event) {
    event.stopPropagation();
    const target = event.target as HTMLSelectElement;
    const newSection = target.value;
    
    isChangingSection = true;
    selectedSection = newSection;
    localStorage.setItem('reignmaker-editor-panel-section', newSection);
    
    // Select the section (applies editor mode and sets default tool)
    await selectSection(newSection);
    
    setTimeout(() => { isChangingSection = false; }, 100);
  }
  
  // Determine active section based on current tool
  $: activeSection = getActiveSection($currentTool);
  
  function getActiveSection(tool: EditorTool): string | null {
    if (tool === 'inactive') return null;
    if (['cell-river-edit', 'cell-river-erase', 'cell-river-area-erase', 'cell-river-flip'].includes(tool)) {
      return 'rivers';
    }
    if (['cell-lake-paint', 'cell-lake-erase'].includes(tool)) {
      return 'lakes';
    }
    if (['cell-crossing-paint', 'cell-crossing-erase', 'waterfall-toggle', 'bridge-toggle', 'ford-toggle'].includes(tool)) {
      return 'crossings';
    }
    if (['road-edit', 'road-scissors'].includes(tool)) {
      return 'roads';
    }
    if (tool.startsWith('terrain-')) {
      return 'terrain';
    }
    if (tool.startsWith('bounty-')) {
      return 'bounty';
    }
    if (tool.startsWith('worksite-')) {
      return 'worksites';
    }
    if (tool === 'settlement-place' || tool === 'settlement-minus') {
      return 'settlements';
    }
    if (tool.startsWith('fortification-')) {
      return 'fortifications';
    }
    if (tool === 'claimed-by') {
      return 'territory';
    }
    return null;
  }
  
  // Select section (applies editor mode and sets default tool)
  async function selectSection(section: string): Promise<void> {
    // First, apply the editor mode (sets default overlay configuration)
    await editorService.setEditorMode(section as EditorMode);
    
    // Then set the default tool for this section
    const defaultTools: Record<string, EditorTool> = {
      'rivers': 'cell-river-edit',
      'lakes': 'cell-lake-paint',
      'crossings': 'cell-crossing-paint',
      'roads': 'road-edit',
      'terrain': 'terrain-plains',
      'bounty': 'bounty-food',
      'worksites': 'worksite-farm',
      'settlements': 'settlement-place',
      'fortifications': 'fortification-tier1',
      'territory': 'claimed-by'
    };
    
    const tool = defaultTools[section];
    if (tool) {
      // Special handling for territory section - must set claim owner
      if (section === 'territory') {
        editorService.setClaimOwner(selectedClaimOwner === 'null' ? null : selectedClaimOwner);
      }
      await setTool(tool);
    }
  }
  
  // Handle claim owner selection
  function selectClaimOwner(owner: string) {
    selectedClaimOwner = owner;
    // Convert 'null' string to actual null for the editor service
    editorService.setClaimOwner(owner === 'null' ? null : owner);
    setTool('claimed-by');
  }

  // Handle claim owner dropdown change
  function handleClaimOwnerChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectClaimOwner(target.value);
  }

  // Color picker handling
  let colorPickerInput: HTMLInputElement;

  async function handleColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newColor = input.value;

    // Update the kingdom data immediately
    const { updateKingdom } = await import('../../stores/KingdomStore');

    await updateKingdom((kingdom) => {
      if (selectedClaimOwner === 'player') {
        kingdom.playerKingdomColor = newColor;
      } else if (selectedClaimOwner !== 'null') {
        const faction = kingdom.factions?.find(f => f.id === selectedClaimOwner);
        if (faction) {
          faction.color = newColor;
        }
      }
    });
  }
  
  // Dragging handlers
  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.tool-button, .action-button, .section-dropdown, .faction-dropdown, .color-swatch')) return;
    isDragging = true;
    dragStart = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.preventDefault();
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    position = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
  }
  
  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      localStorage.setItem('reignmaker-editor-panel-position', JSON.stringify(position));
    }
  }
  
  // Action handlers
  async function handleSave() {
    try {
      await editorService.save();
    } catch (error) {
      console.error('[EditorModePanel] Save error:', error);
      const ui = (globalThis as any).ui;
      ui?.notifications?.error('Failed to save map changes. Please try again.');
      // Don't close on error - let user retry or cancel
      return;
    }
    // Only close on success
    onClose();
  }

  async function handleCancel() {
    try {
      await editorService.cancel();
    } catch (error) {
      console.error('[EditorModePanel] Cancel error:', error);
      const ui = (globalThis as any).ui;
      ui?.notifications?.warn('Error during cancel - changes may not be fully reverted.');
      // Force cleanup even on error to prevent stuck state
      try {
        editorService.exitEditorMode();
      } catch {
        // Ignore secondary errors
      }
    }
    // Always close on cancel (user wants out)
    onClose();
  }
  
  // Global mouse event listeners
  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });
  
  // Settlement editor dialog state
  let showSettlementDialog = false;
  let settlementDialogHexId = '';
  let settlementDialogExisting: any = null;

  // Subscribe to settlement editor dialog store (store unsubscribe for cleanup)
  const unsubscribeSettlementDialog = settlementEditorDialog.subscribe(state => {
    showSettlementDialog = state.show;
    settlementDialogHexId = state.hexId || '';
    settlementDialogExisting = state.existingSettlement;
  });
  
  // Handle settlement editor dialog events
  function handleSettlementConfirm(event: CustomEvent<any>) {
    settlementEditorDialog.confirm(event.detail);
  }
  
  function handleSettlementCancel() {
    settlementEditorDialog.cancel();
  }

  // River editor handlers
  async function handleClearAllRivers() {
    await cellRiverEditorHandlers.clearAll();
  }

  // Lake editor handlers
  async function handleClearAllLakes() {
    await cellLakeEditorHandlers.clearAll();
  }

  // Crossing editor handlers
  async function handleClearAllCrossings() {
    await cellCrossingEditorHandlers.clearAll();
  }

  // Delete confirmation states (which section is showing confirmation)
  let deleteConfirmSection: string | null = null;

  function showDeleteConfirm(section: string) {
    deleteConfirmSection = section;
  }

  function cancelDeleteConfirm() {
    deleteConfirmSection = null;
  }

  async function confirmDelete(section: string) {
    if (section === 'rivers') {
      await handleClearAllRivers();
    } else if (section === 'lakes') {
      await handleClearAllLakes();
    } else if (section === 'crossings') {
      await handleClearAllCrossings();
    }
    deleteConfirmSection = null;
  }

  // Area eraser size options (in pixels)
  const eraserSizes = [
    { label: 'S', value: 16, title: 'Small (16px)' },
    { label: 'M', value: 32, title: 'Medium (32px)' },
    { label: 'L', value: 64, title: 'Large (64px)' }
  ];
  let selectedEraserSize = 32; // Default medium

  function setEraserSize(size: number) {
    selectedEraserSize = size;
    cellRiverEditorHandlers.setEraserRadius(size);
  }

  // Initialize eraser size when selecting area erase tool
  $: if ($currentTool === 'cell-river-area-erase') {
    cellRiverEditorHandlers.setEraserRadius(selectedEraserSize);
  }

  // Keyboard shortcuts for each section
  const sectionShortcuts: Record<string, { title: string; shortcuts: Array<{ key: string; action: string }> }> = {
    'rivers': {
      title: 'River Editor',
      shortcuts: [
        { key: 'Click', action: 'Select path' },
        { key: 'Drag', action: 'Draw river' },
        { key: 'Shift+Drag', action: 'Move vertex' },
        { key: 'Ctrl+Z', action: 'Undo last point' },
        { key: 'Ctrl+Click', action: 'Remove point' },
        { key: 'Alt', action: 'Finish path' }
      ]
    },
    'lakes': {
      title: 'Lake Editor',
      shortcuts: [
        { key: 'Click/Drag', action: 'Paint lake cells' },
        { key: '[ ]', action: 'Adjust brush size' },
        { key: 'X', action: 'Toggle paint/erase' }
      ]
    },
    'crossings': {
      title: 'Crossings Editor',
      shortcuts: [
        { key: 'Click/Drag', action: 'Paint passage' },
        { key: '[ ]', action: 'Adjust brush size' },
        { key: 'X', action: 'Toggle paint/erase' }
      ]
    },
    'roads': {
      title: 'Roads Editor',
      shortcuts: [
        { key: 'Click', action: 'Add road' },
        { key: 'Ctrl+Click', action: 'Remove road' },
        { key: 'Scissors tool', action: 'Cut road segment' }
      ]
    },
    'terrain': {
      title: 'Terrain Editor',
      shortcuts: [
        { key: 'Click', action: 'Set terrain type' },
        { key: 'Drag', action: 'Paint terrain' }
      ]
    },
    'bounty': {
      title: 'Bounty Editor',
      shortcuts: [
        { key: 'Click', action: 'Add resource' },
        { key: 'Ctrl+Click', action: 'Remove resource' }
      ]
    },
    'worksites': {
      title: 'Worksites Editor',
      shortcuts: [
        { key: 'Click', action: 'Place worksite' },
        { key: 'Ctrl+Click', action: 'Remove worksite' }
      ]
    },
    'settlements': {
      title: 'Settlements Editor',
      shortcuts: [
        { key: 'Click', action: 'Place/edit settlement' },
        { key: 'Minus tool', action: 'Remove settlement' }
      ]
    },
    'fortifications': {
      title: 'Fortifications Editor',
      shortcuts: [
        { key: 'Click', action: 'Place fortification' },
        { key: 'Ctrl+Click', action: 'Remove fortification' }
      ]
    },
    'territory': {
      title: 'Territory Editor',
      shortcuts: [
        { key: 'Click', action: 'Claim hex for selected owner' },
        { key: 'Drag', action: 'Paint territory' }
      ]
    }
  };

  // Send help to Foundry chat
  function showHelp(section: string) {
    const help = sectionShortcuts[section];
    if (!help) return;

    const shortcutLines = help.shortcuts.map(s => `<li><strong>${s.key}</strong> - ${s.action}</li>`).join('');
    const content = `
      <div style="padding: 0.5rem;">
        <h3 style="margin: 0 0 0.5rem 0; color: #8b0000;">${help.title} Shortcuts</h3>
        <ul style="margin: 0; padding-left: 1.25rem; list-style: disc;">
          ${shortcutLines}
        </ul>
      </div>
    `;

    // Send to Foundry chat
    const ChatMessage = (globalThis as any).ChatMessage;
    if (ChatMessage) {
      ChatMessage.create({
        content,
        whisper: [(globalThis as any).game?.user?.id].filter(Boolean)
      });
    }
  }
</script>

<!-- Settlement Editor Dialog -->
<SettlementEditorDialog
  bind:show={showSettlementDialog}
  hexId={settlementDialogHexId}
  existingSettlement={settlementDialogExisting}
  on:confirm={handleSettlementConfirm}
  on:cancel={handleSettlementCancel}
/>

<svelte:window />

<div
  bind:this={panelElement}
  class="editor-mode-panel"
  class:dragging={isDragging}
  style="left: {position.x}px; top: {position.y}px;"
  on:mousedown={handleMouseDown}
  role="toolbar"
  aria-label="Map Editor">
  
  <!-- Header -->
  <div class="panel-header">
    <i class="fas fa-pencil-alt"></i>
    <span>Map Editor</span>
    <button class="minimize-button" on:click={toggleMinimize} title={isMinimized ? "Expand all sections" : "Minimize to dropdown"}>
      <i class="fas {isMinimized ? 'fa-expand' : 'fa-compress'}"></i>
    </button>
    <button class="close-button" on:click={handleCancel} title="Close editor (discard changes)">
      <i class="fas fa-times"></i>
    </button>
  </div>
  
  <!-- Editor Tools -->
  <div class="editor-sections">
    
    <!-- Minimized mode: Single persistent dropdown -->
    {#if isMinimized}
      <section class="editor-section dropdown-section">
        <select class="section-dropdown" bind:value={selectedSection} on:change={handleSectionChange}>
          <option value="rivers">Rivers</option>
          <option value="lakes">Lakes</option>
          <option value="crossings">Crossings</option>
          <option value="roads">Roads</option>
          <option value="terrain">Terrain</option>
          <option value="bounty">Bounty</option>
          <option value="worksites">Worksites</option>
          <option value="settlements">Settlements</option>
          <option value="fortifications">Fortifications</option>
          <option value="territory">Territory</option>
        </select>
      </section>
    {/if}
    
    <!-- Rivers Section (Cell-based) -->
    {#if !isMinimized || selectedSection === 'rivers'}
    <section class="editor-section" class:active-section={activeSection === 'rivers'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('rivers')}>Rivers</label>
      {/if}
      <div class="tool-content">
        {#if deleteConfirmSection === 'rivers'}
        <div class="delete-confirm-row">
          <button
            class="tool-button confirm-delete"
            on:click={() => confirmDelete('rivers')}
            title="Confirm delete all rivers">
            Delete All
          </button>
          <button
            class="tool-button cancel-delete"
            on:click={cancelDeleteConfirm}
            title="Cancel">
            Cancel
          </button>
        </div>
        {:else}
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-river-edit'}
            on:click={() => setTool('cell-river-edit')}
            title="Draw Rivers - Click to add points, double-click to finish path">
            <i class="fas fa-water"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-river-erase'}
            on:click={() => setTool('cell-river-erase')}
            title="Erase Path - Click on a river to remove entire path">
            <i class="fas fa-eraser"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-river-area-erase'}
            on:click={() => setTool('cell-river-area-erase')}
            title="Area Erase - Drag to erase river points in a circular area">
            <i class="fas fa-circle" style="color: #ff6666;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-river-flip'}
            on:click={() => setTool('cell-river-flip')}
            title="Flip Direction - Click on a river to reverse its flow">
            <i class="fas fa-exchange-alt"></i>
          </button>
          <button
            class="tool-button danger"
            on:click={() => showDeleteConfirm('rivers')}
            title="Clear All - Remove all river paths">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        {/if}
        {#if $currentTool === 'cell-river-area-erase'}
        <div class="eraser-size-selector">
          <span class="size-label">Size:</span>
          {#each eraserSizes as size}
            <button
              class="size-button"
              class:active={selectedEraserSize === size.value}
              on:click={() => setEraserSize(size.value)}
              title={size.title}>
              {size.label}
            </button>
          {/each}
        </div>
        {/if}
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('rivers')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}

    <!-- Lakes Section (Cell-based) -->
    {#if !isMinimized || selectedSection === 'lakes'}
    <section class="editor-section" class:active-section={activeSection === 'lakes'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('lakes')}>Lakes</label>
      {/if}
      <div class="tool-content">
        {#if deleteConfirmSection === 'lakes'}
        <div class="delete-confirm-row">
          <button
            class="tool-button confirm-delete"
            on:click={() => confirmDelete('lakes')}
            title="Confirm delete all lakes">
            Delete All
          </button>
          <button
            class="tool-button cancel-delete"
            on:click={cancelDeleteConfirm}
            title="Cancel">
            Cancel
          </button>
        </div>
        {:else}
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-lake-paint'}
            on:click={() => setTool('cell-lake-paint')}
            title="Paint Lakes - Click and drag to paint lake cells">
            <i class="fas fa-paint-brush" style="color: #20B2AA;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-lake-erase'}
            on:click={() => setTool('cell-lake-erase')}
            title="Erase Lakes - Click and drag to erase lake cells">
            <i class="fas fa-eraser"></i>
          </button>
          <button
            class="tool-button danger"
            on:click={() => showDeleteConfirm('lakes')}
            title="Clear All - Remove all lake cells">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        {/if}
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('lakes')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}

    
    <!-- Crossings Section -->
    {#if !isMinimized || selectedSection === 'crossings'}
    <section class="editor-section" class:active-section={activeSection === 'crossings'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('crossings')}>Crossings</label>
      {/if}
      <div class="tool-content">
        {#if deleteConfirmSection === 'crossings'}
        <div class="delete-confirm-row">
          <button
            class="tool-button confirm-delete"
            on:click={() => confirmDelete('crossings')}
            title="Confirm delete all crossings">
            Delete All
          </button>
          <button
            class="tool-button cancel-delete"
            on:click={cancelDeleteConfirm}
            title="Cancel">
            Cancel
          </button>
        </div>
        {:else}
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-crossing-paint'}
            on:click={() => setTool('cell-crossing-paint')}
            title="Paint Passages - Click and drag to paint crossing cells (bridges/fords)">
            <i class="fas fa-bridge" style="color: #00FF00;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'cell-crossing-erase'}
            on:click={() => setTool('cell-crossing-erase')}
            title="Erase Passages - Click and drag to remove crossing cells">
            <i class="fas fa-eraser"></i>
          </button>
          <button
            class="tool-button danger"
            on:click={() => showDeleteConfirm('crossings')}
            title="Clear All - Remove all crossing cells">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        {/if}
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('crossings')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
    <!-- Roads Section -->
    {#if !isMinimized || selectedSection === 'roads'}
    <section class="editor-section" class:active-section={activeSection === 'roads'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('roads')}>Roads</label>
      {/if}
      <div class="tool-content">
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'road-edit'}
            on:click={() => setTool('road-edit')}
            title="Roads - Click hex to add road, Ctrl+Click to remove">
            <i class="fas fa-road"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'road-scissors'}
            on:click={() => setTool('road-scissors')}
            title="Cut Roads - Click on a segment to break the connection">
            <i class="fas fa-cut"></i>
          </button>
        </div>
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('roads')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
    <!-- Terrain Section -->
    {#if !isMinimized || selectedSection === 'terrain'}
    <section class="editor-section terrain-section" class:active-section={activeSection === 'terrain'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('terrain')}>Terrain</label>
      {/if}
      <div class="tool-content">
        <div class="tool-buttons terrain-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'terrain-plains'}
            on:click={() => setTool('terrain-plains')}
            title="Plains">
            <i class="fas fa-wheat-awn" style="color: #90C650;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'terrain-forest'}
            on:click={() => setTool('terrain-forest')}
            title="Forest">
            <i class="fas fa-tree" style="color: #228B22;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'terrain-hills'}
            on:click={() => setTool('terrain-hills')}
            title="Hills">
            <i class="fa-solid fa-mound" style="color: #8B7355;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'terrain-mountains'}
            on:click={() => setTool('terrain-mountains')}
            title="Mountains">
            <i class="fas fa-mountain" style="color: #808080;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'terrain-swamp'}
            on:click={() => setTool('terrain-swamp')}
            title="Swamp">
            <i class="fa-solid fa-seedling" style="color: #6B8E23;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'terrain-desert'}
            on:click={() => setTool('terrain-desert')}
            title="Desert">
            <i class="fas fa-sun" style="color: #EDC9AF;"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'terrain-water'}
            on:click={() => setTool('terrain-water')}
            title="Water">
            <i class="fas fa-tint" style="color: #4682B4;"></i>
          </button>
        </div>
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('terrain')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
    <!-- Bounty Section -->
    {#if !isMinimized || selectedSection === 'bounty'}
    <section class="editor-section" class:active-section={activeSection === 'bounty'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('bounty')}>Bounty</label>
      {/if}
      <div class="tool-content">
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'bounty-food'}
            on:click={() => setTool('bounty-food')}
            title="Food - Click to add">
            <i class="fas fa-wheat-awn" style="color: var(--icon-food);"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'bounty-lumber'}
            on:click={() => setTool('bounty-lumber')}
            title="Lumber - Click to add">
            <i class="fas fa-tree" style="color: var(--icon-lumber);"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'bounty-stone'}
            on:click={() => setTool('bounty-stone')}
            title="Stone - Click to add">
            <i class="fas fa-cube" style="color: var(--icon-stone);"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'bounty-ore'}
            on:click={() => setTool('bounty-ore')}
            title="Ore - Click to add">
            <i class="fas fa-mountain" style="color: var(--icon-ore);"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'bounty-gold'}
            on:click={() => setTool('bounty-gold')}
            title="Gold - Click to add">
            <i class="fas fa-coins" style="color: var(--icon-gold);"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'bounty-minus'}
            on:click={() => setTool('bounty-minus')}
            title="Remove - Click to clear bounty from hex">
            <i class="fa-solid fa-minus"></i>
          </button>
        </div>
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('bounty')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
    <!-- Worksites Section -->
    {#if !isMinimized || selectedSection === 'worksites'}
    <section class="editor-section" class:active-section={activeSection === 'worksites'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('worksites')}>Worksites</label>
      {/if}
      <div class="tool-content">
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'worksite-farm'}
            on:click={() => setTool('worksite-farm')}
            title="Farmstead - Click to place, Ctrl+Click to remove">
            <i class="fas fa-wheat-awn"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'worksite-lumber-mill'}
            on:click={() => setTool('worksite-lumber-mill')}
            title="Logging Camp - Click to place (forest only), Ctrl+Click to remove">
            <i class="fas fa-tree"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'worksite-mine'}
            on:click={() => setTool('worksite-mine')}
            title="Mine - Click to place (mountains/swamp), Ctrl+Click to remove">
            <i class="fas fa-hammer"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'worksite-quarry'}
            on:click={() => setTool('worksite-quarry')}
            title="Quarry - Click to place (hills/mountains), Ctrl+Click to remove">
            <i class="fas fa-cube"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'worksite-minus'}
            on:click={() => setTool('worksite-minus')}
            title="Remove - Click to clear worksite from hex">
            <i class="fa-solid fa-minus"></i>
          </button>
        </div>
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('worksites')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
    <!-- Settlements Section -->
    {#if !isMinimized || selectedSection === 'settlements'}
    <section class="editor-section" class:active-section={activeSection === 'settlements'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('settlements')}>Settlements</label>
      {/if}
      <div class="tool-content">
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'settlement-place'}
            on:click={() => setTool('settlement-place')}
            title="Settlement - Click to place/edit">
            <i class="fas fa-city"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'settlement-minus'}
            on:click={() => setTool('settlement-minus')}
            title="Remove - Click to clear settlement marker from hex">
            <i class="fa-solid fa-minus"></i>
          </button>
        </div>
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('settlements')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
    <!-- Fortifications Section -->
    {#if !isMinimized || selectedSection === 'fortifications'}
    <section class="editor-section" class:active-section={activeSection === 'fortifications'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('fortifications')}>Fortifications</label>
      {/if}
      <div class="tool-content">
        <div class="tool-buttons">
          <button
            class="tool-button"
            class:active={$currentTool === 'fortification-tier1'}
            on:click={() => setTool('fortification-tier1')}
            title="Earthworks (Tier 1) - Click to place, Ctrl+Click to remove">
            <i class="fas fa-border-all"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'fortification-tier2'}
            on:click={() => setTool('fortification-tier2')}
            title="Wooden Tower (Tier 2) - Click to place, Ctrl+Click to remove">
            <i class="fas fa-archway"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'fortification-tier3'}
            on:click={() => setTool('fortification-tier3')}
            title="Stone Tower (Tier 3) - Click to place, Ctrl+Click to remove">
            <i class="fas fa-dungeon"></i>
          </button>
          <button
            class="tool-button"
            class:active={$currentTool === 'fortification-tier4'}
            on:click={() => setTool('fortification-tier4')}
            title="Fortress (Tier 4) - Click to place, Ctrl+Click to remove">
            <i class="fas fa-fort-awesome"></i>
          </button>
        </div>
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('fortifications')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
    <!-- Territory Section -->
    {#if !isMinimized || selectedSection === 'territory'}
    <section class="editor-section territory-claim-section" class:active-section={activeSection === 'territory'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('territory')}>Territory</label>
      {/if}
      <div class="tool-content">
        <div class="territory-controls">
          <div class="color-swatch-wrapper">
            <div
              class="color-swatch"
              class:unclaimed={selectedClaimOwner === 'null'}
              style="background-color: {selectedClaimOwner === 'null'
                ? '#444444'
                : selectedClaimOwner === 'player'
                  ? ($kingdomData.playerKingdomColor || '#5b9bd5')
                  : ($kingdomData.factions?.find(f => f.id === selectedClaimOwner)?.color || '#666666')};"
              title="{selectedClaimOwner === 'null' ? 'Unclaimed territory' : 'Click to change faction color'}">
              {#if selectedClaimOwner === 'null'}
                <i class="fas fa-times"></i>
              {/if}
            </div>
            {#if selectedClaimOwner !== 'null'}
              <input
                type="color"
                bind:this={colorPickerInput}
                value={selectedClaimOwner === 'player'
                  ? ($kingdomData.playerKingdomColor || '#5b9bd5')
                  : ($kingdomData.factions?.find(f => f.id === selectedClaimOwner)?.color || '#666666')}
                on:change={handleColorChange}
                class="color-picker-input"
                title="Click to change faction color"
              />
            {/if}
          </div>
          <select
            class="faction-dropdown"
            bind:value={selectedClaimOwner}
            on:change={handleClaimOwnerChange}
            title="Select owner to claim hexes">
            <option value="null">Unclaimed</option>
            <option value="player">{$kingdomData.name || 'Player Kingdom'}</option>
            {#each $kingdomData.factions || [] as faction}
              <option value={faction.id}>{faction.name}</option>
            {/each}
          </select>
        </div>
      </div>
      <button
        class="tool-button help-button section-help"
        on:click={() => showHelp('territory')}
        title="Show keyboard shortcuts in chat">
        <i class="fas fa-question"></i>
      </button>
    </section>
    {/if}
    
  </div>
  
  <!-- Actions -->
  <div class="panel-actions">
    <button class="action-button cancel-button" on:click={handleCancel}>
      <i class="fas fa-times"></i> Cancel
    </button>
    <button class="action-button save-button" on:click={handleSave}>
      <i class="fas fa-check"></i> Save
    </button>
  </div>
</div>

<style lang="scss">
  .editor-mode-panel {
    position: fixed;
    z-index: 1000;
    background: rgba(20, 20, 20, 0.95);
    border: 2px solid var(--color-primary, #8b0000);
    border-radius: var(--radius-xl);
    box-shadow: 0 0.25rem 1.25rem var(--overlay-high);
    min-width: 17.5rem;
    user-select: none;
    backdrop-filter: blur(0.625rem);
    
    &.dragging {
      cursor: grabbing;
      opacity: 0.9;
    }
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-12) var(--space-16);
    background: rgba(139, 0, 0, 0.3);
    border-bottom: 1px solid var(--border-subtle);
    cursor: grab;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    
    &:active {
      cursor: grabbing;
    }
    
    i.fa-pencil-alt {
      color: var(--color-primary, #8b0000);
      font-size: var(--font-md);
    }
    
    .minimize-button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      transition: all 0.2s;
      
      &:hover {
        color: #fff;
        background: var(--hover);
      }
      
      i {
        font-size: var(--font-sm);
      }
    }
    
    span {
      flex: 1;
      font-weight: 600;
      font-size: var(--font-sm);
      text-transform: uppercase;
      letter-spacing: 0.05rem;
      color: #fff;
    }
    
    .close-button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      transition: all 0.2s;
      
      &:hover {
        color: #fff;
        background: var(--hover);
      }
      
      i {
        font-size: var(--font-sm);
      }
    }
  }
  
  .editor-sections {
    padding: var(--space-12);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  
  .editor-section {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-8);
    border-radius: var(--radius-lg);
    transition: all 0.2s;
    border: 2px solid transparent;

    &.active-section {
      border: 2px solid var(--color-primary);
      box-shadow: 0 0 12px rgba(139, 0, 0, 0.4);
    }
    
    .section-label {
      font-size: var(--font-md);
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      width: 6.25rem;
      cursor: pointer;
      padding: var(--space-4);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      
      &:hover {
        background: var(--hover);
        color: #fff;
      }
    }
    
    .section-dropdown {
      min-width: 9.375rem;
      padding: var(--space-8) var(--space-12);
      background: var(--hover);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-lg);
      color: #fff;
      font-size: var(--font-sm);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      line-height: normal;
      height: auto;
      min-height: 2rem;
      display: flex;
      align-items: center;
      
      &:hover {
        background: var(--hover-high);
        border-color: var(--border-medium);
      }
      
      &:focus {
        outline: none;
        border-color: var(--color-primary, #8b0000);
        box-shadow: 0 0 0 0.125rem rgba(139, 0, 0, 0.2);
      }
      
      option {
        background: #1a1a1a;
        color: #fff;
        padding: var(--space-8);
        line-height: normal;
      }
    }
    
    .tool-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      flex: 1;
    }

    .tool-buttons {
      display: flex;
      gap: var(--space-8);
    }

    .delete-confirm-row {
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }

    .section-help {
      margin-left: auto;
      flex-shrink: 0;
      align-self: flex-start;
    }

    .shortcut-help {
      display: flex;
      gap: var(--space-16);
      font-size: var(--font-sm);
      color: rgba(255, 255, 255, 0.6);
      padding-top: var(--space-4);

      span {
        display: flex;
        align-items: center;
        gap: var(--space-6);
      }

      kbd {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: inherit;
        font-size: var(--font-xs);
        color: rgba(255, 255, 255, 0.8);
      }
    }

    .eraser-size-selector {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding-top: var(--space-4);

      .size-label {
        font-size: var(--font-sm);
        color: rgba(255, 255, 255, 0.6);
      }

      .size-button {
        padding: var(--space-4) var(--space-8);
        background: var(--hover-low);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        font-size: var(--font-xs);
        font-weight: 600;
        min-width: 28px;
        transition: all 0.15s;

        &:hover {
          background: var(--hover);
          border-color: var(--border-default);
          color: #fff;
        }

        &.active {
          background: rgba(255, 102, 102, 0.3);
          border-color: #ff6666;
          color: #ff6666;
        }
      }
    }
    
    .tool-button {
      padding: var(--space-8) var(--space-12);
      background: var(--hover-low);
      border: 2px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s;
      font-size: var(--font-md);
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: var(--hover);
        border-color: var(--border-default);
        color: #fff;
        transform: translateY(-0.0625rem);
      }
      
      &.active {
        background: rgba(139, 0, 0, 0.4);
        border-color: var(--color-primary, #8b0000);
        box-shadow: 0 0 0.625rem rgba(139, 0, 0, 0.3);
      }

      &.danger {
        color: rgba(255, 100, 100, 0.8);

        &:hover {
          background: rgba(180, 50, 50, 0.4);
          border-color: rgba(200, 80, 80, 0.8);
          color: #ff6666;
        }
      }

      &.confirm-delete {
        background: rgba(180, 50, 50, 0.6);
        border-color: rgba(200, 80, 80, 0.8);
        color: #fff;
        font-size: var(--font-sm);
        padding: var(--space-6) var(--space-12);

        &:hover {
          background: rgba(200, 60, 60, 0.8);
          border-color: #ff6666;
        }
      }

      &.cancel-delete {
        background: var(--hover);
        border-color: var(--border-default);
        color: rgba(255, 255, 255, 0.8);
        font-size: var(--font-sm);
        padding: var(--space-6) var(--space-12);

        &:hover {
          background: var(--hover-high);
          color: #fff;
        }
      }

      &.help-button {
        background: transparent;
        border-color: transparent;
        color: rgba(255, 255, 255, 0.4);
        padding: var(--space-4) var(--space-8);
        font-size: var(--font-sm);

        &:hover {
          background: var(--hover-low);
          border-color: var(--border-subtle);
          color: rgba(255, 255, 255, 0.7);
          transform: none;
        }
      }
    }

    &.territory-claim-section {
      .territory-controls {
        display: flex;
        gap: var(--space-8);
        flex: 1;
        align-items: center;

        .color-swatch-wrapper {
          position: relative;
          width: 2.5rem;
          height: 2.5rem;
          flex-shrink: 0;
        }

        .color-swatch {
          width: 100%;
          height: 100%;
          border-radius: var(--radius-lg);
          border: 3px solid var(--border-strong);
          box-shadow: 0 0.1875rem 0.375rem rgba(0, 0, 0, 0.4);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;

          &.unclaimed {
            border-style: dashed;

            i {
              color: rgba(255, 255, 255, 0.5);
              font-size: var(--font-md);
            }
          }
        }

        .color-picker-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          opacity: 0;
          z-index: 1;

          &::-webkit-color-swatch-wrapper {
            padding: 0;
          }

          &::-webkit-color-swatch {
            border: none;
            border-radius: var(--radius-lg);
          }

          &::-moz-color-swatch {
            border: none;
            border-radius: var(--radius-lg);
          }
        }

        .color-swatch-wrapper:hover .color-swatch {
          transform: scale(1.05);
          border-color: var(--color-primary, #8b0000);
          box-shadow: 0 0.25rem 0.5rem var(--overlay-high);
        }

        .color-swatch-wrapper:active .color-swatch {
          transform: scale(0.98);
        }

        .color-swatch-wrapper:has(.color-swatch.unclaimed):hover .color-swatch {
          border-color: var(--border-strong);
        }
        
        .faction-dropdown {
          flex: 1;
          padding: var(--space-8) var(--space-12);
          background: var(--hover-low);
          border: 2px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          transition: all 0.2s;
          font-size: var(--font-sm);
          line-height: 1.5;
          height: auto;
          min-height: 2.5rem;
          display: flex;
          align-items: center;
          
          &:hover {
            background: var(--hover);
            border-color: var(--border-default);
            color: #fff;
          }
          
          &:focus {
            outline: none;
            border-color: var(--color-primary, #8b0000);
            box-shadow: 0 0 0 0.125rem rgba(139, 0, 0, 0.2);
          }
          
          option {
            background: #1a1a1a;
            color: #fff;
            padding: var(--space-8);
            line-height: 1.5;
          }
        }
      }
    }
  }
  
  .panel-actions {
    display: flex;
    gap: var(--space-8);
    padding: var(--space-12);
    border-top: 1px solid var(--border-subtle);
    
    .action-button {
      flex: 1;
      padding: var(--space-12) var(--space-16);
      border: none;
      border-radius: var(--radius-lg);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      font-size: var(--font-sm);
      
      &.cancel-button {
        background: var(--hover);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid var(--border-default);
        
        &:hover {
          background: var(--hover-high);
          color: #fff;
        }
      }
      
      &.save-button {
        background: var(--color-primary, #8b0000);
        color: #fff;
        
        &:hover {
          background: rgba(139, 0, 0, 0.8);
          transform: translateY(-0.0625rem);
          box-shadow: 0 0.125rem 0.5rem rgba(139, 0, 0, 0.4);
        }
      }
    }
  }
</style>
