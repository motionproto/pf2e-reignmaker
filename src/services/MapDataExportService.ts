/**
 * MapDataExportService - Export map data for static storage
 *
 * Exports roads, water features, crossings, and terrain from the current
 * kingdom state to a JSON format that can be bundled with the module.
 *
 * This allows pre-configured map data (like the Stolen Lands) to be
 * loaded when importing a scene, rather than requiring manual setup.
 */

import { get } from 'svelte/store';
import { kingdomData } from '../stores/KingdomStore';
import { logger } from '../utils/Logger';

/**
 * Exported map data structure
 * This is the format stored in data/piazolands/stolen-lands-map.json
 */
export interface ExportedMapData {
  version: string;
  exportDate: string;
  mapName: string;

  // Terrain data - hex ID to terrain type mapping
  terrain: Array<{
    id: string;      // Hex ID (e.g., "5.10")
    terrain: string; // Terrain type (e.g., "forest", "plains")
    travel?: string; // Travel difficulty (e.g., "open", "difficult")
  }>;

  // Roads - hex IDs that have roads
  roads: string[];

  // Rivers - cell-based river paths (editable polylines)
  rivers: {
    cellPaths?: Array<{
      id: string;
      cells: Array<{ x: number; y: number; order: number }>;
      navigable?: boolean;
    }>;
    rasterizedCells?: Array<{ x: number; y: number }>;
    crossings?: Array<{
      id: string;
      hexI?: number;
      hexJ?: number;
      pathId?: string;
      segmentIndex?: number;
      position?: number;
      type: 'bridge' | 'ford';
      edge?: string;
    }>;
    waterfalls?: Array<{
      id: string;
      pathId?: string;
      segmentIndex?: number;
      position?: number;
    }>;
    // Legacy paths for backward compatibility
    paths?: Array<{
      id: string;
      points: Array<{
        hexI: number;
        hexJ: number;
        isCenter?: boolean;
        edge?: string;
        cornerIndex?: number;
        order: number;
      }>;
      navigable?: boolean;
    }>;
  };

  // Water features - lakes and passages
  waterFeatures: {
    lakeCells?: Array<{ x: number; y: number }>;
    passageCells?: Array<{ x: number; y: number }>;
    lakes?: Array<{ id: string; hexI: number; hexJ: number }>;
    swamps?: Array<{ id: string; hexI: number; hexJ: number }>;
  };

  // Settlements - named locations on the map
  settlements: Array<{
    hexId: string;       // Hex ID (e.g., "5.10")
    name: string;        // Settlement name
    tier: string;        // Settlement tier (Village, Town, City, Metropolis)
  }>;
}

/**
 * Export current map data to JSON format
 */
export function exportMapData(mapName: string = 'Stolen Lands'): ExportedMapData {
  const state = get(kingdomData);

  // Extract terrain data
  const terrain = (state.hexes || []).map((hex: any) => ({
    id: hex.id,
    terrain: hex.terrain,
    travel: hex.travel
  }));

  // Extract roads (hex IDs with hasRoad flag)
  const roads = (state.hexes || [])
    .filter((hex: any) => hex.hasRoad === true)
    .map((hex: any) => hex.id);

  // Extract rivers data
  const rivers: ExportedMapData['rivers'] = {};
  if (state.rivers) {
    if (state.rivers.cellPaths) {
      rivers.cellPaths = state.rivers.cellPaths;
    }
    if (state.rivers.rasterizedCells) {
      rivers.rasterizedCells = state.rivers.rasterizedCells;
    }
    if (state.rivers.crossings) {
      rivers.crossings = state.rivers.crossings;
    }
    if (state.rivers.waterfalls) {
      rivers.waterfalls = state.rivers.waterfalls;
    }
    if (state.rivers.paths) {
      rivers.paths = state.rivers.paths;
    }
  }

  // Extract water features
  const waterFeatures: ExportedMapData['waterFeatures'] = {};
  if (state.waterFeatures) {
    if (state.waterFeatures.lakeCells) {
      waterFeatures.lakeCells = state.waterFeatures.lakeCells;
    }
    if (state.waterFeatures.passageCells) {
      waterFeatures.passageCells = state.waterFeatures.passageCells;
    }
    if (state.waterFeatures.lakes) {
      waterFeatures.lakes = state.waterFeatures.lakes;
    }
    if (state.waterFeatures.swamps) {
      waterFeatures.swamps = state.waterFeatures.swamps;
    }
  }

  // Extract settlements (only those with valid map locations)
  const settlements = (state.settlements || [])
    .filter((s: any) => s.location && (s.location.x !== 0 || s.location.y !== 0))
    .map((s: any) => ({
      hexId: `${s.location.x}.${s.location.y}`,
      name: s.name,
      tier: s.tier
    }));

  const exportData: ExportedMapData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    mapName,
    terrain,
    roads,
    rivers,
    waterFeatures,
    settlements
  };

  logger.info(`[MapDataExport] Exported map data: ${terrain.length} hexes, ${roads.length} roads, ${settlements.length} settlements`);

  return exportData;
}

/**
 * Download map data as a JSON file
 * Uses native save dialog if available, falls back to download link
 */
export async function downloadMapData(mapName: string = 'Stolen Lands'): Promise<void> {
  const data = exportMapData(mapName);
  const json = JSON.stringify(data, null, 2);
  const filename = `${mapName.toLowerCase().replace(/\s+/g, '-')}-map.json`;

  // Try to use File System Access API for native save dialog
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      logger.info(`[MapDataExport] Saved map data via save dialog`);

      if ((globalThis as any).ui?.notifications) {
        (globalThis as any).ui.notifications.info(`Map data saved to ${filename}`);
      }
      return;
    } catch (err: any) {
      // User cancelled the dialog
      if (err.name === 'AbortError') {
        logger.info('[MapDataExport] Save dialog cancelled');
        return;
      }
      // Fall through to fallback method
      logger.warn('[MapDataExport] Save dialog failed, using fallback:', err);
    }
  }

  // Fallback: Create blob and trigger download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  logger.info(`[MapDataExport] Downloaded map data as ${filename}`);

  if ((globalThis as any).ui?.notifications) {
    (globalThis as any).ui.notifications.info(`Map data downloaded as ${filename}`);
  }
}

/**
 * Copy map data JSON to clipboard (for easy pasting into file)
 */
export async function copyMapDataToClipboard(mapName: string = 'Stolen Lands'): Promise<void> {
  const data = exportMapData(mapName);
  const json = JSON.stringify(data, null, 2);

  try {
    await navigator.clipboard.writeText(json);
    logger.info('[MapDataExport] Map data copied to clipboard');

    // Show notification if Foundry UI is available
    if ((globalThis as any).ui?.notifications) {
      (globalThis as any).ui.notifications.info('Map data copied to clipboard');
    }
  } catch (error) {
    logger.error('[MapDataExport] Failed to copy to clipboard:', error);
    throw error;
  }
}
