/**
 * Game Command Handler System
 * 
 * Provides interface and base class for extracting game command handling
 * from the monolithic createActionOutcomePreview() function.
 * 
 * Each game command type (recruitArmy, outfitArmy, etc.) gets its own
 * handler class, making the code more maintainable and testable.
 */

import type { PreparedCommand } from '../../types/game-commands';
import type { KingdomData } from '../../actors/KingdomActor';

/**
 * Context passed to game command handlers
 */
export interface GameCommandContext {
  actionId: string;
  outcome: string;
  kingdom: KingdomData;
  metadata: Record<string, any>;
  pendingActions: any; // PendingActionsState type
  
  // ✨ NEW: Explicit pending state (replaces global state)
  pendingState: {
    armyId?: string;              // For train/disband/outfit
    settlementId?: string;        // For stipend/upgrade
    factionId?: string;           // For diplomatic/economic/military aid
    factionName?: string;         // For displaying faction name
    recruitmentData?: any;        // For recruit army dialog data
    [key: string]: any;           // Allow other pending data
  };
}

/**
 * Base interface for game command handlers
 */
export interface GameCommandHandler {
  /**
   * Check if this handler can process the given command
   */
  canHandle(command: any): boolean;
  
  /**
   * Prepare the command (generate preview, return commit function)
   * 
   * @returns PreparedCommand with specialEffect and commit(), or null to skip
   */
  prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null>;
}

/**
 * Abstract base class with common utilities
 */
export abstract class BaseGameCommandHandler implements GameCommandHandler {
  abstract canHandle(command: any): boolean;
  abstract prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null>;
  
  /**
   * Helper: Create PreparedCommand from resolver result
   * Handles both PreparedCommand and legacy ResolveResult formats
   */
  protected normalizeResult(result: any, fallbackMessage: string): PreparedCommand | null {
    if (!result) return null;
    
    // Already a PreparedCommand
    if ('specialEffect' in result && 'commit' in result) {
      return result as PreparedCommand;
    }
    
    // Legacy ResolveResult - convert to PreparedCommand
    if ('success' in result) {
      if (!result.success) {
        console.error('[GameCommandHandler] Resolver returned failure:', result.error);
        return null;
      }
      
      const message = result.data?.message || fallbackMessage;
      const isNegative = result.data?.grantedGold === true;
      
      return {
        specialEffect: {
          type: 'status',
          message,
          icon: isNegative ? 'fa-coins' : 'fa-shield-alt',
          variant: isNegative ? 'neutral' : 'positive'
        },
        commit: async () => {
          // Already applied by resolver (legacy pattern)
          console.log('[GameCommandHandler] Legacy command already applied');
        }
      };
    }
    
    return null;
  }
}
