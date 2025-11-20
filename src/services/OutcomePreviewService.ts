/**
 * OutcomePreviewService - Lifecycle management for outcome previews
 * 
 * Provides unified state management for all check-based gameplay:
 * - Incidents (Unrest phase)
 * - Events (Events phase)
 * - Actions (Actions phase)
 * 
 * Replaces fragmented state management where incidents stored in
 * turnState.unrestPhase.incidentResolution and events stored in
 * activeEventInstances.
 */

import { updateKingdom } from '../stores/KingdomStore';
import type { OutcomePreview } from '../models/OutcomePreview';
import type { KingdomData } from '../actors/KingdomActor';
import type { ResolutionData } from '../types/modifiers';
/**
 * Service for managing outcome previews (incidents, events, actions)
 * Provides lifecycle management and state synchronization across clients
 */
export class OutcomePreviewService {
  /**
   * Create a new outcome preview
   */
  async createInstance(
    checkType: 'incident' | 'event' | 'action',
    checkId: string,
    checkData: any,
    currentTurn: number,
    metadata?: any
  ): Promise<string> {
    const previewId = `T${currentTurn}-${checkId}-${Date.now()}`;
    const preview: OutcomePreview = {
      previewId,
      checkType,
      checkId,
      checkData,
      metadata,
      createdTurn: currentTurn,
      status: 'pending'
    };
    
    await updateKingdom(kingdom => {
      if (!kingdom.pendingOutcomes) kingdom.pendingOutcomes = [];
      kingdom.pendingOutcomes.push(preview);

    });
    
    return previewId;
  }
  
  /**
   * Get preview by ID
   */
  getInstance(previewId: string, kingdom: KingdomData): OutcomePreview | null {
    return kingdom.pendingOutcomes?.find(i => i.previewId === previewId) || null;
  }
  
  /**
   * Get active preview by check type and check ID
   */
  getActiveInstance(checkType: string, checkId: string, kingdom: KingdomData): OutcomePreview | null {
    return kingdom.pendingOutcomes?.find(i => 
      i.checkType === checkType && 
      i.checkId === checkId && 
      i.status === 'pending'
    ) || null;
  }
  
  /**
   * Get all pending previews by type
   */
  getPendingInstances(checkType: string, kingdom: KingdomData): OutcomePreview[] {
    return kingdom.pendingOutcomes?.filter(i => 
      i.checkType === checkType && 
      i.status === 'pending'
    ) || [];
  }
  
  /**
   * Store outcome (after skill check, before effects applied)
   * 
   * NOTE: customComponent is NOT serialized to actor flags (functions can't be JSON serialized)
   * Instead, we store the component's name (string) which can be looked up in OutcomeDisplay's registry.
   */
  async storeOutcome(
    previewId: string,
    outcome: string,
    resolutionData: ResolutionData,
    actorName: string,
    skillName: string,
    effect: string,
    rollBreakdown?: any,
    specialEffects?: any[],
    customComponent?: any,
    customResolutionProps?: Record<string, any>
  ): Promise<void> {
    console.log('📦 [OutcomePreviewService] storeOutcome called with specialEffects:', specialEffects);
    
    // Extract component name if component provided
    let componentName: string | undefined;
    if (customComponent) {
      // Get raw name (may be wrapped in Proxy<...> during HMR)
      let rawName = customComponent.name || customComponent.constructor?.name || '';
      
      // Strip Proxy<...> wrapper if present (HMR development mode)
      componentName = rawName.replace(/^Proxy<(.+)>$/, '$1');
      
      console.log('📦 [OutcomePreviewService] Custom component provided:', rawName);
      console.log('📦 [OutcomePreviewService] Extracted component name:', componentName);
      console.log('📦 [OutcomePreviewService] Storing component name (not class) for registry lookup');
    }
    
    await updateKingdom(kingdom => {
      const preview = kingdom.pendingOutcomes?.find(i => i.previewId === previewId);
      if (preview) {
        preview.appliedOutcome = {
          outcome: outcome as any,
          actorName,
          skillName,
          effect,
          modifiers: resolutionData.numericModifiers as any,
          manualEffects: resolutionData.manualEffects,
          specialEffects: specialEffects || [],
          shortfallResources: [],
          rollBreakdown,
          effectsApplied: false,
          // ⚠️ CRITICAL: Store component NAME (string) not component CLASS
          componentName,  // String = JSON serializable
          componentProps: customResolutionProps || {}  // Renamed from customResolutionProps
        };
        preview.status = 'resolved';
        console.log('✅ [OutcomePreviewService] Stored outcome with componentName:', componentName);
      } else {
        console.error(`❌ [OutcomePreviewService] Preview ${previewId} not found when storing outcome`);
      }
    });
  }
  
