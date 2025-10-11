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
import type { KingdomEvent, EventModifier, EventTier } from '../types/events';
import { getEventDisplayName } from '../types/event-helpers';
import { updateKingdom } from '../stores/KingdomStore';

/**
 * Map tier descriptors to numeric values for modifier tracking
 */
function tierToNumber(tier: EventTier): number {
  switch (tier) {
    case 'minor': return 1;
    case 'moderate': return 2;
    case 'major': return 3;
    default: return 1;
  }
}

/**
 * Create modifier service
 */
export async function createModifierService() {
  return {
    /**
     * Create active modifier from unresolved event/incident
     * 
     * NOTE: This is a simplified implementation that creates a basic modifier.
     * The full ifUnresolved structure is not yet implemented in the JSON data.
     * For now, this creates a modifier based on the event's tier.
     */
    createFromUnresolvedEvent(event: KingdomEvent, currentTurn: number): ActiveModifier | undefined {
      // TODO: Implement proper ifUnresolved structure in JSON data
      // For now, return undefined as most events don't have this configured yet
      if (!event.ifUnresolved) {
        console.warn(`Event ${event.id} has no ifUnresolved configuration`);
        return undefined;
      }
      
      // Create a basic modifier using event data
      // IMPORTANT: Preserve original event data for ongoing events that need skill resolution
      return {
        id: `event-${event.id}-${currentTurn}`,
        name: getEventDisplayName(event),
        description: event.description,
        tier: tierToNumber(event.tier),
        sourceType: 'event',
        sourceId: event.id,
        sourceName: getEventDisplayName(event),
        startTurn: currentTurn,
        modifiers: [], // TODO: Extract from ifUnresolved when structure is defined
        originalEventData: event // Preserve event for skill resolution in CheckCard
      };
    },
    
    /**
     * Apply structure modifiers only during Status phase
     * Custom modifiers are applied during Events phase by EventPhaseController
     */
    async applyOngoingModifiers(): Promise<void> {
      console.log('🟡 [ModifierService] Applying structure modifiers...');
      
      await updateKingdom(kingdom => {
        const modifiers = kingdom.activeModifiers || [];
        
        // Filter for structure modifiers only (permanent effects)
        const structureModifiers = modifiers.filter(m => m.sourceType === 'structure');
        
        if (structureModifiers.length === 0) {
          console.log('  ℹ️ No structure modifiers to apply');
          return;
        }
        
        for (const modifier of structureModifiers as ActiveModifier[]) {
          for (const mod of modifier.modifiers as EventModifier[]) {
            if (mod.duration === 'ongoing' && typeof mod.value === 'number') {
              // Apply resource/stat change
              const current = kingdom.resources[mod.resource] || 0;
              kingdom.resources[mod.resource] = Math.max(0, current + mod.value);
              
              console.log(`  ✓ Applied structure modifier: ${mod.value} ${mod.resource} (from ${modifier.name})`);
            }
          }
        }
      });
      
      console.log('✅ [ModifierService] Structure modifiers applied');
    },
    
    /**
     * Clean up expired turn-based modifiers
     */
    async cleanupExpiredModifiers(): Promise<void> {
      await updateKingdom(kingdom => {
        const currentTurn = kingdom.currentTurn;
        const initialCount = kingdom.activeModifiers?.length || 0;
        
        kingdom.activeModifiers = (kingdom.activeModifiers || []).filter((modifier: ActiveModifier) => {
          // Check if any modifier has expired
          const hasExpired = modifier.modifiers.some((mod: EventModifier) => {
            if (mod.duration === 'turns' && mod.turns) {
              return (currentTurn - modifier.startTurn) >= mod.turns;
            }
            return false;
          });
          
          return !hasExpired;
        });
        
        const removedCount = initialCount - kingdom.activeModifiers.length;
        if (removedCount > 0) {
          console.log(`🧹 [ModifierService] Removed ${removedCount} expired modifiers`);
        }
      });
    },
    
    /**
     * Attempt to resolve a modifier
     * Returns result indicating success/failure
     */
    async attemptResolution(modifierId: string, rollResult: number, levelBasedDC: number): Promise<ResolutionResult> {
      let result: ResolutionResult = {
        success: false,
        msg: 'Modifier not found',
        removed: false
      };
      
      await updateKingdom(kingdom => {
        const modifier = kingdom.activeModifiers?.find(m => m.id === modifierId);
        
        if (!modifier) {
          return;
        }
        
        if (!modifier.resolvedWhen || modifier.resolvedWhen.type !== 'skill') {
          result = {
            success: false,
            msg: 'This modifier cannot be resolved',
            removed: false
          };
          return;
        }
        
        const resolution = modifier.resolvedWhen.skillResolution;
        if (!resolution) {
          return;
        }
        
        const dc = levelBasedDC + (resolution.dcAdjustment || 0);
        const success = rollResult >= dc;
        
        if (success) {
          // Remove modifier on success
          kingdom.activeModifiers = kingdom.activeModifiers?.filter((m: ActiveModifier) => m.id !== modifierId) || [];
          
          result = {
            success: true,
            msg: resolution.onSuccess?.msg || 'Successfully resolved!',
            removed: true
          };
        } else {
          result = {
            success: false,
            msg: resolution.onFailure?.msg || 'Failed to resolve',
            removed: false
          };
        }
      });
      
      return result;
    },
    
    /**
     * Get summary of active modifiers
     */
    getActiveModifiers(): ActiveModifier[] {
      const { getKingdomActor } = require('../stores/KingdomStore');
      const actor = getKingdomActor();
      if (!actor) return [];
      
      const kingdom = actor.getKingdom();
      return kingdom?.activeModifiers || [];
    }
  };
}
