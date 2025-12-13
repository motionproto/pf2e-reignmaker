<script lang="ts">
   import { pipelineRegistry } from '../../pipelines/PipelineRegistry';
   import { updateKingdom } from '../../stores/KingdomStore';
   import Button from '../kingdom/components/baseComponents/Button.svelte';
   
   // Map of migrated event IDs to their migration order number
   // These events use the strategic choice pattern with voting
   const MIGRATED_EVENTS: Record<string, number> = {
      'criminal-trial': 1,
      'feud': 2,
      'inquisition': 3,
      'public-scandal': 4,
      'plague': 5,
      'food-shortage': 6,
      'natural-disaster': 7,
      'immigration': 8,
      'assassination-attempt': 9,
      'crime-wave': 10,
      'notorious-heist': 11,
      'bandit-activity': 12,
      'raiders': 13,
      'trade-agreement': 14,
      'economic-surge': 15,
      'food-surplus': 16,
      'boomtown': 17,
      'land-rush': 18,
      'pilgrimage': 19,
      'diplomatic-overture': 20,
      'festive-invitation': 21,
      'visiting-celebrity': 22,
      'grand-tournament': 23,
      'archaeological-find': 24,
      'magical-discovery': 25,
      'remarkable-treasure': 26,
      'scholarly-discovery': 27,
      'natures-blessing': 28,
      'good-weather': 29,
      'military-exercises': 30,
      'drug-den': 31,
      'monster-attack': 32,
      'undead-uprising': 33,
      'cult-activity': 34
   };

   // Load all events sorted by migration number (migrated first, then alphabetically)
   let allEvents = pipelineRegistry.getPipelinesByType('event')
      .sort((a, b) => {
         const aNum = MIGRATED_EVENTS[a.id];
         const bNum = MIGRATED_EVENTS[b.id];
         
         // Both migrated: sort by migration number
         if (aNum !== undefined && bNum !== undefined) {
            return aNum - bNum;
         }
         // Only a is migrated: a comes first
         if (aNum !== undefined) return -1;
         // Only b is migrated: b comes first
         if (bNum !== undefined) return 1;
         // Neither migrated: sort alphabetically
         return a.name.localeCompare(b.name);
      });

   // Helper to check if event has been migrated to strategic choice pattern
   function isMigrated(eventId: string): boolean {
      return eventId in MIGRATED_EVENTS;
   }

   // Helper to get migration order number
   function getMigrationNumber(eventId: string): number | null {
      return MIGRATED_EVENTS[eventId] ?? null;
   }
   
   let selectedEventId = '';
   let isTriggering = false;
   
   // Debug mode: Force specific outcomes by clicking on them
   let forceOutcomeMode = false;
   
   // Sync forceOutcomeMode to kingdom turnState for reactivity
   async function updateForceOutcomeFlag(enabled: boolean) {
      await updateKingdom(kingdom => {
         if (kingdom.turnState?.eventsPhase) {
            kingdom.turnState.eventsPhase.debugForceOutcome = enabled;
         }
      });
      console.log('[SimpleEventSelector] Force outcome mode:', enabled ? 'enabled' : 'disabled');
   }
   
   // Reactive: update flag when checkbox changes
   $: {
      updateForceOutcomeFlag(forceOutcomeMode);
   }
   
   async function triggerSelectedEvent() {
      if (!selectedEventId) return;

      isTriggering = true;

      try {
         // First, reset the event phase to clear any existing state
         await doResetEventPhase();

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

   // Core reset logic - can be called directly or via button
   async function doResetEventPhase() {
      console.log('[SimpleEventSelector] Starting reset...');

      console.log('[SimpleEventSelector] Step 1: Clearing kingdom data...');
      // Clear event phase data from turnState and pendingOutcomes
      await updateKingdom(kingdom => {
         // Clear event phase data (including selectedApproach for voting)
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
               appliedOutcomes: [],
               selectedApproach: null  // Clear voting selection
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
   }

   // Button handler with loading state and notifications
   async function resetEventPhase() {
      isResetting = true;

      try {
         await doResetEventPhase();
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
               {#if isMigrated(event.id)}
                  ✅ [{getMigrationNumber(event.id)}] {event.name}
               {:else}
                  {event.name}
               {/if}
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
   
   <div class="selector-options">
      <label class="debug-checkbox">
         <input type="checkbox" bind:checked={forceOutcomeMode} />
         <span>Force Outcome Mode</span>
         <i class="fas fa-flask" title="Click on outcome cards to force that result"></i>
      </label>
   </div>
   
   <div class="selector-info">
      <i class="fas fa-info-circle"></i>
      <span>
         {#if forceOutcomeMode}
            Click on any outcome card to force that result (skips roll)
         {:else}
            Bypasses stability check and triggers selected event immediately
         {/if}
      </span>
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
   
   .selector-options {
      display: flex;
      align-items: center;
      gap: var(--space-16);
   }
   
   .debug-checkbox {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      cursor: pointer;
      font-size: var(--font-md);
      color: var(--text-secondary);
      
      input[type="checkbox"] {
         width: 1rem;
         height: 1rem;
         cursor: pointer;
         accent-color: rgba(168, 85, 247, 1);
      }
      
      span {
         color: var(--text-primary);
      }
      
      i {
         font-size: var(--font-sm);
         color: rgba(168, 85, 247, 0.7);
      }
      
      &:hover {
         span {
            color: rgba(168, 85, 247, 1);
         }
         
         i {
            color: rgba(168, 85, 247, 1);
         }
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