  /**
   * Mark effects as applied (after "Apply Result" clicked)
   */
  async markApplied(previewId: string): Promise<void> {
    await updateKingdom(kingdom => {
      if (!kingdom.pendingOutcomes) return;
      
      // CRITICAL: Create new array atomically (no mutation before reassignment)
      kingdom.pendingOutcomes = kingdom.pendingOutcomes.map(preview => {
        if (preview.previewId === previewId && preview.appliedOutcome) {
          // Create new preview with updated nested properties
          return {
            ...preview,
            status: 'applied' as const,
            appliedOutcome: {
              ...preview.appliedOutcome,
              effectsApplied: true
            }
          };
        }
        return preview;
      });

    });
  }
  
  /**
   * Update shortfall resources after effects application
   */
  async updateShortfallResources(previewId: string, resources: string[]): Promise<void> {
    await updateKingdom(kingdom => {
      const preview = kingdom.pendingOutcomes?.find(i => i.previewId === previewId);
      if (preview?.appliedOutcome) {
        preview.appliedOutcome.shortfallResources = resources;
      }
    });
  }
  
  /**
   * Clear completed previews (for specific check type)
   * IMPORTANT: For events, this only clears 'resolved' or 'applied' status, NOT 'pending' (ongoing events)
   */
  async clearCompleted(checkType: 'incident' | 'event', currentTurn?: number): Promise<void> {
    await updateKingdom(kingdom => {
      const before = kingdom.pendingOutcomes?.length || 0;
      
      if (checkType === 'event') {
        // Events: Keep pending (ongoing), clear resolved/applied
        kingdom.pendingOutcomes = kingdom.pendingOutcomes?.filter(i => 
          i.checkType !== 'event' || i.status === 'pending'
        ) || [];

      } else {
        // Incidents: Clear all non-pending (incidents don't have ongoing state)
        kingdom.pendingOutcomes = kingdom.pendingOutcomes?.filter(i => 
          i.checkType !== checkType || i.status === 'pending'
        ) || [];

      }
    });
  }
  
  /**
   * Clear ongoing event appliedOutcome (reset for re-resolution each turn)
   * Called at the start of Events phase to clear last turn's resolution
   */
  async clearOngoingResolutions(checkType: 'event'): Promise<void> {
    await updateKingdom(kingdom => {
      if (!kingdom.pendingOutcomes) return;
      
      // CRITICAL: Create new array atomically (no mutation before reassignment)
      // This ensures Foundry VTT detects changes and syncs across clients
      kingdom.pendingOutcomes = kingdom.pendingOutcomes.map(preview => {
        if (preview.checkType === checkType && preview.status === 'pending') {
          // Create new preview with cleared resolution data
          return {
            ...preview,
            appliedOutcome: undefined,
            resolutionProgress: undefined
          };
        }
        return preview;
      });
    });
  }
  
  /**
   * Clear specific preview
   */
  async clearInstance(previewId: string): Promise<void> {
    await updateKingdom(kingdom => {
      const before = kingdom.pendingOutcomes?.length || 0;
      kingdom.pendingOutcomes = kingdom.pendingOutcomes?.filter(i => 
        i.previewId !== previewId
      ) || [];
      const after = kingdom.pendingOutcomes.length;
      if (before > after) {

      }
    });
  }
  
  /**
   * Update resolution progress (for multi-player coordination)
   */
  async updateResolutionProgress(
    previewId: string,
    playerId: string,
    playerName: string,
    outcome: string,
    updates: {
      selectedChoices?: number[];
      rolledDice?: Record<string, number>;
    }
  ): Promise<void> {
    await updateKingdom(kingdom => {
      const preview = kingdom.pendingOutcomes?.find(i => i.previewId === previewId);
      if (preview) {
        if (!preview.resolutionProgress) {
          preview.resolutionProgress = {
            playerId,
            playerName,
            timestamp: Date.now(),
            outcome,
            selectedChoices: [],
            rolledDice: {}
          };
        }
        
        if (updates.selectedChoices !== undefined) {
          preview.resolutionProgress.selectedChoices = updates.selectedChoices;
        }
        if (updates.rolledDice !== undefined) {
          preview.resolutionProgress.rolledDice = {
            ...preview.resolutionProgress.rolledDice,
            ...updates.rolledDice
          };
        }

      }
    });
  }
  
