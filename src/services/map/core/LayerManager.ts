/**
 * LayerManager - Handles PIXI layer lifecycle management
 * 
 * Responsibilities:
 * - Layer creation and singleton pattern
 * - Layer visibility management (show/hide)
 * - Layer cleanup and disposal
 * - Z-index ordering
 * - Layer state tracking
 * 
 * This class extracts layer lifecycle concerns from ReignMakerMapLayer,
 * allowing ReignMakerMapLayer to focus on rendering orchestration.
 */

import type { LayerId, MapLayer } from '../types';
import { logger } from '../../../utils/Logger';

export class LayerManager {
  private layers: Map<LayerId, MapLayer> = new Map();
  private container: PIXI.Container;

  /**
   * Create a new LayerManager
   * @param container - The parent PIXI container to add layers to
   */
  constructor(container: PIXI.Container) {
    this.container = container;
  }

  /**
   * Create or get a layer by ID (SINGLETON PATTERN)
   * 
   * If a layer with this ID already exists, returns the existing layer.
   * This prevents duplicate layer containers and ensures proper lifecycle management.
   * 
   * @param id - Unique layer identifier
   * @param zIndex - Z-index for rendering order (only used when creating new layer)
   * @returns The layer's PIXI container
   */
  createLayer(id: LayerId, zIndex: number = 0): PIXI.Container {
    // SINGLETON: Return existing layer if it already exists
    if (this.layers.has(id)) {
      const existingLayer = this.layers.get(id)!;

      // Update z-index if different (allows re-ordering)
      if (existingLayer.zIndex !== zIndex && zIndex !== 0) {
        existingLayer.container.zIndex = zIndex;
        existingLayer.zIndex = zIndex;
      }
      
      return existingLayer.container;
    }

    // Create new layer
    const layerContainer = new PIXI.Container();
    layerContainer.name = `Layer_${id}`;
    layerContainer.zIndex = zIndex;
    layerContainer.visible = true; // Explicitly set visible

    const layer: MapLayer = {
      id,
      container: layerContainer,
      visible: true,
      zIndex
    };

    this.layers.set(id, layer);
    this.container.addChild(layerContainer);

    return layerContainer;
  }

  /**
   * Get an existing layer by ID
   * @param id - Layer identifier
   * @returns The layer's PIXI container, or undefined if not found
   */
  getLayer(id: LayerId): PIXI.Container | undefined {
    return this.layers.get(id)?.container;
  }

  /**
   * Remove a layer completely
   * Destroys the layer's PIXI container and removes it from tracking
   * 
   * @param id - Layer identifier
   */
  removeLayer(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      this.container.removeChild(layer.container);
      layer.container.destroy({ children: true });
      this.layers.delete(id);
    }
  }

  /**
   * Clear content from a layer (remove graphics but keep visibility state)
   * Use this when you want to redraw a layer without changing its visibility
   * Creates the layer if it doesn't exist yet
   * 
   * @param id - Layer identifier
   */
  clearLayerContent(id: LayerId): void {
    // Ensure layer exists (create if needed)
    let layer = this.layers.get(id);
    if (!layer) {
      // Create empty layer with default z-index
      const zIndex = this.getDefaultZIndex(id);
      this.createLayer(id, zIndex);
      return; // Layer is already empty, nothing to clear
    }
    
    const childCount = layer.container.children.length;
    
    // Clear and destroy all children
    layer.container.removeChildren().forEach(child => {
      // If it's a Graphics object, clear it first
      if (child instanceof PIXI.Graphics) {
        child.clear();
      }
      child.destroy({ children: true, texture: false, baseTexture: false });
    });
    
    if (childCount > 0) {
      // Logging removed - let caller log if needed
    }
  }

  /**
   * Clear all content from a layer AND hide it
   * Use this when you want to completely remove a layer from view
   * 
   * @param id - Layer identifier
   */
  clearLayer(id: LayerId): void {
    this.clearLayerContent(id);
    this.hideLayer(id);
  }

  /**
   * Show a layer (make it visible)
   * @param id - Layer identifier
   */
  showLayer(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.container.visible = true;
      layer.visible = true;
    }
  }

  /**
   * Hide a layer (make it invisible)
   * @param id - Layer identifier
   */
  hideLayer(id: LayerId): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.container.visible = false;
      layer.visible = false;
    }
  }

  /**
   * Clear all layers and reset state
   * Hides all layers and clears their content
   */
  clearAllLayers(): void {
    this.layers.forEach((layer, id) => {
      // Clear and destroy all children
      layer.container.removeChildren().forEach(child => {
        // If it's a Graphics object, clear it first to remove all drawing commands
        if (child instanceof PIXI.Graphics) {
          child.clear();
        }
        child.destroy({ children: true, texture: false, baseTexture: false });
      });
      
      // Hide the layer
      layer.container.visible = false;
      layer.visible = false;
    });
  }

  /**
   * Validate that a layer is empty (no children)
   * Logs a warning if layer has unexpected content
   * 
   * @param id - Layer ID to validate
   * @returns true if layer is empty or doesn't exist, false if has children
   */
  validateLayerEmpty(id: LayerId): boolean {
    const layer = this.layers.get(id);
    if (!layer) return true;
    
    const childCount = layer.container.children.length;
    if (childCount > 0) {
      logger.warn(
        `[LayerManager] ⚠️ Layer '${id}' has ${childCount} children when expected to be empty!`,
        'Children:', layer.container.children.map(c => c.name || c.constructor.name)
      );
      return false;
    }
    return true;
  }

  /**
   * Get default z-index for a layer based on its type
   * Ensures consistent layer ordering across the application
   * 
   * @param layerId - Layer identifier
   * @returns Default z-index for the layer type
   */
  getDefaultZIndex(layerId: LayerId): number {
    switch (layerId) {
      case 'terrain-overlay':
      case 'terrain-difficulty-overlay':
        return 5; // Terrain/difficulty overlays at very bottom (never shown together)
      case 'provinces-fill':
        return 6; // Province fills above terrain but below territory
      case 'kingdom-territory':
      case 'kingdom-territory-outline':
        return 10; // Territory layers above terrain
      case 'province-borders':
        return 11; // Province borders above territory outline
      case 'settlements-overlay':
        return 30; // Settlements in middle
      case 'routes':
        return 40; // Roads on top
      case 'worksites':
        return 45; // Worksites above roads
      case 'resources':
        return 45; // Resources same level as worksites (never shown together)
      case 'settlement-icons':
        return 50; // Settlement icons above everything
      case 'hex-selection':
      default:
        return 0; // Default z-index
    }
  }

  /**
   * Get all layer IDs currently managed
   * @returns Array of layer identifiers
   */
  getLayerIds(): LayerId[] {
    return Array.from(this.layers.keys());
  }

  /**
   * Get the number of layers currently managed
   * @returns Layer count
   */
  getLayerCount(): number {
    return this.layers.size;
  }

  /**
   * Check if a layer exists
   * @param id - Layer identifier
   * @returns true if layer exists, false otherwise
   */
  hasLayer(id: LayerId): boolean {
    return this.layers.has(id);
  }

  /**
   * Get the visibility state of a layer
   * @param id - Layer identifier
   * @returns true if layer is visible, false otherwise (or if layer doesn't exist)
   */
  isLayerVisible(id: LayerId): boolean {
    return this.layers.get(id)?.visible ?? false;
  }
}
