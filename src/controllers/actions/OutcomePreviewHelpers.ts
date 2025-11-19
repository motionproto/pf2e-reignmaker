/**
 * Outcome Preview Management Helpers
 * 
 * Centralizes logic for creating and managing outcome previews for actions.
 * Handles placeholder replacement, metadata preparation, and preview creation.
 */

import { createOutcomePreviewService } from '../../services/OutcomePreviewService';
import { getKingdomActor, updateKingdom } from '../../stores/KingdomStore';
import type { PlayerAction } from './pipeline-types';
import type { Army } from '../../models/Army';

/**
 * Pending actions state - passed from ActionsPhase component
 */
export interface PendingActionsState {
  pendingBuildAction?: { skill: string; structureId?: string; settlementId?: string } | null;
  pendingRepairAction?: { skill: string; structureId?: string; settlementId?: string } | null;
  pendingUpgradeAction?: { skill: string; settlementId?: string } | null;
  pendingDiplomaticAction?: { skill: string; factionId?: string; factionName?: string } | null;
  pendingInfiltrationAction?: { skill: string; factionId?: string; factionName?: string } | null;
  pendingStipendAction?: { skill: string; settlementId?: string } | null;
}

/**
 * Replace placeholders in action effect messages.
 * 
 * Handles dynamic replacement of {structure}, {Settlement}, etc.
 * with actual names from pending action context.
 * 
 * @param text - Text containing placeholders
 * @param actionId - Action ID to determine which placeholder logic to use
 * @param pendingActions - State containing pending action data
 * @returns Text with placeholders replaced
 */
export async function replacePlaceholders(
  text: string,
  actionId: string,
  pendingActions: PendingActionsState
): Promise<string> {
  let result = text;
  
  // Handle build-structure: {structure} placeholder
  if (actionId === 'build-structure' && result.includes('{structure}')) {
    if (pendingActions.pendingBuildAction?.structureId) {
      const { structuresService } = await import('../../services/structures');
      const structure = structuresService.getStructure(pendingActions.pendingBuildAction.structureId);
      
      if (structure) {
        result = result.replace(/{structure}/g, structure.name);
      } else {
        result = result.replace(/{structure}/g, 'structure');
      }
    } else {
      result = result.replace(/{structure}/g, 'structure');
    }
  }
  
  // Handle repair-structure: {structure} placeholder
  if (actionId === 'repair-structure' && result.includes('{structure}')) {
    if (pendingActions.pendingRepairAction?.structureId) {
      const { structuresService } = await import('../../services/structures');
      const structure = structuresService.getStructure(pendingActions.pendingRepairAction.structureId);
      
      if (structure) {
        result = result.replace(/{structure}/g, structure.name);
      } else {
        result = result.replace(/{structure}/g, 'structure');
      }
    } else {
      result = result.replace(/{structure}/g, 'structure');
    }
  }
  
  // Handle upgrade-settlement: Replace generic text with personalized outcome
  if (actionId === 'upgrade-settlement' && pendingActions.pendingUpgradeAction?.settlementId) {
    const actor = getKingdomActor();
    if (actor) {
      const kingdom = actor.getKingdomData();
      const settlement = kingdom?.settlements.find((s: any) => 
        s.id === pendingActions.pendingUpgradeAction!.settlementId
      );
      
      if (settlement) {
        const newLevel = settlement.level + 1;
        
        // Replace generic outcome text with personalized versions
        if (result.includes('Settlement level increases by 1 at half the cost')) {
          result = `${settlement.name} level increases to ${newLevel} at half the cost (rounded up)`;
        } else if (result.includes('Settlement level increases by 1')) {
          result = `${settlement.name} level increases to ${newLevel}`;
        } else if (result.includes('achieve nothing in the settlement')) {
          result = result.replace('in the settlement', `in ${settlement.name}`);
        } else if (result.includes('investment in the settlement')) {
          result = result.replace('in the settlement', `in ${settlement.name}`);
        }
      }
    }
  }
  
  return result;
}

/**
 * Create action metadata for instance storage.
 * 
 * @param actionId - Action ID
 * @param pendingActions - Pending action state
 * @returns Metadata object or undefined
 */
