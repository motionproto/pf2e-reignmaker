<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { getEditorModeService, type EditorTool } from '../../services/map/core/EditorModeService';
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
  
  // Territory claim state
  let selectedClaimOwner: string | null = 'player';  // 'player' or faction.id
  
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
  function handleSectionChange(event: Event) {
    event.stopPropagation();
    const target = event.target as HTMLSelectElement;
    const newSection = target.value;
    
    isChangingSection = true;
    selectedSection = newSection;
    localStorage.setItem('reignmaker-editor-panel-section', newSection);
    
    // Ensure the tool is set for the new section
    const defaultTools: Record<string, EditorTool> = {
      'waterways': 'river-edit',
      'crossings': 'waterfall-toggle',
      'roads': 'road-edit',
      'terrain': 'terrain-plains',
      'bounty': 'bounty-food',
      'worksites': 'worksite-farm',
      'settlements': 'settlement-place',
      'fortifications': 'fortification-tier1',
      'territory': 'claimed-by'
    };
    
    const tool = defaultTools[newSection];
    if (tool) {
      currentTool.set(tool);
      editorService.setTool(tool);
    }
    
    setTimeout(() => { isChangingSection = false; }, 100);
  }
  
  // Determine active section based on current tool
  $: activeSection = getActiveSection($currentTool);
  
  function getActiveSection(tool: EditorTool): string | null {
    if (tool === 'inactive') return null;
    if (['river-edit', 'river-scissors', 'river-reverse', 'lake-toggle', 'swamp-toggle'].includes(tool)) {
      return 'waterways';
    }
    if (['waterfall-toggle', 'bridge-toggle', 'ford-toggle'].includes(tool)) {
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
    if (tool === 'settlement-place') {
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
  
  // Select section (set default tool for that section)
  async function selectSection(section: string): Promise<void> {
    const defaultTools: Record<string, EditorTool> = {
      'waterways': 'river-edit',
      'crossings': 'waterfall-toggle',
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
        editorService.setClaimOwner(selectedClaimOwner);
      }
      await setTool(tool);
    }
  }
  
  // Handle claim owner selection
  function selectClaimOwner(owner: string | null) {
    selectedClaimOwner = owner;
    editorService.setClaimOwner(owner);
    setTool('claimed-by');
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
    } finally {
      // Always close the panel, even if there's an error
      onClose();
    }
  }
  
  async function handleCancel() {
    try {
      await editorService.cancel();
    } catch (error) {
      console.error('[EditorModePanel] Cancel error:', error);
    } finally {
      // Always close the panel, even if there's an error
      onClose();
    }
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
  
  // Subscribe to settlement editor dialog store
  settlementEditorDialog.subscribe(state => {
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
          <option value="waterways">Waterways</option>
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
    
    <!-- Waterways Section -->
    {#if !isMinimized || selectedSection === 'waterways'}
    <section class="editor-section" class:active-section={activeSection === 'waterways'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('waterways')}>Waterways</label>
      {/if}
      <div class="tool-buttons">
        <button
          class="tool-button"
          class:active={$currentTool === 'river-edit'}
          on:click={() => setTool('river-edit')}
          title="Draw Rivers - Click connectors to add points, double-click to finish">
          <i class="fas fa-water"></i>
        </button>
        <button
          class="tool-button"
          class:active={$currentTool === 'river-scissors'}
          on:click={() => setTool('river-scissors')}
          title="Cut Rivers - Click on a segment to split the path">
          <i class="fas fa-cut"></i>
        </button>
        <button
          class="tool-button"
          class:active={$currentTool === 'river-reverse'}
          on:click={() => setTool('river-reverse')}
          title="Reverse Flow - Click on a path to reverse its direction">
          <i class="fas fa-exchange-alt"></i>
        </button>
        <button
          class="tool-button"
          class:active={$currentTool === 'lake-toggle'}
          on:click={() => setTool('lake-toggle')}
          title="Lake - Click hex to toggle lake (open water)">
          <i class="fas fa-tint"></i>
        </button>
        <button
          class="tool-button"
          class:active={$currentTool === 'swamp-toggle'}
          on:click={() => setTool('swamp-toggle')}
          title="Swamp - Click hex to toggle swamp (difficult water)">
          <i class="fa-solid fa-seedling"></i>
        </button>
      </div>
    </section>
    {/if}
    
    <!-- Crossings Section -->
    {#if !isMinimized || selectedSection === 'crossings'}
    <section class="editor-section" class:active-section={activeSection === 'crossings'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('crossings')}>Crossings</label>
      {/if}
      <div class="tool-buttons">
        <button
          class="tool-button"
          class:active={$currentTool === 'waterfall-toggle'}
          on:click={() => setTool('waterfall-toggle')}
          title="Waterfall - Click edge to toggle waterfall (blocks boats)">
          <i class="fas fa-angle-double-down"></i>
        </button>
        <button
          class="tool-button"
          class:active={$currentTool === 'bridge-toggle'}
          on:click={() => setTool('bridge-toggle')}
          title="Bridge - Click edge to toggle bridge (allows crossing)">
          <i class="fas fa-archway"></i>
        </button>
        <button
          class="tool-button"
          class:active={$currentTool === 'ford-toggle'}
          on:click={() => setTool('ford-toggle')}
          title="Ford - Click edge to toggle ford (allows crossing)">
          <i class="fas fa-water"></i>
        </button>
      </div>
    </section>
    {/if}
    
    <!-- Roads Section -->
    {#if !isMinimized || selectedSection === 'roads'}
    <section class="editor-section" class:active-section={activeSection === 'roads'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('roads')}>Roads</label>
      {/if}
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
    </section>
    {/if}
    
    <!-- Terrain Section -->
    {#if !isMinimized || selectedSection === 'terrain'}
    <section class="editor-section terrain-section" class:active-section={activeSection === 'terrain'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('terrain')}>Terrain</label>
      {/if}
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
    </section>
    {/if}
    
    <!-- Bounty Section -->
    {#if !isMinimized || selectedSection === 'bounty'}
    <section class="editor-section" class:active-section={activeSection === 'bounty'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('bounty')}>Bounty</label>
      {/if}
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
    </section>
    {/if}
    
    <!-- Worksites Section -->
    {#if !isMinimized || selectedSection === 'worksites'}
    <section class="editor-section" class:active-section={activeSection === 'worksites'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('worksites')}>Worksites</label>
      {/if}
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
      </div>
    </section>
    {/if}
    
    <!-- Settlements Section -->
    {#if !isMinimized || selectedSection === 'settlements'}
    <section class="editor-section" class:active-section={activeSection === 'settlements'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('settlements')}>Settlements</label>
      {/if}
      <div class="tool-buttons">
        <button
          class="tool-button"
          class:active={$currentTool === 'settlement-place'}
          on:click={() => setTool('settlement-place')}
          title="Settlement - Click to place, Ctrl+Click to remove">
          <i class="fas fa-city"></i>
        </button>
      </div>
    </section>
    {/if}
    
    <!-- Fortifications Section -->
    {#if !isMinimized || selectedSection === 'fortifications'}
    <section class="editor-section" class:active-section={activeSection === 'fortifications'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('fortifications')}>Fortifications</label>
      {/if}
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
    </section>
    {/if}
    
    <!-- Territory Section -->
    {#if !isMinimized || selectedSection === 'territory'}
    <section class="editor-section territory-claim-section" class:active-section={activeSection === 'territory'}>
      {#if !isMinimized}
        <label class="section-label" on:click={() => selectSection('territory')}>Territory</label>
      {/if}
      <div class="territory-controls">
        <div 
          class="color-swatch"
          style="background-color: {selectedClaimOwner === 'player' 
            ? ($kingdomData.playerKingdomColor || '#5b9bd5')
            : ($kingdomData.factions?.find(f => f.id === selectedClaimOwner)?.color || '#666666')};"
          title="Claim color">
        </div>
        <select 
          class="faction-dropdown"
          bind:value={selectedClaimOwner}
          on:change={() => selectClaimOwner(selectedClaimOwner)}
          title="Select owner to claim hexes">
          <option value="player">{$kingdomData.name || 'Player Kingdom'}</option>
          {#each $kingdomData.factions || [] as faction}
            <option value={faction.id}>{faction.name}</option>
          {/each}
        </select>
      </div>
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
    box-shadow: 0 0.2500rem 1.2500rem rgba(0, 0, 0, 0.5);
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
    border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);
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
        background: rgba(255, 255, 255, 0.1);
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
      letter-spacing: 0.0500rem;
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
        background: rgba(255, 255, 255, 0.1);
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
    
    &.active-section {
      background-color: var(--bg-elevated) ;
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
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
    }
    
    .section-dropdown {
      min-width: 9.375rem;
      padding: var(--space-8) var(--space-12);
      background: rgba(255, 255, 255, 0.1);
      border: 0.1250rem solid rgba(255, 255, 255, 0.2);
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
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }
      
      &:focus {
        outline: none;
        border-color: var(--color-primary, #8b0000);
        box-shadow: 0 0 0 0.1250rem rgba(139, 0, 0, 0.2);
      }
      
      option {
        background: #1a1a1a;
        color: #fff;
        padding: var(--space-8);
        line-height: normal;
      }
    }
    
    .tool-buttons {
      display: flex;
      gap: var(--space-8);
    }
    
    .tool-button {
      padding: var(--space-8) var(--space-12);
      background: rgba(255, 255, 255, 0.05);
      border: 0.1250rem solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-lg);
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s;
      font-size: var(--font-md);
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: #fff;
        transform: translateY(-0.0625rem);
      }
      
      &.active {
        background: rgba(139, 0, 0, 0.4);
        border-color: var(--color-primary, #8b0000);
        box-shadow: 0 0 0.625rem rgba(139, 0, 0, 0.3);
      }
    }
    
    &.territory-claim-section {
      .territory-controls {
        display: flex;
        gap: var(--space-8);
        flex: 1;
        align-items: center;
        
        .color-swatch {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: var(--radius-lg);
          border: 0.1875rem solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 0.1875rem 0.375rem rgba(0, 0, 0, 0.4);
          flex-shrink: 0;
          transition: all 0.2s;
          
          &:hover {
            transform: scale(1.05);
            border-color: rgba(255, 255, 255, 0.6);
            box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.5);
          }
        }
        
        .faction-dropdown {
          flex: 1;
          padding: var(--space-8) var(--space-12);
          background: rgba(255, 255, 255, 0.05);
          border: 0.1250rem solid rgba(255, 255, 255, 0.1);
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
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: #fff;
          }
          
          &:focus {
            outline: none;
            border-color: var(--color-primary, #8b0000);
            box-shadow: 0 0 0 0.1250rem rgba(139, 0, 0, 0.2);
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
    border-top: 0.0625rem solid rgba(255, 255, 255, 0.1);
    
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
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 0.0625rem solid rgba(255, 255, 255, 0.2);
        
        &:hover {
          background: rgba(255, 255, 255, 0.15);
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
