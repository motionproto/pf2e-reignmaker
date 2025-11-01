/**
 * Token Animation Utilities
 * 
 * Provides smooth token movement along paths with easing
 */

import { logger } from '../../utils/Logger';

/**
 * Easing function for smooth animation (ease-in-out)
 * @param t - Progress value (0 to 1)
 * @returns Eased value (0 to 1)
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 
    ? 2 * t * t 
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Get hex center coordinates in pixels
 * @param hexId - Hex ID (e.g., "50.18")
 * @returns { x, y } pixel coordinates
 */
function getHexCenterPixels(hexId: string): { x: number, y: number } {
  const canvas = (globalThis as any).canvas;
  const parts = hexId.split('.');
  const hexI = parseInt(parts[0], 10);
  const hexJ = parseInt(parts[1], 10);
  
  const GridHex = (globalThis as any).foundry.grid.GridHex;
  const hex = new GridHex({ i: hexI, j: hexJ }, canvas.grid);
  const center = hex.center;
  
  return { x: center.x, y: center.y };
}

/**
 * Animate a token smoothly along a path
 * 
 * @param tokenDocument - The TokenDocument to animate
 * @param path - Array of hex IDs defining the path
 * @param msPerHex - Duration per hex segment in milliseconds (default: 100ms)
 * @returns Promise that resolves when animation completes
 */
export async function animateTokenAlongPath(
  tokenDocument: any,
  path: string[],
  msPerHex: number = 100
): Promise<void> {
  
  if (!tokenDocument) {
    logger.error('[TokenAnimation] No token document provided');
    return;
  }
  
  if (path.length < 2) {
    logger.warn('[TokenAnimation] Path too short (need at least 2 hexes)');
    return;
  }
  
  const totalDuration = (path.length - 1) * msPerHex;
  logger.info(`[TokenAnimation] Animating token along ${path.length} hexes (${msPerHex}ms per hex, ${totalDuration}ms total)`);
  
  // Calculate pixel coordinates for each hex in the path
  const waypoints = path.map(hexId => {
    const center = getHexCenterPixels(hexId);
    const gridSize = (globalThis as any).canvas.grid.size;
    
    // Adjust for token size (tokens are positioned by top-left corner)
    const tokenWidth = tokenDocument.width * gridSize;
    const tokenHeight = tokenDocument.height * gridSize;
    
    return {
      hexId,
      x: center.x - tokenWidth / 2,
      y: center.y - tokenHeight / 2
    };
  });
  
  // Fixed duration per segment
  const segmentDuration = msPerHex;
  
  // Animate through each segment
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    
    logger.info(`[TokenAnimation] Segment ${i + 1}/${waypoints.length - 1}: ${start.hexId} → ${end.hexId} (${segmentDuration}ms)`);
    
    await animateSegment(tokenDocument, start, end, segmentDuration);
  }
  
  logger.info('[TokenAnimation] Animation complete');
}

/**
 * Animate a single segment between two waypoints
 * 
 * @param tokenDocument - The TokenDocument to animate
 * @param start - Start position { x, y, hexId }
 * @param end - End position { x, y, hexId }
 * @param duration - Segment duration in milliseconds
 */
async function animateSegment(
  tokenDocument: any,
  start: { x: number, y: number, hexId: string },
  end: { x: number, y: number, hexId: string },
  duration: number
): Promise<void> {
  
  return new Promise<void>((resolve) => {
    const startTime = Date.now();
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      
      // Apply easing
      const easedProgress = easeInOutQuad(progress);
      
      // Calculate current position
      const currentX = start.x + deltaX * easedProgress;
      const currentY = start.y + deltaY * easedProgress;
      
      // Update token position (optimized - no database write during animation)
      tokenDocument.object.document.x = currentX;
      tokenDocument.object.document.y = currentY;
      tokenDocument.object.position.set(currentX, currentY);
      
      if (progress < 1.0) {
        // Continue animation
        requestAnimationFrame(animate);
      } else {
        // Segment complete - write final position to database
        tokenDocument.update({ x: end.x, y: end.y }).then(() => {
          resolve();
        });
      }
    }
    
    // Start animation loop
    requestAnimationFrame(animate);
  });
}

/**
 * Get token document from army
 * 
 * @param armyId - Army ID
 * @returns TokenDocument or null if not found
 */
export async function getArmyToken(armyId: string): Promise<any | null> {
  const { getKingdomActor } = await import('../../stores/KingdomStore');
  const { TokenHelpers } = await import('../tokens/TokenHelpers');
  
  const kingdomActor = getKingdomActor();
  const kingdom = kingdomActor?.getKingdomData();
  const army = kingdom?.armies?.find((a: any) => a.id === armyId);
  
  if (!army || !army.actorId) {
    logger.warn(`[TokenAnimation] Army ${armyId} has no linked actor`);
    return null;
  }
  
  logger.info(`[TokenAnimation] Looking for token for army ${army.name} (actorId: ${army.actorId})`);
  
  // Use TokenHelpers to find token
  const token = TokenHelpers.findTokenByActor(army.actorId);
  
  if (!token) {
    logger.warn(`[TokenAnimation] No token found for army ${army.name} (actorId: ${army.actorId}) on current scene`);
    logger.warn(`[TokenAnimation] Try placing the army token on the scene first`);
    return null;
  }
  
  logger.info(`[TokenAnimation] Found token: ${token.name}`);
  return token;
}