export function createActionMetadata(
  actionId: string,
  pendingActions: PendingActionsState
): Record<string, any> | undefined {
  if (actionId === 'repair-structure' && pendingActions.pendingRepairAction) {
    return {
      structureId: pendingActions.pendingRepairAction.structureId,
      settlementId: pendingActions.pendingRepairAction.settlementId
    };
  }
  
  if (actionId === 'upgrade-settlement' && pendingActions.pendingUpgradeAction) {
    return {
      settlementId: pendingActions.pendingUpgradeAction.settlementId
    };
  }
  
  if (actionId === 'diplomatic-mission' && pendingActions.pendingDiplomaticAction) {
    return {
      factionId: pendingActions.pendingDiplomaticAction.factionId,
      factionName: pendingActions.pendingDiplomaticAction.factionName
    };
  }
  
  if (actionId === 'infiltration' && (pendingActions as any).pendingInfiltrationAction) {
    return {
      factionId: (pendingActions as any).pendingInfiltrationAction.factionId,
      factionName: (pendingActions as any).pendingInfiltrationAction.factionName
    };
  }
  
  if (actionId === 'collect-stipend' && pendingActions.pendingStipendAction) {
    return {
      settlementId: pendingActions.pendingStipendAction.settlementId
    };
  }
  
  return undefined;
}

/**
 * Create an outcome preview for an action with outcome data.
 * 
 * Handles:
 * - Placeholder replacement in effect messages
 * - Metadata preparation
 * - Preview creation via OutcomePreviewService
 * - Preliminary resolution data preparation
 * 
 * @param context - Action resolution context
 * @returns Preview ID
 */
