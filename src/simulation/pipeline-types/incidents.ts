/**
 * Incident Pipeline Types and Auto-Resolvers
 * 
 * This file defines data requirements for all 30 incident pipelines
 * and provides auto-resolve functions for simulation.
 * 
 * Incidents are triggered by high unrest and generally have negative effects.
 * Most use modifiers only, but some have execute functions for special effects
 * like structure damage/destroy or spending player actions.
 * 
 * Categories:
 * - none: Pure modifier incidents (most common)
 * - gameCommand: Uses gameCommands for structure effects or player actions
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { OutcomeType } from '../../types/CheckPipeline';

// =============================================================================
// TYPES
// =============================================================================

export type IncidentDataLocation = 'none' | 'gameCommand';

export interface IncidentSimulationContext {
  kingdom: KingdomData;
  exploredHexIds: Set<string>;
  outcome: OutcomeType;
  turn: number;
}

export interface IncidentDataRequirement {
  incidentId: string;
  dataLocation: IncidentDataLocation;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  resolve: (ctx: IncidentSimulationContext) => IncidentResolvedData | null;
}

export interface IncidentResolvedData {
  metadata?: Record<string, any>;
}

// =============================================================================
// INCIDENT DATA REQUIREMENTS
// =============================================================================

/**
 * Pure modifier incidents - no special data needed
 * These incidents just apply outcome modifiers automatically
 */
const PURE_MODIFIER_INCIDENTS: Array<{ id: string; severity: 'minor' | 'moderate' | 'major' }> = [
  // Minor
  { id: 'bandit-raids', severity: 'minor' },
  { id: 'corruption-scandal', severity: 'minor' },
  { id: 'crime-wave', severity: 'minor' },
  { id: 'diplomatic-incident', severity: 'minor' },
  { id: 'emigration-threat', severity: 'minor' },
  { id: 'protests', severity: 'minor' },
  { id: 'rising-tensions', severity: 'minor' },
  { id: 'work-stoppage', severity: 'minor' },
  
  // Moderate
  { id: 'diplomatic-crisis', severity: 'moderate' },
  { id: 'disease-outbreak', severity: 'moderate' },
  { id: 'mass-exodus', severity: 'moderate' },
  { id: 'production-strike', severity: 'moderate' },
  { id: 'tax-revolt', severity: 'moderate' },
  { id: 'trade-embargo', severity: 'moderate' },
  
  // Major
  { id: 'border-raid', severity: 'major' },
  { id: 'economic-crash', severity: 'major' },
  { id: 'international-crisis', severity: 'major' },
  { id: 'international-scandal', severity: 'major' },
  { id: 'mass-desertion-threat', severity: 'major' },
  { id: 'prison-breaks', severity: 'major' },
  { id: 'religious-schism', severity: 'major' },
  { id: 'trade-war', severity: 'major' },
];

/**
 * Incidents with gameCommand effects (structure damage/destroy, player actions)
 */
const GAME_COMMAND_INCIDENTS: Array<{ id: string; severity: 'minor' | 'moderate' | 'major'; description: string }> = [
  // Moderate - structure effects
  { id: 'assassin-attack', severity: 'moderate', description: 'May spend player action on failure' },
  { id: 'infrastructure-damage', severity: 'moderate', description: 'Damages structures on failure' },
  { id: 'riot', severity: 'moderate', description: 'Damages/destroys structures on failure' },
  { id: 'settlement-crisis', severity: 'moderate', description: 'Damages structures on failure' },
  
  // Major - severe effects
  { id: 'guerrilla-movement', severity: 'major', description: 'Damages/destroys structures on failure' },
  { id: 'noble-conspiracy', severity: 'major', description: 'Spends player action on critical failure' },
  { id: 'secession-crisis', severity: 'major', description: 'May damage structures' },
  { id: 'settlement-collapse', severity: 'major', description: 'Destroys structures on failure' },
];

