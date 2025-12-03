/**
 * Territories Overlay - Shows faction-controlled territories with colored fills
 * 
 * Features:
 * - Groups hexes by faction (including 'unclaimed' for unowned hexes)
 * - Draws all visible factions in a single batch pass (fixes multi-faction bug)
 * - Supports per-faction visibility filtering via hiddenFactions store
 * - Correctly handles donut shapes and complex territory geometries
 */

import { derived } from 'svelte/store';
import { kingdomData, allHexesByFaction, hiddenFactions } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';
import type { HexStyle } from '../types';

export function createTerritoriesOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'territories',
    name: 'Territory',
    icon: 'fa-flag',
    layerIds: ['kingdom-territory'],
    // Subscribe to hex groupings, visibility filter, and kingdom data
    store: derived(
      [allHexesByFaction, hiddenFactions, kingdomData], 
      ([$grouped, $hidden, $data]) => ({ 
        grouped: $grouped, 
        hidden: $hidden,
        kingdom: $data 
      })
    ),
    render: ({ grouped, hidden, kingdom }) => {
      // Clear layer ONCE at the start
      mapLayer.clearLayer('kingdom-territory');
      
      if (grouped.size === 0) {
        return;
      }

      // Collect all hex data to draw in a single batch
      const allHexData: Array<{ hexId: string; style: HexStyle }> = [];

      // Process each faction's territory
      grouped.forEach((hexes: any[], factionId: string) => {
        // Skip unclaimed hexes (they remain empty)
        if (factionId === 'unclaimed') return;
        
        // Skip empty groups
        if (hexes.length === 0) return;
        
        // Skip hidden factions
        if (hidden.has(factionId)) return;
        
        // Determine color for this faction
        let color = '#5b9bd5'; // Default blue
        
        if (factionId === PLAYER_KINGDOM) {
          // Use player kingdom color
          color = kingdom.playerKingdomColor || '#5b9bd5';
        } else {
          // Find faction in kingdom.factions and use its color
          const faction = kingdom.factions?.find((f: any) => f.id === factionId);
          color = faction?.color || '#666666'; // Gray fallback
        }
        
        // Convert hex color string to number (remove # and parse as base 16)
        const colorNumber = parseInt(color.substring(1), 16);
        
        // Create style with faction color
        const style: HexStyle = {
          fillColor: colorNumber,
          fillAlpha: 0.25,
          borderColor: colorNumber,
          borderAlpha: 0.8,
          borderWidth: 3
        };

        // Add all hexes for this faction to the batch
        hexes.forEach((h: any) => {
          allHexData.push({ hexId: h.id, style });
        });
      });

      // Draw all hexes in a single batch operation
      if (allHexData.length > 0) {
        mapLayer.drawHexesBatch(allHexData, 'kingdom-territory');
      }
    },
    hide: () => {
      // Cleanup handled by OverlayManager
    },
    isActive: () => isOverlayActive('territories')
  };
}
