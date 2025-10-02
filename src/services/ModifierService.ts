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
import type { KingdomEvent, EventModifier } from '../controllers/events/types';
import { updateKingdom } from '../stores/KingdomStore';

/**
 * Create modifier service
 */
export async function createModifierService() {
  return {
    /**
     * Create active modifier from unresolved event/incident
     */
    createFromUnresolvedEvent(event: KingdomEvent, currentTurn: number): ActiveModifier {
      const unresolved = event.ifUnresolved;
      
      if (!unresolved) {
        throw new Error(`Event ${event.id} has no unresolved section`);
      }
      
      return {
        id: `event-${event.id}-${currentTurn}`,
        name: unresolved.name,
        description: unresolved.description,
        icon: unresolved.icon,
        tier: unresolved.tier,
        sourceType: 'event',
        sourceId: event.id,
        sourceName: event.name,
        startTurn: currentTurn,
        modifiers: unresolved.modifiers,
        resolvedWhen: unresolved.resolvedWhen
      };
    },
    
    /**
     * Apply all ongoing modifiers
     * Called during Status phase
     */
    async applyOngoingModifiers(): Promise<void> {
      console.log('🟡 [ModifierService] Applying ongoing modifiers...');
      
      await updateKingdom(kingdom => {
        const modifiers = kingdom.activeModifiers || [];
        
        for (const modifier of modifiers as ActiveModifier[]) {
          for (const mod of modifier.modifiers as EventModifier[]) {
            if (mod.duration === 'ongoing') {
              // Apply resource/stat change
              const current = kingdom.resources[mod.resource] || 0;
              kingdom.resources[mod.resource] = Math.max(0, current + mod.value);
              
              console.log(`  ✓ Applied ${mod.name}: ${mod.value} ${mod.resource}`);
            }
          }
        }
      });
      
      console.log('✅ [ModifierService] Ongoing modifiers applied');
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
      const kingdom = (window as any).game?.actors?.find((a: any) => a.type === 'kingdom')?.getKingdom();
      return kingdom?.activeModifiers || [];
    }
  };
}
