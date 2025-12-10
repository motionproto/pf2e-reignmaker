/**
 * Foundry Hooks for Vote System
 * 
 * Handles user connection/disconnection events to update voting requirements
 */

import { VoteService } from '../services/VoteService';
import { logger } from '../utils/Logger';

/**
 * Initialize vote-related Foundry hooks
 */
export function initializeVoteHooks(): void {
  // Handle user disconnection
  Hooks.on('userConnected', async (user: any, connected: boolean) => {
    if (!connected) {
      // User disconnected - remove their votes and check resolution
      logger.info(`🗳️ [VoteHooks] User ${user.name} disconnected, updating votes...`);
      await VoteService.handleUserDisconnect(user.id);
    } else {
      // User connected - log but no action needed (votes will adjust automatically)
      logger.info(`🗳️ [VoteHooks] User ${user.name} connected`);
    }
  });
  
  console.log('🗳️ [VoteHooks] Vote system hooks initialized');
}
