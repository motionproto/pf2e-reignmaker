/**
 * File System Helper
 * Utilities for managing file system operations (e.g., directory creation)
 */

import { actionDispatcher } from '../services/ActionDispatcher';
import { logger } from './Logger';

/**
 * Ensure upload directory exists (creates parent directories as needed)
 * Routes through GM via ActionDispatcher if player
 * 
 * @param path - Directory path (e.g., 'reignmaker-uploads/map-icons')
 */
export async function ensureUploadDirectory(path: string): Promise<void> {
  // @ts-ignore
  const game = (globalThis as any).game;
  
  // If GM, create directly
  if (game?.user?.isGM) {
    try {
      // @ts-ignore
      await FilePicker.browse('data', path);
      logger.debug(`✅ Directory exists: ${path}`);
    } catch (err) {
      // Directory doesn't exist, create it (and parents if needed)
      try {
        // Create parent directories first
        const parts = path.split('/');
        let currentPath = '';
        
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          try {
            // @ts-ignore
            await FilePicker.browse('data', currentPath);
            logger.debug(`✅ Directory exists: ${currentPath}`);
          } catch (browseErr) {
            // Directory doesn't exist, create it
            // @ts-ignore
            await FilePicker.createDirectory('data', currentPath);
            logger.info(`📁 Created directory: ${currentPath}`);
          }
        }
      } catch (createErr) {
        logger.error(`❌ Failed to create directory: ${path}`, createErr);
        throw createErr;
      }
    }
    return;
  }
  
  // If player, route through GM via ActionDispatcher
  logger.debug(`[FileSystemHelper] Requesting GM to ensure directory: ${path}`);
  
  try {
    await actionDispatcher.dispatch('ensureUploadDirectory', { path });
    
    // Brief delay to let GM process
    await new Promise(resolve => setTimeout(resolve, 300));
    
    logger.debug(`✅ [FileSystemHelper] Directory creation request sent to GM: ${path}`);
  } catch (err) {
    logger.error(`❌ [FileSystemHelper] Failed to ensure directory: ${path}`, err);
    throw err;
  }
}
