<script lang="ts">
   import { pipelineRegistry } from '../../pipelines/PipelineRegistry';
   import { updateKingdom } from '../../stores/KingdomStore';
   import Button from '../kingdom/components/baseComponents/Button.svelte';
   
   // Load all events sorted by name
   let allEvents = pipelineRegistry.getPipelinesByType('event')
      .sort((a, b) => a.name.localeCompare(b.name));
   
   // List of pre-roll choice event IDs (strategic approach selection)
   const PRE_ROLL_CHOICE_EVENTS = [
      'feud',
      'criminal-trial',
      'public-scandal',
      'inquisition'
   ];
   
   // Helper to check if event has pre-roll choices
   function hasPreRollChoice(eventId: string): boolean {
      return PRE_ROLL_CHOICE_EVENTS.includes(eventId);
   }
   
   let selectedEventId = '';
   let isTriggering = false;
   
   async function triggerSelectedEvent() {
      if (!selectedEventId) return;
      
      isTriggering = true;
      
      try {
         // Use EventPhaseController to properly trigger the event
         const { createEventPhaseController } = await import('../../controllers/EventPhaseController');
         const controller = await createEventPhaseController();
         
         // Trigger the specific event by ID
         await controller.triggerSpecificEvent(selectedEventId);
         
         console.log('[SimpleEventSelector] Event triggered:', selectedEventId);
         
      } catch (error) {
         console.error('[SimpleEventSelector] Failed to trigger event:', error);
         ui?.notifications?.error(`Failed to trigger event: ${error}`);
      } finally {
         isTriggering = false;
      }
   }
   
   let isResetting = false;
   
   async function resetEventPhase() {
      console.log('[SimpleEventSelector] Starting reset...');
      isResetting = true;
      
      try {
         console.log('[SimpleEventSelector] Step 1: Clearing kingdom data...');
         // Clear event phase data from turnState and pendingOutcomes
         await updateKingdom(kingdom => {
            // Clear event phase data
            if (kingdom.turnState?.eventsPhase) {
               kingdom.turnState.eventsPhase = {
                  completed: false,
                  eventRolled: false,
                  eventResolved: false,
                  eventRoll: undefined,
                  eventTriggered: false,
                  eventId: null,
                  eventInstanceId: null,
                  activeAids: [],
                  appliedOutcomes: []
               };
            }
            
            // Clear all event instances from pendingOutcomes
            if (kingdom.pendingOutcomes) {
               const beforeCount = kingdom.pendingOutcomes.length;
               kingdom.pendingOutcomes = kingdom.pendingOutcomes.filter(
                  (instance: any) => instance.checkType !== 'event'
               );
               const afterCount = kingdom.pendingOutcomes.length;
               const removedCount = beforeCount - afterCount;
               
               console.log(`[SimpleEventSelector] Cleared ${removedCount} event instances`);
            }
            
            // Reset phase steps
            if (kingdom.currentPhaseSteps) {
               kingdom.currentPhaseSteps = [];
            }
         });
         
         console.log('[SimpleEventSelector] Step 2: Clearing votes...');
         // Clear ALL votes for current turn (not just old ones)
         const { getKingdomActor } = await import('../../stores/KingdomStore');
         const actor = getKingdomActor();
         if (actor) {
            await actor.setFlag('pf2e-reignmaker', 'eventVotes', []);
            console.log('[SimpleEventSelector] Cleared all votes');
         } else {
            console.warn('[SimpleEventSelector] No kingdom actor found, skipping vote cleanup');
         }
         
         console.log('[SimpleEventSelector] Reset complete!');
         ui?.notifications?.info('Event phase reset successfully');
         
      } catch (error) {
         console.error('[SimpleEventSelector] Failed to reset event phase:', error);
         ui?.notifications?.error(`Failed to reset event phase: ${error}`);
      } finally {
         console.log('[SimpleEventSelector] Resetting flag to false');
         isResetting = false;
      }
   }
</script>

<div class="simple-event-selector">
   <div class="selector-header">
      <i class="fas fa-bolt"></i>
      <h4>Quick Event Trigger</h4>
   </div>
   
   <div class="selector-controls">
      <select bind:value={selectedEventId} class="event-dropdown">
         <option value="">-- Select Event --</option>
         {#each allEvents as event}
            <option value={event.id}>
               {hasPreRollChoice(event.id) ? '🎯 ' : ''}{event.name}
            </option>
         {/each}
      </select>
      
      <Button
         variant="primary"
         size="small"
         disabled={!selectedEventId || isTriggering}
         on:click={triggerSelectedEvent}
         icon={isTriggering ? 'fas fa-spinner fa-spin' : 'fas fa-bolt'}
         iconPosition="left"
      >
         {isTriggering ? 'Triggering...' : 'Trigger Event'}
      </Button>
      
      <Button
         variant="secondary"
         size="small"
         disabled={isResetting}
         on:click={resetEventPhase}
         icon={isResetting ? 'fas fa-spinner fa-spin' : 'fas fa-redo'}
         iconPosition="left"
      >
         {isResetting ? 'Resetting...' : 'Reset Phase'}
      </Button>
   </div>
   
   <div class="selector-info">
      <i class="fas fa-info-circle"></i>
      <span>Bypasses stability check and triggers selected event immediately</span>
   </div>
</div>

<style lang="scss">
   .simple-event-selector {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
      padding: var(--space-16);
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-16);
   }
   
   .selector-header {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      
      i {
         font-size: var(--font-lg);
         color: rgba(96, 165, 250, 1);
      }
      
      h4 {
         margin: 0;
         font-size: var(--font-lg);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }
   }
   
   .selector-controls {
      display: flex;
      gap: var(--space-10);
      align-items: center;
   }
   
   .event-dropdown {
      flex: 1;
      padding: var(--space-8) var(--space-12);
      background: var(--surface-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-md);
      cursor: pointer;
      
      &:hover {
         border-color: var(--border-accent);
      }
      
      &:focus {
         outline: none;
         border-color: rgba(96, 165, 250, 0.6);
         box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
      }
   }
   
   .selector-info {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-8) var(--space-12);
      background: rgba(59, 130, 246, 0.1);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      color: var(--text-secondary);
      
      i {
         color: rgba(96, 165, 250, 1);
      }
   }
</style>
