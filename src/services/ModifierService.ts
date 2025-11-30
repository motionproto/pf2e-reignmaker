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
/**
 * Create modifier service
 */
export async function createModifierService() {
  return {
    /**
     * Apply ALL ongoing modifiers during Resources phase
     * Applies custom, event, incident, and structure modifiers
     */
    async applyOngoingModifiers(): Promise<{ success: boolean; appliedCount: number; changes: Record<string, number> }> {
      const changes: Record<string, number> = {};
      let appliedCount = 0;

      await updateKingdom(kingdom => {
        const modifiers = kingdom.activeModifiers || [];
        
        if (modifiers.length === 0) {
          return;
        }
        
        for (const modifier of modifiers as ActiveModifier[]) {
          for (const mod of modifier.modifiers as EventModifier[]) {
            // Apply static modifiers with ongoing duration
            if (isStaticModifier(mod) && isOngoingDuration(mod.duration)) {
              // Apply resource/stat change
              const current = kingdom.resources[mod.resource] || 0;
              const newValue = Math.max(0, current + mod.value);
              // ✅ Immutable: Reassign object to trigger Svelte reactivity
              kingdom.resources = { ...kingdom.resources, [mod.resource]: newValue };
              
              // Track the change
              changes[mod.resource] = (changes[mod.resource] || 0) + mod.value;
              appliedCount++;
            }
          }
        }
      });

      return { success: true, appliedCount, changes };
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
    },
    
    /**
     * Preview what applying modifiers would do (doesn't modify kingdom state)
     */
    async previewModifierEffects(): Promise<{ resource: string; change: number; modifiers: Array<{ name: string; value: number }> }[]> {
      const { getKingdomActor } = await import('../stores/KingdomStore');
      const actor = getKingdomActor();
      if (!actor) return [];
      
      const kingdom = actor.getKingdomData();
      const modifiers = kingdom?.activeModifiers || [];
      
      // Group changes by resource with individual modifier details
      const resourceChanges = new Map<string, { change: number; modifiers: Array<{ name: string; value: number }> }>();
      
      for (const modifier of modifiers as ActiveModifier[]) {
        for (const mod of modifier.modifiers as EventModifier[]) {
          if (isStaticModifier(mod) && isOngoingDuration(mod.duration)) {
            const existing = resourceChanges.get(mod.resource) || { change: 0, modifiers: [] };
            existing.change += mod.value;
            existing.modifiers.push({ name: modifier.name, value: mod.value });
            resourceChanges.set(mod.resource, existing);
          }
        }
      }
      
      // Convert to array for display
      return Array.from(resourceChanges.entries()).map(([resource, data]) => ({
        resource,
        change: data.change,
        modifiers: data.modifiers
      }));
    }
  };
}
