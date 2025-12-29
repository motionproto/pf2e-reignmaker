/**
 * OverlayManager - Standardized factory pattern for map overlays
 * 
 * Provides:
 * - Centralized overlay lifecycle management
 * - Automatic cleanup and singleton behavior
 * - State persistence across sessions
 * - Easy registration of new overlay types
 */

import { ReignMakerMapLayer } from './ReignMakerMapLayer';
import type { LayerId, HexStyle } from '../types';
import { get, derived, writable, type Readable, type Unsubscriber, type Writable } from 'svelte/store';
import { 
  kingdomData, 
  claimedHexes, 
  claimedSettlements,
  allSettlements,
  claimedHexesWithWorksites,
  hexesWithSettlementFeatures,
  allClaimedHexesByFaction
} from '../../../stores/KingdomStore';
import { territoryService } from '../../territory';
import { MAP_HEX_STYLES } from '../../../view/kingdom/utils/presentation';
import { logger } from '../../../utils/Logger';
import {
  createTerrainOverlay,
  createTerrainDifficultyOverlay,
  createTerritoryCompositeOverlay,
  createProvinceOverlay,
  createProvincesFillOverlay,
  createSettlementsOverlay,
  createRoadsOverlay,
  createRiversOverlay,
  createWorksitesOverlay,
  createResourcesOverlay,
  createSettlementIconsOverlay,
  createSettlementLabelsOverlay,
  createFortificationsOverlay,
  createInteractiveHoverOverlay,
  createArmyMovementOverlay,
  createNavigationGridDebugOverlay,
  createDemandedHexOverlay
} from '../overlays';

/**
 * Overlay definition interface
 * Each overlay type implements this interface
 * 
 * Supports two patterns:
 * 1. Reactive (preferred): Provide `store` and `render` - automatically redraws when store changes
 * 2. Legacy: Provide `show` - called manually each time overlay is shown
 */
export interface MapOverlay {
  id: string;
  name: string;
  icon: string;
  layerIds: LayerId[]; // Which layers this overlay manages
  
  // Mutual exclusivity - overlays in the same group can't be active together
  exclusiveGroup?: string;  // Optional group ID for mutual exclusivity

  // Linked overlays - automatically show/hide together with this overlay
  linkedOverlays?: string[];  // Overlay IDs that should toggle with this one

  // Reactive pattern (preferred)
  store?: Readable<any>;  // Store to subscribe to for automatic updates
  render?: (data: any) => void | Promise<void>;  // How to render when data changes
  
  // Legacy pattern (backwards compatibility)
  show?: () => Promise<void>;
  
  hide: () => void;
  isActive: () => boolean;
}

/**
 * OverlayManager - Singleton service for managing all map overlays
 */
export class OverlayManager {
  private static instance: OverlayManager | null = null;
  private overlays: Map<string, MapOverlay> = new Map();
  private subscriptions: Map<string, Unsubscriber> = new Map();  // Store subscriptions
  private zoomSubscriptions: Map<string, { callback: Function; lastScale: number }> = new Map();  // Zoom hook tracking
  private renderLocks: Map<string, Promise<void>> = new Map();  // Rendering locks to prevent race conditions
  private cancelledOverlays: Set<string> = new Set();  // Track overlays cancelled during render
  private pendingRenders: Map<string, any> = new Map();  // Latest data waiting to be rendered (prevents queue buildup)
  private batchOperationInProgress: boolean = false;  // Prevents subscription renders during batch operations
  private mapLayer: ReignMakerMapLayer;
  private readonly STORAGE_KEY = 'reignmaker-overlay-states';
  
  // Single source of truth for active overlay IDs - both runtime and reactive UI state
  private activeOverlaysStore: Writable<Set<string>> = writable(new Set());
  
  // Overlay state stack for temporary overlay views (e.g., during map interactions)
  private overlayStateStack: Set<string>[] = [];

  private constructor() {
    this.mapLayer = ReignMakerMapLayer.getInstance();
  }
  
