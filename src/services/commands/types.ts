/**
 * Shared types for game command resolution
 * 
 * Re-exports from central types for backward compatibility
 */

// Re-export from central types file
export type { PreparedCommand } from '../../types/game-commands';
export type { UnifiedOutcomeBadge, BadgeValue } from '../../types/OutcomeBadge';

/**
 * ResolveResult - Legacy pattern
 * 
 * Used for commands that need post-roll user interaction:
 * - Dialogs (select army, equipment type, resource)
 * - Hex selection (interactive map selection)
 * - Complex calculations
 */
export interface ResolveResult {
  success: boolean;
  error?: string;
  data?: any; // Action-specific return data
}
