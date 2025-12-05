<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData } from '../../stores/KingdomStore';
   import { pipelineRegistry } from '../../pipelines/PipelineRegistry';
   import { buildPossibleOutcomes } from '../../controllers/shared/PossibleOutcomeHelpers';
   import { buildEventOutcomes } from '../../controllers/shared/EventOutcomeHelpers';
   import { logger } from '../../utils/Logger';
   
   // Type for loaded events
   type LoadedEvent = any;
   
   // Import UI components
   import BaseCheckCard from '../kingdom/components/BaseCheckCard.svelte';
   
   // Import event status tracking
   import { getEventStatus, getEventNumber } from '../../constants/migratedEvents';
   
   // Props
   export let hideUntrainedSkills: boolean = true;
   
   // Toggle for showing tested events
   let showTestedEvents: boolean = false;
   
   // Priority events to test first (from the testing plan)
   const PRIORITY_EVENT_IDS = [
      'assassination-attempt',  // Static only - simplest case
      'food-surplus',           // Positive dice rolls
      'food-shortage',          // Negative dice formula
      'grand-tournament',       // Fame resource
      'land-rush',              // claim_hex special effect
      'notorious-heist',        // imprisoned_unrest
      'bandit-activity',        // Ongoing event
      'archaeological-find',    // Choice-buttons (gain commodity)
      'natural-disaster',       // Choice-buttons (lose commodity)
   ];
   
   // Load all events organized by trait
   let priorityEvents: LoadedEvent[] = [];
   let beneficialEvents: LoadedEvent[] = [];
   let dangerousEvents: LoadedEvent[] = [];
   let neutralEvents: LoadedEvent[] = [];
   
   // Track which event is currently being tested
   let activeEventId: string | null = null;
   let isRolling = false;
   
   // Controller reference for event execution
   let eventPhaseController: any;
   
   // ✅ REACTIVE: Derive event previews from store (must use $: for reactivity)
   // This is the same pattern used by ActionsPhase for action outcomes
   $: eventPreviewMap = ($kingdomData?.pendingOutcomes || [])
      .filter(i => i.checkType === 'event' && i.metadata?.isDebugTest)
      .reduce((map, instance) => {
         map.set(instance.checkId, instance);
         return map;
      }, new Map<string, any>());
   
   // ✅ Force {#each} blocks to re-render when previews change
   // This key changes whenever any debug event preview is added/updated
   $: previewsKey = Array.from(eventPreviewMap.entries())
      .map(([id, p]) => `${id}:${p.status}:${!!p.appliedOutcome}`)
      .join(',');
   
   onMount(async () => {
      // Load events by trait from pipeline registry
      loadEvents();
      
      // Initialize controller
      const { createEventPhaseController } = await import('../../controllers/EventPhaseController');
      eventPhaseController = await createEventPhaseController(null);
   });
   
   // Reactive: Reload events when toggle changes
   $: if (showTestedEvents !== undefined) {
      loadEvents();
   }
   
   function loadEvents() {
      const allEvents = pipelineRegistry.getPipelinesByType('event');
      
      // Priority events - show at top regardless of trait
      priorityEvents = PRIORITY_EVENT_IDS
         .map(id => allEvents.find((e: any) => e.id === id))
         .filter((e): e is LoadedEvent => {
            if (!e) return false;
            const notTested = getEventStatus(e.id) !== 'tested';
            return showTestedEvents || notTested;
         });
      
      // Non-priority events by trait
      const nonPriorityEvents = allEvents.filter((e: any) => !PRIORITY_EVENT_IDS.includes(e.id));
      
      // Filter events by trait and tested status
      beneficialEvents = nonPriorityEvents.filter((e: any) => {
         const notTested = getEventStatus(e.id) !== 'tested';
         const isBeneficial = e.traits?.includes('beneficial');
         return isBeneficial && (showTestedEvents || notTested);
      });
      
      dangerousEvents = nonPriorityEvents.filter((e: any) => {
         const notTested = getEventStatus(e.id) !== 'tested';
         const isDangerous = e.traits?.includes('dangerous');
         return isDangerous && (showTestedEvents || notTested);
      });
      
      // Neutral = not beneficial and not dangerous
      neutralEvents = nonPriorityEvents.filter((e: any) => {
         const notTested = getEventStatus(e.id) !== 'tested';
         const isBeneficial = e.traits?.includes('beneficial');
         const isDangerous = e.traits?.includes('dangerous');
         return !isBeneficial && !isDangerous && (showTestedEvents || notTested);
      });
      
      console.log('[EventDebugPanel] Loaded events:', {
         showTested: showTestedEvents,
         priority: priorityEvents.length,
         beneficial: beneficialEvents.length,
         dangerous: dangerousEvents.length,
         neutral: neutralEvents.length
      });
   }
   
   // Build outcomes array for BaseCheckCard using shared helper
   function buildEventCardOutcomes(event: LoadedEvent) {
      if (!event.outcomes) return [];
      return buildEventOutcomes(event);
   }
   
   // Execute skill check for an event
   async function handleExecuteSkill(event: CustomEvent, eventData: LoadedEvent) {
      const { skill } = event.detail;
      
      activeEventId = eventData.id;
      isRolling = true;
      
      try {
         // Use PipelineCoordinator for events
         const { getPipelineCoordinator } = await import('../../services/PipelineCoordinator');
         const { getCurrentUserCharacter } = await import('../../services/pf2e');
         
         const pipelineCoordinator = await getPipelineCoordinator();
         const actingCharacter = getCurrentUserCharacter();
         
         if (!actingCharacter) {
            throw new Error('No character selected');
         }
         
         await pipelineCoordinator.executePipeline(eventData.id, {
            checkType: 'event',
            actor: {
               selectedSkill: skill,
               fullActor: actingCharacter,
               actorName: actingCharacter.name,
               actorId: actingCharacter.id,
               level: actingCharacter.level || 1,
               proficiencyRank: 0
            },
            metadata: {
               isDebugTest: true  // Mark as debug test to hide from normal EventsPhase
            }
         });
         
         console.log('[EventDebugPanel] Pipeline executed for:', eventData.name);
         
      } catch (error) {
         if ((error as Error).message === 'Action cancelled by user') {
            logger.info('[EventDebugPanel] User cancelled event check');
         } else {
            logger.error('[EventDebugPanel] Error in event check:', error);
            ui?.notifications?.error(`Failed to perform event check: ${(error as Error).message}`);
         }
      } finally {
         isRolling = false;
         activeEventId = null;
      }
   }
   
   // Handle apply result
   async function handleApplyResult(event: CustomEvent, eventData: LoadedEvent) {
      const resolutionData = event.detail.resolution;
      
      // Get the active instance for this event
      const activeInstance = $kingdomData?.pendingOutcomes?.find(
         i => i.checkType === 'event' && i.checkId === eventData.id
      );
      
      if (!activeInstance) {
         console.warn('[EventDebugPanel] No active instance found for event:', eventData.id);
         return;
      }
      
      // Use PipelineCoordinator to confirm and execute
      const { getPipelineCoordinator } = await import('../../services/PipelineCoordinator');
      const pipelineCoordinator = await getPipelineCoordinator();
      await pipelineCoordinator.confirmApply(activeInstance.previewId, resolutionData);
   }
   
   // Handle cancel
   async function handleCancel(event: CustomEvent, eventData: LoadedEvent) {
      // Get the active instance for this event
      const activeInstance = $kingdomData?.pendingOutcomes?.find(
         i => i.checkType === 'event' && i.checkId === eventData.id
      );
      
      if (!activeInstance) return;
      
      // Clear the instance
      const { createOutcomePreviewService } = await import('../../services/OutcomePreviewService');
      const outcomePreviewService = await createOutcomePreviewService();
      await outcomePreviewService.clearInstance(activeInstance.previewId);
   }
   
   // Handle ignore event - uses centralized IgnoreEventService
   async function handleIgnore(event: CustomEvent, eventData: LoadedEvent) {
      const { ignoreEventService } = await import('../../services/IgnoreEventService');
      
      console.log('[EventDebugPanel] Ignoring event:', eventData.id);
      const result = await ignoreEventService.ignoreEvent(eventData.id, { isDebugTest: true });
      
      if (!result.success) {
         console.error('[EventDebugPanel] Failed to ignore event:', result.error);
      }
   }
   
   // Handle reroll
   async function handleReroll(event: CustomEvent, eventData: LoadedEvent) {
      const { skill } = event.detail;
      
      // Cancel current and re-execute
      await handleCancel(event, eventData);
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a mock event with the skill
      const mockEvent = { detail: { skill } } as CustomEvent;
      await handleExecuteSkill(mockEvent, eventData);
   }
   
   // Get active outcome preview for an event (only debug tests)
   // ✅ Use reactive map lookup instead of store.find() for proper reactivity
   function getEventPreview(eventData: LoadedEvent) {
      const preview = eventPreviewMap.get(eventData.id) || null;
      
      if (preview) {
         console.log(`[EventDebugPanel] Found debug preview for ${eventData.id}:`, preview);
      }
      
      return preview;
   }
   
   // Check if event is resolved
   function isEventResolved(eventData: LoadedEvent): boolean {
      const preview = getEventPreview(eventData);
      const resolved = !!preview?.appliedOutcome;
      
      console.log(`[EventDebugPanel] isEventResolved for ${eventData.id}:`, {
         hasPreview: !!preview,
         hasAppliedOutcome: !!preview?.appliedOutcome,
         resolved
      });
      
      return resolved;
   }
   
   // Get resolution for event
   function getEventResolution(eventData: LoadedEvent) {
      const preview = getEventPreview(eventData);
      return preview?.appliedOutcome || null;
   }
   
   // Helper to get trait category for display
   function getTraitCategory(event: LoadedEvent): 'beneficial' | 'dangerous' | 'neutral' {
      if (event.traits?.includes('beneficial')) return 'beneficial';
      if (event.traits?.includes('dangerous')) return 'dangerous';
      return 'neutral';
   }