  /**
   * Get reactive store for active overlays
   * Components can subscribe to this for automatic UI updates
   */
  getActiveOverlaysStore(): Readable<Set<string>> {
    return this.activeOverlaysStore;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OverlayManager {
    if (!OverlayManager.instance) {
      OverlayManager.instance = new OverlayManager();
      // Register default overlays
      OverlayManager.instance.registerDefaultOverlays();
    }
    return OverlayManager.instance;
  }

  /**
   * Register an overlay type
   */
  registerOverlay(overlay: MapOverlay): void {
    this.overlays.set(overlay.id, overlay);

  }

  /**
   * Get overlay by ID
   */
  getOverlay(id: string): MapOverlay | undefined {
    return this.overlays.get(id);
  }

  /**
   * Get all registered overlays
   */
  getAllOverlays(): MapOverlay[] {
    return Array.from(this.overlays.values());
  }

  /**
   * Show an overlay (with automatic cleanup)
   * Supports both reactive (store + render) and legacy (show) patterns
   *
   * IDEMPOTENT: Safe to call multiple times - returns early if already active
   *
   * @param id - Overlay ID to show
   * @param skipStateSave - If true, don't save state to localStorage (used during editor mode)
   */
  async showOverlay(id: string, skipStateSave: boolean = false): Promise<void> {
    const overlay = this.overlays.get(id);
    if (!overlay) {
      logger.warn(`[OverlayManager] Overlay not found: ${id}`);
      return;
    }

    // ✅ IDEMPOTENT: Early return if already active (prevent double subscription/render)
    const $active = get(this.activeOverlaysStore);
    if ($active.has(id)) {

      return;
    }

    // ✅ MUTUAL EXCLUSIVITY: If overlay belongs to an exclusive group, hide others in that group
    if (overlay.exclusiveGroup) {
      const overlaysInGroup = Array.from(this.overlays.values())
        .filter(o => o.exclusiveGroup === overlay.exclusiveGroup && o.id !== id);
      
      for (const otherOverlay of overlaysInGroup) {
        if (this.isOverlayActive(otherOverlay.id)) {
          logger.info(`[OverlayManager] Hiding ${otherOverlay.id} (exclusive group: ${overlay.exclusiveGroup})`);
          this.hideOverlay(otherOverlay.id);
        }
      }
    }

    try {
      // Clear cancellation flag - overlay is being shown again
      this.cancelledOverlays.delete(id);

      // Mark as active FIRST (before subscription fires)
      // This ensures isOverlayActive() returns true when subscription callback fires
      this.activeOverlaysStore.update($set => {
        $set.add(id);
        return $set;
      });

      // Reactive pattern: Subscribe to store for automatic updates
      if (overlay.store && overlay.render) {
        // Cleanup old subscription if exists
        const hadOldSubscription = this.subscriptions.has(id);
        this.subscriptions.get(id)?.();
        
        if (hadOldSubscription) {
          logger.warn(`[OverlayManager] ⚠️ Cleaned up old subscription for ${id} - this shouldn't happen!`);
        }

        // Subscribe to store - automatically redraws when data changes
        const unsubscribe = overlay.store.subscribe(($data) => {
          // Skip rendering during batch operations (e.g., setActiveOverlays)
          if (this.batchOperationInProgress) {
            return;
          }

          // Check cancellation BEFORE any work
          if (this.cancelledOverlays.has(id) || !this.isOverlayActive(id)) {
            return; // Overlay was hidden, skip render
          }

          // Store latest data - if render is in progress, it will pick this up when done
          this.pendingRenders.set(id, $data);

          // If no render in progress, start the render loop
          if (!this.renderLocks.has(id)) {
            this.processRenderQueue(id, overlay);
          }
          // If render IS in progress, it will automatically process pendingRenders when done
        });
        
        this.subscriptions.set(id, unsubscribe);

      }
      // Legacy pattern: Call show() method
      else if (overlay.show) {

        await overlay.show();
      }
      else {
        logger.warn(`[OverlayManager] Overlay ${id} has neither reactive nor legacy show method`);
        // Remove from active since we couldn't show it
        this.activeOverlaysStore.update($set => {
          $set.delete(id);
          return $set;
        });
        return;
      }
      
      // Subscribe to zoom changes for settlement-labels overlay
      if (id === 'settlement-labels') {
        this.setupZoomSubscription(id);
      }

      // CRITICAL: Show all layers used by this overlay
      // This is the ONLY place where layers become visible
      // Draw methods no longer auto-show to prevent visibility bypassing the OverlayManager
      overlay.layerIds.forEach(layerId => {
        this.mapLayer.showLayer(layerId);
      });

      // Show linked overlays (overlays that should always appear together)
      if (overlay.linkedOverlays) {
        for (const linkedId of overlay.linkedOverlays) {
          if (!this.isOverlayActive(linkedId)) {
            await this.showOverlay(linkedId, skipStateSave);
          }
        }
      }

      // Save state after successful activation (unless told to skip)
      if (!skipStateSave) {
        this.saveState();
      }

      const $activeAfter = get(this.activeOverlaysStore);

    } catch (error) {
      logger.error(`[OverlayManager] ❌ Failed to show overlay ${id}:`, error);
      // Don't throw - log error but continue (prevents one failing overlay from breaking everything)
      // Remove from active overlays since it failed
      this.activeOverlaysStore.update($set => {
        $set.delete(id);
        return $set;
      });
      this.saveState();
    }
  }

  /**
   * Hide an overlay (with automatic cleanup)
   * @param skipStateSave - If true, don't save state (used during bulk clear operations)
   */
  hideOverlay(id: string, skipStateSave: boolean = false): void {
    const overlay = this.overlays.get(id);
    if (!overlay) {
      logger.warn(`[OverlayManager] Overlay not found: ${id}`);
      return;
    }

    try {
      // Mark as cancelled FIRST - prevents any in-flight renders from continuing
      this.cancelledOverlays.add(id);

      // Cleanup subscription if exists
      const unsubscribe = this.subscriptions.get(id);
      if (unsubscribe) {
        unsubscribe();
        this.subscriptions.delete(id);
      }

      // Clear any pending renders and locks
      this.pendingRenders.delete(id);
      this.renderLocks.delete(id);
      
      // Cleanup zoom subscription if exists
      const zoomSub = this.zoomSubscriptions.get(id);
      if (zoomSub) {
        Hooks.off('canvasPan', zoomSub.callback);
        this.zoomSubscriptions.delete(id);

      }
      
      // Call overlay's hide method
      overlay.hide();
      
      // Clear all layers used by this overlay
      overlay.layerIds.forEach(layerId => {
        this.mapLayer.clearLayer(layerId);
        this.mapLayer.hideLayer(layerId);
      });

      // Hide linked overlays (overlays that should always appear together)
      if (overlay.linkedOverlays) {
        for (const linkedId of overlay.linkedOverlays) {
          if (this.isOverlayActive(linkedId)) {
            this.hideOverlay(linkedId, skipStateSave);
          }
        }
      }

      // Mark as inactive
      this.activeOverlaysStore.update($set => {
        $set.delete(id);
        return $set;
      });

      // Save state unless told to skip (bulk operations handle state separately)
      if (!skipStateSave) {
        this.saveState();
      }

    } catch (error) {
      logger.error(`[OverlayManager] Failed to hide overlay ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process render queue for an overlay - renders latest data, skipping intermediate updates
   * This prevents UI blocking when store updates rapidly
   */
  private async processRenderQueue(id: string, overlay: MapOverlay): Promise<void> {
    // Keep rendering while there's pending data
    while (this.pendingRenders.has(id)) {
      // Check cancellation
      if (this.cancelledOverlays.has(id) || !this.isOverlayActive(id)) {
        this.pendingRenders.delete(id);
        this.renderLocks.delete(id);
        return;
      }

      // Get and clear pending data (grab latest, discard any that came before)
      const data = this.pendingRenders.get(id);
      this.pendingRenders.delete(id);

      try {
        // Create render promise and store as lock
        const renderPromise = Promise.resolve(overlay.render!(data));
        this.renderLocks.set(id, renderPromise);

        // Wait for render to complete
        await renderPromise;
      } catch (error) {
        logger.error(`[OverlayManager] ❌ Render failed for ${id}:`, error);
      }

      // Loop continues if new data arrived during render
    }

    // No more pending data, clear the lock
    this.renderLocks.delete(id);
  }

  /**
   * Toggle an overlay on/off
   */
  async toggleOverlay(id: string): Promise<void> {
    if (this.isOverlayActive(id)) {
      this.hideOverlay(id);
    } else {
      await this.showOverlay(id);
    }
  }

  /**
   * Check if overlay is active
   */
  isOverlayActive(id: string): boolean {
    const $active = get(this.activeOverlaysStore);
    return $active.has(id);
  }

  /**
   * Get list of active overlay IDs
   */
  getActiveOverlayIds(): string[] {
    const $active = get(this.activeOverlaysStore);
    return Array.from($active);
  }

  /**
   * Force re-render of all active overlays
   * Use this when overlay state might be stale or out of sync
   *
   * This is useful after mode transitions where overlays may have been
   * affected by other operations (editor mode, hex selection, etc.)
   */
  async refreshActiveOverlays(): Promise<void> {
    const $active = get(this.activeOverlaysStore);
    logger.info('[OverlayManager] 🔄 Refreshing active overlays:', Array.from($active));

    for (const id of $active) {
      const overlay = this.overlays.get(id);
      if (!overlay) continue;

      try {
        // For reactive overlays, trigger a re-render by getting current store value
        if (overlay.store && overlay.render) {
          const currentData = get(overlay.store);
          await overlay.render(currentData);
        }
        // For legacy overlays, call show() again
        else if (overlay.show) {
          await overlay.show();
        }

        // Ensure all layer IDs for this overlay are visible
        overlay.layerIds.forEach(layerId => {
          this.mapLayer.showLayer(layerId);
        });
      } catch (error) {
        logger.error(`[OverlayManager] ❌ Failed to refresh overlay ${id}:`, error);
      }
    }

    logger.info('[OverlayManager] ✅ Active overlays refreshed');
  }

  /**
   * Push current overlay state onto stack (for temporary overlay changes)
   * Use this before showing temporary overlays during map interactions
   * 
   * @returns The saved state (for debugging/verification)
   */
  pushOverlayState(): Set<string> {
    const $active = get(this.activeOverlaysStore);
    const savedState = new Set($active);
    this.overlayStateStack.push(savedState);
    logger.info(`[OverlayManager] 📌 Pushed overlay state (stack depth: ${this.overlayStateStack.length}):`, Array.from(savedState));
    return savedState;
  }
  
  /**
   * Pop and restore previous overlay state from stack
   * Use this to restore player's overlay preferences after map interaction
   *
   * @returns true if state was restored, false if stack was empty
   */
  async popOverlayState(): Promise<boolean> {
    if (this.overlayStateStack.length === 0) {
      logger.warn('[OverlayManager] ⚠️ Cannot pop overlay state - stack is empty');
      return false;
    }

    const previousState = this.overlayStateStack.pop()!;
    logger.info(`[OverlayManager] 📍 Popping overlay state (stack depth: ${this.overlayStateStack.length}):`, Array.from(previousState));

    // Get current active overlays
    const $active = get(this.activeOverlaysStore);

    // Track any errors during restoration
    const errors: Array<{ id: string; error: unknown }> = [];

    // Hide overlays that weren't in the previous state
    const toHide = Array.from($active).filter(id => !previousState.has(id));
    for (const id of toHide) {
      try {
        logger.info(`[OverlayManager]   - Hiding: ${id}`);
        this.hideOverlay(id, true); // Skip state save during batch operation
      } catch (error) {
        logger.error(`[OverlayManager] ❌ Failed to hide overlay ${id}:`, error);
        errors.push({ id, error });
        // Continue with other overlays - don't let one failure break restoration
      }
    }

    // Show overlays that were in the previous state but aren't active now
    const toShow = Array.from(previousState).filter(id => !$active.has(id));
    for (const id of toShow) {
      try {
        logger.info(`[OverlayManager]   + Showing: ${id}`);
        await this.showOverlay(id);
      } catch (error) {
        logger.error(`[OverlayManager] ❌ Failed to show overlay ${id}:`, error);
        errors.push({ id, error });
        // Continue with other overlays - don't let one failure break restoration
      }
    }

    // Save the restored state to localStorage
    this.saveState();

    // Log summary if there were errors
    if (errors.length > 0) {
      logger.warn(`[OverlayManager] ⚠️ Overlay state restoration completed with ${errors.length} error(s)`);
    }

    return true;
  }
  
  /**
   * Set temporary overlays for map interaction (auto-saves current state)
   * This is a convenience method that combines pushOverlayState() + showing specific overlays
   *
   * @param overlayIds - Array of overlay IDs to show (all others will be hidden)
   * @param skipPush - If true, don't push state (useful if already pushed manually)
   */
  async setTemporaryOverlays(overlayIds: string[], skipPush: boolean = false): Promise<void> {
    // Save current state first (unless told to skip)
    if (!skipPush) {
      this.pushOverlayState();
    }

    logger.info('[OverlayManager] 🔄 Setting temporary overlays:', overlayIds);

    // Track any errors during the operation
    const errors: Array<{ id: string; error: unknown }> = [];

    // Get current active overlays
    const $active = get(this.activeOverlaysStore);

    // Hide overlays not in the target list
    const toHide = Array.from($active).filter(id => !overlayIds.includes(id));
    for (const id of toHide) {
      try {
        this.hideOverlay(id, true); // Skip state save during batch operation
      } catch (error) {
        logger.error(`[OverlayManager] ❌ Failed to hide overlay ${id}:`, error);
        errors.push({ id, error });
      }
    }

    // Show overlays in the target list
    for (const id of overlayIds) {
      if (!$active.has(id)) {
        try {
          await this.showOverlay(id);
        } catch (error) {
          logger.error(`[OverlayManager] ❌ Failed to show overlay ${id}:`, error);
          errors.push({ id, error });
        }
      }
    }

    if (errors.length > 0) {
      logger.warn(`[OverlayManager] ⚠️ setTemporaryOverlays completed with ${errors.length} error(s)`);
    } else {
      logger.info('[OverlayManager] ✅ Temporary overlays set');
    }
  }
  
  /**
   * Clear the overlay state stack (use sparingly - mainly for cleanup/reset)
   */
  clearOverlayStateStack(): void {
    const depth = this.overlayStateStack.length;
    this.overlayStateStack = [];
    if (depth > 0) {
      logger.info(`[OverlayManager] 🗑️ Cleared overlay state stack (was ${depth} deep)`);
    }
  }
  
  /**
   * Get current overlay state stack depth (for debugging)
   */
  getOverlayStateStackDepth(): number {
    return this.overlayStateStack.length;
  }
  
  /**
   * Set active overlays - show specified overlays and hide all others
   * This is the centralized way to manage overlay state
   *
   * @param overlayIds - Array of overlay IDs to show (all others will be hidden)
   * @param saveState - If true, save the new state to localStorage (default: true)
   */
  async setActiveOverlays(overlayIds: string[], saveState: boolean = true): Promise<void> {
    logger.info('[OverlayManager] 🔄 setActiveOverlays START - requested:', overlayIds);

    // Prevent subscription callbacks from rendering during batch operation
    this.batchOperationInProgress = true;

    try {
      // Get current active overlays
      const $active = get(this.activeOverlaysStore);
      logger.info('[OverlayManager] 🔍 Current active overlays:', Array.from($active));

      // Track any errors during the operation
      const errors: Array<{ id: string; error: unknown }> = [];

      // Hide overlays not in the target list (skip individual state saves for batch operation)
      const toHide = Array.from($active).filter(id => !overlayIds.includes(id));
      logger.info('[OverlayManager] 🔍 Overlays to hide:', toHide);
      for (const id of toHide) {
        try {
          logger.info(`[OverlayManager] 🔍 Hiding overlay: ${id}...`);
          this.hideOverlay(id, true); // Skip state save during batch operation
        } catch (error) {
          logger.error(`[OverlayManager] ❌ Failed to hide overlay ${id}:`, error);
          errors.push({ id, error });
          // Continue with other overlays - don't let one failure break the batch
        }
      }

      // Show overlays in the target list (skip individual state saves for batch operation)
      logger.info('[OverlayManager] 🔍 Overlays to show:', overlayIds.filter(id => !$active.has(id)));
      for (const id of overlayIds) {
        if (!$active.has(id)) {
          try {
            logger.info(`[OverlayManager] 🔍 Showing overlay: ${id}...`);
            // Pass !saveState as skipStateSave - if we're not saving state for the batch, skip individual saves too
            await this.showOverlay(id, !saveState);
            logger.info(`[OverlayManager] 🔍 showOverlay(${id}) completed`);
          } catch (error) {
            logger.error(`[OverlayManager] ❌ Failed to show overlay ${id}:`, error);
            errors.push({ id, error });
            // Continue with other overlays - don't let one failure break the batch
          }
        } else {
          logger.info(`[OverlayManager] 🔍 Overlay ${id} already active, skipping`);
        }
      }

      // Save the new state if requested
      if (saveState) {
        logger.info('[OverlayManager] 🔍 Saving state to localStorage...');
        this.saveState();
      }

      const $activeAfter = get(this.activeOverlaysStore);
      logger.info('[OverlayManager] ✅ setActiveOverlays COMPLETE - final active overlays:', Array.from($activeAfter));

      // Log summary if there were errors
      if (errors.length > 0) {
        logger.warn(`[OverlayManager] ⚠️ setActiveOverlays completed with ${errors.length} error(s)`);
      }
    } finally {
      // Always reset batch flag, even if errors occurred
      this.batchOperationInProgress = false;

      // CRITICAL: Trigger initial render for all overlays that were shown during batch
      // The subscription callbacks were skipped during batch, so we need to render now
      for (const id of overlayIds) {
        const overlay = this.overlays.get(id);
        if (overlay?.store && overlay?.render) {
          const $data = get(overlay.store);
          this.pendingRenders.set(id, $data);
          if (!this.renderLocks.has(id)) {
            this.processRenderQueue(id, overlay);
          }
        }
      }
    }
  }
  
  /**
   * Clear all overlays
   * 
   * @param preserveState - If true, keeps the active overlay state saved for restoration
   *                        (useful when toggling scene control OFF/ON)
   */
  clearAll(preserveState: boolean = false): void {
    const $active = get(this.activeOverlaysStore);


    // ✅ CRITICAL FIX: Save current state to localStorage BEFORE clearing
    // This preserves which overlays were active so they can be restored later
    if (preserveState) {
      this.saveState();

    }
    
    // Hide all active overlays (skip individual state saves - we'll handle at end)
    const overlaysToHide = Array.from($active);
    overlaysToHide.forEach((id: string) => {
      this.hideOverlay(id, true); // skipStateSave = true
    });
    
    // Extra safety: Clean up any lingering subscriptions
    const lingering = this.subscriptions.size;
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions.clear();
    
    if (lingering > 0) {
      logger.warn(`[OverlayManager] ⚠️ Cleaned up ${lingering} lingering subscription(s)`);
    }
    
    // Clear all map layers
    this.mapLayer.clearAllLayers();
    
    // Handle state saving
    if (preserveState) {
      // State already saved before clearing - store already updated by hideOverlay calls

    } else {
      // Permanently clear state (e.g., "Reset Map" button)
      // Store already updated by hideOverlay calls, just persist to localStorage
      this.saveState();

    }
  }

  /**
   * Setup zoom change subscription for dynamic label scaling
   * Hooks into Foundry's canvasPan event to detect zoom changes
   */
  private setupZoomSubscription(overlayId: string): void {
    const overlay = this.overlays.get(overlayId);
    if (!overlay || !overlay.store || !overlay.render) {
      logger.warn(`[OverlayManager] Cannot setup zoom subscription for ${overlayId} - missing store/render`);
      return;
    }

    // Get initial canvas scale
    const canvas = (globalThis as any).canvas;
    if (!canvas?.stage?.scale) {
      logger.warn('[OverlayManager] Canvas not available for zoom subscription');
      return;
    }

    const initialScale = canvas.stage.scale.x;
    
    // Define hook callback for zoom changes
    const zoomCallback = (canvasInstance: any, view: any) => {
      // Only proceed if overlay is still active
      if (!this.isOverlayActive(overlayId)) {
        return;
      }

      const currentScale = canvasInstance.stage?.scale?.x;
      if (!currentScale) return;

      // Check if zoom has changed (not just pan)
      const zoomSubscription = this.zoomSubscriptions.get(overlayId);
      if (!zoomSubscription) return;

      const lastScale = zoomSubscription.lastScale;
      
      // Only re-render if zoom actually changed (threshold to avoid floating point issues)
      if (Math.abs(currentScale - lastScale) > 0.001) {

        // Update tracked scale
        zoomSubscription.lastScale = currentScale;
        
        // Trigger re-render with current data
        const currentData = get(overlay.store!);
        overlay.render!(currentData);
      }
    };

    // Register the hook
    Hooks.on('canvasPan', zoomCallback);

    // Store subscription info for cleanup
    this.zoomSubscriptions.set(overlayId, {
      callback: zoomCallback,
      lastScale: initialScale
    });

  }

  /**
   * Save overlay states to localStorage
   * Store is already the source of truth, so we just persist it
   */
  saveState(): void {
    const $active = get(this.activeOverlaysStore);
    const state = {
      activeOverlays: Array.from($active)
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));

  }

  /**
   * Restore overlay states from localStorage
   */
  async restoreState(): Promise<void> {
    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (!savedState) return;

      const state = JSON.parse(savedState);

      // Restore each active overlay
      for (const overlayId of state.activeOverlays || []) {
        if (this.overlays.has(overlayId)) {
          await this.showOverlay(overlayId);
        }
      }

      // Auto-show data-dependent overlays that should always be active when data exists
      await this.showDataDependentOverlays();

    } catch (error) {
      logger.error('[OverlayManager] Failed to restore state:', error);
    }
  }

  /**
   * Show overlays that should always be active when their data conditions are met
   * These overlays show important game state (like demanded hexes) and shouldn't require
   * manual activation by the user.
   */
  private async showDataDependentOverlays(): Promise<void> {
    // List of overlays that should auto-show when they have data
    const dataDependentOverlays = ['demanded-hex'];
    
    for (const overlayId of dataDependentOverlays) {
      if (this.overlays.has(overlayId) && !this.isOverlayActive(overlayId)) {
        await this.showOverlay(overlayId);
      }
    }
  }

  /**
   * Register default overlay types
   * All overlay definitions extracted to individual files in src/services/map/overlays/
   * This reduces OverlayManager from ~900 lines to ~300 lines
   */
  private registerDefaultOverlays(): void {
    const boundIsActive = this.isOverlayActive.bind(this);
    
    this.registerOverlay(createTerrainOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createTerrainDifficultyOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createTerritoryCompositeOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createProvinceOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createProvincesFillOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createSettlementsOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createRoadsOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createRiversOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createWorksitesOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createResourcesOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createSettlementIconsOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createSettlementLabelsOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createFortificationsOverlay(this.mapLayer, boundIsActive));
    
    // Debug overlays (GM only, shown in overlay panel)
    this.registerOverlay(createNavigationGridDebugOverlay(this.mapLayer, boundIsActive));
    
    // Event-based overlays (shown when relevant events are active)
    this.registerOverlay(createDemandedHexOverlay(this.mapLayer, boundIsActive));
    
    // Internal overlays (used during map interactions, not shown in overlay panel)
    this.registerOverlay(createInteractiveHoverOverlay(this.mapLayer, boundIsActive));
    this.registerOverlay(createArmyMovementOverlay(this.mapLayer, boundIsActive));
  }
}

/**
 * Convenience function to get overlay manager instance
 */
export function getOverlayManager(): OverlayManager {
  return OverlayManager.getInstance();
}
