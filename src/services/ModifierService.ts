/**
 * ModifierService - Simplified modifier management
 * 
 * Responsibilities:
 * - Create modifiers from unresolved events/incidents
 * - Apply ongoing modifiers during Status phase
 * - Clean up expired modifiers
 * - Handle modifier resolution
 */

import type { ActiveModifier, ResolutionResult } from '../models/Modifiers';
import type { KingdomEvent, EventTier } from '../types/events';
import type { EventModifier } from '../types/modifiers';
import { isStaticModifier, isOngoingDuration, isTurnCountDuration } from '../types/modifiers';
import { getEventDisplayName } from '../types/event-helpers';
import { updateKingdom } from '../stores/KingdomStore';
import { logger } from '../utils/Logger';

/**
 * Create modifier service
 */
export async function createModifierService() {
  return {
    /**
     * Apply structure modifiers only during Status phase
     * Custom modifiers are applied during Events phase by EventPhaseController
     */
    async applyOngoingModifiers(): Promise<void> {
      logger.debug('🟡 [ModifierService] Applying structure modifiers...');
      
      await updateKingdom(kingdom => {
        const modifiers = kingdom.activeModifiers || [];
        
        // Filter for structure modifiers only (permanent effects)
        const structureModifiers = modifiers.filter(m => m.sourceType === 'structure');
        
        if (structureModifiers.length === 0) {
          logger.debug('  ℹ️ No structure modifiers to apply');
          return;
        }
        
        for (const modifier of structureModifiers as ActiveModifier[]) {
          for (const mod of modifier.modifiers as EventModifier[]) {
            // Only apply static modifiers with ongoing duration
            if (isStaticModifier(mod) && isOngoingDuration(mod.duration)) {
              // Apply resource/stat change
              const current = kingdom.resources[mod.resource] || 0;
              kingdom.resources[mod.resource] = Math.max(0, current + mod.value);
              
              logger.debug(`  ✓ Applied structure modifier: ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.resource} (from ${modifier.name})`);
            }
          }
        }
      });
      
      logger.debug('✅ [ModifierService] Structure modifiers applied');
    },
    
    /**
     * Clean up expired turn-based modifiers
     */
    async cleanupExpiredModifiers(): Promise<void> {
      await updateKingdom(kingdom => {
        const currentTurn = kingdom.currentTurn;
        const initialCount = kingdom.activeModifiers?.length || 0;
        
        kingdom.activeModifiers = (kingdom.activeModifiers || []).filter((modifier: ActiveModifier) => {
          // Check if any modifier has expired (using turn count duration)
          const hasExpired = modifier.modifiers.some((mod: EventModifier) => {
            if (isTurnCountDuration(mod.duration)) {
              return (currentTurn - modifier.startTurn) >= mod.duration;
            }
            return false;
          });
          
          return !hasExpired;
        });
        
        const removedCount = initialCount - kingdom.activeModifiers.length;
        if (removedCount > 0) {
          logger.debug(`🧹 [ModifierService] Removed ${removedCount} expired modifiers`);
        }
      });
    },
    
    /**
     * Get summary of active modifiers
     */
    async getActiveModifiers(): Promise<ActiveModifier[]> {
      const { getKingdomActor } = await import('../stores/KingdomStore');
      const actor = getKingdomActor();
      if (!actor) return [];
      
      const kingdom = actor.getKingdomData();
      return kingdom?.activeModifiers || [];
    }
  };
}
