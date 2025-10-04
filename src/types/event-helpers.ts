/**
 * Helper functions for working with kingdom events and incidents
 * (Not auto-generated - safe to edit)
 */

import type { KingdomEvent } from './events';

/**
 * Helper to generate display name from event ID
 */
export function getEventDisplayName(event: KingdomEvent): string {
  return event.id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper to generate display name from incident ID
 * (Incidents use the same structure as events)
 */
export function getIncidentDisplayName(incident: KingdomEvent): string {
  return incident.id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
