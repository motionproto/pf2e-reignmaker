/**
 * CheckHandler - Centralized check execution and lifecycle management
 * 
 * Handles the complete check flow including:
 * - Roll execution
 * - Result handling
 * - Cancellation detection
 * - State cleanup
 */

import { performKingdomSkillCheck } from '../../services/pf2e';
import { logger } from '../../utils/Logger';

export interface CheckConfig {
  checkType: 'event' | 'incident' | 'action';
  item: any;  // Event, incident, or action data
  skill: string;
  enabledModifiers?: Array<{ label: string; modifier: number }>;  // Modifiers that were enabled in previous roll
  
  // Callbacks for UI updates
  onStart?: () => void;
  onComplete: (result: CheckResult) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

export interface CheckResult {
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  actorName: string;
  skillName: string;
  rollBreakdown: RollBreakdown | null;
}

export interface RollBreakdown {
  d20Result: number;
  total: number;
  dc: number;
  modifiers: Array<{ label: string; modifier: number; enabled?: boolean }>;
}

export class CheckHandler {
  private eventListener: ((event: Event) => void) | null = null;

  /**
   * Execute a kingdom skill check with full lifecycle management
   */
  async executeCheck(config: CheckConfig): Promise<void> {
    const { checkType, item, skill, enabledModifiers, onStart, onComplete, onCancel, onError } = config;

    // Call onStart callback
    onStart?.();

    try {
      // Set up event listener for roll completion
      this.eventListener = (event: Event) => {
        const customEvent = event as CustomEvent;
        
        // Only handle events matching our check
        if (
          customEvent.detail?.checkId === item.id && 
          customEvent.detail?.checkType === checkType
        ) {

          const result: CheckResult = {
            outcome: customEvent.detail.outcome,
            actorName: customEvent.detail.actorName,
            skillName: customEvent.detail.skillName,
            rollBreakdown: customEvent.detail.rollBreakdown || null
          };

          // Call completion callback
          onComplete(result);

          // Remove event listener
          this.cleanup();
        }
      };

      window.addEventListener('kingdomRollComplete', this.eventListener);

      // Trigger PF2e skill roll
      const rollResult = await performKingdomSkillCheck(
        skill,
        checkType,
        item.name,
        item.id,
        {
          successEffect: item.outcomes?.success?.msg || 'Success',
          failureEffect: item.outcomes?.failure?.msg || 'Failure',
          criticalFailureEffect: item.outcomes?.criticalFailure?.msg || 'Critical Failure'
        },
        undefined  // actionId
        // Note: Modifiers are now preserved via module-scoped state in PF2eSkillService
      );

      // If performKingdomSkillCheck returns null, the user cancelled
      if (!rollResult) {

        this.handleCancellation(config);
      }

    } catch (error) {
      logger.error(`❌ [CheckHandler] Error executing ${checkType} check:`, error);
      this.cleanup();
      onError?.(error as Error);
    }
  }

  /**
   * Handle check cancellation
   */
  private handleCancellation(config: CheckConfig): void {

    this.cleanup();
    config.onCancel?.();

    // Clear the pending check flag if it still exists
    if (typeof (window as any).game !== 'undefined') {
      (window as any).game.user?.unsetFlag('pf2e-reignmaker', 'pendingCheck');
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    if (this.eventListener) {
      window.removeEventListener('kingdomRollComplete', this.eventListener);
      this.eventListener = null;
    }
  }
}

/**
 * Factory function for creating a CheckHandler instance
 */
export function createCheckHandler(): CheckHandler {
  return new CheckHandler();
}