export async function createActionOutcomePreview(context: {
  actionId: string;
  action: PlayerAction;
  outcome: string;
  actorName: string;
  actorId?: string;  // ✅ ADD: Actor ID
  actorLevel?: number;  // ✅ ADD: Actor level
  proficiencyRank?: number;  // ✅ ADD: Proficiency rank
  skillName?: string;
  rollBreakdown?: any;
  currentTurn: number;
  pendingActions: PendingActionsState;
  controller: any;
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
    pendingActions,
    controller
  } = context;
  
  const outcomePreviewService = await createOutcomePreviewService();
  
  const outcomeType = outcome as 'success' | 'criticalSuccess' | 'failure' | 'criticalFailure';
  
  // Get modifiers from the action for preview
  const modifiers = controller.getActionModifiers(action, outcomeType);
  
  // Get base outcome description (handle both nested and top-level)
  const outcomeData = (action as any).effects?.[outcomeType] || action[outcomeType];
  let effectMessage = outcomeData?.description || 'Action completed';
  
  // Replace placeholders in effect message
  effectMessage = await replacePlaceholders(effectMessage, actionId, pendingActions);
  
  // Create metadata with actor context
  const metadata = {
    ...createActionMetadata(actionId, pendingActions),
    // ✅ ADD: Actor context for pipeline use
    actor: actorId ? {
      actorId,
      actorName,
      level: actorLevel || 1,
      selectedSkill: skillName || '',
      proficiencyRank: proficiencyRank || 0
    } : undefined
  };
  
  // ✅ RETRIEVE PIPELINE METADATA BEFORE creating instance
  try {
    const { pipelineMetadataStorage } = await import('../../services/PipelineMetadataStorage');
    const game = (window as any).game;
    const userId = game?.user?.id;
    
    if (userId) {
      const pipelineMetadata = pipelineMetadataStorage.retrieve(actionId, userId);
      
      if (pipelineMetadata) {
        console.log(`📦 [CheckInstanceHelpers] Retrieved pipeline metadata for ${actionId}:`, pipelineMetadata);
        
        // MERGE pipeline metadata into metadata object BEFORE creating instance
        Object.assign(metadata, pipelineMetadata);
        console.log(`📦 [CheckInstanceHelpers] Merged metadata:`, metadata);
      }
    }
  } catch (error) {
    console.error('❌ [CheckInstanceHelpers] Failed to retrieve pipeline metadata:', error);
  }
  
  // Create preview with complete metadata (including faction info)
  const previewId = await outcomePreviewService.createInstance(
    'action',
    actionId,
    action,
    currentTurn,
    metadata
  );
  
  // Build preliminary resolution data with dynamic modifiers
  // IMPORTANT: Keep raw modifiers (with formulas) for OutcomeDisplay
  let preliminaryModifiers = modifiers.map((m: any) => ({ 
    resource: m.resource, 
    value: m.value,
    type: m.type,  // Preserve type (static/dice)
    formula: m.formula,  // Preserve formula for dice rolls
    operation: m.operation,
    duration: m.duration
  }));
  
  // Special handling for upgrade-settlement: inject cost modifier
  if (actionId === 'upgrade-settlement' && pendingActions.pendingUpgradeAction?.settlementId) {
    const actor = getKingdomActor();
    if (actor && pendingActions.pendingUpgradeAction) {
      const kingdom = actor.getKingdomData();
      const settlement = kingdom?.settlements.find((s: any) => 
        s.id === pendingActions.pendingUpgradeAction!.settlementId
      );
      
      if (settlement) {
        const newLevel = settlement.level + 1;
        const fullCost = newLevel;
        
        // Calculate cost based on outcome
        let actualCost = fullCost;
        if (outcomeType === 'success') {
          actualCost = fullCost;
        } else if (outcomeType === 'criticalSuccess') {
          actualCost = Math.ceil(fullCost / 2);
        } else if (outcomeType === 'failure') {
          actualCost = Math.ceil(fullCost / 2);
        } else if (outcomeType === 'criticalFailure') {
          actualCost = fullCost;
        }
        
        // Add cost modifier
        preliminaryModifiers.push({
          resource: 'gold',
          value: -actualCost
        });
      }
    }
  }
  
  // PREPARE/COMMIT PATTERN: Execute game commands to PREPARE (not commit)
  // This allows the OutcomeDisplay to show special effect badges before Apply Result is clicked
  let preliminarySpecialEffects: any[] = [];
  let pendingCommits: Array<() => Promise<void>> = [];
  
  // Build preliminary resolution data first (needed for preview calculation)
  const preliminaryResolutionData = {
    diceRolls: {},
    choices: {},
    allocations: {},
    textInputs: {},
    compoundData: {},
    numericModifiers: preliminaryModifiers,
    manualEffects: [],
    complexActions: [],
    customComponentData: null
  };
  
  // ✅ EXTRACT CUSTOM COMPONENT FROM PIPELINE (for inline display in OutcomeDisplay)
  let customComponent = null;
  let customResolutionProps: Record<string, any> = {};
  
  // ✅ CALCULATE PREVIEW FOR ALL PIPELINE ACTIONS
  console.log(`🎯 [OutcomePreviewHelpers] Calculating preview for action: ${actionId}`);
  
  try {
    const actor = getKingdomActor();
    if (actor) {
      const kingdom = actor.getKingdomData();
      const { unifiedCheckHandler } = await import('../../services/UnifiedCheckHandler');
      
      // Get the pipeline to extract postRollInteractions
      const pipeline = unifiedCheckHandler.getCheck(actionId);
      console.log(`🔍 [OutcomePreviewHelpers] Pipeline for ${actionId}:`, pipeline);
      console.log(`🔍 [OutcomePreviewHelpers] Has postRollInteractions?`, !!pipeline?.postRollInteractions);
      
      // ✅ FIX: Skip preview calculation for actions with pre-roll interactions
      // The PipelineCoordinator will calculate it properly in Step 5 with full metadata
      if (pipeline?.preRollInteractions && pipeline.preRollInteractions.length > 0) {
        console.log(`⏭️ [OutcomePreviewHelpers] Skipping early preview - action has pre-roll interactions, will calculate in PipelineCoordinator Step 5`);
        return previewId;  // Skip to storing outcome
      }
      
      // Extract custom component from postRollInteractions (for inline display)
      if (pipeline?.postRollInteractions) {
        console.log(`🔍 [OutcomePreviewHelpers] postRollInteractions:`, pipeline.postRollInteractions);
        for (const interaction of pipeline.postRollInteractions) {
          console.log(`🔍 [OutcomePreviewHelpers] Checking interaction:`, interaction);
          // Check if this interaction has a custom component
          if (interaction.type === 'configuration' && interaction.component) {
            console.log(`🔍 [OutcomePreviewHelpers] Found configuration interaction with component`);
            // Check condition if defined
            const conditionMet = !interaction.condition || interaction.condition({ outcome: outcomeType });
            console.log(`🔍 [OutcomePreviewHelpers] Condition met for outcome ${outcomeType}?`, conditionMet);
            if (conditionMet) {
              customComponent = interaction.component;
              customResolutionProps = interaction.componentProps || {};
              console.log(`✅ [OutcomePreviewHelpers] Extracted custom component for inline display:`, customComponent);
              break;
            }
          }
        }
      } else {
        console.log(`⚠️ [OutcomePreviewHelpers] No postRollInteractions found for ${actionId}`);
      }
      
      // Build context for preview calculation
      const context = {
        check: action,
        outcome: outcomeType,
        kingdom,
        metadata,
        resolutionData: preliminaryResolutionData
      };
      
      // Calculate preview
      const preview = await unifiedCheckHandler.calculatePreview(actionId, context);
      
      // Format preview to special effects
      const formattedPreview = unifiedCheckHandler.formatPreview(actionId, preview);
      
      // Add preview special effects
      preliminarySpecialEffects.push(...formattedPreview);
      
      console.log(`✅ [OutcomePreviewHelpers] Preview calculated:`, formattedPreview);
    }
  } catch (error) {
    console.error(`❌ [OutcomePreviewHelpers] Failed to calculate preview:`, error);
  }
  
  // Get game commands from action outcome (reuse outcomeData from above)
  const gameCommands = outcomeData?.gameCommands || [];

  // Skip prepare/commit for actions with custom implementations
  // These handle their own resolution logic
  const actionsWithCustomImplementations = ['outfit-army'];
  const shouldSkipPrepare = actionsWithCustomImplementations.includes(actionId);

  if (gameCommands.length > 0 && !shouldSkipPrepare) {
    const actor = getKingdomActor();
    if (actor) {
      const kingdom = actor.getKingdomData();
      
      // ✨ NEW: Use handler registry instead of massive switch/case
      const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');
      const registry = getGameCommandRegistry();
      
      // Build context for handlers
      const baseMetadata = createActionMetadata(actionId, pendingActions);
      
      // ✨ NEW: Build explicit pending state from global state
      // This centralizes all the scattered global state reads
      const pendingState = {
        armyId: (globalThis as any).__pendingDisbandArmyArmy || (globalThis as any).__pendingTrainArmyArmy,
        settlementId: (globalThis as any).__pendingStipendSettlement,
        factionId: (globalThis as any).__pendingEconomicAidFaction,
        factionName: (globalThis as any).__pendingEconomicAidFactionName || (globalThis as any).__pendingInfiltrationFactionName,
        recruitmentData: (globalThis as any).__pendingRecruitArmy
      };
      
      const commandContext = {
        actionId,
        outcome: outcomeType,
        kingdom,
        metadata: baseMetadata || {},
        pendingActions,
        pendingState  // ✨ NEW: Explicit pending state
      };
      
      // Process each game command through registry
      for (const gameCommand of gameCommands) {
        try {
          const result = await registry.process(gameCommand, commandContext);
          
          // Check if result is a PreparedCommand (has specialEffect and commit)
          if (result && 'specialEffect' in result && 'commit' in result) {
            preliminarySpecialEffects.push(result.specialEffect);
            pendingCommits.push(result.commit);
          }
        } catch (error) {
          console.error('❌ [OutcomePreviewHelpers] Failed to prepare game command:', gameCommand.type, error);
        }
      }
    }
  }
  
  // Store outcome with special effects and custom component
  await outcomePreviewService.storeOutcome(
    previewId,
    outcomeType,
    preliminaryResolutionData,
    actorName,
    skillName || '',
    effectMessage,
    rollBreakdown,
    preliminarySpecialEffects,  // Pass special effects to display in preview
    customComponent,  // Pass custom component for inline rendering
    customResolutionProps  // Pass props for custom component
  );
  
  // Store pending commits if any (prepare/commit pattern)
  // IMPORTANT: Store in client-side memory, NOT in actor flags (functions can't be serialized)
  if (pendingCommits.length > 0) {
    const { commitStorage } = await import('../../utils/CommitStorage');
    commitStorage.store(previewId, pendingCommits);
  }
  
  return previewId;
}

