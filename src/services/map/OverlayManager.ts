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
  claimedHexesWithWorksites 
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
  private activeOverlays: Set<string> = new Set();
  private subscriptions: Map<string, Unsubscriber> = new Map();  // Store subscriptions
  private mapLayer: ReignMakerMapLayer;
  private readonly STORAGE_KEY = 'reignmaker-overlay-states';
  
  // Reactive store for active overlay IDs - components can subscribe to this
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
    if (this.activeOverlays.has(id)) {
      console.log(`[OverlayManager] 🔄 Overlay ${id} already active, skipping duplicate showOverlay() call`);
      return;
    }

    try {
      // Mark as active FIRST (before subscription fires)
      // This ensures isOverlayActive() returns true when subscription callback fires
      this.activeOverlays.add(id);
      
      // Reactive pattern: Subscribe to store for automatic updates
      if (overlay.store && overlay.render) {
        // Cleanup old subscription if exists
        this.subscriptions.get(id)?.();
        
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
          }
        });
        
        this.subscriptions.set(id, unsubscribe);
      }
      // Legacy pattern: Call show() method
      else if (overlay.show) {
        await overlay.show();
      }
      else {
        console.warn(`[OverlayManager] Overlay ${id} has neither reactive nor legacy show method`);
        // Remove from active since we couldn't show it
        this.activeOverlays.delete(id);
        return;
      }
      
      // Save state after successful activation
      this.saveState();
      
      console.log(`[OverlayManager] ✅ Showed overlay: ${id}`);
    } catch (error) {
      console.error(`[OverlayManager] ❌ Failed to show overlay ${id}:`, error);
      // Don't throw - log error but continue (prevents one failing overlay from breaking everything)
      // Remove from active overlays since it failed
      this.activeOverlays.delete(id);
      this.saveState();
    }
  }

  /**
   * Hide an overlay (with automatic cleanup)
   */
  hideOverlay(id: string): void {
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
      this.activeOverlays.delete(id);
      this.saveState();
      
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
    return this.activeOverlays.has(id);
  }

  /**
   * Get list of active overlay IDs
   */
  getActiveOverlayIds(): string[] {
    return Array.from(this.activeOverlays);
  }

  /**
   * Clear all overlays
   */
  clearAll(): void {
    console.log('[OverlayManager] Clearing all overlays...');
    
    // Hide all active overlays (this will also clean up subscriptions)
    this.activeOverlays.forEach(id => {
      this.hideOverlay(id);
    });
    
    // Extra safety: Clean up any lingering subscriptions
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions.clear();
    
    // Clear all map layers
    this.mapLayer.clearAllLayers();
    
    // Clear active state
    this.activeOverlays.clear();
    this.saveState();
    
    console.log('[OverlayManager] ✅ All overlays cleared');
  }

  /**
   * Save overlay states to localStorage and update reactive store
   */
  saveState(): void {
    const state = {
      activeOverlays: Array.from(this.activeOverlays)
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    
    // Update reactive store so subscribers (like toolbar) get notified
    this.activeOverlaysStore.set(new Set(this.activeOverlays));
    
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

    // Settlements Overlay - REACTIVE (uses claimedSettlements store)
    this.registerOverlay({
      id: 'settlements',
      name: 'Settlements',
      icon: 'fa-city',
      layerIds: ['settlements-overlay'],
      store: claimedSettlements,  // ✅ Reactive subscription
      render: (settlements) => {
        const settlementHexIds = settlements
          .filter((s: any) => s.kingmakerLocation && s.kingmakerLocation.x > 0 && s.kingmakerLocation.y > 0)
          .map((s: any) => `${s.kingmakerLocation.x}.${s.kingmakerLocation.y}`);

        if (settlementHexIds.length === 0) {
          console.log('[OverlayManager] No settlements - clearing layer');
          this.mapLayer.clearLayer('settlements-overlay');
          return;
        }

        console.log(`[OverlayManager] Drawing ${settlementHexIds.length} settlements`);
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

    // Settlement Icons Overlay - REACTIVE (uses claimedSettlements store)
    this.registerOverlay({
      id: 'settlement-icons',
      name: 'Settlement Icons',
      icon: 'fa-castle',
      layerIds: ['settlement-icons'],
      store: claimedSettlements,  // ✅ Reactive subscription
      render: async (settlements) => {
        const settlementData = settlements
          .filter((s: any) => s.kingmakerLocation && s.kingmakerLocation.x > 0 && s.kingmakerLocation.y > 0)
          .map((s: any) => ({
            id: `${s.kingmakerLocation.x}.${s.kingmakerLocation.y}`,
            tier: s.tier || 'Village'
          }));

        if (settlementData.length === 0) {
          console.log('[OverlayManager] No settlement icons - clearing layer');
          this.mapLayer.clearLayer('settlement-icons');
          return;
        }

        console.log(`[OverlayManager] Drawing ${settlementData.length} settlement icons`);
        await this.mapLayer.drawSettlementIcons(settlementData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('settlement-icons')
    });

    console.log('[OverlayManager] ✅ Registered 8 default overlays');
  }
}

/**
 * Convenience function to get overlay manager instance
 */
export function getOverlayManager(): OverlayManager {
  return OverlayManager.getInstance();
}