</script>

<div class="event-debug-panel">
   <div class="debug-header">
      <i class="fas fa-bug"></i>
      <h3>Event Debug Panel</h3>
      <span class="event-count">
         {priorityEvents.length + beneficialEvents.length + dangerousEvents.length + neutralEvents.length} events
      </span>
   </div>
   
   <div class="debug-controls">
   <div class="debug-notice">
      <i class="fas fa-info-circle"></i>
         <span>Testing events with the PipelineCoordinator system.</span>
      </div>
      
      <label class="toggle-control">
         <input type="checkbox" bind:checked={showTestedEvents} />
         <span class="toggle-slider"></span>
         <span class="toggle-label">Show Tested Events</span>
      </label>
   </div>
   
   <!-- Priority Testing Events (test these first!) -->
   {#if priorityEvents.length > 0}
   <div class="trait-section">
      <div class="trait-header priority">
         <i class="fas fa-flask"></i>
         <h4>Priority Testing</h4>
         <span class="count">{priorityEvents.length}</span>
      </div>
      <div class="events-grid">
         {#each priorityEvents as event (`${event.id}-${previewsKey}`)}
            {@const preview = getEventPreview(event)}
            {@const resolved = isEventResolved(event)}
            {@const resolution = getEventResolution(event)}
            {@const possibleOutcomes = buildPossibleOutcomes(event.outcomes, true)}
            {@const eventStatus = getEventStatus(event.id)}
            {@const eventNumber = getEventNumber(event.id)}
            <BaseCheckCard
               id={event.id}
               name={event.name}
               description={event.description}
               skills={event.skills}
               outcomes={buildEventCardOutcomes(event)}
               traits={event.traits || []}
               checkType="event"
               outcomePreview={preview}
               expandable={false}
               showCompletions={false}
               showAvailability={false}
               showSpecial={false}
               showIgnoreButton={true}
               isViewingCurrentPhase={true}
               {possibleOutcomes}
               showAidButton={false}
               {resolved}
               {resolution}
               skillSectionTitle="Choose Your Response:"
               {hideUntrainedSkills}
               eventStatus={eventStatus}
               eventNumber={eventNumber}
               on:executeSkill={(e) => handleExecuteSkill(e, event)}
               on:primary={(e) => handleApplyResult(e, event)}
               on:cancel={(e) => handleCancel(e, event)}
               on:ignore={(e) => handleIgnore(e, event)}
               on:performReroll={(e) => handleReroll(e, event)}
            />
         {/each}
      </div>
   </div>
   {/if}
   
   <!-- Beneficial Events -->
   <div class="trait-section">
      <div class="trait-header beneficial">
         <i class="fas fa-sun"></i>
         <h4>Beneficial Events</h4>
         <span class="count">{beneficialEvents.length}</span>
      </div>
      <div class="events-grid">
         {#each beneficialEvents as event (`${event.id}-${previewsKey}`)}
            {@const preview = getEventPreview(event)}
            {@const resolved = isEventResolved(event)}
            {@const resolution = getEventResolution(event)}
            {@const possibleOutcomes = buildPossibleOutcomes(event.outcomes, true)}
            {@const eventStatus = getEventStatus(event.id)}
            {@const eventNumber = getEventNumber(event.id)}
            <BaseCheckCard
               id={event.id}
               name={event.name}
               description={event.description}
               skills={event.skills}
               outcomes={buildEventCardOutcomes(event)}
               traits={event.traits || []}
               checkType="event"
               outcomePreview={preview}
               expandable={false}
               showCompletions={false}
               showAvailability={false}
               showSpecial={false}
               showIgnoreButton={true}
               isViewingCurrentPhase={true}
               {possibleOutcomes}
               showAidButton={false}
               {resolved}
               {resolution}
               skillSectionTitle="Choose Your Response:"
               {hideUntrainedSkills}
               eventStatus={eventStatus}
               eventNumber={eventNumber}
               on:executeSkill={(e) => handleExecuteSkill(e, event)}
               on:primary={(e) => handleApplyResult(e, event)}
               on:cancel={(e) => handleCancel(e, event)}
               on:ignore={(e) => handleIgnore(e, event)}
               on:performReroll={(e) => handleReroll(e, event)}
            />
         {/each}
      </div>
   </div>
   
   <!-- Dangerous Events -->
   <div class="trait-section">
      <div class="trait-header dangerous">
         <i class="fas fa-skull-crossbones"></i>
         <h4>Dangerous Events</h4>
         <span class="count">{dangerousEvents.length}</span>
      </div>
      <div class="events-grid">
         {#each dangerousEvents as event (`${event.id}-${previewsKey}`)}
            {@const preview = getEventPreview(event)}
            {@const resolved = isEventResolved(event)}
            {@const resolution = getEventResolution(event)}
            {@const possibleOutcomes = buildPossibleOutcomes(event.outcomes, true)}
            {@const eventStatus = getEventStatus(event.id)}
            {@const eventNumber = getEventNumber(event.id)}
            <BaseCheckCard
               id={event.id}
               name={event.name}
               description={event.description}
               skills={event.skills}
               outcomes={buildEventCardOutcomes(event)}
               traits={event.traits || []}
               checkType="event"
               outcomePreview={preview}
               expandable={false}
               showCompletions={false}
               showAvailability={false}
               showSpecial={false}
               showIgnoreButton={true}
               isViewingCurrentPhase={true}
               {possibleOutcomes}
               showAidButton={false}
               {resolved}
               {resolution}
               skillSectionTitle="Choose Your Response:"
               {hideUntrainedSkills}
               eventStatus={eventStatus}
               eventNumber={eventNumber}
               on:executeSkill={(e) => handleExecuteSkill(e, event)}
               on:primary={(e) => handleApplyResult(e, event)}
               on:cancel={(e) => handleCancel(e, event)}
               on:ignore={(e) => handleIgnore(e, event)}
               on:performReroll={(e) => handleReroll(e, event)}
            />
         {/each}
      </div>
   </div>
   
   <!-- Neutral/Mixed Events -->
   <div class="trait-section">
      <div class="trait-header neutral">
         <i class="fas fa-balance-scale"></i>
         <h4>Neutral Events</h4>
         <span class="count">{neutralEvents.length}</span>
      </div>
      <div class="events-grid">
         {#each neutralEvents as event (`${event.id}-${previewsKey}`)}
            {@const preview = getEventPreview(event)}
            {@const resolved = isEventResolved(event)}
            {@const resolution = getEventResolution(event)}
            {@const possibleOutcomes = buildPossibleOutcomes(event.outcomes, true)}
            {@const eventStatus = getEventStatus(event.id)}
            {@const eventNumber = getEventNumber(event.id)}
            <BaseCheckCard
               id={event.id}
               name={event.name}
               description={event.description}
               skills={event.skills}
               outcomes={buildEventCardOutcomes(event)}
               traits={event.traits || []}
               checkType="event"
               outcomePreview={preview}
               expandable={false}
               showCompletions={false}
               showAvailability={false}
               showSpecial={false}
               showIgnoreButton={true}
               isViewingCurrentPhase={true}
               {possibleOutcomes}
               showAidButton={false}
               {resolved}
               {resolution}
               skillSectionTitle="Choose Your Response:"
               {hideUntrainedSkills}
               eventStatus={eventStatus}
               eventNumber={eventNumber}
               on:executeSkill={(e) => handleExecuteSkill(e, event)}
               on:primary={(e) => handleApplyResult(e, event)}
               on:cancel={(e) => handleCancel(e, event)}
               on:ignore={(e) => handleIgnore(e, event)}
               on:performReroll={(e) => handleReroll(e, event)}
            />
         {/each}
      </div>
   </div>
</div>

<style lang="scss">
   .event-debug-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-20);
      padding: var(--space-16);
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid var(--border-special-subtle);
      border-radius: var(--radius-lg);
   }
   
   .debug-header {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      
      i {
         font-size: var(--font-xl);
         color: rgba(196, 181, 253, 1);
      }
      
      h3 {
         margin: 0;
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }
      
      .event-count {
         margin-left: auto;
         padding: var(--space-4) var(--space-10);
         background: rgba(139, 92, 246, 0.15);
         border-radius: var(--radius-full);
         font-size: var(--font-md);
         color: rgba(196, 181, 253, 1);
      }
   }
   
   .debug-controls {
      display: flex;
      flex-direction: column;
      gap: var(--space-10);
      padding-bottom: var(--space-12);
      border-bottom: 1px solid var(--border-special-subtle);
   }
   
   .debug-notice {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-10) var(--space-12);
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid var(--border-special-subtle);
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      color: var(--text-secondary);
      
      i {
         color: rgba(196, 181, 253, 1);
      }
   }
   
   .toggle-control {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      padding: var(--space-8) var(--space-12);
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid var(--border-special-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background 0.2s;
      
      &:hover {
         background: rgba(139, 92, 246, 0.1);
      }
      
      input[type="checkbox"] {
         position: absolute;
         opacity: 0;
         width: 0;
         height: 0;
         
         &:checked + .toggle-slider {
            background: rgba(139, 92, 246, 0.8);
            
            &::before {
               transform: translateX(1rem);
            }
         }
      }
      
      .toggle-slider {
         position: relative;
         display: inline-block;
         width: 2.5rem;
         height: 1.25rem;
         background: rgba(139, 92, 246, 0.3);
         border-radius: var(--radius-full);
         transition: background 0.2s;
         
         &::before {
            content: '';
            position: absolute;
            top: 0.125rem;
            left: 0.125rem;
            width: 1rem;
            height: 1rem;
            background: white;
            border-radius: var(--radius-full);
            transition: transform 0.2s;
         }
      }
      
      .toggle-label {
         font-size: var(--font-md);
         color: var(--text-primary);
         user-select: none;
      }
   }
   
   .trait-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }
   
   .trait-header {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      padding: var(--space-8) var(--space-12);
      border-radius: var(--radius-md);
      
      i {
         font-size: var(--font-lg);
      }
      
      h4 {
         margin: 0;
         font-size: var(--font-lg);
         font-weight: var(--font-weight-medium);
      }
      
      .count {
         margin-left: auto;
         padding: var(--space-2) var(--space-8);
         border-radius: var(--radius-full);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
      }
      
      &.priority {
         background: rgba(139, 92, 246, 0.15);
         border: 1px solid rgba(139, 92, 246, 0.5);
         
         i, h4 { color: rgba(196, 181, 253, 1); }
         .count {
            background: rgba(139, 92, 246, 0.3);
            color: rgba(196, 181, 253, 1);
         }
      }
      
      &.beneficial {
         background: var(--surface-success-low);
         border: 1px solid var(--color-green-border);
         
         i, h4 { color: var(--color-green); }
         .count {
            background: rgba(34, 197, 94, 0.2);
            color: var(--color-green);
         }
      }
      
      &.dangerous {
         background: var(--surface-primary-low);
         border: 1px solid var(--border-primary-subtle);
         
         i, h4 { color: var(--color-red); }
         .count {
            background: var(--surface-primary);
            color: var(--color-red);
         }
      }
      
      &.neutral {
         background: var(--surface-accent-low);
         border: 1px solid var(--border-accent-subtle);
         
         i, h4 { color: var(--color-amber-light); }
         .count {
            background: var(--surface-accent);
            color: var(--color-amber-light);
         }
      }
   }
   
   .events-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }
</style>

