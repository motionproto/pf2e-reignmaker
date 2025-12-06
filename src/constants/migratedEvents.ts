/**
 * Event Testing Status Tracking
 * 
 * Tracks which events have been tested with the PipelineCoordinator.
 * Order matches debug panel display (priority first, then alphabetical by trait).
 */

export type EventStatus = 'untested' | 'testing' | 'tested';

/**
 * Event status tracking - Key: event ID, Value: current status
 */
export const EVENT_STATUS = new Map<string, EventStatus>([
  // Priority Testing #1-9
  ['assassination-attempt', 'tested'],
  ['food-surplus', 'tested'],
  ['food-shortage', 'tested'],
  ['grand-tournament', 'tested'],
  ['land-rush', 'tested'],
  ['notorious-heist', 'tested'],
  ['bandit-activity', 'tested'],
  ['archaeological-find', 'tested'],
  ['natural-disaster', 'tested'],
  // Beneficial #10-23
  ['boomtown', 'tested'],
  ['criminal-trial', 'tested'],
  ['diplomatic-overture', 'tested'],
  ['economic-surge', 'tested'],
  ['festive-invitation', 'tested'],
  ['good-weather', 'tested'],
  ['immigration', 'tested'],
  ['military-exercises', 'tested'],
  ['natures-blessing', 'tested'],
  ['pilgrimage', 'tested'],
  ['remarkable-treasure', 'tested'],
  ['scholarly-discovery', 'tested'],
  ['trade-agreement', 'tested'],
  ['visiting-celebrity', 'tested'],
  // Dangerous #24-37
  ['cult-activity', 'tested'],
  ['demand-expansion', 'tested'],
  ['demand-structure', 'tested'],
  ['drug-den', 'tested'],
  ['feud', 'tested'],
  ['inquisition', 'tested'],
  ['local-disaster', 'tested'],
  ['magical-discovery', 'tested'],
  ['monster-attack', 'tested'],
  ['plague', 'tested'],
  ['public-scandal', 'tested'],
  ['raiders', 'tested'],
  ['sensational-crime', 'tested'],
  ['undead-uprising', 'testing'],
]);

/**
 * Event numbers for badge display
 */
export const EVENT_NUMBERS = new Map<string, number>([
  ['assassination-attempt', 1],
  ['food-surplus', 2],
  ['food-shortage', 3],
  ['grand-tournament', 4],
  ['land-rush', 5],
  ['notorious-heist', 6],
  ['bandit-activity', 7],
  ['archaeological-find', 8],
  ['natural-disaster', 9],
  ['boomtown', 10],
  ['criminal-trial', 11],
  ['diplomatic-overture', 12],
  ['economic-surge', 13],
  ['festive-invitation', 14],
  ['good-weather', 15],
  ['immigration', 16],
  ['military-exercises', 17],
  ['natures-blessing', 18],
  ['pilgrimage', 19],
  ['remarkable-treasure', 20],
  ['scholarly-discovery', 21],
  ['trade-agreement', 22],
  ['visiting-celebrity', 23],
  ['cult-activity', 24],
  ['demand-expansion', 25],
  ['demand-structure', 26],
  ['drug-den', 27],
  ['feud', 28],
  ['inquisition', 29],
  ['local-disaster', 30],
  ['magical-discovery', 31],
  ['monster-attack', 32],
  ['plague', 33],
  ['public-scandal', 34],
  ['raiders', 35],
  ['sensational-crime', 36],
  ['undead-uprising', 37],
]);

export function getEventStatus(eventId: string): EventStatus {
  return EVENT_STATUS.get(eventId) || 'untested';
}

export function getEventNumber(eventId: string): number | null {
  return EVENT_NUMBERS.get(eventId) || null;
}

export function setEventStatus(eventId: string, status: EventStatus): void {
  EVENT_STATUS.set(eventId, status);
}

export function getEventsByStatus(status: EventStatus): string[] {
  return Array.from(EVENT_STATUS.entries())
    .filter(([_, s]) => s === status)
    .map(([id, _]) => id);
}

export function getCompletionStats(): {
  untested: number;
  testing: number;
  tested: number;
  total: number;
  percentComplete: number;
} {
  const stats = {
    untested: 0,
    testing: 0,
    tested: 0,
    total: EVENT_STATUS.size,
    percentComplete: 0
  };
  
  for (const status of EVENT_STATUS.values()) {
    stats[status]++;
  }
  
  stats.percentComplete = Math.round((stats.tested / stats.total) * 100);
  return stats;
}
