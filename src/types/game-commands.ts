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
   * Outcome badge to display in preview (singular)
   * Shows user what will happen when they click Apply
   * Uses UnifiedOutcomeBadge format for consistency with other badges
   */
  outcomeBadge?: UnifiedOutcomeBadge;
  
  /**
   * Outcome badges to display in preview (multiple)
   * Use when a command affects multiple entities (e.g., multiple structures)
   * Each badge represents one affected entity
   */
  outcomeBadges?: UnifiedOutcomeBadge[];
  
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
