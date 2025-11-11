/**
 * Check Instance Management Helpers
 * 
 * Centralizes logic for creating and managing check instances for actions.
 * Handles placeholder replacement, metadata preparation, and instance creation.
 */

import { createCheckInstanceService } from '../../services/CheckInstanceService';
import { getKingdomActor } from '../../stores/KingdomStore';
import type { PlayerAction } from './action-types';

/**
 * Pending actions state - passed from ActionsPhase component
 */
export interface PendingActionsState {
  pendingBuildAction?: { skill: string; structureId?: string; settlementId?: string } | null;
  pendingRepairAction?: { skill: string; structureId?: string; settlementId?: string } | null;
  pendingUpgradeAction?: { skill: string; settlementId?: string } | null;
  pendingDiplomaticAction?: { skill: string; factionId?: string; factionName?: string } | null;
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
  
  if (actionId === 'dimplomatic-mission' && pendingActions.pendingDiplomaticAction) {
    console.log('🎯 [CheckInstanceHelpers] Creating metadata for diplomatic mission');
    console.log('🎯 [CheckInstanceHelpers] pendingDiplomaticAction:', pendingActions.pendingDiplomaticAction);
    const metadata = {
      factionId: pendingActions.pendingDiplomaticAction.factionId,
      factionName: pendingActions.pendingDiplomaticAction.factionName
    };
    console.log('🎯 [CheckInstanceHelpers] Created metadata:', metadata);
    return metadata;
  }
  
  return undefined;
}

/**
 * Create a check instance for an action with outcome data.
 * 
 * Handles:
 * - Placeholder replacement in effect messages
 * - Metadata preparation
 * - Instance creation via CheckInstanceService
 * - Preliminary resolution data preparation
 * 
 * @param context - Action resolution context
 * @returns Instance ID
 */
