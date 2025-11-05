/**
 * SaveLoadService - Handle export and import of kingdom data
 * Provides JSON serialization and file download/upload capabilities
 */

import type { KingdomData } from '../actors/KingdomActor';
import { logger } from '../utils/Logger';

export interface SaveMetadata {
  version: string;
  exportDate: string;
  kingdomName: string;
  currentTurn: number;
  moduleVersion: string;
}

export interface SaveFile {
  metadata: SaveMetadata;
  kingdomData: KingdomData;
}

const MODULE_VERSION = '1.0.0'; // Update this when save format changes
const SAVE_VERSION = '1.0.0';

export class SaveLoadService {
  /**
   * Export kingdom data to a JSON file
   */
  static async exportKingdom(kingdomData: KingdomData): Promise<void> {
    try {
      const metadata: SaveMetadata = {
        version: SAVE_VERSION,
        exportDate: new Date().toISOString(),
        kingdomName: kingdomData.name || 'Unknown Kingdom',
        currentTurn: kingdomData.currentTurn,
        moduleVersion: MODULE_VERSION
      };

      const saveFile: SaveFile = {
        metadata,
        kingdomData
      };

      const jsonString = JSON.stringify(saveFile, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Generate filename with date and kingdom name
      const sanitizedName = (kingdomData.name || 'kingdom')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `kingdom-${sanitizedName}-${dateStr}.json`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      // Cleanup
      URL.revokeObjectURL(url);

      logger.info('[SaveLoadService] Kingdom data exported successfully:', filename);
      ui.notifications?.info(`Kingdom data exported: ${filename}`);
    } catch (error) {
      logger.error('[SaveLoadService] Failed to export kingdom:', error);
      ui.notifications?.error('Failed to export kingdom data. Check console for details.');
      throw error;
    }
  }

  /**
   * Import kingdom data from a JSON file
   */
  static async importKingdom(file: File): Promise<KingdomData> {
    try {
      const text = await file.text();
      const saveFile: SaveFile = JSON.parse(text);

      // Validate save file structure
      if (!saveFile.metadata || !saveFile.kingdomData) {
        throw new Error('Invalid save file format: Missing metadata or kingdomData');
      }

      // Validate version compatibility
      if (saveFile.metadata.version !== SAVE_VERSION) {
        logger.warn('[SaveLoadService] Save file version mismatch:', {
          fileVersion: saveFile.metadata.version,
          currentVersion: SAVE_VERSION
        });
        // Could add migration logic here if needed
      }

      // Validate required fields
      const kingdomData = saveFile.kingdomData;
      if (typeof kingdomData.currentTurn !== 'number') {
        throw new Error('Invalid kingdom data: Missing currentTurn');
      }

      logger.info('[SaveLoadService] Kingdom data imported successfully:', {
        kingdomName: saveFile.metadata.kingdomName,
        turn: saveFile.metadata.currentTurn,
        exportDate: saveFile.metadata.exportDate
      });

      ui.notifications?.info(`Kingdom "${saveFile.metadata.kingdomName}" imported successfully (Turn ${saveFile.metadata.currentTurn})`);

      return kingdomData;
    } catch (error) {
      logger.error('[SaveLoadService] Failed to import kingdom:', error);
      
      if (error instanceof SyntaxError) {
        ui.notifications?.error('Invalid JSON file. Please select a valid kingdom save file.');
      } else {
        ui.notifications?.error(`Failed to import kingdom: ${(error as Error).message}`);
      }
      
      throw error;
    }
  }

  /**
   * Validate kingdom data structure
   */
  static validateKingdomData(data: any): data is KingdomData {
    if (!data || typeof data !== 'object') return false;
    
    // Check required fields
    const requiredFields = [
      'currentTurn',
      'currentPhase',
      'currentPhaseStepIndex',
      'resources',
      'hexes',
      'settlements',
      'armies',
      'unrest',
      'fame'
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        logger.warn('[SaveLoadService] Missing required field:', field);
        return false;
      }
    }

    return true;
  }

  /**
   * Create a backup of current kingdom data before importing
   */
  static async createBackup(kingdomData: KingdomData): Promise<void> {
    const backupMetadata: SaveMetadata = {
      version: SAVE_VERSION,
      exportDate: new Date().toISOString(),
      kingdomName: `${kingdomData.name || 'Unknown'} (Backup)`,
      currentTurn: kingdomData.currentTurn,
      moduleVersion: MODULE_VERSION
    };

    const saveFile: SaveFile = {
      metadata: backupMetadata,
      kingdomData
    };

    const jsonString = JSON.stringify(saveFile, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    const sanitizedName = (kingdomData.name || 'kingdom')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kingdom-${sanitizedName}-backup-${timestamp}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);

    logger.info('[SaveLoadService] Backup created:', filename);
  }
}
