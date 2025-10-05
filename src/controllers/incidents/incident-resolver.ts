/**
 * IncidentResolver - Handles incident resolution business logic
 * 
 * Incidents use the same structure as events (KingdomEvent/KingdomIncident)
 * and require the same resolution logic: skill checks, outcome parsing,
 * resource changes, and modifier creation.
 */

import type { KingdomIncident, EventOutcome } from '../../types/incidents';
import { getIncidentDisplayName } from '../../types/incidents';
import type { KingdomData } from '../../actors/KingdomActor';
import type { ActiveModifier } from '../../models/Modifiers';
import {
  aggregateResourceChanges,
  prepareStateChanges,
  createUnresolvedModifier as createUnresolvedModifierShared,
  canResolveWithSkill as canResolveWithSkillShared,
  getLevelBasedDC
} from '../shared/resolution-service';

export interface IncidentResolutionResult {
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  message: string;
  resourceChanges: Map<string, number>;
  unresolvedModifier?: ActiveModifier;
}

export class IncidentResolver {
  /**
   * Apply the outcome of an incident resolution
   */
  applyIncidentOutcome(
    incident: KingdomIncident,
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
    currentTurn: number = 0,
    currentState?: KingdomData
  ): IncidentResolutionResult {
    let unresolvedModifier: ActiveModifier | undefined;
    
    const effect = incident.effects?.[outcome];
    if (!effect) {
      return { 
        outcome, 
        message: `No effect defined for ${outcome}`,
        resourceChanges: new Map()
      };
    }
    
    // Parse and aggregate resource modifiers using shared utility
    const resourceChanges = effect.modifiers
      ? aggregateResourceChanges(effect.modifiers)
      : new Map<string, number>();
    
    let message = effect.msg;
    
    // Check for resource shortage if we have current state
    if (currentState) {
      const { hadShortage } = prepareStateChanges(currentState, resourceChanges);
      if (hadShortage) {
        // Add shortage penalty
        const currentUnrest = resourceChanges.get('unrest') || 0;
        resourceChanges.set('unrest', currentUnrest + 1);
        message += '\nYou gained 1 unrest from shortage.';
      }
    }
    
    // Note: Incidents don't currently have ifUnresolved modifiers in their structure
    // They apply their effects immediately and don't persist
    
    return { 
      outcome,
      message,
      resourceChanges,
      unresolvedModifier 
    };
  }

  /**
   * Calculate resource changes from incident outcome
   */
  calculateResourceChanges(
    incident: KingdomIncident, 
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
  ): Map<string, number> {
    const effect = incident.effects?.[outcome];
    
    if (!effect?.modifiers) return new Map();
    
    // Use shared utility for resource aggregation
    return aggregateResourceChanges(effect.modifiers);
  }


  /**
   * Check if an incident can be resolved with a specific skill
   */
  canResolveWithSkill(incident: KingdomIncident, skill: string): boolean {
    return canResolveWithSkillShared(incident.skills, skill);
  }

  /**
   * Get the DC for resolving an incident (level-based)
   */
  getResolutionDC(kingdomLevel: number): number {
    // Use shared level-based DC calculation
    return getLevelBasedDC(kingdomLevel);
  }

  /**
   * Apply state changes to kingdom
   * Note: This returns the changes to be applied, not directly mutating state
   */
  prepareKingdomStateChanges(
    currentState: KingdomData,
    resourceChanges: Map<string, number>
  ): Partial<KingdomData> {
    // Use shared state preparation utility
    const { updates } = prepareStateChanges(currentState, resourceChanges);
    return updates;
  }
}

// Export singleton instance
export const incidentResolver = new IncidentResolver();
