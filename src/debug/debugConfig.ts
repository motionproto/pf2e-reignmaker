/**
 * Debug Panel Configuration
 * 
 * Controls which debug panels are shown in the kingdom UI.
 * Set to `false` to disable panels when testing is complete.
 * 
 * Usage:
 *   import { DEBUG_PANELS } from '../../debug/debugConfig';
 *   
 *   {#if isGM && DEBUG_PANELS.events}
 *     <EventDebugPanel />
 *   {/if}
 */

export const DEBUG_PANELS = {
  /**
   * Event Debug Panel
   * Shows all 37 events organized by trait (beneficial, dangerous, neutral)
   * for systematic testing with PipelineCoordinator.
   * 
   * Location: src/view/debug/EventDebugPanel.svelte
   * Used in: EventsPhase.svelte
   * 
   * STATUS: Disabled - using SimpleEventSelector instead
   */
  events: false,

  /**
   * Incident Debug Panel
   * Shows all 30 incidents organized by severity (minor, moderate, major)
   * for systematic testing with PipelineCoordinator.
   * 
   * Location: src/view/debug/IncidentDebugPanel.svelte
   * Used in: UnrestPhase.svelte (when enabled)
   */
  incidents: true,

  /**
   * Phase Progression Debug
   * Shows detailed phase step completion states.
   * 
   * Location: src/view/debug/PhaseProgressionDebug.svelte
   */
  phaseProgression: false,
} as const;

/**
 * Master debug switch - set to false to disable ALL debug panels at once
 */
export const DEBUG_MODE = true;

/**
 * Check if a specific debug panel should be shown
 */
export function isDebugPanelEnabled(panel: keyof typeof DEBUG_PANELS): boolean {
  return DEBUG_MODE && DEBUG_PANELS[panel];
}
