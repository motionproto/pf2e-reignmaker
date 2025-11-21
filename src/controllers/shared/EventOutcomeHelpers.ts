import type { EventData } from '../events/event-loader';

/**
 * Outcome structure for display
 */
export interface EventOutcome {
  type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  description: string;
}

/**
 * Build outcomes array for an event
 * 
 * Consolidates duplicated logic from EventsPhase.svelte:
 * - Lines 141-165: Build outcomes for ongoing events
 * - Lines 275-304: Build outcomes for current event
 */
export function buildEventOutcomes(event: EventData): EventOutcome[] {
  const outcomes: EventOutcome[] = [];
  
  if (event.outcomes.criticalSuccess) {
    outcomes.push({
      type: 'criticalSuccess',
      description: event.outcomes.criticalSuccess.msg
    });
  }
  
  if (event.outcomes.success) {
    outcomes.push({
      type: 'success',
      description: event.outcomes.success.msg
    });
  }
  
  if (event.outcomes.failure) {
    outcomes.push({
      type: 'failure',
      description: event.outcomes.failure.msg
    });
  }
  
  if (event.outcomes.criticalFailure) {
    outcomes.push({
      type: 'criticalFailure',
      description: event.outcomes.criticalFailure.msg
    });
  }
  
  return outcomes;
}
