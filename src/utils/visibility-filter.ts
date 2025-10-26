/**
 * World Explorer Visibility Filter
 * 
 * Filters hex data based on World Explorer's fog-of-war visibility.
 * Uses World Explorer's revealed array for efficient Set-based lookup.
 */

/**
 * Filter hexes based on World Explorer visibility
 * 
 * @param hexes - Array of objects with 'id' property (hex IDs in "i.j" format)
 * @returns Filtered array containing only visible hexes
 * 
 * Visibility Rules:
 * - World Explorer disabled: All hexes visible
 * - GM user: All hexes visible
 * - Player user: Only revealed hexes visible
 */
export function filterVisibleHexes<T extends { id: string }>(hexes: T[]): T[] {
  const canvas = (globalThis as any).canvas;
  
  // World Explorer not available or not enabled - show all hexes
  if (!canvas?.worldExplorer?.enabled) {
    return hexes;
  }
  
  // GMs see all hexes regardless of fog-of-war
  const game = (globalThis as any).game;
  if (game?.user?.isGM) {
    return hexes;
  }
  
  // Get revealed hexes from World Explorer
  const revealed = canvas.worldExplorer.gridDataMap?.revealed;
  if (!revealed || revealed.length === 0) {
    return []; // Nothing revealed - hide all overlays
  }
  
  // Convert revealed array to Set of hex IDs for O(1) lookup
  // World Explorer stores as {offset: {i, j}}, we need "i.j" format
  const revealedIds = new Set(
    revealed.map((entry: any) => `${entry.offset.i}.${entry.offset.j}`)
  );
  
  // Filter hexes against revealed set
  return hexes.filter(hex => revealedIds.has(hex.id));
}

/**
 * Filter array of hex IDs based on World Explorer visibility
 * Convenience function for arrays of strings instead of objects
 * 
 * @param hexIds - Array of hex ID strings in "i.j" format
 * @returns Filtered array containing only visible hex IDs
 */
export function filterVisibleHexIds(hexIds: string[]): string[] {
  const canvas = (globalThis as any).canvas;
  
  // World Explorer not available or not enabled - show all
  if (!canvas?.worldExplorer?.enabled) {
    return hexIds;
  }
  
  // GMs see all
  const game = (globalThis as any).game;
  if (game?.user?.isGM) {
    return hexIds;
  }
  
  // Get revealed hexes
  const revealed = canvas.worldExplorer.gridDataMap?.revealed;
  if (!revealed || revealed.length === 0) {
    return []; // Nothing revealed
  }
  
  // Convert to Set
  const revealedIds = new Set(
    revealed.map((entry: any) => `${entry.offset.i}.${entry.offset.j}`)
  );
  
  // Filter
  return hexIds.filter(id => revealedIds.has(id));
}
