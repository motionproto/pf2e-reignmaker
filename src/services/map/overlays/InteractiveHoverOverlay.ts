/**
 * Interactive Hover Overlay - Shows hex highlight during mouse hover
 * 
 * This is an internal overlay used during map interactions (hex selection).
 * It doesn't render any data itself - the layer is controlled by mouse event handlers.
 * This overlay just ensures the layer exists and is properly managed by OverlayManager.
 */

import type { MapOverlay } from '../core/OverlayManager';
import type { ReignMakerMapLayer } from '../core/ReignMakerMapLayer';

export function createInteractiveHoverOverlay(
  mapLayer: ReignMakerMapLayer,
  isOverlayActive: (id: string) => boolean
): MapOverlay {
  return {
    id: 'interactive-hover',
    name: 'Interactive Hover (Internal)',
    icon: 'fa-hand-pointer',
    layerIds: ['interactive-hover'],
    
    // No store/render - this layer is controlled by mouse events
    // We just need to ensure the layer exists and is visible
    show: async () => {
      // Create layer if it doesn't exist
      mapLayer.createLayer('interactive-hover', 15);
      // Show the layer
      mapLayer.showLayer('interactive-hover');
    },
    
    hide: () => {
      // Clear and hide the layer
      mapLayer.clearLayer('interactive-hover');
      mapLayer.hideLayer('interactive-hover');
    },
    
    isActive: () => isOverlayActive('interactive-hover')
  };
}
