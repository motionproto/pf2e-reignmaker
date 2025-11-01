/**
 * Token Helpers
 * Shared utilities for token operations used across the codebase
 */

import { logger } from '../../utils/Logger';

export class TokenHelpers {
  /**
   * Find all tokens for a given actor on the current scene
   * 
   * @param actorId - Actor ID to search for
   * @returns Array of token documents (empty if none found)
   */
  static findTokensByActor(actorId: string): any[] {
    const canvas = (globalThis as any).canvas;
    
    if (!canvas?.scene) {
      logger.warn('[TokenHelpers] No active scene');
      return [];
    }
    
    const allTokens: any[] = Array.from(canvas.scene.tokens);
    const tokens = allTokens.filter((t: any) => t.actorId === actorId);
    
    logger.info(`[TokenHelpers] Found ${tokens.length} token(s) for actor ${actorId} on scene ${canvas.scene.name}`);
    
    return tokens;
  }
  
  /**
   * Find the first token for a given actor on the current scene
   * 
   * @param actorId - Actor ID to search for
   * @returns Token document or null if not found
   */
  static findTokenByActor(actorId: string): any | null {
    const tokens = this.findTokensByActor(actorId);
    
    if (tokens.length === 0) {
      return null;
    }
    
    if (tokens.length > 1) {
      logger.warn(`[TokenHelpers] Multiple tokens found for actor ${actorId}, returning first one`);
    }
    
    return tokens[0];
  }
  
  /**
   * Get the hex ID from a token's position
   * 
   * @param tokenDoc - Token document
   * @returns Hex ID (e.g., "5.12") or null if conversion fails
   */
  static getTokenHexId(tokenDoc: any): string | null {
    try {
      const canvas = (globalThis as any).canvas;
      const gridSize = canvas?.grid?.size || 100;
      
      // Token center position (tokens positioned by top-left corner)
      const centerX = tokenDoc.x + (tokenDoc.width * gridSize) / 2;
      const centerY = tokenDoc.y + (tokenDoc.height * gridSize) / 2;
      
      // Convert pixel coordinates to grid coordinates
      const gridCoords = canvas.grid.getOffset({ x: centerX, y: centerY });
      
      // Format as hex ID: "row.col" (pad col to 2 digits)
      const hexId = `${gridCoords.i}.${String(gridCoords.j).padStart(2, '0')}`;
      
      logger.info(`[TokenHelpers] Token at (${tokenDoc.x}, ${tokenDoc.y}) -> hex ${hexId}`);
      
      return hexId;
    } catch (error) {
      logger.error('[TokenHelpers] Failed to get token hex:', error);
      return null;
    }
  }
  
  /**
   * Get the center position of a token in pixels
   * 
   * @param tokenDoc - Token document
   * @returns { x, y } center position
   */
  static getTokenCenter(tokenDoc: any): { x: number; y: number } {
    const canvas = (globalThis as any).canvas;
    const gridSize = canvas?.grid?.size || 100;
    
    const centerX = tokenDoc.x + (tokenDoc.width * gridSize) / 2;
    const centerY = tokenDoc.y + (tokenDoc.height * gridSize) / 2;
    
    return { x: centerX, y: centerY };
  }
  
  /**
   * Convert a hex ID to token position (centered on hex)
   * 
   * @param hexId - Hex ID (e.g., "5.12")
   * @param tokenWidth - Token width in grid units (default: 1)
   * @param tokenHeight - Token height in grid units (default: 1)
   * @returns { x, y } position for token's top-left corner (Foundry standard)
   */
  static hexToTokenPosition(
    hexId: string, 
    tokenWidth: number = 1, 
    tokenHeight: number = 1
  ): { x: number; y: number } | null {
    try {
      const canvas = (globalThis as any).canvas;
      
      if (!canvas?.grid) {
        logger.warn('[TokenHelpers] Canvas grid not available');
        return null;
      }
      
      const gridSize = canvas.grid.size;
      
      // Parse hex ID (format: "row.col")
      const [rowStr, colStr] = hexId.split('.');
      const i = parseInt(rowStr, 10);
      const j = parseInt(colStr, 10);
      
      if (isNaN(i) || isNaN(j)) {
        logger.error(`[TokenHelpers] Invalid hex ID format: ${hexId}`);
        return null;
      }
      
      // Get hex center using Foundry's API
      const center = canvas.grid.getCenterPoint({ i, j });
      
      // Calculate token dimensions
      const widthPx = tokenWidth * gridSize;
      const heightPx = tokenHeight * gridSize;
      
      // Calculate top-left position to center token on hex
      const x = center.x - widthPx / 2;
      const y = center.y - heightPx / 2;
      
      logger.info(`[TokenHelpers] Hex ${hexId} (${i},${j}) -> token position (${x}, ${y})`);
      
      return { x, y };
    } catch (error) {
      logger.error('[TokenHelpers] Failed to convert hex to token position:', error);
      return null;
    }
  }
  
  /**
   * Get the current scene
   * 
   * @returns Current scene or null
   */
  static getCurrentScene(): any | null {
    const game = (globalThis as any).game;
    return game?.scenes?.current || null;
  }
  
  /**
   * Check if a token exists on the current scene
   * 
   * @param actorId - Actor ID to check
   * @returns True if at least one token exists
   */
  static hasTokenOnScene(actorId: string): boolean {
    const tokens = this.findTokensByActor(actorId);
    return tokens.length > 0;
  }
}
