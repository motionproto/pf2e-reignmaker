/**
 * OutcomePreview - Unified outcome preview for all check-based gameplay
 * 
 * This replaces the fragmented state management where:
 * - Incidents stored in turnState.unrestPhase.incidentResolution
 * - Events stored in activeEventInstances
 * 
 * New unified pattern: All checks (incidents, events, actions) use OutcomePreview
 * stored in kingdomData.pendingOutcomes
 */

import type { EventModifier } from '../types/events';

/**
 * Unified outcome preview for all check-based gameplay
 * Replaces ActiveEventInstance and turnState check fields
 */
export interface OutcomePreview {
  // Identity
  previewId: string;           // Unique per preview: "{checkType}-{checkId}-{timestamp}"
  checkType: 'event' | 'incident' | 'action';
  checkId: string;              // Source ID (eventId, incidentId, actionId)
  checkData: any;               // KingdomEvent | KingdomIncident | PlayerAction
  metadata?: any;               // Optional metadata for action-specific data (e.g., structureId, settlementId)
  
  // Pipeline coordinator flag (for new unified pipeline system)
  usePipelineCoordinator?: boolean;  // If true, PipelineCoordinator manages this instance
  
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
    
    // Resolution data (all synced across clients for multi-player coordination)
    stateChanges?: Record<string, number>;  // Pre-computed state changes (synced for display)
    modifiers: EventModifier[];  // Resolved static values
    manualEffects: string[];
    specialEffects: (string | import('../types/special-effects').SpecialEffect)[];    // Supports both legacy strings and new structured format
    outcomeBadges?: Array<{ icon: string; message: string }>;  // Custom outcome badges (e.g., gold collection, status changes)
    gameCommands?: any[];  // Complex operations to execute on "Apply Result" (PreparedCommand pattern)
    choices?: any[];  // Explicit choices (if not auto-generated from resource arrays)
    
    // Metadata
    shortfallResources: string[];
    rollBreakdown?: any;
    effectsApplied: boolean;     // Mark when "Apply Result" clicked
    isIgnored?: boolean;         // Flag for ignored events (hides reroll button)
    
    // Component-based rendering (unified pattern for standard and custom outcomes)
    component?: any;       // Svelte component for rendering (null = use StandardOutcomeDisplay)
    componentProps?: Record<string, any>;  // Props to pass to component
    componentName?: string;  // Component name for registry lookup (serializable alternative to component class)
    
    // Legacy aliases (deprecated - use componentName/componentProps instead)
    /** @deprecated Use componentName instead */
    customComponent?: any;
    /** @deprecated Use componentProps instead */
    customResolutionProps?: Record<string, any>;
  };
  
  // NOTE: Pending commits are stored client-side in CommitStorage (src/utils/CommitStorage.ts)
  // Functions cannot be serialized in Foundry actor flags, so we store them separately
}

/**
 * Helper type for outcome preview filtering
 */
export type CheckType = OutcomePreview['checkType'];
export type CheckStatus = OutcomePreview['status'];
