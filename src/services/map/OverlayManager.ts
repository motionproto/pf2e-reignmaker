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
import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { territoryService } from '../territory';
import { MAP_HEX_STYLES } from '../../view/kingdom/utils/presentation';

/**
 * Overlay definition interface
 * Each overlay type implements this interface
 */
export interface MapOverlay {
  id: string;
  name: string;
  icon: string;
  layerIds: LayerId[]; // Which layers this overlay manages
  show: () => Promise<void>;
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
  private mapLayer: ReignMakerMapLayer;
  private readonly STORAGE_KEY = 'reignmaker-overlay-states';

  private constructor() {
    this.mapLayer = ReignMakerMapLayer.getInstance();
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
   */
  async showOverlay(id: string): Promise<void> {
    const overlay = this.overlays.get(id);
    if (!overlay) {
      console.warn(`[OverlayManager] Overlay not found: ${id}`);
      return;
    }

    try {
      // PHASE 1 FIX: Don't clear here - let draw methods handle it
      // Draw methods now validate, clear, draw, and show in one consistent operation
      
      // Show the overlay (draw methods handle clearing)
      await overlay.show();
      
      // Mark as active
      this.activeOverlays.add(id);
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
    
    // Hide all active overlays
    this.activeOverlays.forEach(id => {
      this.hideOverlay(id);
    });
    
    // Clear all map layers
    this.mapLayer.clearAllLayers();
    
    // Clear active state
    this.activeOverlays.clear();
    this.saveState();
    
    console.log('[OverlayManager] ✅ All overlays cleared');
  }

  /**
   * Save overlay states to localStorage
   */
  saveState(): void {
    const state = {
      activeOverlays: Array.from(this.activeOverlays)
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
    // Terrain Overlay
    this.registerOverlay({
      id: 'terrain',
      name: 'Terrain',
      icon: 'fa-mountain',
      layerIds: ['terrain-overlay'],
      show: async () => {
        const kingdom = get(kingdomData);
        if (!kingdom?.hexes) {
          ui?.notifications?.warn('No kingdom data available');
          throw new Error('No kingdom data');
        }

        const hexData = kingdom.hexes
          .filter((h: any) => h.terrain)
          .map((h: any) => ({ id: h.id, terrain: h.terrain }));

        if (hexData.length === 0) {
          ui?.notifications?.warn('No hexes with terrain data found');
          throw new Error('No terrain data');
        }

        console.log('[OverlayManager] Drawing terrain overlay for', hexData.length, 'hexes');
        this.mapLayer.drawTerrainOverlay(hexData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('terrain')
    });

    // Territory Overlay
    this.registerOverlay({
      id: 'territories',
      name: 'Territory',
      icon: 'fa-flag',
      layerIds: ['kingdom-territory'],
      show: async () => {
        const kingdom = get(kingdomData);
        if (!kingdom?.hexes) {
          ui?.notifications?.warn('No kingdom data available');
          throw new Error('No kingdom data');
        }

        const hexIds = kingdom.hexes
          .filter((h: any) => h.claimedBy === 1)
          .map((h: any) => h.id);

        if (hexIds.length === 0) {
          ui?.notifications?.warn('No claimed territory to display');
          throw new Error('No claimed territory');
        }

        const style: HexStyle = MAP_HEX_STYLES.partyTerritory;

        // PHASE 1 FIX: Draw method now handles showing (no manual showLayer needed)
        this.mapLayer.drawHexes(hexIds, style, 'kingdom-territory');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('territories')
    });

    // Territory Border Overlay
    this.registerOverlay({
      id: 'territory-border',
      name: 'Border',
      icon: 'fa-vector-square',
      layerIds: ['kingdom-territory-outline'],
      show: async () => {
        const kingdom = get(kingdomData);
        if (!kingdom?.hexes) {
          ui?.notifications?.warn('No kingdom data available');
          throw new Error('No kingdom data');
        }

        const hexIds = kingdom.hexes
          .filter((h: any) => h.claimedBy === 1)
          .map((h: any) => h.id);

        if (hexIds.length === 0) {
          ui?.notifications?.warn('No claimed territory to display border for');
          throw new Error('No claimed territory');
        }

        this.mapLayer.drawTerritoryOutline(hexIds);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('territory-border')
    });

    // Settlements Overlay
    this.registerOverlay({
      id: 'settlements',
      name: 'Settlements',
      icon: 'fa-city',
      layerIds: ['settlements-overlay'],
      show: async () => {
        const kingdom = get(kingdomData);
        if (!kingdom?.settlements || kingdom.settlements.length === 0) {
          ui?.notifications?.warn('No settlements to display');
          throw new Error('No settlements');
        }

        const settlementHexIds = kingdom.settlements
          .filter((s: any) => s.kingmakerLocation && s.kingmakerLocation.x > 0 && s.kingmakerLocation.y > 0)
          .map((s: any) => `${s.kingmakerLocation.x}.${s.kingmakerLocation.y}`);

        if (settlementHexIds.length === 0) {
          ui?.notifications?.warn('No settlements found on map');
          throw new Error('No settlements on map');
        }

        console.log('[OverlayManager] Highlighting settlements:', settlementHexIds);

        const style: HexStyle = MAP_HEX_STYLES.settlement;

        // PHASE 1 FIX: Draw method now handles showing (no manual showLayer needed)
        this.mapLayer.drawHexes(settlementHexIds, style, 'settlements-overlay');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('settlements')
    });

    // Roads Overlay
    this.registerOverlay({
      id: 'roads',
      name: 'Roads',
      icon: 'fa-road',
      layerIds: ['routes'],
      show: async () => {
        const roadHexIds = territoryService.getRoads();

        if (roadHexIds.length === 0) {
          ui?.notifications?.warn('No roads to display');
          throw new Error('No roads');
        }

        console.log('[OverlayManager] Displaying roads:', roadHexIds);

        // PHASE 1 FIX: Draw method now handles showing (no manual showLayer needed)
        this.mapLayer.drawRoadConnections(roadHexIds, 'routes');
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('roads')
    });

    // Worksites Overlay
    this.registerOverlay({
      id: 'worksites',
      name: 'Worksites',
      icon: 'fa-industry',
      layerIds: ['worksites'],
      show: async () => {
        const kingdom = get(kingdomData);
        if (!kingdom?.hexes) {
          ui?.notifications?.warn('No kingdom data available');
          throw new Error('No kingdom data');
        }

        const worksiteData = kingdom.hexes
          .filter((h: any) => h.worksite?.type)
          .map((h: any) => ({ id: h.id, worksiteType: h.worksite.type }));

        if (worksiteData.length === 0) {
          ui?.notifications?.warn('No worksites to display');
          throw new Error('No worksites');
        }

        console.log('[OverlayManager] Displaying worksites:', worksiteData);

        await this.mapLayer.drawWorksiteIcons(worksiteData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('worksites')
    });

    // Resources Overlay (commodity production icons)
    this.registerOverlay({
      id: 'resources',
      name: 'Resources',
      icon: 'fa-gem',
      layerIds: ['resources'],
      show: async () => {
        const kingdom = get(kingdomData);
        if (!kingdom?.hexes) {
          ui?.notifications?.warn('No kingdom data available');
          throw new Error('No kingdom data');
        }

        // Use worksite positions but display resource icons
        const worksiteData = kingdom.hexes
          .filter((h: any) => h.worksite?.type)
          .map((h: any) => ({ id: h.id, worksiteType: h.worksite.type }));

        if (worksiteData.length === 0) {
          ui?.notifications?.warn('No worksites to display resources for');
          throw new Error('No worksites');
        }

        console.log('[OverlayManager] Displaying resources:', worksiteData);

        await this.mapLayer.drawResourceIcons(worksiteData);
      },
      hide: () => {
        // Cleanup handled by OverlayManager
      },
      isActive: () => this.isOverlayActive('resources')
    });

    // Settlement Icons Overlay (tier-based settlement icons)
    this.registerOverlay({
      id: 'settlement-icons',
      name: 'Settlement Icons',
      icon: 'fa-castle',
      layerIds: ['settlement-icons'],
      show: async () => {
        const kingdom = get(kingdomData);
        if (!kingdom?.settlements || kingdom.settlements.length === 0) {
          ui?.notifications?.warn('No settlements to display');
          throw new Error('No settlements');
        }

        // Map settlements to their hex IDs and tiers
        const settlementData = kingdom.settlements
          .filter((s: any) => s.kingmakerLocation && s.kingmakerLocation.x > 0 && s.kingmakerLocation.y > 0)
          .map((s: any) => ({
            id: `${s.kingmakerLocation.x}.${s.kingmakerLocation.y}`,
            tier: s.tier || 'Village'  // Default to Village if not specified
          }));

        if (settlementData.length === 0) {
          ui?.notifications?.warn('No settlements found on map');
          throw new Error('No settlements on map');
        }

        console.log('[OverlayManager] Displaying settlement icons:', settlementData);

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
