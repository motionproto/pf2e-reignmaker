import {
  getCurrentUserCharacter,
  showCharacterSelectionDialog,
  performKingdomActionRoll
} from '../../services/pf2e';
import { actionLoader } from '../actions/action-loader';
import { eventService } from '../events/event-loader';
import { logger } from '../../utils/Logger';

/**
 * Unified context for executing action or event rolls
 */
export interface ExecutionContext {
  type: 'action' | 'event';
  id: string;
  skill: string;
  metadata?: {
    structureId?: string;
    settlementId?: string;
    factionId?: string;
    factionName?: string;
    instanceId?: string;  // For ongoing events
    [key: string]: any;
  };
}

/**
 * Configuration for roll execution
 */
export interface ExecutionConfig {
  getDC: (characterLevel: number) => number;
  onRollStart?: () => void;
  onRollCancel?: () => void;
}

/**
 * Execute a roll with character selection and DC calculation
 * 
 * Consolidates common roll execution logic used by:
 * - Action rolls (build, repair, upgrade, etc.)
 * - Event rolls (event skill checks)
 */
export async function executeRoll(
  context: ExecutionContext,
  config: ExecutionConfig
): Promise<void> {
  const { type, id, skill, metadata } = context;
  const { getDC, onRollStart, onRollCancel } = config;

  // Find the item (action or event)
  let item: any = null;
  let outcomes: any = null;
  let itemName = '';

  if (type === 'action') {
    item = actionLoader.getAllActions().find(a => a.id === id);
    if (!item) {
      logger.error(`[ExecutionHelpers] Action not found: ${id}`);
      ui.notifications?.error(`Action not found: ${id}`);
      return;
    }
    itemName = item.name;
    outcomes = {
      criticalSuccess: item.criticalSuccess,
      success: item.success,
      failure: item.failure,
      criticalFailure: item.criticalFailure
    };
  } else {
    item = eventService.getEventById(id);
    if (!item) {
      logger.error(`[ExecutionHelpers] Event not found: ${id}`);
      ui.notifications?.error(`Event not found: ${id}`);
      return;
    }
    itemName = item.name;
    // Events use effects structure
    outcomes = {
      criticalSuccess: item.effects.criticalSuccess,
      success: item.effects.success,
      failure: item.effects.failure,
      criticalFailure: item.effects.criticalFailure
    };
  }

  // Validate required metadata
  if (type === 'action' && !validateMetadata(id, metadata)) {
    onRollCancel?.();
    return;
  }

  // Get character for roll
  let actingCharacter = getCurrentUserCharacter();

  if (!actingCharacter) {
    actingCharacter = await showCharacterSelectionDialog();
    if (!actingCharacter) {
      // User cancelled
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
      itemName,
      id,
      outcomes,
      metadata?.instanceId  // Pass instanceId for ongoing events
    );

    // Roll completion will be handled by the kingdomRollComplete event listener
    // in the parent component
  } catch (error) {
    logger.error(`[ExecutionHelpers] Error executing ${type} ${id} roll:`, error);
    ui.notifications?.error(`Failed to perform ${type}: ${error}`);
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
 * Helper to create execution context for actions
 */
export function createActionContext(
  actionId: string,
  skill: string,
  pendingData?: Record<string, any>
): ExecutionContext {
  return {
    type: 'action',
    id: actionId,
    skill,
    metadata: pendingData
  };
}

/**
 * Helper to create execution context for events
 */
export function createEventContext(
  eventId: string,
  skill: string,
  instanceId?: string,
  pendingData?: Record<string, any>
): ExecutionContext {
  return {
    type: 'event',
    id: eventId,
    skill,
    metadata: {
      ...pendingData,
      instanceId
    }
  };
}
