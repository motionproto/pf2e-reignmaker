/**
 * WorldExplorerService - Integration with World Explorer module
 * 
 * Provides a safe wrapper around the World Explorer module API for revealing hexes.
 * The World Explorer module manages fog-of-war on the map, allowing hexes to be
 * revealed, partially revealed, or hidden.
 * 
 * Usage:
 * ```typescript
 * const service = new WorldExplorerService();
 * if (service.isAvailable()) {
 *   service.revealHexes(['50.18', '51.19']);
 * }
 * ```
 */

export class WorldExplorerService {
  /**
   * Check if World Explorer module is installed, enabled, and active on current scene
   */
  isAvailable(): boolean {
    const canvas = (globalThis as any).canvas;
    return !!(canvas?.worldExplorer?.enabled);
  }

  /**
   * Reveal hexes on the map (removes fog-of-war)
   * 
   * @param hexIds - Array of hex IDs in "i.j" dot notation format (e.g., "50.18")
   * @param partial - Optional: Use partial reveal (semi-transparent) instead of full reveal
   */
  revealHexes(hexIds: string[], partial: boolean = false): void {
    if (!this.isAvailable()) {
      console.warn('[WorldExplorer] Module not available - skipping hex reveal');
      return;
    }

    const canvas = (globalThis as any).canvas;
    const revealState = partial ? 'partial' : true;

    console.log(`[WorldExplorer] Revealing ${hexIds.length} hex(es) with state:`, revealState);

    hexIds.forEach(hexId => {
      try {
        // Parse hex ID from "i.j" format to offset {i, j}
        const [i, j] = hexId.split('.').map(Number);

        if (isNaN(i) || isNaN(j)) {
          console.warn(`[WorldExplorer] Invalid hex ID format: ${hexId}`);
          return;
        }

        // Call World Explorer API
        canvas.worldExplorer.setRevealed({ offset: { i, j } }, revealState);
        console.log(`[WorldExplorer] ✅ Revealed hex: ${hexId}`);
      } catch (error) {
        console.error(`[WorldExplorer] Failed to reveal hex ${hexId}:`, error);
      }
    });
  }

  /**
   * Hide hexes on the map (adds fog-of-war)
   * 
   * @param hexIds - Array of hex IDs in "i.j" dot notation format
   */
  hideHexes(hexIds: string[]): void {
    if (!this.isAvailable()) {
      console.warn('[WorldExplorer] Module not available - skipping hex hide');
      return;
    }

    const canvas = (globalThis as any).canvas;

    console.log(`[WorldExplorer] Hiding ${hexIds.length} hex(es)`);

    hexIds.forEach(hexId => {
      try {
        const [i, j] = hexId.split('.').map(Number);

        if (isNaN(i) || isNaN(j)) {
          console.warn(`[WorldExplorer] Invalid hex ID format: ${hexId}`);
          return;
        }

        canvas.worldExplorer.setRevealed({ offset: { i, j } }, false);
        console.log(`[WorldExplorer] ✅ Hidden hex: ${hexId}`);
      } catch (error) {
        console.error(`[WorldExplorer] Failed to hide hex ${hexId}:`, error);
      }
    });
  }

  /**
   * Check if a hex is currently revealed
   * 
   * @param hexId - Hex ID in "i.j" dot notation format
   * @returns true if revealed, false if hidden, null if module unavailable
   */
  isRevealed(hexId: string): boolean | null {
    if (!this.isAvailable()) {
      return null;
    }

    const canvas = (globalThis as any).canvas;

    try {
      const [i, j] = hexId.split('.').map(Number);
      return canvas.worldExplorer.isRevealed({ offset: { i, j } });
    } catch (error) {
      console.error(`[WorldExplorer] Failed to check hex ${hexId}:`, error);
      return null;
    }
  }

  /**
   * Check if a hex is partially revealed
   * 
   * @param hexId - Hex ID in "i.j" dot notation format
   * @returns true if partial, false otherwise, null if module unavailable
   */
  isPartial(hexId: string): boolean | null {
    if (!this.isAvailable()) {
      return null;
    }

    const canvas = (globalThis as any).canvas;

    try {
      const [i, j] = hexId.split('.').map(Number);
      return canvas.worldExplorer.isPartial({ offset: { i, j } });
    } catch (error) {
      console.error(`[WorldExplorer] Failed to check hex ${hexId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const worldExplorerService = new WorldExplorerService();
