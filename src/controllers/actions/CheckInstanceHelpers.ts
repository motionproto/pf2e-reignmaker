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
  
  // Handle upgrade-settlement: {Settlement} placeholder
  if (actionId === 'upgrade-settlement' && result.includes('{Settlement}')) {
    if (pendingActions.pendingUpgradeAction?.settlementId) {
      const actor = getKingdomActor();
      if (actor) {
        const kingdom = actor.getKingdomData();
        const settlement = kingdom?.settlements.find((s: any) => 
          s.id === pendingActions.pendingUpgradeAction!.settlementId
        );
        
        if (settlement) {
          result = result.replace(/{Settlement}/g, settlement.name);
        } else {
          result = result.replace(/{Settlement}/g, 'settlement');
        }
      } else {
        result = result.replace(/{Settlement}/g, 'settlement');
      }
    } else {
      result = result.replace(/{Settlement}/g, 'settlement');
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
  
  // Create instance
  const instanceId = await checkInstanceService.createInstance(
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
  
  const preliminaryResolutionData = {
    numericModifiers: preliminaryModifiers,
    manualEffects: [],
    complexActions: []
  };
  
  // Store outcome
  await checkInstanceService.storeOutcome(
    instanceId,
    outcomeType,
    preliminaryResolutionData,
    actorName,
    skillName || '',
    effectMessage,
    rollBreakdown
  );
  
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
