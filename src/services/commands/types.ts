/**
 * Shared types for game command resolution
 */

/**
 * PreparedCommand - New pattern (2025-11-11)
 * 
 * Commands return preview data + commit function instead of executing immediately.
 * This allows:
 * - Special effects to show in preview BEFORE "Apply Result" is clicked
 * - Clean cancellation (just discard commit, no undo needed)
 * - Single code path (no duplicate preview logic)
 */
export interface PreparedCommand {
  specialEffect: SpecialEffect;     // Preview data for OutcomeDisplay
  commit: () => Promise<void>;       // Function to execute on "Apply Result"
}

/**
 * SpecialEffect - Preview display data
 */
export interface SpecialEffect {
  type: 'status' | 'resource' | 'hex' | 'attitude';
  message: string;
  icon: string;
  variant: 'positive' | 'negative' | 'neutral';
}

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
