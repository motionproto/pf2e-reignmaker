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
  private mapLayer: ReignMakerMapLayer;
  private readonly STORAGE_KEY = 'reignmaker-overlay-states';
  
  // Single source of truth for active overlay IDs - both runtime and reactive UI state
  private activeOverlaysStore: Writable<Set<string>> = writable(new Set());

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
    console.log(`[OverlayManager] Registered overlay: ${overlay.id}`);
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
      console.warn(`[OverlayManager] Overlay not found: ${id}`);
      return;
    }

    // ✅ IDEMPOTENT: Early return if already active (prevent double subscription/render)
    const $active = get(this.activeOverlaysStore);
    if ($active.has(id)) {
      console.log(`[OverlayManager] 🔄 Overlay ${id} already active, skipping duplicate showOverlay() call`);
      return;
    }

    console.log(`[OverlayManager] 📍 Showing overlay: ${id}`);
    console.log(`[OverlayManager] Active overlays before: ${$active.size}, Subscriptions before: ${this.subscriptions.size}`);

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
          console.warn(`[OverlayManager] ⚠️ Cleaned up old subscription for ${id} - this shouldn't happen!`);
        }
        
        console.log(`[OverlayManager] 🔄 Setting up reactive subscription for: ${id}`);
        
        // Subscribe to store - automatically redraws when data changes
        const unsubscribe = overlay.store.subscribe(async ($data) => {
          // Only render if overlay is still active
          if (this.isOverlayActive(id)) {
            console.log(`[OverlayManager] 🎨 Reactive redraw triggered for: ${id}`);
            try {
              await overlay.render!($data);
            } catch (error) {
              console.error(`[OverlayManager] ❌ Render failed for ${id}:`, error);
            }
          } else {
            console.warn(`[OverlayManager] ⚠️ Subscription fired for inactive overlay: ${id} - this shouldn't happen!`);
          }
        });
        
        this.subscriptions.set(id, unsubscribe);
        console.log(`[OverlayManager] ✅ Subscription registered for: ${id} (total: ${this.subscriptions.size})`);
      }
      // Legacy pattern: Call show() method
      else if (overlay.show) {
        console.log(`[OverlayManager] 📜 Using legacy show() method for: ${id}`);
        await overlay.show();
      }
      else {
        console.warn(`[OverlayManager] Overlay ${id} has neither reactive nor legacy show method`);
        // Remove from active since we couldn't show it
        this.activeOverlaysStore.update($set => {
          $set.delete(id);
          return $set;
        });
        return;
      }
      
      // Save state after successful activation
      this.saveState();
      
      const $activeAfter = get(this.activeOverlaysStore);
      console.log(`[OverlayManager] ✅ Showed overlay: ${id} (active: ${$activeAfter.size}, subscriptions: ${this.subscriptions.size})`);
    } catch (error) {
      console.error(`[OverlayManager] ❌ Failed to show overlay ${id}:`, error);
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
      console.warn(`[OverlayManager] Overlay not found: ${id}`);
      return;
    }

    try {
      // Cleanup subscription if exists
      const unsubscribe = this.subscriptions.get(id);
      if (unsubscribe) {
        unsubscribe();
        this.subscriptions.delete(id);
        console.log(`[OverlayManager] 🔌 Unsubscribed from: ${id}`);
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
      
      console.log(`[OverlayManager] ✅ Hid overlay: ${id}`);
    } catch (error) {
      console.error(`[OverlayManager] Failed to hide overlay ${id}:`, error);
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
   * Clear all overlays
   * 
   * @param preserveState - If true, keeps the active overlay state saved for restoration
   *                        (useful when toggling scene control OFF/ON)
   */
  clearAll(preserveState: boolean = false): void {
    const $active = get(this.activeOverlaysStore);
    
    console.log('[OverlayManager] 🧹 Clearing all overlays...');
    console.log('[OverlayManager] Active overlays before cleanup:', Array.from($active));
    console.log('[OverlayManager] Active subscriptions before cleanup:', this.subscriptions.size);
    console.log('[OverlayManager] Preserve state:', preserveState);
    
    // ✅ CRITICAL FIX: Save current state to localStorage BEFORE clearing
    // This preserves which overlays were active so they can be restored later
    if (preserveState) {
      this.saveState();
      console.log('[OverlayManager] 💾 Saved overlay state before clearing:', Array.from($active));
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
      console.warn(`[OverlayManager] ⚠️ Cleaned up ${lingering} lingering subscription(s)`);
    }
    
    // Clear all map layers
    this.mapLayer.clearAllLayers();
    
    // Handle state saving
    if (preserveState) {
      // State already saved before clearing - store already updated by hideOverlay calls
      console.log('[OverlayManager] ✅ All overlays cleared - graphics removed, subscriptions: 0, state preserved for restoration');
    } else {
      // Permanently clear state (e.g., "Reset Map" button)
      // Store already updated by hideOverlay calls, just persist to localStorage
      this.saveState();
      console.log('[OverlayManager] ✅ All overlays cleared - subscriptions: 0, active: 0, state saved');
    }
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
    
    console.log('[OverlayManager] Saved state:', state);
  }

  /**
   * Restore overlay states from localStorage
   */
  async restoreState(): Promise<void> {
    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (!savedState) return;

      const state = JSON.parse(savedState);
      console.log('[OverlayManager] Restoring state:', state);

      // Restore each active overlay
      for (const overlayId of state.activeOverlays || []) {
        if (this.overlays.has(overlayId)) {
          await this.showOverlay(overlayId);
        }
      }

      console.log('[OverlayManager] ✅ State restored');
    } catch (error) {
      console.error('[OverlayManager] Failed to restore state:', error);
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
      store: derived(kingdomData, $data => 
        $data.hexes.filter((h: any) => h.terrain)
      ),  // ✅ Reactive subscription
      render: (hexes) => {
        const hexData = hexes.map((h: any) => ({ id: h.id, terrain: h.terrain }));

        if (hexData.length === 0) {
          console.log('[OverlayManager] No terrain data - clearing layer');
          this.mapLayer.clearLayer('terrain-overlay');
          return;
        }

        console.log(`[OverlayManager] Drawing terrain overlay for ${hexData.length} hexes`);
        this.mapLayer.drawTerrainOverlay(hexData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('terrain')
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
          console.log('[OverlayManager] No claimed territory - clearing layer');
          this.mapLayer.clearLayer('kingdom-territory');
          return;
        }

        const style: HexStyle = MAP_HEX_STYLES.partyTerritory;
        console.log(`[OverlayManager] Drawing ${hexIds.length} claimed hexes`);
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
          console.log('[OverlayManager] No claimed territory - clearing border');
          this.mapLayer.clearLayer('kingdom-territory-outline');
          return;
        }

        console.log(`[OverlayManager] Drawing border for ${hexIds.length} claimed hexes`);
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
          console.log('[OverlayManager] No settlement features - clearing layer');
          this.mapLayer.clearLayer('settlements-overlay');
          return;
        }

        console.log(`[OverlayManager] Drawing ${settlementHexIds.length} settlement features`);
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
        // Use getRoads() to get road hex IDs from territory service
        // This ensures we use the same logic as before
        ($data.roadsBuilt || []).length > 0 ? territoryService.getRoads() : []
      ),  // ✅ Reactive subscription
      render: (roadHexIds) => {
        if (roadHexIds.length === 0) {
          console.log('[OverlayManager] No roads - clearing layer');
          this.mapLayer.clearLayer('routes');
          return;
        }

        console.log(`[OverlayManager] Drawing ${roadHexIds.length} road connections`);
        this.mapLayer.drawRoadConnections(roadHexIds, 'routes');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('roads')
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
          console.log('[OverlayManager] No worksites - clearing layer');
          this.mapLayer.clearLayer('worksites');
          return;
        }

        console.log(`[OverlayManager] Drawing ${worksiteData.length} worksites`);
        await this.mapLayer.drawWorksiteIcons(worksiteData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('worksites')
    });

    // Resources Overlay - REACTIVE (uses claimedHexesWithWorksites store)
    this.registerOverlay({
      id: 'resources',
      name: 'Resources',
      icon: 'fa-gem',
      layerIds: ['resources'],
      store: claimedHexesWithWorksites,  // ✅ Reactive subscription
      render: async (hexes) => {
        const worksiteData = hexes.map((h: any) => ({ 
          id: h.id, 
          worksiteType: h.worksite.type 
        }));

        if (worksiteData.length === 0) {
          console.log('[OverlayManager] No resources - clearing layer');
          this.mapLayer.clearLayer('resources');
          return;
        }

        console.log(`[OverlayManager] Drawing ${worksiteData.length} resource icons`);
        await this.mapLayer.drawResourceIcons(worksiteData);
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
          tier: h.feature?.tier || 'Village'
        }));

        if (settlementData.length === 0) {
          console.log('[OverlayManager] No settlement feature icons - clearing layer');
          this.mapLayer.clearLayer('settlement-icons');
          return;
        }

        console.log(`[OverlayManager] Drawing ${settlementData.length} settlement feature icons`);
        await this.mapLayer.drawSettlementIcons(settlementData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('settlement-icons')
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
          console.log('[OverlayManager] No fortifications - clearing layer');
          this.mapLayer.clearLayer('fortifications');
          return;
        }

        console.log(`[OverlayManager] Drawing ${fortificationData.length} fortifications`);
        await this.mapLayer.drawFortificationIcons(fortificationData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('fortifications')
    });

    console.log('[OverlayManager] ✅ Registered 9 default overlays');
  }
}

/**
 * Convenience function to get overlay manager instance
 */
export function getOverlayManager(): OverlayManager {
  return OverlayManager.getInstance();
}
