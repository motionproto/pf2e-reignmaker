/**
 * Game Command Handler System
 * 
 * Provides interface and base class for extracting game command handling
 * from the monolithic createActionOutcomePreview() function.
 * 
 * Each game command type (recruitArmy, outfitArmy, etc.) gets its own
 * handler class, making the code more maintainable and testable.
 * 
 * ## Two Execution Patterns
 * 
 * ### Prepare/Commit Pattern (Interactive)
 * Used when user preview is needed or command requires UI interaction.
 * ```typescript
 * const prepared = await registry.process(command, ctx);
 * // Show prepared.outcomeBadge to user
 * // User clicks Apply
 * await prepared.commit();
 * ```
 * 
 * ### Immediate Execute Pattern (Automatic)
 * Used when command should run without user intervention.
 * ```typescript
 * const result = await registry.executeCommand(command, ctx);
 * // Command is already applied
 * ```
 * 
 * ## When to Use Each Pattern
 * 
 * | Scenario | Pattern |
 * |----------|---------|
 * | User must choose options (equipment, settlement) | Prepare/Commit |
 * | Preview shows specific affected entities | Prepare/Commit |
 * | Post-apply interaction needs metadata | Prepare/Commit |
 * | Commands in `pipeline.outcomes.gameCommands` | Immediate Execute |
 * | Simple automatic outcome effects | Immediate Execute |
 */

import type { PreparedCommand } from '../../types/game-commands';
import type { KingdomData } from '../../actors/KingdomActor';

/**
 * Result of executing a game command via registry.executeCommand()
 */
export interface GameCommandResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Error message if success is false */
  error?: string;
  /** Informational message about what happened */
  message?: string;
  /** Whether the command was skipped (user cancelled or no-op) */
  skipped?: boolean;
}

/**
 * Context passed to game command handlers
 */
export interface GameCommandContext {
  actionId?: string;
  outcome: string;
  kingdom: KingdomData;
  metadata?: Record<string, any>;
  pendingActions?: any; // PendingActionsState type
  
  // Explicit pending state (replaces global state)
  pendingState?: {
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
 * 
 * All handlers must implement canHandle() and prepare().
 * The prepare() method returns a PreparedCommand with an outcomeBadge
 * for preview and a commit() function for deferred execution.
 */
export interface GameCommandHandler {
  /**
   * Check if this handler can process the given command
   * @param command - Command object with at minimum a `type` property
   */
  canHandle(command: any): boolean;
  
  /**
   * Prepare the command (generate preview, return commit function)
   * 
   * This method should NOT modify game state. All state changes
   * should happen in the returned commit() function.
   * 
   * @param command - The command to prepare
   * @param ctx - Context with kingdom data, outcome, metadata
   * @returns PreparedCommand with outcomeBadge and commit(), or null to skip
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
   * Handles both PreparedCommand (outcomeBadge) and legacy ResolveResult formats
   */
  protected normalizeResult(result: any, fallbackMessage: string): PreparedCommand | null {
    if (!result) return null;
    
    // Already a PreparedCommand with outcomeBadge (new format)
    if ('outcomeBadge' in result && 'commit' in result) {
      return result as PreparedCommand;
    }
    
    // Legacy PreparedCommand with specialEffect - convert to outcomeBadge
    if ('specialEffect' in result && 'commit' in result) {
      const effect = result.specialEffect;
      return {
        outcomeBadge: {
          icon: effect.icon || 'fa-info-circle',
          template: effect.message,
          variant: effect.variant || 'info'
        },
        commit: result.commit
      };
    }
    
    // Legacy ResolveResult - convert to PreparedCommand with outcomeBadge
    if ('success' in result) {
      if (!result.success) {
        console.error('[GameCommandHandler] Resolver returned failure:', result.error);
        return null;
      }
      
      const message = result.data?.message || fallbackMessage;
      const isNegative = result.data?.grantedGold === true;
      
      return {
        outcomeBadge: {
          icon: isNegative ? 'fa-coins' : 'fa-shield-alt',
          template: message,
          variant: isNegative ? 'info' : 'positive'
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
