/**
 * Canvas Layer Interactivity Utility
 * 
 * Provides utilities for disabling/restoring canvas layer interactivity
 * during map interactions, editor mode, or other scenarios where
 * token/tile/drawing selection should be prevented.
 */

import { logger } from './Logger';

/**
 * Layers that can have their interactivity disabled
 */
const INTERACTIVE_LAYERS = [
  'tokens',
  'tiles', 
  'drawings',
  'walls',
  'lighting',
  'sounds',
  'notes',
  'templates'
] as const;

/**
 * Disable interactivity on canvas layers
 * Returns a Map of saved states for restoration
 */
export function disableCanvasLayerInteractivity(): Map<string, boolean> {
  const canvas = (globalThis as any).canvas;
  if (!canvas) {
    logger.warn('[CanvasInteractivity] Canvas not available');
    return new Map();
  }
  
  const savedStates = new Map<string, boolean>();
  
  for (const layerName of INTERACTIVE_LAYERS) {
    const layer = canvas[layerName];
    if (layer && 'interactiveChildren' in layer) {
      // Save current state
      savedStates.set(layerName, layer.interactiveChildren);
      
      // Disable interactivity
      layer.interactiveChildren = false;
      
      logger.debug(`[CanvasInteractivity] Disabled interactivity for ${layerName} layer`);
    }
  }
  
  logger.info('[CanvasInteractivity] ✅ Disabled canvas layer interactivity');
  return savedStates;
}

/**
 * Restore interactivity on canvas layers from saved states
 */
export function restoreCanvasLayerInteractivity(savedStates: Map<string, boolean>): void {
  const canvas = (globalThis as any).canvas;
  if (!canvas) {
    logger.warn('[CanvasInteractivity] Canvas not available for restoration');
    return;
  }
  
  for (const [layerName, wasInteractive] of savedStates) {
    const layer = canvas[layerName];
    if (layer && 'interactiveChildren' in layer) {
      layer.interactiveChildren = wasInteractive;
      logger.debug(`[CanvasInteractivity] Restored interactivity for ${layerName} layer to ${wasInteractive}`);
    }
  }
  
  logger.info('[CanvasInteractivity] ✅ Restored canvas layer interactivity');
}
