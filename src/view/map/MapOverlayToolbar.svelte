<script lang="ts">
  import { onMount } from 'svelte';
  import { ReignMakerMapLayer } from '../../services/map/ReignMakerMapLayer';
  import { kingdomData } from '../../stores/KingdomStore';
  import { territoryService } from '../../services/territory';
  import type { HexStyle } from '../../services/map/types';

  // Toolbar state
  let isDragging = false;
  let position = { x: 100, y: 100 };
  let dragStart = { x: 0, y: 0 };
  let toolbarElement: HTMLDivElement;

  // Toggle states
  let terrainActive = false;
  let territoriesActive = false;
  let territoryBorderActive = false;
  let settlementsActive = false;
  let roadsActive = false;

  // Map layer instance
  const mapLayer = ReignMakerMapLayer.getInstance();

  // Load saved position and overlay states from localStorage
  onMount(async () => {
    const savedPosition = localStorage.getItem('reignmaker-toolbar-position');
    if (savedPosition) {
      position = JSON.parse(savedPosition);
    }
    
    // IMPORTANT: Ensure PIXI container is visible when toolbar opens
    // This is critical for overlays to be visible
    mapLayer.showPixiContainer();
    console.log('[MapOverlayToolbar] Ensured PIXI container is visible');
    
    // Load saved overlay states
    const savedStates = localStorage.getItem('reignmaker-overlay-states');
    if (savedStates) {
      try {
        const states = JSON.parse(savedStates);
        
        // Restore terrain overlay
        if (states.terrainActive) {
          terrainActive = true;
          await showTerrain();
        }
        
        // Restore territory overlay
        if (states.territoriesActive) {
          territoriesActive = true;
          await showTerritories();
        }
        
        // Restore territory border
        if (states.territoryBorderActive) {
          territoryBorderActive = true;
          await showTerritoryBorder();
        }
        
        // Restore settlements overlay
        if (states.settlementsActive) {
          settlementsActive = true;
          await showSettlements();
        }
        
        // Restore roads overlay
        if (states.roadsActive) {
          roadsActive = true;
          await showRoads();
        }
        
        console.log('[MapOverlayToolbar] Restored overlay states:', states);
      } catch (error) {
        console.error('[MapOverlayToolbar] Failed to restore overlay states:', error);
      }
    }
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

  // Save overlay states to localStorage whenever they change
  function saveOverlayStates() {
    const states = {
      terrainActive,
      territoriesActive,
      territoryBorderActive,
      settlementsActive,
      roadsActive
    };
    localStorage.setItem('reignmaker-overlay-states', JSON.stringify(states));
    console.log('[MapOverlayToolbar] Saved overlay states:', states);
  }

  // Toggle handlers
  async function toggleTerrain() {
    terrainActive = !terrainActive;
    
    if (terrainActive) {
      await showTerrain();
    } else {
      // Clear and hide terrain layer
      mapLayer.clearLayer('terrain-overlay');
      mapLayer.hideLayer('terrain-overlay');
    }
    
    saveOverlayStates();
  }

  async function toggleTerritories() {
    territoriesActive = !territoriesActive;
    
    if (territoriesActive) {
      await showTerritories();
    } else {
      // Clear and hide only the territory fill layer (border is independent)
      mapLayer.clearLayer('kingdom-territory');
      mapLayer.hideLayer('kingdom-territory');
    }
    
    saveOverlayStates();
  }

  async function toggleSettlements() {
    settlementsActive = !settlementsActive;
    
    if (settlementsActive) {
      await showSettlements();
    } else {
      // Clear and hide layer to completely remove visuals
      mapLayer.clearLayer('settlements-overlay');
      mapLayer.hideLayer('settlements-overlay');
    }
    
    saveOverlayStates();
  }

  async function toggleTerritoryBorder() {
    territoryBorderActive = !territoryBorderActive;
    
    if (territoryBorderActive) {
      await showTerritoryBorder();
    } else {
      // Clear outline only (keep territory fill if active)
      mapLayer.clearLayer('kingdom-territory-outline');
      mapLayer.hideLayer('kingdom-territory-outline');
    }
    
    saveOverlayStates();
  }

  async function toggleRoads() {
    roadsActive = !roadsActive;
    
    if (roadsActive) {
      await showRoads();
    } else {
      // Clear and hide road layers (overlay + routes)
      mapLayer.clearRoadLayers();
    }
    
    saveOverlayStates();
  }

  // Show terrain overlay (colors hexes by terrain type)
  async function showTerrain() {
    const kingmaker = (globalThis as any).game?.kingmaker;
    if (!kingmaker?.region?.hexes) {
      ui?.notifications?.warn('No terrain data available from Kingmaker module');
      terrainActive = false;
      return;
    }

    // Get all hexes with terrain data from Kingmaker module
    const hexData = kingmaker.region.hexes
      .filter((h: any) => h.data?.terrain)
      .map((h: any) => ({
        id: `${h.offset.i}.${h.offset.j}`,
        terrain: h.data.terrain
      }));

    if (hexData.length === 0) {
      ui?.notifications?.warn('No hexes with terrain data found');
      terrainActive = false;
      return;
    }

    console.log('[MapOverlayToolbar] Drawing terrain overlay for', hexData.length, 'hexes');
    mapLayer.drawTerrainOverlay(hexData);
  }

  // Show territories (claimed hexes in party color)
  async function showTerritories() {
    // Clear only the territory fill layer (border is independent)
    mapLayer.clearLayer('kingdom-territory');
    
    const canvas = (globalThis as any).canvas;
    if (!canvas?.ready) {
      console.warn('[MapOverlayToolbar] Canvas not ready');
      return;
    }

    // Get claimed hexes from kingdom data
    let hexIds: string[] = [];
    
    // Try Kingmaker module first
    const kingmaker = (globalThis as any).game?.kingmaker;
    if (kingmaker?.region?.hexes) {
      const claimedHexes = kingmaker.region.hexes.filter((h: any) => h.data?.claimed);
      if (claimedHexes && claimedHexes.length > 0) {
        hexIds = claimedHexes.map((h: any) => `${h.offset.i}.${h.offset.j}`);
      }
    }
    
    // Fallback to KingdomActor data
    if (hexIds.length === 0 && $kingdomData?.hexes) {
      hexIds = $kingdomData.hexes
        .filter((h: any) => h.claimedBy === 1) // Only player-claimed
        .map((h: any) => h.id);
    }
    
    if (hexIds.length === 0) {
      ui?.notifications?.warn('No claimed territory to display');
      territoriesActive = false;
      return;
    }

    // Get party color (default to bright dodger blue)
    const partyColor = 0x1E90FF; // Dodger blue - brighter than royal blue
    
    const style: HexStyle = {
      fillColor: partyColor,
      fillAlpha: 0.4,
      borderWidth: 0  // No border on territory fill
    };
    
    // Let drawHexes manage the layer creation with correct z-index
    mapLayer.drawHexes(hexIds, style, 'kingdom-territory');
    mapLayer.showLayer('kingdom-territory');
  }

  // Show territory border (outline around claimed territory)
  async function showTerritoryBorder() {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.ready) {
      console.warn('[MapOverlayToolbar] Canvas not ready');
      return;
    }

    // Get claimed hexes from kingdom data
    let hexIds: string[] = [];
    
    // Try Kingmaker module first
    const kingmaker = (globalThis as any).game?.kingmaker;
    if (kingmaker?.region?.hexes) {
      const claimedHexes = kingmaker.region.hexes.filter((h: any) => h.data?.claimed);
      if (claimedHexes && claimedHexes.length > 0) {
        hexIds = claimedHexes.map((h: any) => `${h.offset.i}.${h.offset.j}`);
      }
    }
    
    // Fallback to KingdomActor data
    if (hexIds.length === 0 && $kingdomData?.hexes) {
      hexIds = $kingdomData.hexes
        .filter((h: any) => h.claimedBy === 1) // Only player-claimed
        .map((h: any) => h.id);
    }
    
    if (hexIds.length === 0) {
      ui?.notifications?.warn('No claimed territory to display border for');
      territoryBorderActive = false;
      return;
    }

    // Draw territory outline
    mapLayer.drawTerritoryOutline(hexIds);
  }

  // Show settlements (hexes with settlements highlighted)
  async function showSettlements() {
    mapLayer.clearLayer('settlements-overlay');
    
    if (!$kingdomData?.settlements || $kingdomData.settlements.length === 0) {
      ui?.notifications?.warn('No settlements to display');
      settlementsActive = false;
      return;
    }

    // Get hex IDs from settlement kingmakerLocation
    const settlementHexIds = $kingdomData.settlements
      .filter((s: any) => s.kingmakerLocation && s.kingmakerLocation.x > 0 && s.kingmakerLocation.y > 0) // Filter out unlinked settlements (0,0)
      .map((s: any) => `${s.kingmakerLocation.x}.${s.kingmakerLocation.y}`); // Convert to hex ID format
    
    if (settlementHexIds.length === 0) {
      ui?.notifications?.warn('No settlements found on map');
      settlementsActive = false;
      return;
    }

    console.log('[MapOverlayToolbar] Highlighting settlements:', settlementHexIds);

    // Bright cyan highlight for settlements
    const style: HexStyle = {
      fillColor: 0x00FFFF, // Cyan - bright and visible
      fillAlpha: 0.5,
      borderColor: 0x00FFFF,
      borderWidth: 3,
      borderAlpha: 1.0
    };
    
    // Let drawHexes manage the layer creation with correct z-index
    mapLayer.drawHexes(settlementHexIds, style, 'settlements-overlay');
    mapLayer.showLayer('settlements-overlay');
  }

  // Show roads (hexes with roads connected by lines)
  async function showRoads() {
    // Clear all road-related layers before redrawing
    mapLayer.clearRoadLayers();
    
    // Get road hex IDs from territory service (single source of truth)
    const roadHexIds = territoryService.getRoads();
    
    if (roadHexIds.length === 0) {
      ui?.notifications?.warn('No roads to display');
      roadsActive = false;
      return;
    }
    
    console.log('[MapOverlayToolbar] Displaying roads:', roadHexIds);
    
    // Let drawRoadConnections manage the layer creation with correct z-index
    mapLayer.drawRoadConnections(roadHexIds, 'routes');
    mapLayer.showLayer('routes');
  }

  // Reset all overlays
  function resetMap() {
    console.log('[MapOverlayToolbar] Resetting all map overlays');
    
    // Clear all layers
    mapLayer.clearAllLayers();
    
    // Deactivate all toggles
    terrainActive = false;
    territoriesActive = false;
    territoryBorderActive = false;
    settlementsActive = false;
    roadsActive = false;
    
    // Save cleared state
    saveOverlayStates();
    
    ui?.notifications?.info('Map overlays cleared');
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
  
  <div class="toolbar-buttons">
    <button 
      class="toolbar-button" 
      class:active={terrainActive}
      on:click={toggleTerrain}
      title="Toggle Terrain Overlay"
    >
      <i class="fas fa-mountain"></i>
      <span>Terrain</span>
    </button>
    
    <button 
      class="toolbar-button" 
      class:active={territoriesActive}
      on:click={toggleTerritories}
      title="Toggle Territory Overlay"
    >
      <i class="fas fa-flag"></i>
      <span>Territory</span>
    </button>
    
    <button 
      class="toolbar-button" 
      class:active={territoryBorderActive}
      on:click={toggleTerritoryBorder}
      title="Toggle Territory Border"
    >
      <i class="fas fa-vector-square"></i>
      <span>Border</span>
    </button>
    
    <button 
      class="toolbar-button" 
      class:active={settlementsActive}
      on:click={toggleSettlements}
      title="Toggle Settlements Overlay"
    >
      <i class="fas fa-city"></i>
      <span>Settlements</span>
    </button>
    
    <button 
      class="toolbar-button" 
      class:active={roadsActive}
      on:click={toggleRoads}
      title="Toggle Roads Overlay"
    >
      <i class="fas fa-road"></i>
      <span>Roads</span>
    </button>
    
    <div class="toolbar-divider"></div>
    
    <button 
      class="toolbar-button reset-button" 
      on:click={resetMap}
      title="Clear All Map Overlays"
    >
      <i class="fas fa-eraser"></i>
      <span>Reset Map</span>
    </button>
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
    
    &.reset-button {
      background: rgba(255, 100, 100, 0.1);
      border-color: rgba(255, 100, 100, 0.3);
      
      &:hover {
        background: rgba(255, 100, 100, 0.2);
        border-color: rgba(255, 100, 100, 0.5);
      }
      
      i {
        color: rgba(255, 150, 150, 0.9);
      }
    }
  }
</style>
