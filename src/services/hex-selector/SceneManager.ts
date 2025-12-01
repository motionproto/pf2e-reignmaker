/**
 * SceneManager - Handles scene switching, app minimization, and overlay management
 * for hex selection operations
 */

import { getOverlayManager } from '../map/core/OverlayManager';
import { ReignMakerMapLayer } from '../map/core/ReignMakerMapLayer';
import { appWindowManager } from '../ui/AppWindowManager';
import { logger } from '../../utils/Logger';

export class SceneManager {
  private overlayManager = getOverlayManager();
  private mapLayer: ReignMakerMapLayer;

  constructor(mapLayer: ReignMakerMapLayer) {
    this.mapLayer = mapLayer;
  }

  /**
   * Switch to the kingdom map scene
   */
  async switchToKingdomScene(): Promise<void> {
    console.log('[HexSelector] 🎬 Starting scene switch...');
    
    try {
      const game = (globalThis as any).game;
      
      // Try to find kingdom scene in order of priority:
      // 1. Configured setting (if set)
      // 2. Auto-detect by name (Stolen Lands, Kingdom Map, etc.)
      // 3. Stay on current scene
      
      let sceneId = game.settings?.get('pf2e-reignmaker', 'kingdomSceneId');
      console.log('[HexSelector] 📍 Kingdom scene ID from settings:', sceneId || '(not configured)');

      // If no setting, try to auto-detect kingdom scene
      if (!sceneId) {
        console.log('[HexSelector] 🔍 Auto-detecting kingdom scene...');
        
        // Common kingdom map names
        const kingdomSceneNames = [
          'Stolen Lands',
          'stolen lands',
          'Kingdom Map',
          'kingdom map',
          'Kingdom',
          'Kingmaker'
        ];
        
        // Search for scene by name
        const detectedScene = game.scenes?.find((s: any) => 
          kingdomSceneNames.some(name => s.name?.toLowerCase().includes(name.toLowerCase()))
        );
        
        if (detectedScene) {
          sceneId = detectedScene.id;
          console.log('[HexSelector] ✅ Auto-detected kingdom scene:', `"${detectedScene.name}" (${sceneId})`);
          
          // Save for next time
          await game.settings?.set('pf2e-reignmaker', 'kingdomSceneId', sceneId);
          console.log('[HexSelector] 💾 Saved kingdom scene ID to settings');
        } else {
          console.warn('[HexSelector] ⚠️  Could not auto-detect kingdom scene, staying on current scene');
          logger.warn('[HexSelector] ⚠️  Could not auto-detect kingdom scene - looking for scenes named "Stolen Lands" or "Kingdom Map"');
          return;
        }
      }
      
      const scene = game.scenes?.get(sceneId);
      console.log('[HexSelector] 🗺️  Found scene object:', scene ? `"${scene.name}" (${sceneId})` : 'NOT FOUND');

      if (!scene) {
        console.warn('[HexSelector] ⚠️  Kingdom scene not found:', sceneId);
        logger.warn('[HexSelector] ⚠️  Kingdom scene not found:', sceneId);
        return;
      }
      
      // Only switch if not already viewing this scene
      const currentSceneId = game.scenes?.active?.id;
      const currentSceneName = game.scenes?.active?.name;
      console.log('[HexSelector] 👁️  Current scene:', currentSceneName, `(${currentSceneId})`);

      if (currentSceneId !== sceneId) {
        console.log('[HexSelector] 🔄 Switching to kingdom scene...');
        await scene.view();
        console.log('[HexSelector] ✅ Scene switched successfully');

        // Give the scene time to render
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.log('[HexSelector] ✅ Already on kingdom scene, no switch needed');
      }
    } catch (error) {
      console.error('[HexSelector] ❌ Failed to switch scene:', error);
      logger.warn('[HexSelector] ❌ Failed to switch scene:', error);
    }
  }

  /**
   * Minimize the Reignmaker Application window
   */
  minimizeReignmakerApp(): void {
    appWindowManager.enterMapMode('hide');
  }

  /**
   * Restore the Reignmaker Application window
   */
  restoreReignmakerApp(): void {
    appWindowManager.exitMapMode();
  }

  /**
   * Show relevant overlays based on action type
   * Uses temporary overlay state to preserve player preferences
   */
  async showRelevantOverlays(colorType: string): Promise<void> {
    // Clear any existing selection/hover layers
    this.mapLayer.clearSelection();
    this.mapLayer.hideInteractiveHover();
    
    // Determine which overlays to show for this action type
    let actionViewOverlays: string[] = [];
    
    switch (colorType) {
      case 'claim':
      case 'scout':
        // Show territory for claiming/scouting + interactive hover
        actionViewOverlays = ['territories', 'territory-border', 'interactive-hover'];
        break;
        
      case 'road':
        // Show territory, existing roads, AND settlements for road building
        // (settlements count as roads for adjacency) + interactive hover
        actionViewOverlays = ['territories', 'territory-border', 'roads', 'settlement-icons', 'settlement-labels', 'interactive-hover'];
        break;
        
      case 'settlement':
        // Show territory, existing settlements, and settlement icons/labels + interactive hover
        actionViewOverlays = ['territories', 'territory-border', 'settlements', 'settlement-icons', 'settlement-labels', 'interactive-hover'];
        break;
        
      case 'fortify':
        // Show territory, roads, settlements, and existing fortifications + interactive hover
        actionViewOverlays = ['territories', 'territory-border', 'roads', 'settlement-icons', 'settlement-labels', 'fortifications', 'interactive-hover'];
        break;
        
      case 'worksite':
        // Show territory border, existing worksites, and settlement icons (settlements block worksites) + interactive hover
        actionViewOverlays = ['territories', 'territory-border', 'worksites', 'settlement-icons', 'settlement-labels', 'interactive-hover'];
        break;
        
      case 'destroyed':
        // Show worksites being destroyed (same overlays as worksite creation but in display mode)
        actionViewOverlays = ['territories', 'territory-border', 'worksites', 'settlement-icons', 'settlement-labels', 'interactive-hover'];
        break;
    }

    // ✅ CRITICAL: Ensure interactive-hover is ALWAYS enabled for map selection
    // This is required for the hex selector to visualize hover states
    if (!actionViewOverlays.includes('interactive-hover')) {
      actionViewOverlays.push('interactive-hover');
    }
    
    // Apply temporary overlay configuration (saves current state automatically)
    // The interactive-hover overlay is now managed by OverlayManager, so it will be
    // automatically shown/hidden along with other overlays
    await this.overlayManager.setTemporaryOverlays(actionViewOverlays);
    logger.info(`[HexSelector] 📌 Applied action view overlays for '${colorType}':`, actionViewOverlays);
  }

  /**
   * Restore player's overlay preferences
   */
  async restoreOverlays(): Promise<void> {
    await this.overlayManager.popOverlayState();
    logger.info('[HexSelector] � Restored player overlay preferences');
  }
}
