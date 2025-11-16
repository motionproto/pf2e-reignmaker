/**
 * Pipeline Metadata Storage
 *
 * Centralized storage for pipeline metadata collected during pre-roll interactions.
 * Ensures metadata flows through the entire pipeline lifecycle:
 * 1. Pre-roll interactions → store()
 * 2. Roll completion → retrieve() (when creating check instance)
 * 3. Apply → metadata available in ctx
 * 4. Post-apply → clear()
 */

import type { CheckMetadata } from '../types/CheckContext';

class PipelineMetadataStorage {
  private storage = new Map<string, CheckMetadata>();

  /**
   * Store metadata after pre-roll interactions
   * 
   * @param actionId - Action ID
   * @param playerId - Player ID (for multi-player support)
   * @param metadata - Metadata collected from pre-roll interactions
   */
  store(actionId: string, playerId: string, metadata: CheckMetadata): void {
    const key = `${actionId}:${playerId}`;
    this.storage.set(key, metadata);
    console.log(`📦 [PipelineMetadataStorage] Stored metadata for ${key}:`, metadata);
  }

  /**
   * Retrieve metadata when creating check instance
   * 
   * @param actionId - Action ID
   * @param playerId - Player ID
   * @returns Metadata or null if not found
   */
  retrieve(actionId: string, playerId: string): CheckMetadata | null {
    const key = `${actionId}:${playerId}`;
    const metadata = this.storage.get(key);
    
    if (metadata) {
      console.log(`📦 [PipelineMetadataStorage] Retrieved metadata for ${key}:`, metadata);
    } else {
      console.log(`📦 [PipelineMetadataStorage] No metadata found for ${key}`);
    }
    
    return metadata || null;
  }

  /**
   * Clear metadata after successful execution
   * 
   * @param actionId - Action ID
   * @param playerId - Player ID
   */
  clear(actionId: string, playerId: string): void {
    const key = `${actionId}:${playerId}`;
    const deleted = this.storage.delete(key);
    
    if (deleted) {
      console.log(`📦 [PipelineMetadataStorage] Cleared metadata for ${key}`);
    }
  }

  /**
   * Clear all metadata (cleanup)
   */
  clearAll(): void {
    const count = this.storage.size;
    this.storage.clear();
    console.log(`📦 [PipelineMetadataStorage] Cleared all metadata (${count} entries)`);
  }
}

/**
 * Singleton instance
 */
export const pipelineMetadataStorage = new PipelineMetadataStorage();
