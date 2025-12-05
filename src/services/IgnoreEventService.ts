/**
 * Ignore Event Service
 * 
 * Centralized service for handling "Ignore Event" button clicks.
 * Ensures consistent behavior across all UI contexts (EventsPhase, debug panels, etc.)
 * 
 * Usage:
 * ```typescript
 * import { ignoreEventService } from '../services/IgnoreEventService';
 * 
 * async function handleIgnore(event: CustomEvent) {
 *   await ignoreEventService.ignoreEvent(event.detail.checkId, { isDebugTest: true });
 * }
 * ```
 */

import { pipelineRegistry } from '../pipelines/PipelineRegistry';
import { updateKingdom, getKingdomData } from '../stores/KingdomStore';
import { buildIgnoredEventResolution } from '../controllers/shared/IgnoredEventResolution';
import { logger } from '../utils/Logger';

export interface IgnoreEventOptions {
  /** Mark as debug test (won't show in main Events phase) */
  isDebugTest?: boolean;
  /** Custom actor name to display (default: "Event Ignored") */
  actorName?: string;
}

export interface IgnoreEventResult {
  success: boolean;
  error?: string;
  previewId?: string;
}

/**
 * Ignore Event Service
 */
export const ignoreEventService = {
  /**
   * Ignore an event by ID
   * 
   * For beneficial events: Applies failure outcome immediately
   * For dangerous events: Creates instance showing failure outcome (requires Apply)
   * 
   * @param eventId - The event pipeline ID
   * @param options - Optional configuration
   * @returns Result with success/error status
   */
  async ignoreEvent(eventId: string, options: IgnoreEventOptions = {}): Promise<IgnoreEventResult> {
    const { isDebugTest = false, actorName = 'Event Ignored' } = options;
    
    logger.info(`[IgnoreEventService] Ignoring event: ${eventId}`, { isDebugTest });
    
    // Get the event pipeline
    const event = pipelineRegistry.getPipeline(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    
    const isBeneficial = event.traits?.includes('beneficial');
    const isDangerous = event.traits?.includes('dangerous');
    const outcomeData = event.outcomes?.failure;
    
    // Handle beneficial events: Apply failure outcome immediately
    if (isBeneficial && !isDangerous && outcomeData) {
      logger.info('[IgnoreEventService] Beneficial event - applying failure immediately');
      
      // Import and use EventPhaseController for immediate resolution
      const { createEventPhaseController } = await import('../controllers/EventPhaseController');
      const controller = await createEventPhaseController(null);
      
      const result = await controller.resolveEvent(
        eventId,
        'failure',
        { 
          numericModifiers: [],
          manualEffects: [],
          complexActions: []
        },
        true, // isIgnored
        actorName,
        '',
        undefined
      );
      
      return result;
    }
    
    // Handle dangerous events: Create instance showing failure outcome
    if (isDangerous && outcomeData) {
      logger.info('[IgnoreEventService] Dangerous event - creating failure preview');
      
      const kingdom = getKingdomData();
      if (!kingdom) {
        return { success: false, error: 'Kingdom data not available' };
      }
      
      // Check for existing instance
      const existingInstance = kingdom.pendingOutcomes?.find(
        (i: any) => i.checkType === 'event' && i.checkId === event.id && i.status === 'pending'
      );
      
      let previewId: string;
      
      if (existingInstance) {
        previewId = existingInstance.previewId;
        logger.info('[IgnoreEventService] Using existing instance:', previewId);
      } else {
        // Create new instance
        const { createOutcomePreviewService } = await import('./OutcomePreviewService');
        const outcomePreviewService = await createOutcomePreviewService();
        
        const metadata = isDebugTest ? { isDebugTest: true } : undefined;
        previewId = await outcomePreviewService.createInstance(
          'event',
          event.id,
          event,
          kingdom.currentTurn,
          metadata
        );
        logger.info('[IgnoreEventService] Created new instance:', previewId);
      }
      
      // Build the ignored event resolution (with pre-rolled dice and badges)
      const { resolution, resolvedDice } = await buildIgnoredEventResolution(event, actorName);
      
      // Store in instance
      await updateKingdom(k => {
        const instance = k.pendingOutcomes?.find(i => i.previewId === previewId);
        if (instance) {
          instance.appliedOutcome = resolution;
          instance.status = 'resolved';
          
          // Store pre-rolled dice
          if (!instance.resolutionState) {
            instance.resolutionState = {
              selectedChoice: null,
              resolvedDice: {},
              selectedResources: {}
            };
          }
          instance.resolutionState.resolvedDice = resolvedDice;
          
          logger.info('[IgnoreEventService] Updated instance with failure resolution');
        } else {
          logger.error('[IgnoreEventService] Instance not found:', previewId);
        }
      });
      
      // Clear from turnState if this was the active event
      await updateKingdom(k => {
        if (k.turnState?.eventsPhase?.eventId === eventId) {
          k.turnState.eventsPhase.eventId = null;
          k.turnState.eventsPhase.eventInstanceId = null;
          k.turnState.eventsPhase.eventTriggered = false;
        }
      });
      
      return { success: true, previewId };
    }
    
    // Fallback for events that are neither beneficial nor dangerous
    logger.warn('[IgnoreEventService] Event has no applicable traits, treating as neutral');
    return { success: true };
  }
};

// Export type for external use
export type { IgnoreEventService } from './IgnoreEventService';