/**
 * Update outcome preview (for debug mode).
 * 
 * Re-generates effect message with placeholder replacement and updates preview.
 * 
 * @param context - Update context
 */
export async function updateOutcomePreview(context: {
  previewId: string;
  actionId: string;
  action: PlayerAction;
  newOutcome: string;
  preview: any;
  pendingActions: PendingActionsState;
  controller: any;
}): Promise<void> {
  const {
    previewId,
    actionId,
    action,
    newOutcome,
    preview,
    pendingActions,
    controller
  } = context;
  
  const outcomePreviewService = await createOutcomePreviewService();
  
  // Get modifiers for the new outcome
  const modifiers = controller.getActionModifiers(action, newOutcome);
  
  // Get base outcome description
  const outcomeData = (action as any)[newOutcome];
  let customEffect: string | undefined = undefined;
  
  if (outcomeData?.description) {
    customEffect = await replacePlaceholders(
      outcomeData.description,
      actionId,
      pendingActions
    );
  }
  
  // Update preview with new outcome
  const resolutionData = {
    numericModifiers: modifiers.map((m: any) => ({ 
      resource: m.resource, 
      value: m.value 
    })),
    manualEffects: [],
    complexActions: []
  };
  
  await outcomePreviewService.storeOutcome(
    previewId,
    newOutcome,
    resolutionData,
    preview.appliedOutcome?.actorName || 'Unknown',
    preview.appliedOutcome?.skillName || '',
    customEffect || ((action as any)[newOutcome])?.description || 'Action completed',
    preview.appliedOutcome?.rollBreakdown  // Preserve existing rollBreakdown
  );
}
