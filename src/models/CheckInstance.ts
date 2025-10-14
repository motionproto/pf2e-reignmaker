/**
 * CheckInstance - Unified check instance for all check-based gameplay
 * 
 * This replaces the fragmented state management where:
 * - Incidents stored in turnState.unrestPhase.incidentResolution
 * - Events stored in activeEventInstances
 * 
 * New unified pattern: All checks (incidents, events, actions) use ActiveCheckInstance
 * stored in kingdomData.activeCheckInstances
 */

import type { EventModifier } from '../types/events';

/**
 * Unified check instance for all check-based gameplay
 * Replaces ActiveEventInstance and turnState check fields
 */
export interface ActiveCheckInstance {
  // Identity
  instanceId: string;           // Unique per instance: "{checkType}-{checkId}-{timestamp}"
  checkType: 'event' | 'incident' | 'action';
  checkId: string;              // Source ID (eventId, incidentId, actionId)
  checkData: any;               // KingdomEvent | KingdomIncident | PlayerAction
  
  // Lifecycle
  createdTurn: number;
  status: 'pending' | 'resolved' | 'applied';
  
  // Resolution state (dice rolls, choices) - stored in instance for persistence
  resolutionState?: {
    selectedChoice: number | null;
    resolvedDice: Record<string | number, number>;
    selectedResources: Record<number, string>;
    customComponentData?: any;  // Custom component resolution data (action-specific)
  };
  
  // Resolution tracking (for multi-player coordination)
  resolutionProgress?: {
    playerId: string;
    playerName: string;
    timestamp: number;
    outcome: string;
    selectedChoices: number[];
    rolledDice: Record<string, number>;
  };
  
  // Applied outcome (syncs across clients)
  appliedOutcome?: {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    actorName: string;
    skillName: string;
    effect: string;
    modifiers: EventModifier[];  // Resolved static values
    manualEffects: string[];
    shortfallResources: string[];
    rollBreakdown?: any;
    effectsApplied: boolean;     // Mark when "Apply Result" clicked
  };
}

/**
 * Helper type for check instance filtering
 */
export type CheckType = ActiveCheckInstance['checkType'];
export type CheckStatus = ActiveCheckInstance['status'];
