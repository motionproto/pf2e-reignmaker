<script lang="ts">
   import { updateKingdom } from '../../../stores/KingdomStore';
   import { eventService } from '../../../controllers/events/event-loader';
   import { incidentLoader } from '../../../controllers/incidents/incident-loader';
   import type { EventData } from '../../../controllers/events/event-loader';
   import type { KingdomIncident } from '../../../types/incidents';
   
   // Props
   export let type: 'event' | 'incident' = 'event';
   export let currentItemId: string | null = null;
   
   // Get all available items
   let allItems: Array<EventData | KingdomIncident> = [];
   let currentIndex = -1;
   
   $: {
      if (type === 'event') {
         allItems = eventService.exportEvents();
      } else {
         allItems = incidentLoader.getAllIncidents();
      }
      
      // Find current index
      if (currentItemId && allItems.length > 0) {
         currentIndex = allItems.findIndex(item => item.id === currentItemId);
      } else {
         currentIndex = -1;
      }
   }
   
   $: currentItem = currentIndex >= 0 ? allItems[currentIndex] : null;
   $: totalCount = allItems.length;
   $: displayIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
   
   async function navigatePrevious() {
      if (allItems.length === 0) return;
      
      let newIndex = currentIndex - 1;
      if (newIndex < 0) {
         newIndex = allItems.length - 1; // Wrap to last
      }
      
      await setActiveItem(allItems[newIndex].id);
   }
   
   async function navigateNext() {
      if (allItems.length === 0) return;
      
      let newIndex = currentIndex + 1;
      if (newIndex >= allItems.length) {
         newIndex = 0; // Wrap to first
      }
      
      await setActiveItem(allItems[newIndex].id);
   }
   
   async function setRandom() {
      if (allItems.length === 0) return;
      
      const randomIndex = Math.floor(Math.random() * allItems.length);
      await setActiveItem(allItems[randomIndex].id);
   }
   
   async function clearActive() {
      await setActiveItem(null);
   }
   
   async function setActiveItem(itemId: string | null) {
      await updateKingdom(kingdom => {
         if (!kingdom.turnState) {
            console.warn('[DebugEventSelector] No turnState found, cannot set item');
            return;
         }
         
         if (type === 'event') {
            kingdom.turnState.eventsPhase.eventId = itemId;
            kingdom.turnState.eventsPhase.eventTriggered = itemId !== null;
         } else {
            kingdom.turnState.unrestPhase.incidentId = itemId;
            kingdom.turnState.unrestPhase.incidentTriggered = itemId !== null;
         }
      });
   }
</script>

<div class="debug-selector">
   <div class="debug-label">
      <i class="fas fa-bug"></i>
      <span>DEBUG</span>
   </div>
   
   <button class="nav-btn" on:click={navigatePrevious} disabled={totalCount === 0}>
      <i class="fas fa-chevron-left"></i>
   </button>
   
   <div class="current-info">
      {#if currentItem}
         <span class="index">{displayIndex}/{totalCount}:</span>
         <span class="name">"{currentItem.name}"</span>
      {:else}
         <span class="no-item">No {type} selected ({totalCount} available)</span>
      {/if}
   </div>
   
   <button class="nav-btn" on:click={navigateNext} disabled={totalCount === 0}>
      <i class="fas fa-chevron-right"></i>
   </button>
   
   <button class="action-btn" on:click={setRandom} disabled={totalCount === 0}>
      <i class="fas fa-dice"></i>
      Random
   </button>
   
   <button class="action-btn clear" on:click={clearActive} disabled={!currentItemId}>
      <i class="fas fa-times"></i>
      Clear
   </button>
</div>

<style lang="scss">
   .debug-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      margin-bottom: 16px;
   }
   
   .debug-label {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: rgba(139, 92, 246, 0.2);
      border-radius: var(--radius-sm);
      color: rgba(196, 181, 253, 1);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      
      i {
         font-size: var(--font-xs);
      }
   }
   
   .nav-btn {
      padding: 4px 8px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &:hover:not(:disabled) {
         background: rgba(139, 92, 246, 0.25);
         border-color: rgba(139, 92, 246, 0.5);
      }
      
      &:disabled {
         opacity: 0.4;
         cursor: not-allowed;
      }
      
      i {
         font-size: var(--font-sm);
      }
   }
   
   .current-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-primary);
      font-size: var(--font-sm);
      min-width: 0; // Allow text truncation
      
      .index {
         color: rgba(196, 181, 253, 1);
         font-weight: var(--font-weight-medium);
         white-space: nowrap;
      }
      
      .name {
         color: var(--text-primary);
         white-space: nowrap;
         overflow: hidden;
         text-overflow: ellipsis;
      }
      
      .no-item {
         color: var(--text-secondary);
         font-style: italic;
      }
   }
   
   .action-btn {
      padding: 4px 10px;
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      transition: all var(--transition-fast);
      white-space: nowrap;
      
      &:hover:not(:disabled) {
         background: rgba(139, 92, 246, 0.3);
         border-color: rgba(139, 92, 246, 0.5);
      }
      
      &:disabled {
         opacity: 0.4;
         cursor: not-allowed;
      }
      
      &.clear {
         background: rgba(239, 68, 68, 0.15);
         border-color: rgba(239, 68, 68, 0.3);
         
         &:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.25);
            border-color: rgba(239, 68, 68, 0.5);
         }
      }
      
      i {
         font-size: var(--font-xs);
      }
   }
</style>
