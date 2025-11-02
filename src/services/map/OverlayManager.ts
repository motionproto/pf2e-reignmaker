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
import type { LayerId, HexStyle } from './types';
import { get, derived, writable, type Readable, type Unsubscriber, type Writable } from 'svelte/store';
import { 
  kingdomData, 
  claimedHexes, 
  claimedSettlements,
  allSettlements,
  claimedHexesWithWorksites,
  hexesWithSettlementFeatures
} from '../../stores/KingdomStore';
import { territoryService } from '../territory';
import { MAP_HEX_STYLES } from '../../view/kingdom/utils/presentation';
import { logger } from '../../utils/Logger';

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
   */
  async showOverlay(id: string): Promise<void> {
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
        const unsubscribe = overlay.store.subscribe(async ($data) => {
          // Only render if overlay is still active
          if (this.isOverlayActive(id)) {
            try {
              // 🔒 RENDERING LOCK: Wait for any in-progress render to complete
              // This prevents race conditions when store updates rapidly (e.g., army deletion)
              const existingRender = this.renderLocks.get(id);
              if (existingRender) {
                logger.info(`[OverlayManager] ⏳ Waiting for in-progress render: ${id}`);
                await existingRender;
              }
              
              // Start new render and store the promise (wrap in Promise.resolve for sync renders)
              const renderPromise = Promise.resolve(overlay.render!($data));
              this.renderLocks.set(id, renderPromise);
              
              // Wait for render to complete
              await renderPromise;
              
              // Clear the lock after successful render
              this.renderLocks.delete(id);
            } catch (error) {
              logger.error(`[OverlayManager] ❌ Render failed for ${id}:`, error);
              // Clear lock even on error to prevent permanent deadlock
              this.renderLocks.delete(id);
            }
          } else {
            logger.warn(`[OverlayManager] ⚠️ Subscription fired for inactive overlay: ${id} - this shouldn't happen!`);
          }
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
      
      // Save state after successful activation
      this.saveState();
      
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
      // Cleanup subscription if exists
      const unsubscribe = this.subscriptions.get(id);
      if (unsubscribe) {
        unsubscribe();
        this.subscriptions.delete(id);
      }
      
      // Clear any in-progress render lock
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
    
    // Hide overlays that weren't in the previous state
    const toHide = Array.from($active).filter(id => !previousState.has(id));
    for (const id of toHide) {
      logger.info(`[OverlayManager]   - Hiding: ${id}`);
      this.hideOverlay(id, true); // Skip state save during batch operation
    }
    
    // Show overlays that were in the previous state but aren't active now
    const toShow = Array.from(previousState).filter(id => !$active.has(id));
    for (const id of toShow) {
      logger.info(`[OverlayManager]   + Showing: ${id}`);
      await this.showOverlay(id);
    }
    
    // Save the restored state to localStorage
    this.saveState();
    
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
    
    // Get current active overlays
    const $active = get(this.activeOverlaysStore);
    
    // Hide overlays not in the target list
    const toHide = Array.from($active).filter(id => !overlayIds.includes(id));
    for (const id of toHide) {
      this.hideOverlay(id, true); // Skip state save during batch operation
    }
    
    // Show overlays in the target list
    for (const id of overlayIds) {
      if (!$active.has(id)) {
        await this.showOverlay(id);
      }
    }
    
    logger.info('[OverlayManager] ✅ Temporary overlays set');
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

    } catch (error) {
      logger.error('[OverlayManager] Failed to restore state:', error);
    }
  }

  /**
   * Register default overlay types
   */
  private registerDefaultOverlays(): void {
    // Terrain Overlay - REACTIVE (uses hexesWithTerrain store)
    this.registerOverlay({
      id: 'terrain',
      name: 'Terrain',
      icon: 'fa-mountain',
      layerIds: ['terrain-overlay'],
      exclusiveGroup: 'terrain-display',  // ✅ Mutually exclusive with terrain-difficulty
      store: derived(kingdomData, $data => 
        $data.hexes.filter((h: any) => h.terrain)
      ),  // ✅ Reactive subscription
      render: (hexes) => {
        const hexData = hexes.map((h: any) => ({ id: h.id, terrain: h.terrain }));

        if (hexData.length === 0) {

          this.mapLayer.clearLayer('terrain-overlay');
          return;
        }

        this.mapLayer.drawTerrainOverlay(hexData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('terrain')
    });

    // Terrain Difficulty Overlay - REACTIVE (uses hexesWithTerrain store)
    this.registerOverlay({
      id: 'terrain-difficulty',
      name: 'Travel Speed',
      icon: 'fa-shoe-prints',
      layerIds: ['terrain-difficulty-overlay'],
      exclusiveGroup: 'terrain-display',  // ✅ Mutually exclusive with terrain
      store: derived(kingdomData, $data => 
        $data.hexes.filter((h: any) => h.terrain)
      ),  // ✅ Reactive subscription
      render: (hexes) => {
        const hexData = hexes.map((h: any) => ({ id: h.id, terrain: h.terrain }));

        if (hexData.length === 0) {

          this.mapLayer.clearLayer('terrain-difficulty-overlay');
          return;
        }

        this.mapLayer.drawTerrainDifficultyOverlay(hexData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('terrain-difficulty')
    });

    // Territory Overlay - REACTIVE (uses claimedHexes store)
    this.registerOverlay({
      id: 'territories',
      name: 'Territory',
      icon: 'fa-flag',
      layerIds: ['kingdom-territory'],
      store: claimedHexes,  // ✅ Reactive subscription
      render: (hexes) => {
        const hexIds = hexes.map((h: any) => h.id);
        
        if (hexIds.length === 0) {

          this.mapLayer.clearLayer('kingdom-territory');
          return;
        }

        const style: HexStyle = MAP_HEX_STYLES.partyTerritory;

        this.mapLayer.drawHexes(hexIds, style, 'kingdom-territory');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('territories')
    });

    // Territory Border Overlay - REACTIVE (uses claimedHexes store)
    this.registerOverlay({
      id: 'territory-border',
      name: 'Border',
      icon: 'fa-vector-square',
      layerIds: ['kingdom-territory-outline'],
      store: claimedHexes,  // ✅ Reactive subscription
      render: (hexes) => {
        const hexIds = hexes.map((h: any) => h.id);
        
        if (hexIds.length === 0) {

          this.mapLayer.clearLayer('kingdom-territory-outline');
          return;
        }

        this.mapLayer.drawTerritoryOutline(hexIds);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('territory-border')
    });

    // Settlements Overlay - REACTIVE (uses hexesWithSettlementFeatures store)
    this.registerOverlay({
      id: 'settlements',
      name: 'Settlements',
      icon: 'fa-city',
      layerIds: ['settlements-overlay'],
      store: hexesWithSettlementFeatures,  // ✅ Reactive subscription - shows hex features
      render: (hexesWithFeatures) => {
        const settlementHexIds = hexesWithFeatures.map((h: any) => h.id);

        if (settlementHexIds.length === 0) {

          this.mapLayer.clearLayer('settlements-overlay');
          return;
        }

        const style: HexStyle = MAP_HEX_STYLES.settlement;
        this.mapLayer.drawHexes(settlementHexIds, style, 'settlements-overlay');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('settlements')
    });

    // Roads Overlay - REACTIVE (uses kingdomRoads store)
    this.registerOverlay({
      id: 'roads',
      name: 'Roads',
      icon: 'fa-road',
      layerIds: ['routes'],
      store: derived(kingdomData, $data => 
        // Always derive from hex.hasRoad flags (source of truth)
        territoryService.getRoads()
      ),  // ✅ Reactive subscription
      render: (roadHexIds) => {
        if (roadHexIds.length === 0) {

          this.mapLayer.clearLayer('routes');
          return;
        }

        this.mapLayer.drawRoadConnections(roadHexIds, 'routes');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('roads')
    });

    // Rivers and Water Overlay - REACTIVE (uses water hexes from kingdom data)
    this.registerOverlay({
      id: 'water',
      name: 'Rivers and Water',
      icon: 'fa-water',
      layerIds: ['water'],
      store: derived(kingdomData, $data => 
        // Filter for water terrain hexes
        $data.hexes.filter((h: any) => h.terrain === 'water')
      ),  // ✅ Reactive subscription
      render: async (waterHexes) => {
        if (waterHexes.length === 0) {

          this.mapLayer.clearLayer('water');
          return;
        }

        await this.mapLayer.drawWaterConnections('water');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('water')
    });

    // Worksites Overlay - REACTIVE (uses claimedHexesWithWorksites store)
    this.registerOverlay({
      id: 'worksites',
      name: 'Worksites',
      icon: 'fa-industry',
      layerIds: ['worksites'],
      store: claimedHexesWithWorksites,  // ✅ Reactive subscription
      render: async (hexes) => {
        const worksiteData = hexes.map((h: any) => ({ 
          id: h.id, 
          worksiteType: h.worksite.type 
        }));

        if (worksiteData.length === 0) {

          this.mapLayer.clearLayer('worksites');
          return;
        }

        await this.mapLayer.drawWorksiteIcons(worksiteData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('worksites')
    });

    // Resources Overlay - REACTIVE (uses derived store for hexes with bounties)
    this.registerOverlay({
      id: 'resources',
      name: 'Resources',
      icon: 'fa-gem',
      layerIds: ['resources'],
      store: derived(claimedHexes, $hexes => 
        // Filter claimed hexes that have commodities
        $hexes.filter((h: any) => h.commodities && Object.keys(h.commodities).length > 0)
      ),  // ✅ Reactive subscription to claimed hexes with bounties
      render: async (hexes) => {
        const bountyData = hexes.map((h: any) => ({ 
          id: h.id, 
          commodities: h.commodities 
        }));

        if (bountyData.length === 0) {

          this.mapLayer.clearLayer('resources');
          return;
        }

        await this.mapLayer.drawResourceIcons(bountyData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('resources')
    });

    // Settlement Icons Overlay - REACTIVE (uses hexesWithSettlementFeatures store)
    this.registerOverlay({
      id: 'settlement-icons',
      name: 'Settlement Icons',
      icon: 'fa-castle',
      layerIds: ['settlement-icons'],
      store: hexesWithSettlementFeatures,  // ✅ Reactive subscription - shows hex features
      render: async (hexesWithFeatures) => {
        const settlementData = hexesWithFeatures.map((h: any) => ({
          id: h.id,
          tier: h.feature?.tier || 'Village',
          mapIconPath: h.feature?.mapIconPath  // Custom map icon (optional)
        }));

        if (settlementData.length === 0) {

          this.mapLayer.clearLayer('settlement-icons');
          return;
        }

        await this.mapLayer.drawSettlementIcons(settlementData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('settlement-icons')
    });

    // Settlement Labels Overlay - REACTIVE (uses hexesWithSettlementFeatures store)
    this.registerOverlay({
      id: 'settlement-labels',
      name: 'Settlement Labels',
      icon: 'fa-tag',
      layerIds: ['settlement-labels'],
      store: hexesWithSettlementFeatures,  // ✅ Reactive subscription - shows hex features
      render: async (hexesWithFeatures) => {

        const settlementData = hexesWithFeatures.map((h: any) => {

          return {
            id: h.id,
            name: h.feature?.name || 'Unnamed',
            tier: h.feature?.tier || 'Village'
          };
        });

        if (settlementData.length === 0) {

          this.mapLayer.clearLayer('settlement-labels');
          return;
        }

        await this.mapLayer.drawSettlementLabels(settlementData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('settlement-labels')
    });

    // Fortifications Overlay - REACTIVE (uses derived store for hexes with fortifications)
    this.registerOverlay({
      id: 'fortifications',
      name: 'Fortifications',
      icon: 'fa-shield-alt',
      layerIds: ['fortifications'],
      store: derived(kingdomData, $data => 
        $data.hexes.filter((h: any) => h.fortification && h.fortification.tier > 0)
      ),  // ✅ Reactive subscription
      render: async (hexes) => {
        const fortificationData = hexes.map((h: any) => ({ 
          id: h.id, 
          tier: h.fortification.tier,
          maintenancePaid: h.fortification.maintenancePaid
        }));

        if (fortificationData.length === 0) {

          this.mapLayer.clearLayer('fortifications');
          return;
        }

        await this.mapLayer.drawFortificationIcons(fortificationData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('fortifications')
    });

  }
}

/**
 * Convenience function to get overlay manager instance
 */
export function getOverlayManager(): OverlayManager {
  return OverlayManager.getInstance();
}