  /**
   * Clear resolution progress
   */
  async clearResolutionProgress(previewId: string): Promise<void> {
    await updateKingdom(kingdom => {
      const preview = kingdom.pendingOutcomes?.find(i => i.previewId === previewId);
      if (preview) {
        preview.resolutionProgress = undefined;

      }
    });
  }
}

// Export singleton instance
export const outcomePreviewService = new OutcomePreviewService();

/**
 * Factory function for creating service instance
 */
export async function createOutcomePreviewService(): Promise<OutcomePreviewService> {
  return outcomePreviewService;
}

/**
 * Create action outcome preview (Step 4 ONLY - minimal version)
 * 
 * This is a clean replacement for the archived OutcomePreviewHelpers.createActionOutcomePreview()
 * that ONLY handles Step 4 responsibilities:
 * - Create instance
 * - Store outcome with basic data
 * - Return instance ID
 * 
 * Does NOT handle (these belong in other steps):
 * - Preview calculation (Step 5)
 * - Custom component extraction (Step 7)
 * - Game command execution (Step 8)
 * - Complex placeholder replacement (formatting concern)
 * 
 * @param context - Minimal context for instance creation
 * @returns Preview ID
 */
export async function createActionOutcomePreview(context: {
  actionId: string;
  action: any;
  outcome: string;
  actorName: string;
  actorId?: string;
  actorLevel?: number;
  proficiencyRank?: number;
  skillName?: string;
  rollBreakdown?: any;
  currentTurn: number;
  metadata?: Record<string, any>;
}): Promise<string> {
  const {
    actionId,
    action,
    outcome,
    actorName,
    actorId,
    actorLevel,
    proficiencyRank,
    skillName,
    rollBreakdown,
    currentTurn,
    metadata = {}
  } = context;
  
  // Create instance with metadata
  const previewId = await outcomePreviewService.createInstance(
    'action',
    actionId,
    action,
    currentTurn,
    {
      ...metadata,
      // Add actor context if provided
      actor: actorId ? {
        actorId,
        actorName,
        level: actorLevel || 1,
        selectedSkill: skillName || '',
        proficiencyRank: proficiencyRank || 0
      } : undefined
    }
  );
  
  // Get basic effect message (no placeholder replacement - that's a formatting concern)
  const outcomeType = outcome as 'success' | 'criticalSuccess' | 'failure' | 'criticalFailure';
  const outcomeData = (action as any).outcomes?.[outcomeType];
  
  // Validate pipeline configuration (fail fast instead of silent fallback)
  let effectMessage: string;
  
  if (!outcomeData) {
    const error = `Pipeline configuration error: Action "${actionId}" missing outcome definition for "${outcomeType}"`;
    console.error(`❌ ${error}`, { actionId, outcomeType, availableOutcomes: Object.keys((action as any).outcomes || {}) });
    (globalThis as any).ui?.notifications?.error(error);
    effectMessage = 'ERROR: Missing outcome configuration';
  } else if (!outcomeData.description) {
    const error = `Pipeline configuration error: Action "${actionId}" outcome "${outcomeType}" missing description`;
    console.error(`❌ ${error}`, { actionId, outcomeType, outcomeData });
    (globalThis as any).ui?.notifications?.error(error);
    effectMessage = 'ERROR: Missing outcome description';
  } else {
    effectMessage = outcomeData.description;
  }
  
  // Get basic modifiers (raw, unprocessed - preview calculation happens in Step 5)
  const modifiers = outcomeData?.modifiers || [];
  
  // Build minimal resolution data (no processing, just raw data)
  const resolutionData = {
    diceRolls: {},
    choices: {},
    allocations: {},
    textInputs: {},
    compoundData: {},
    numericModifiers: modifiers.map((m: any) => ({
      resource: m.resource,
      value: m.value,
      type: m.type,
      formula: m.formula,
      operation: m.operation,
      duration: m.duration
    })),
    manualEffects: [],
    complexActions: [],
    customComponentData: null
  };
  
  // Store outcome with minimal data
  await outcomePreviewService.storeOutcome(
    previewId,
    outcomeType,
    resolutionData,
    actorName,
    skillName || '',
    effectMessage,
    rollBreakdown,
    [],  // No special effects - calculated in Step 5
    undefined,  // No custom component - extracted in Step 7
    {}  // No custom props - handled in Step 7
  );
  
  console.log(`✅ [OutcomePreviewService] Created minimal outcome preview: ${previewId}`);
  
  return previewId;
}