export async function createActionCheckInstance(context: {
  actionId: string;
  action: PlayerAction;
  outcome: string;
  actorName: string;
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
    skillName,
    rollBreakdown,
    currentTurn,
    pendingActions,
    controller
  } = context;
  
  const checkInstanceService = await createCheckInstanceService();
  
  const outcomeType = outcome as 'success' | 'criticalSuccess' | 'failure' | 'criticalFailure';
  
  // Get modifiers from the action for preview
  const modifiers = controller.getActionModifiers(action, outcomeType);
  
  // Get base outcome description (handle both nested and top-level)
  const outcomeData = (action as any).effects?.[outcomeType] || action[outcomeType];
  let effectMessage = outcomeData?.description || 'Action completed';
  
  // Replace placeholders in effect message
  effectMessage = await replacePlaceholders(effectMessage, actionId, pendingActions);
  
  // Create metadata
  const metadata = createActionMetadata(actionId, pendingActions);
  console.log('🎯 [CheckInstanceHelpers] createActionCheckInstance - actionId:', actionId);
  console.log('🎯 [CheckInstanceHelpers] createActionCheckInstance - metadata:', metadata);
  
  // Create instance
  const instanceId = await checkInstanceService.createInstance(
    'action',
    actionId,
    action,
    currentTurn,
    metadata
  );
  console.log('🎯 [CheckInstanceHelpers] Created instance with ID:', instanceId);
  
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
  
  // Get game commands from action outcome (reuse outcomeData from above)
  const gameCommands = outcomeData?.gameCommands || [];

  // Skip prepare/commit for actions with custom implementations
  // These handle their own resolution logic
  const actionsWithCustomImplementations = ['outfit-army'];
  const shouldSkipPrepare = actionsWithCustomImplementations.includes(actionId);

  if (gameCommands.length > 0 && !shouldSkipPrepare) {
    console.log('🎬 [CheckInstanceHelpers] Preparing game commands (not executing)');

    const actor = getKingdomActor();
    if (actor) {
      const kingdom = actor.getKingdomData();
      
      // Import resolver to prepare commands
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      
      // Execute each game command to PREPARE (returns PreparedCommand or ResolveResult)
      for (const gameCommand of gameCommands) {
        try {
          let result: any;
          
          // Call the appropriate resolver method based on game command type
          switch (gameCommand.type) {
            case 'giveActorGold': {
              // Get settlementId from gameCommand OR from pending action state
              let settlementId = gameCommand.settlementId;
              if (!settlementId && (globalThis as any).__pendingStipendSettlement) {
                settlementId = (globalThis as any).__pendingStipendSettlement;
              }
              
              if (settlementId) {
                const multiplier = parseFloat(gameCommand.multiplier) || 1;
                result = await resolver.giveActorGold(multiplier, settlementId);
              }
              break;
            }
            
            case 'recruitArmy': {
              // Determine army level
              let level = 1; // Default level
              
              if (gameCommand.level === 'kingdom-level') {
                // Get party level from kingdom data (synced by partyLevelHooks)
                level = kingdom.partyLevel || 1;
              } else if (typeof gameCommand.level === 'number') {
                level = gameCommand.level;
              }
              
              result = await resolver.recruitArmy(level);
              break;
            }
            
            case 'foundSettlement': {
              // For critical success on Establish Settlement, grant free structure
              const grantFreeStructure = (outcomeType === 'criticalSuccess');
              result = await resolver.foundSettlement(
                gameCommand.name || 'New Settlement',
                gameCommand.location || { x: 0, y: 0 },
                grantFreeStructure
              );
              break;
            }
            
            case 'disbandArmy': {
              // Get armyId from pending state (set by pre-roll dialog)
              const armyId = (globalThis as any).__pendingDisbandArmyArmy;
              const deleteActor = gameCommand.deleteActor !== false; // Default to true
              
              if (!armyId) {
                console.error('❌ [CheckInstanceHelpers] No army selected for disbanding');
                break;
              }
              
              result = await resolver.disbandArmy(armyId, deleteActor);
              break;
            }
            
            case 'trainArmy': {
              // Get armyId from pending state (set by pre-roll dialog)
              const armyId = (globalThis as any).__pendingTrainArmyArmy;
              
              if (!armyId) {
                console.error('❌ [CheckInstanceHelpers] No army selected for training');
                break;
              }
              
              result = await resolver.trainArmy(armyId, outcomeType);
              break;
            }
            
            // NOTE: outfitArmy uses custom implementation (post-roll dialog)
            // It's handled by OutfitArmyAction, not the prepare/commit pattern
            
            // Add more game command types here as they're refactored to PreparedCommand
          }
          
          // Check if result is a PreparedCommand (has specialEffect and commit)
          if (result && 'specialEffect' in result && 'commit' in result) {
            // NEW PATTERN: PreparedCommand
            preliminarySpecialEffects.push(result.specialEffect);
            pendingCommits.push(result.commit);
            console.log('🎬 [CheckInstanceHelpers] Prepared command:', gameCommand.type);
          } else if (result && 'success' in result) {
            // LEGACY PATTERN: ResolveResult (will be phased out)
            // For now, do nothing - these commands execute immediately
            console.log('⚠️ [CheckInstanceHelpers] Legacy command (not prepared):', gameCommand.type);
          }
        } catch (error) {
          console.error('❌ [CheckInstanceHelpers] Failed to prepare game command:', gameCommand.type, error);
        }
      }
    }
  }
  
  const preliminaryResolutionData = {
    numericModifiers: preliminaryModifiers,
    manualEffects: [],
    complexActions: []
  };
  
  // Store outcome with special effects
  console.log('🔍 [CheckInstanceHelpers] About to store outcome with specialEffects:', preliminarySpecialEffects);
  await checkInstanceService.storeOutcome(
    instanceId,
    outcomeType,
    preliminaryResolutionData,
    actorName,
    skillName || '',
    effectMessage,
    rollBreakdown,
    preliminarySpecialEffects  // Pass special effects to display in preview
  );
  console.log('✅ [CheckInstanceHelpers] Outcome stored, verifying instance...');
  
  // Store pending commits if any (prepare/commit pattern)
  // IMPORTANT: Store in client-side memory, NOT in actor flags (functions can't be serialized)
  if (pendingCommits.length > 0) {
    console.log(`🎬 [CheckInstanceHelpers] Storing ${pendingCommits.length} pending commit(s) in client-side storage`);
    const { commitStorage } = await import('../../utils/CommitStorage');
    commitStorage.store(instanceId, pendingCommits);
  }
  
  return instanceId;
}

/**
 * Update check instance outcome (for debug mode).
 * 
 * Re-generates effect message with placeholder replacement and updates instance.
 * 
 * @param context - Update context
 */
export async function updateCheckInstanceOutcome(context: {
  instanceId: string;
  actionId: string;
  action: PlayerAction;
  newOutcome: string;
  instance: any;
  pendingActions: PendingActionsState;
  controller: any;
}): Promise<void> {
  const {
    instanceId,
    actionId,
    action,
    newOutcome,
    instance,
    pendingActions,
    controller
  } = context;
  
  const checkInstanceService = await createCheckInstanceService();
  
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
  
  // Update instance with new outcome
  const resolutionData = {
    numericModifiers: modifiers.map((m: any) => ({ 
      resource: m.resource, 
      value: m.value 
    })),
    manualEffects: [],
    complexActions: []
  };
  
  await checkInstanceService.storeOutcome(
    instanceId,
    newOutcome,
    resolutionData,
    instance.appliedOutcome?.actorName || 'Unknown',
    instance.appliedOutcome?.skillName || '',
    customEffect || ((action as any)[newOutcome])?.description || 'Action completed',
    instance.appliedOutcome?.rollBreakdown  // Preserve existing rollBreakdown
  );
}
