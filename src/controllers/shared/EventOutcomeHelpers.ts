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
  
  if (event.effects.criticalSuccess) {
    outcomes.push({
      type: 'criticalSuccess',
      description: event.effects.criticalSuccess.msg
    });
  }
  
  if (event.effects.success) {
    outcomes.push({
      type: 'success',
      description: event.effects.success.msg
    });
  }
  
  if (event.effects.failure) {
    outcomes.push({
      type: 'failure',
      description: event.effects.failure.msg
    });
  }
  
  if (event.effects.criticalFailure) {
    outcomes.push({
      type: 'criticalFailure',
      description: event.effects.criticalFailure.msg
    });
  }
  
  return outcomes;
}
