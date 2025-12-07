/**
 * Game Commands Type Definitions
 * 
 * Types for the prepare/commit pattern used in game command execution.
 */

import type { UnifiedOutcomeBadge } from './OutcomeBadge';

/**
 * PreparedCommand - Result of preparing a game command
 * 
 * The prepare/commit pattern allows game commands to:
 * 1. Generate a preview badge (outcomeBadge) shown before Apply
 * 2. Defer execution until user clicks Apply (commit function)
 * 3. Store metadata for post-apply interactions
 * 
 * This prevents premature state changes and allows user review.
 */
export interface PreparedCommand {
  /**
   * Outcome badges to display in preview
   * Shows user what will happen when they click Apply
   * Uses UnifiedOutcomeBadge format for consistency with other badges
   * 
   * Always returns an array, even for single badges.
   * This is the preferred field - use this instead of outcomeBadge.
   */
  outcomeBadges?: UnifiedOutcomeBadge[];
  
  /**
   * @deprecated Use `outcomeBadges` instead. This field exists for backwards compatibility.
   * Single outcome badge - will be migrated to outcomeBadges array.
   */
  outcomeBadge?: UnifiedOutcomeBadge;
  
  /**
   * Commit function - executes when user clicks Apply
   * Should apply state changes to kingdom
   */
  commit: () => Promise<void>;
  
  /**
   * Optional metadata for post-apply interactions
   * Stores information determined during prepare() that post-apply interactions need
   * Example: hexIds that will be destroyed, structures that will be damaged, etc.
   */
  metadata?: Record<string, any>;
}

/**
 * Legacy ResolveResult format (deprecated)
 * 
 * Old pattern where resolvers immediately applied changes.
 * Being phased out in favor of PreparedCommand pattern.
 */
export interface ResolveResult {
  success: boolean;
  error?: string;
  data?: {
    message?: string;
    grantedGold?: boolean;
    [key: string]: any;
  };
}

/**
 * Result of executing a game command via registry.executeCommand()
 * 
 * Re-exported from GameCommandHandler for convenience
 */
export type { GameCommandResult } from '../services/gameCommands/GameCommandHandler';
