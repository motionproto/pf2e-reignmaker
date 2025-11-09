<script lang="ts">
   import { updateKingdom, kingdomData } from '../../../stores/KingdomStore';
   import { eventService } from '../../../controllers/events/event-loader';
   import { incidentLoader } from '../../../controllers/incidents/incident-loader';
   import { checkInstanceService } from '../../../services/CheckInstanceService';
   import { get } from 'svelte/store';
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
      const kingdom = get(kingdomData);
      
      if (!kingdom.turnState) {
         logger.warn('[DebugEventSelector] No turnState found, cannot set item');
         return;
      }
      
      if (type === 'event') {
         // EVENT: NEW ARCHITECTURE (ActiveCheckInstance + turnState)
         if (itemId !== null) {
            // Find event data
            const event = eventService.getEventById(itemId);
            if (!event) {
               logger.error(`[DebugEventSelector] Event not found: ${itemId}`);
               return;
            }
            
            // Clear any existing event instances
            const existing = checkInstanceService.getPendingInstances('event', kingdom);
            for (const instance of existing) {
               await checkInstanceService.clearInstance(instance.instanceId);
            }
            
            // Create new ActiveCheckInstance
            const instanceId = await checkInstanceService.createInstance(
               'event',
               event.id,
               event,
               kingdom.currentTurn
            );
            
            // Update turnState for display purposes (roll number + event ID + instance ID)
            await updateKingdom(kingdom => {
               if (!kingdom.turnState) return;
               kingdom.turnState.eventsPhase.eventRolled = true;
               kingdom.turnState.eventsPhase.eventTriggered = true;
               kingdom.turnState.eventsPhase.eventRoll = 20; // Simulated 20 roll (triggered)
               kingdom.turnState.eventsPhase.eventId = event.id; // Store event ID for display
               kingdom.turnState.eventsPhase.eventInstanceId = instanceId; // Store instance ID for lookup
               kingdom.eventDC = 15; // Reset DC (matches normal event trigger behavior)
            });

         } else {
            // Clear event
            const existing = checkInstanceService.getPendingInstances('event', kingdom);
            for (const instance of existing) {
               await checkInstanceService.clearInstance(instance.instanceId);
            }
            
            // Clear turnState
            await updateKingdom(kingdom => {
               if (!kingdom.turnState) return;
               kingdom.turnState.eventsPhase.eventRolled = false;
               kingdom.turnState.eventsPhase.eventTriggered = false;
               kingdom.turnState.eventsPhase.eventRoll = undefined;
               kingdom.turnState.eventsPhase.eventId = null;
               kingdom.turnState.eventsPhase.eventInstanceId = null;
            });

         }
      } else {
         // INCIDENT: NEW ARCHITECTURE (ActiveCheckInstance + turnState)
         if (itemId !== null) {
            // Find incident data
            const incident = incidentLoader.getIncidentById(itemId);
            if (!incident) {
               logger.error(`[DebugEventSelector] Incident not found: ${itemId}`);
               return;
            }
            
            // Clear any existing incident instances
            const existing = checkInstanceService.getPendingInstances('incident', kingdom);
            for (const instance of existing) {
               await checkInstanceService.clearInstance(instance.instanceId);
            }
            
            // Create new ActiveCheckInstance
            const instanceId = await checkInstanceService.createInstance(
               'incident',
               incident.id,
               incident,
               kingdom.currentTurn
            );
            
            // Update turnState for display purposes (roll number)
            await updateKingdom(kingdom => {
               if (!kingdom.turnState) return;
               kingdom.turnState.unrestPhase.incidentRolled = true;
               kingdom.turnState.unrestPhase.incidentTriggered = true;
               kingdom.turnState.unrestPhase.incidentRoll = 50; // Simulated 50% roll
            });

         } else {
            // Clear incident
            const existing = checkInstanceService.getPendingInstances('incident', kingdom);
            for (const instance of existing) {
               await checkInstanceService.clearInstance(instance.instanceId);
            }
            
            // Clear turnState
            await updateKingdom(kingdom => {
               if (!kingdom.turnState) return;
               kingdom.turnState.unrestPhase.incidentRolled = false;
               kingdom.turnState.unrestPhase.incidentTriggered = false;
               kingdom.turnState.unrestPhase.incidentRoll = undefined;
            });

         }
      }
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
      gap: var(--space-8);
      padding: var(--space-8) var(--space-12);
      background: rgba(139, 92, 246, 0.1);
      border: 0.0625rem solid rgba(139, 92, 246, 0.3);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      margin-bottom: var(--space-16);
   }
   
   .debug-label {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-4) var(--space-8);
      background: rgba(139, 92, 246, 0.2);
      border-radius: var(--radius-sm);
      color: rgba(196, 181, 253, 1);
      font-weight: var(--font-weight-medium);
      font-size: var(--font-xs);
      text-transform: uppercase;
      letter-spacing: 0.05rem;
      
      i {
         font-size: var(--font-xs);
      }
   }
   
   .nav-btn {
      padding: var(--space-4) var(--space-8);
      background: rgba(139, 92, 246, 0.15);
      border: 0.0625rem solid rgba(139, 92, 246, 0.3);
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
      gap: var(--space-6);
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
      padding: var(--space-4) var(--space-10);
      background: rgba(139, 92, 246, 0.2);
      border: 0.0625rem solid rgba(139, 92, 246, 0.3);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--space-4);
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
