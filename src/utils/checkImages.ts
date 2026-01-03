/**
 * Utility for resolving event and incident image paths
 *
 * Images are located at:
 * - Events: /src/img/events/{id}.webp
 * - Incidents: /src/img/incidents/{severity}/{id}.webp
 */

// Import all event images
const eventImages = import.meta.glob('../img/events/*.webp', { eager: true, as: 'url' });

// Import all incident images by severity
const incidentImages = import.meta.glob('../img/incidents/**/*.webp', { eager: true, as: 'url' });

/**
 * Get the image path for an event
 * @param eventId - The event ID (e.g., 'archaeological-find')
 * @returns The image URL or null if not found
 */
export function getEventImagePath(eventId: string): string | null {
  const key = `../img/events/${eventId}.webp`;
  return (eventImages[key] as string) || null;
}

/**
 * Get the image path for an incident
 * @param incidentId - The incident ID (e.g., 'bandit-raids')
 * @param severity - The incident severity ('minor', 'moderate', 'major')
 * @returns The image URL or null if not found
 */
export function getIncidentImagePath(incidentId: string, severity: string): string | null {
  const key = `../img/incidents/${severity}/${incidentId}.webp`;
  return (incidentImages[key] as string) || null;
}

/**
 * Get the image path for any check (event or incident)
 * @param checkType - 'event' or 'incident'
 * @param checkId - The check ID
 * @param severity - Required for incidents, ignored for events
 * @returns The image URL or null if not found
 */
export function getCheckImagePath(
  checkType: 'event' | 'incident' | 'action',
  checkId: string,
  severity?: string
): string | null {
  if (checkType === 'event') {
    return getEventImagePath(checkId);
  } else if (checkType === 'incident' && severity) {
    return getIncidentImagePath(checkId, severity);
  }
  return null;
}
