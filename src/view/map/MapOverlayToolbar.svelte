<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ReignMakerMapLayer } from '../../services/map/core/ReignMakerMapLayer';
  import { getOverlayManager } from '../../services/map/core/OverlayManager';
  import { getEditorModeService } from '../../services/map/core/EditorModeService';
  import EditorModePanel from './EditorModePanel.svelte';
  import FactionVisibilityDropdown from './FactionVisibilityDropdown.svelte';
  import { logger } from '../../utils/Logger';

  // Toolbar state
  let isDragging = false;
  let position = { x: 100, y: 100 };
  let dragStart = { x: 0, y: 0 };
  let toolbarElement: HTMLDivElement;

  // Editor panel state
  let showEditorPanel = false;
  let editorPanelMountPoint: HTMLElement | null = null;
  let editorPanelComponent: any = null;

  // Debug mode states
  let debugHexMode = false;
  let debugEdgeMode = false;
  let debugNeighborsMode = false;

  // Check if user is GM
  const isGM = (globalThis as any).game?.user?.isGM ?? false;

  // Map layer and overlay manager instances
  const mapLayer = ReignMakerMapLayer.getInstance();
  const overlayManager = getOverlayManager();
  const editorService = getEditorModeService();

  // Get all registered overlays (static list)
  const allOverlays = overlayManager.getAllOverlays();
  
  // Filter overlays: show debug overlays only to GMs
  const overlays = allOverlays.filter(overlay => {
    // Debug overlays (contain "debug" in ID) only visible to GMs
    if (overlay.id.includes('debug')) {
      return isGM;
    }
    // Hide internal overlays (like hover)
    if (overlay.id === 'interactive-hover') {
      return false;
    }
    // Hide territory-border - it's linked to territories overlay
    if (overlay.id === 'territory-border') {
      return false;
    }
    // Hide province overlays - now integrated into territories overlay
    if (overlay.id === 'provinces' || overlay.id === 'provinces-fill') {
      return false;
    }
    // Hide settlement-labels - linked to settlements overlay
    if (overlay.id === 'settlement-labels') {
      return false;
    }
    return true;
  });
  
  // Subscribe to active overlays store for reactive UI updates
  const activeOverlaysStore = overlayManager.getActiveOverlaysStore();

  // Load saved position and restore overlay states
  onMount(async () => {
    const savedPosition = localStorage.getItem('reignmaker-toolbar-position');
    if (savedPosition) {
      position = JSON.parse(savedPosition);
    }
    
    // IMPORTANT: Ensure PIXI container is visible when toolbar opens
    // This is critical for overlays to be visible
    mapLayer.showPixiContainer();

    // Restore overlay states using OverlayManager
    await overlayManager.restoreState();
  });

  // Dragging handlers
  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.toolbar-button')) return; // Don't drag when clicking buttons
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
      // Save position to localStorage
      localStorage.setItem('reignmaker-toolbar-position', JSON.stringify(position));
    }
  }

  // Toggle overlay using OverlayManager
  async function toggleOverlay(overlayId: string) {
    try {
      await overlayManager.toggleOverlay(overlayId);
      // No manual state update needed - reactive store will update automatically
    } catch (error) {
      logger.error(`[MapOverlayToolbar] Failed to toggle overlay ${overlayId}:`, error);
      // State will be automatically rolled back by OverlayManager
    }
  }

  // Add global mouse event listeners
  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  // Clean up editor panel if toolbar is destroyed while editor is open
  onDestroy(() => {
    if (editorPanelComponent) {
      editorPanelComponent.$destroy();
      editorPanelComponent = null;
    }
    if (editorPanelMountPoint) {
      editorPanelMountPoint.remove();
      editorPanelMountPoint = null;
    }
  });

  // Dispatch custom event to notify parent when toolbar is closed
  function closeToolbar() {
    // Don't clear overlays when manually closing - they should stay visible
    // Only hide the toolbar UI itself
    
    // Dispatch close event
    toolbarElement.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  // Open editor panel
  async function openEditor() {
    if (showEditorPanel) return;
    
    showEditorPanel = true;
    
    // Ensure rivers overlay is active for water editing
    if (!$activeOverlaysStore.has('rivers')) {
      await overlayManager.toggleOverlay('rivers');
    }
    
    // Create mount point
    editorPanelMountPoint = document.createElement('div');
    editorPanelMountPoint.id = 'editor-panel-mount';
    document.body.appendChild(editorPanelMountPoint);
    
    // Mount editor panel
    editorPanelComponent = new EditorModePanel({
      target: editorPanelMountPoint,
      props: {
        onClose: closeEditor
      }
    });
  }
  
  // Close editor panel
  function closeEditor() {
    if (!showEditorPanel) return;
    
    showEditorPanel = false;
    
    // Unmount component
    if (editorPanelComponent) {
      editorPanelComponent.$destroy();
      editorPanelComponent = null;
    }
    
    // Remove mount point
    if (editorPanelMountPoint) {
      editorPanelMountPoint.remove();
      editorPanelMountPoint = null;
    }
  }

  // Toggle hex debug mode
  function toggleDebugHex() {
    debugHexMode = editorService.toggleDebugHex();
  }
  
  // Toggle edge debug mode
  function toggleDebugEdge() {
    debugEdgeMode = editorService.toggleDebugEdge();
  }
  
  // Toggle neighbors debug mode
  function toggleDebugNeighbors() {
    debugNeighborsMode = editorService.toggleDebugNeighbors();
  }
</script>

<svelte:window />

<div 
  bind:this={toolbarElement}
  class="map-overlay-toolbar" 
  class:dragging={isDragging}
  style="left: {position.x}px; top: {position.y}px;"
  on:mousedown={handleMouseDown}
  role="toolbar"
  aria-label="Map Overlay Controls"
>
  <div class="toolbar-header">
    <i class="fas fa-chess-rook"></i>
    <span>Map Overlays</span>
    <button class="close-button" on:click={closeToolbar} title="Close toolbar">
      <i class="fas fa-times"></i>
    </button>
  </div>
  
  <div class="debug-tools">
    <button 
      class="debug-toggle" 
      class:active={debugHexMode}
      on:click={toggleDebugHex} 
      title="Toggle Hex Debug (logs hex IDs on click)"
    >
      <i class="fas fa-hexagon"></i>
    </button>
    <button 
      class="debug-toggle" 
      class:active={debugEdgeMode}
      on:click={toggleDebugEdge} 
      title="Toggle Edge Debug (logs edge IDs on click)"
    >
      <i class="fas fa-grip-lines"></i>
    </button>
    <button 
      class="debug-toggle" 
      class:active={debugNeighborsMode}
      on:click={toggleDebugNeighbors} 
      title="Toggle Neighbors Debug (logs neighbor hex IDs)"
    >
      <i class="fas fa-arrows-alt"></i>
    </button>
  </div>
  
  <div class="toolbar-buttons">
    {#each overlays as overlay}
      <div class="overlay-row">
        <button
          class="toolbar-button"
          class:active={$activeOverlaysStore.has(overlay.id)}
          on:click={() => toggleOverlay(overlay.id)}
          title="Toggle {overlay.name} Overlay"
        >
          <i class="fas {overlay.icon}"></i>
          <span>{overlay.name}</span>
        </button>

        {#if overlay.id === 'territories'}
          <FactionVisibilityDropdown />
        {/if}
      </div>
    {/each}
    
    {#if isGM}
      <div class="toolbar-divider"></div>
      
      <button 
        class="toolbar-button editor-button" 
        on:click={openEditor}
        title="Open Map Editor (GM Only)"
      >
        <i class="fas fa-pencil-alt"></i>
        <span>Map Editor</span>
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  .map-overlay-toolbar {
    position: fixed;
    z-index: 1000;
    background: rgba(20, 20, 20, 0.95);
    border: 2px solid var(--color-primary, #8b0000);
    border-radius: var(--radius-xl);
    box-shadow: 0 0.25rem 1.25rem var(--overlay-high);
    min-width: 12.5rem;
    user-select: none;
    backdrop-filter: blur(0.625rem);
    
    &.dragging {
      cursor: grabbing;
      opacity: 0.9;
    }
  }
  
  .toolbar-header {
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
    
    i {
      color: var(--color-primary, #8b0000);
      font-size: var(--font-md);
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
        color: inherit;
        font-size: var(--font-sm);
      }
    }
  }
  
  .debug-tools {
    display: flex;
    gap: var(--space-8);
    padding: var(--space-8) var(--space-12);
    border-bottom: 1px solid var(--border-subtle);
    background: var(--overlay-low);
  }
  
  .debug-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    background: var(--hover-low);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      color: rgba(100, 200, 255, 0.9);
      background: rgba(100, 200, 255, 0.1);
      border-color: var(--border-info-subtle);
    }
    
    &.active {
      color: #00FF00;
      background: rgba(0, 255, 0, 0.15);
      border-color: var(--border-success);
      
      i {
        animation: pulse 2s ease-in-out infinite;
      }
    }
    
    i {
      color: inherit;
      font-size: var(--font-md);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
  
  .toolbar-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-12);
  }
  
  .overlay-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-4);
  }
  
  .toolbar-divider {
    height: 0.0625rem;
    background: var(--hover);
    margin: var(--space-4) 0;
  }
  
  .toolbar-button {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    height: 2rem;
    padding: 0 var(--space-12);
    background: var(--hover-low);
    border: 2px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s;
    font-size: var(--font-sm);
    font-weight: 500;
    flex: 1;
    
    &:hover {
      background: var(--hover);
      border-color: var(--border-default);
      color: #fff;
      transform: translateY(-0.0625rem);
    }
    
    &.active {
      background: rgba(139, 0, 0, 0.4);
      border-color: var(--color-primary, #8b0000);
      color: #fff;
      box-shadow: 0 0 0.625rem rgba(139, 0, 0, 0.3);
      
      i {
        color: var(--color-primary, #8b0000);
      }
    }
    
    i {
      font-size: var(--font-lg);
      min-width: 1.25rem;
      text-align: center;
    }
    
    span {
      flex: 1;
      text-align: left;
    }
    
    &.editor-button {
      background: rgba(100, 150, 255, 0.1);
      border-color: rgba(100, 150, 255, 0.3);
      
      &:hover {
        background: rgba(100, 150, 255, 0.2);
        border-color: rgba(100, 150, 255, 0.5);
      }
      
      i {
        color: rgba(150, 180, 255, 0.9);
      }
    }
  }
</style>
