<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { getEditorModeService, type EditorTool } from '../../services/map/EditorModeService';
  
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
  
  onMount(async () => {
    // Load saved position
    const savedPosition = localStorage.getItem('reignmaker-editor-panel-position');
    if (savedPosition) {
      position = JSON.parse(savedPosition);
    }
    
    // Enter editor mode
    await editorService.enterEditorMode();
  });
  
  onDestroy(() => {
    // Exit editor mode on unmount (cleanup)
    editorService.exitEditorMode();
  });
  
  // Tool selection
  function setTool(tool: EditorTool) {
    currentTool.set(tool);
    editorService.setTool(tool);
  }
  
  // Dragging handlers
  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.tool-button, .action-button')) return;
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
</script>

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
    <button class="close-button" on:click={handleCancel} title="Close editor (discard changes)">
      <i class="fas fa-times"></i>
    </button>
  </div>
  
  <!-- Editor Tools -->
  <div class="editor-sections">
    
    <!-- Rivers Section -->
    <section class="editor-section">
      <label class="section-label">Rivers</label>
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
      </div>
    </section>
    
    <!-- Water Features Section -->
    <section class="editor-section">
      <label class="section-label">Water</label>
      <div class="tool-buttons">
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
          <i class="fas fa-seedling"></i>
        </button>
      </div>
    </section>
    
    <!-- Crossings Section -->
    <section class="editor-section">
      <label class="section-label">Crossings</label>
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
    
    <!-- Roads Section -->
    <section class="editor-section">
      <label class="section-label">Roads</label>
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
    
    <!-- Terrain Section -->
    <section class="editor-section terrain-section">
      <label class="section-label">Terrain</label>
      <div class="tool-buttons terrain-buttons">
        <button
          class="tool-button"
          class:active={$currentTool === 'terrain-plains'}
          on:click={() => setTool('terrain-plains')}
          title="Plains">
          <i class="fas fa-seedling" style="color: #90C650;"></i>
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
          <i class="fas fa-hill-rockslide" style="color: #8B7355;"></i>
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
          <i class="fas fa-water" style="color: #6B8E23;"></i>
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
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    min-width: 280px;
    user-select: none;
    backdrop-filter: blur(10px);
    
    &.dragging {
      cursor: grabbing;
      opacity: 0.9;
    }
  }
  
  .panel-header {
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
    
    i.fa-pencil-alt {
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
        font-size: 0.875rem;
      }
    }
  }
  
  .editor-sections {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .editor-section {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    
    .section-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      min-width: 80px;
    }
    
    .tool-buttons {
      display: flex;
      gap: 0.5rem;
    }
    
    .tool-button {
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: #fff;
        transform: translateY(-1px);
      }
      
      &.active {
        background: rgba(139, 0, 0, 0.4);
        border-color: var(--color-primary, #8b0000);
        color: var(--color-primary, #8b0000);
        box-shadow: 0 0 10px rgba(139, 0, 0, 0.3);
      }
    }
  }
  
  .panel-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    .action-button {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      
      &.cancel-button {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
        
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
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(139, 0, 0, 0.4);
        }
      }
    }
  }
</style>
