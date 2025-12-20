<script lang="ts">
   import type { Province } from '../../actors/KingdomActor';

   export let provinces: Province[] = [];
   export let selectedProvinceId: string | null = null;
   export let onProvinceSelect: (id: string | null) => void;
   export let onDone: () => void;
   export let onCancel: () => void;

   // Color palette matching ProvinceEditorService
   const PROVINCE_COLORS = [
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
      '#E91E63', // Pink
      '#8BC34A', // Light Green
      '#3F51B5', // Indigo
      '#FFEB3B', // Yellow
      '#795548', // Brown
      '#607D8B', // Blue Grey
      '#F44336', // Red
   ];

   function getProvinceColor(index: number): string {
      return PROVINCE_COLORS[index % PROVINCE_COLORS.length];
   }

   // Dragging state
   let isDragging = false;
   let dragOffset = { x: 0, y: 0 };
   let panelPosition = { x: window.innerWidth - 280, y: 100 };

   function handleMouseDown(event: MouseEvent) {
      if ((event.target as HTMLElement).closest('.panel-actions')) return;
      isDragging = true;
      dragOffset = {
         x: event.clientX - panelPosition.x,
         y: event.clientY - panelPosition.y
      };
      event.preventDefault();
   }

   function handleMouseMove(event: MouseEvent) {
      if (!isDragging) return;
      panelPosition = {
         x: Math.max(0, Math.min(window.innerWidth - 260, event.clientX - dragOffset.x)),
         y: Math.max(0, Math.min(window.innerHeight - 200, event.clientY - dragOffset.y))
      };
   }

   function handleMouseUp() {
      isDragging = false;
   }
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

<div
   class="province-editor-panel"
   style="left: {panelPosition.x}px; top: {panelPosition.y}px;"
>
   <div class="panel-header" on:mousedown={handleMouseDown}>
      <i class="fas fa-map"></i>
      <span>Province Editor</span>
   </div>

   <div class="panel-content">
      <div class="brush-section">
         <label>Select brush:</label>
         <div class="brush-list">
            <button
               class="brush-item"
               class:selected={selectedProvinceId === null}
               on:click={() => onProvinceSelect(null)}
            >
               <span class="color-swatch none-swatch">
                  <i class="fas fa-times"></i>
               </span>
               <span class="brush-name">None (Unassign)</span>
            </button>
            {#each provinces as province, index}
               <button
                  class="brush-item"
                  class:selected={selectedProvinceId === province.id}
                  on:click={() => onProvinceSelect(province.id)}
               >
                  <span
                     class="color-swatch"
                     style="background-color: {getProvinceColor(index)};"
                  ></span>
                  <span class="brush-name">{province.name}</span>
                  <span class="hex-count">{province.hexIds.length}</span>
               </button>
            {/each}
         </div>
      </div>

      <div class="instructions">
         <p>Click hexes on the map to paint with selected province.</p>
      </div>
   </div>

   <div class="panel-actions">
      <button class="btn btn-primary" on:click={onDone}>
         <i class="fas fa-check"></i> Done
      </button>
      <button class="btn btn-secondary" on:click={onCancel}>
         <i class="fas fa-times"></i> Cancel
      </button>
   </div>
</div>

<style>
   .province-editor-panel {
      position: fixed;
      width: 240px;
      background: rgba(30, 30, 35, 0.95);
      border: 2px solid #444;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      font-family: var(--font-primary, sans-serif);
      color: #e0e0e0;
   }

   .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: rgba(60, 60, 70, 0.8);
      border-bottom: 1px solid #444;
      border-radius: 6px 6px 0 0;
      cursor: move;
      user-select: none;
   }

   .panel-header i {
      color: #6495ed;
   }

   .panel-header span {
      font-weight: 600;
      font-size: 14px;
   }

   .panel-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
   }

   .brush-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
   }

   .brush-section label {
      font-size: 12px;
      color: #aaa;
      font-weight: 500;
   }

   .brush-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 200px;
      overflow-y: auto;
   }

   .brush-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background: rgba(40, 40, 50, 0.6);
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      color: #ddd;
   }

   .brush-item:hover {
      background: rgba(60, 60, 70, 0.8);
      border-color: #555;
   }

   .brush-item.selected {
      background: rgba(100, 149, 237, 0.2);
      border-color: #6495ed;
   }

   .color-swatch {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.2);
   }

   .none-swatch {
      background: #444;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      font-size: 10px;
   }

   .brush-name {
      flex: 1;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   .hex-count {
      font-size: 10px;
      color: #888;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
   }

   .instructions {
      font-size: 11px;
      color: #888;
      line-height: 1.4;
   }

   .instructions p {
      margin: 0 0 4px 0;
   }

   .panel-actions {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #444;
   }

   .btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
   }

   .btn-primary {
      background: #4caf50;
      color: white;
   }

   .btn-primary:hover {
      background: #45a049;
   }

   .btn-secondary {
      background: #555;
      color: #ddd;
   }

   .btn-secondary:hover {
      background: #666;
   }
</style>
