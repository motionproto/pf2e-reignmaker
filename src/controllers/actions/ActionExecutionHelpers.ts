import {
  getCurrentUserCharacter,
  showCharacterSelectionDialog,
  performKingdomActionRoll
} from '../../services/pf2e';
import { actionLoader } from './pipeline-loader';
import { logger } from '../../utils/Logger';

/**
 * Context for executing an action roll
 */
export interface ActionExecutionContext {
  actionId: string;
  skill: string;
  metadata?: {
    structureId?: string;
    settlementId?: string;
    factionId?: string;
    factionName?: string;
    [key: string]: any;
  };
}

/**
 * Configuration for action execution
 */
export interface ActionExecutionConfig {
  getDC: (characterLevel: number) => number;
  onRollStart?: () => void;
  onRollCancel?: () => void;
}

/**
 * Execute an action roll with character selection and DC calculation
 * 
 * Consolidates common roll execution logic used by:
 * - executeBuildStructureRoll
 * - executeRepairStructureRoll
 * - executeUpgradeSettlementRoll
 * - executeEstablishDiplomaticRelationsRoll
 * - executeStipendRoll
 */
export async function executeActionRoll(
  context: ActionExecutionContext,
  config: ActionExecutionConfig
): Promise<void> {
  const { actionId, skill, metadata } = context;
  const { getDC, onRollStart, onRollCancel } = config;

  // Find the action
  const action = actionLoader.getAllActions().find(a => a.id === actionId);
  if (!action) {
    logger.error(`[ActionExecutionHelpers] Action not found: ${actionId}`);
    ui.notifications?.error(`Action not found: ${actionId}`);
    return;
  }

  // Validate required metadata based on action type
  if (!validateMetadata(actionId, metadata)) {
    onRollCancel?.();
    return;
  }

  // Get character for roll
  let actingCharacter = getCurrentUserCharacter();

  if (!actingCharacter) {
    actingCharacter = await showCharacterSelectionDialog();
    if (!actingCharacter) {
      // User cancelled - call cancel callback
      onRollCancel?.();
      return;
    }
  }

  try {
    // Call start callback if provided
    onRollStart?.();

    // Calculate DC based on character level
    const characterLevel = actingCharacter.level || 1;
    const dc = getDC(characterLevel);

    // Perform the roll
    await performKingdomActionRoll(
      actingCharacter,
      skill,
      dc,
      action.name,
      action.id,
      {
        criticalSuccess: action.criticalSuccess,
        success: action.success,
        failure: action.failure,
        criticalFailure: action.criticalFailure
      }
    );

    // Roll completion will be handled by the kingdomRollComplete event listener
    // in the parent component
  } catch (error) {
    logger.error(`[ActionExecutionHelpers] Error executing ${actionId} roll:`, error);
    ui.notifications?.error(`Failed to perform action: ${error}`);
    onRollCancel?.();
  }
}

/**
 * Validate metadata requirements for specific action types
 */
function validateMetadata(actionId: string, metadata?: Record<string, any>): boolean {
  if (!metadata) {
    return true; // No metadata required
  }

  switch (actionId) {
    case 'build-structure':
      if (!metadata.structureId || !metadata.settlementId) {
        ui.notifications?.warn('Please select a structure to build');
        return false;
      }
      break;

    case 'repair-structure':
      if (!metadata.structureId || !metadata.settlementId) {
        ui.notifications?.warn('Please select a structure to repair');
        return false;
      }
      break;

    case 'upgrade-settlement':
      if (!metadata.settlementId) {
        ui.notifications?.warn('Please select a settlement to upgrade');
        return false;
      }
      break;

    case 'dimplomatic-mission':
      if (!metadata.factionId) {
        ui.notifications?.warn('Please select a faction');
        return false;
      }
      break;

    case 'collect-stipend':
      if (!metadata.settlementId) {
        ui.notifications?.warn('Please select a settlement for stipend collection');
        return false;
      }
      break;
  }

  return true;
}

/**
 * Helper to create execution context from pending action state
 */
export function createExecutionContext(
  actionId: string,
  skill: string,
  pendingData?: Record<string, any>
): ActionExecutionContext {
  return {
    actionId,
    skill,
    metadata: pendingData
  };
}
