<script lang="ts">
  import { onMount } from 'svelte';
  import { ReignMakerMapLayer } from '../../services/map/ReignMakerMapLayer';
  import { getOverlayManager } from '../../services/map/OverlayManager';
  import { getEditorModeService } from '../../services/map/EditorModeService';
  import EditorModePanel from './EditorModePanel.svelte';
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
  const overlays = overlayManager.getAllOverlays();
  
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
    
    // Ensure water overlay is active for river editing
    if (!$activeOverlaysStore.has('water')) {
      await overlayManager.toggleOverlay('water');
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
      <button 
        class="toolbar-button" 
        class:active={$activeOverlaysStore.has(overlay.id)}
        on:click={() => toggleOverlay(overlay.id)}
        title="Toggle {overlay.name} Overlay"
      >
        <i class="fas {overlay.icon}"></i>
        <span>{overlay.name}</span>
      </button>
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
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    min-width: 200px;
    user-select: none;
    backdrop-filter: blur(10px);
    
    &.dragging {
      cursor: grabbing;
      opacity: 0.9;
    }
  }
  
  .toolbar-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(139, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: grab;
    border-radius: 6px 6px 0 0;
    
    &:active {
      cursor: grabbing;
    }
    
    i {
      color: var(--color-primary, #8b0000);
      font-size: 1rem;
    }
    
    span {
      flex: 1;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #fff;
    }
    
    .close-button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
      
      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }
      
      i {
        color: inherit;
        font-size: 0.875rem;
      }
    }
  }
  
  .debug-tools {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }
  
  .debug-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      color: rgba(100, 200, 255, 0.9);
      background: rgba(100, 200, 255, 0.1);
      border-color: rgba(100, 200, 255, 0.3);
    }
    
    &.active {
      color: #00FF00;
      background: rgba(0, 255, 0, 0.15);
      border-color: rgba(0, 255, 0, 0.4);
      
      i {
        animation: pulse 2s ease-in-out infinite;
      }
    }
    
    i {
      color: inherit;
      font-size: 1rem;
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
    gap: 0.5rem;
    padding: 0.75rem;
  }
  
  .toolbar-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0.25rem 0;
  }
  
  .toolbar-button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
    font-weight: 500;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: #fff;
      transform: translateY(-1px);
    }
    
    &.active {
      background: rgba(139, 0, 0, 0.4);
      border-color: var(--color-primary, #8b0000);
      color: #fff;
      box-shadow: 0 0 10px rgba(139, 0, 0, 0.3);
      
      i {
        color: var(--color-primary, #8b0000);
      }
    }
    
    i {
      font-size: 1.125rem;
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