export const INCIDENT_DATA_REQUIREMENTS: Record<string, IncidentDataRequirement> = {};

// Add pure modifier incidents (no data needed)
for (const incident of PURE_MODIFIER_INCIDENTS) {
  INCIDENT_DATA_REQUIREMENTS[incident.id] = {
    incidentId: incident.id,
    dataLocation: 'none',
    severity: incident.severity,
    description: 'Pure modifier incident - modifiers applied automatically',
    resolve: () => ({})
  };
}

// Add gameCommand incidents
for (const incident of GAME_COMMAND_INCIDENTS) {
  INCIDENT_DATA_REQUIREMENTS[incident.id] = {
    incidentId: incident.id,
    dataLocation: 'gameCommand',
    severity: incident.severity,
    description: incident.description,
    resolve: () => ({})  // gameCommands are prepared during preview.calculate
  };
}

// =============================================================================
// RESOLVER FUNCTION
// =============================================================================

/**
 * Auto-resolve data requirements for an incident
 * 
 * @param incidentId - The incident pipeline ID
 * @param ctx - Simulation context with kingdom state
 * @returns Resolved data ready to inject into pipeline context
 */
export function resolveIncidentData(
  incidentId: string,
  ctx: IncidentSimulationContext
): IncidentResolvedData | null {
  const requirement = INCIDENT_DATA_REQUIREMENTS[incidentId];
  
  if (!requirement) {
    // Unknown incident - assume pure modifier
    console.warn(`[PipelineTypes] No data requirement defined for incident: ${incidentId}`);
    return {};
  }
  
  return requirement.resolve(ctx);
}

/**
 * Get list of all incident IDs with their data requirements
 */
export function getIncidentDataSummary(): Array<{ 
  incidentId: string; 
  location: IncidentDataLocation;
  severity: string;
  description: string 
}> {
  return Object.values(INCIDENT_DATA_REQUIREMENTS).map(req => ({
    incidentId: req.incidentId,
    location: req.dataLocation,
    severity: req.severity,
    description: req.description
  }));
}

/**
 * Check if an incident is a pure modifier incident (no special handling needed)
 */
export function isPureModifierIncident(incidentId: string): boolean {
  const requirement = INCIDENT_DATA_REQUIREMENTS[incidentId];
  return requirement?.dataLocation === 'none';
}

/**
 * Get incidents by severity for simulation selection
 */
export function getIncidentsBySeverity(severity: 'minor' | 'moderate' | 'major'): string[] {
  return Object.values(INCIDENT_DATA_REQUIREMENTS)
    .filter(req => req.severity === severity)
    .map(req => req.incidentId);
}

/**
 * Determine incident severity based on unrest level
 * - 3+ unrest: minor incidents
 * - 5+ unrest: moderate incidents
 * - 8+ unrest: major incidents
 */
export function selectIncidentSeverity(unrest: number): 'minor' | 'moderate' | 'major' | null {
  if (unrest >= 8) {
    // Major incidents at very high unrest
    const roll = Math.random();
    if (roll < 0.3) return 'major';
    if (roll < 0.7) return 'moderate';
    return 'minor';
  }
  
  if (unrest >= 5) {
    // Moderate incidents at high unrest
    const roll = Math.random();
    if (roll < 0.5) return 'moderate';
    return 'minor';
  }
  
  if (unrest >= 3) {
    // Only minor incidents at moderate unrest
    return 'minor';
  }
  
  // No incidents at low unrest
  return null;
}

/**
 * Select a random incident based on kingdom unrest
 */
export function selectRandomIncident(kingdom: KingdomData): string | null {
  const unrest = kingdom.resources?.unrest || 0;
  const severity = selectIncidentSeverity(unrest);
  
  if (!severity) return null;
  
  const candidates = getIncidentsBySeverity(severity);
  if (candidates.length === 0) return null;
  
  return candidates[Math.floor(Math.random() * candidates.length)];
}








