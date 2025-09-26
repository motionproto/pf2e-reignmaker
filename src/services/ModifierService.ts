import type { KingdomModifier, ModifierEffects, ResolutionResult } from '../models/Modifiers';
import { ModifierUtils } from '../models/Modifiers';

/**
 * Service for managing kingdom modifiers from unresolved events, trade agreements, etc.
 */
export class ModifierService {
    private modifiers: KingdomModifier[] = [];

    constructor() {
        this.modifiers = [];
    }

    /**
     * Add a new modifier to the kingdom
     */
    addModifier(modifier: KingdomModifier): void {
        // Ensure the modifier has a unique ID
        if (!modifier.id) {
            modifier.id = `modifier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Set the start turn if not provided
        if (modifier.startTurn === undefined) {
            modifier.startTurn = 0; // Will be set properly by the kingdom store
        }

        this.modifiers.push(modifier);
    }

    /**
     * Remove a modifier by ID
     */
    removeModifier(id: string): boolean {
        const initialLength = this.modifiers.length;
        this.modifiers = this.modifiers.filter(m => m.id !== id);
        return this.modifiers.length < initialLength;
    }

    /**
     * Process all modifiers at the start of a turn
     * Returns the combined effects that should be applied
     */
    processTurnStart(currentTurn: number): ModifierEffects {
        const totalEffects: ModifierEffects = {
            rollModifiers: []
        };

        // Process each active modifier
        const activeModifiers = this.getActiveModifiers(currentTurn);
        
        for (const modifier of activeModifiers) {
            // Check for escalation
            if (modifier.escalation && modifier.startTurn !== undefined) {
                if (ModifierUtils.needsEscalation(modifier, currentTurn)) {
                    this.applyEscalation(modifier);
                }
            }

            // Check for automatic resolution (if there's a specific condition)
            if (modifier.resolution?.automatic && modifier.startTurn !== undefined) {
                // This would be handled by checking the condition
                // For now, we'll mark it for the kingdom store to handle
                (modifier as any).pendingAutoResolve = true;
            }

            // Combine effects using ModifierUtils
            if (modifier.effects) {
                const combined = ModifierUtils.combineEffects([modifier]);
                totalEffects.gold = (totalEffects.gold || 0) + (combined.gold || 0);
                totalEffects.food = (totalEffects.food || 0) + (combined.food || 0);
                totalEffects.lumber = (totalEffects.lumber || 0) + (combined.lumber || 0);
                totalEffects.stone = (totalEffects.stone || 0) + (combined.stone || 0);
                totalEffects.ore = (totalEffects.ore || 0) + (combined.ore || 0);
                totalEffects.luxuries = (totalEffects.luxuries || 0) + (combined.luxuries || 0);
                totalEffects.resources = (totalEffects.resources || 0) + (combined.resources || 0);
                totalEffects.unrest = (totalEffects.unrest || 0) + (combined.unrest || 0);
                totalEffects.fame = (totalEffects.fame || 0) + (combined.fame || 0);
                totalEffects.infamy = (totalEffects.infamy || 0) + (combined.infamy || 0);
                totalEffects.armyMorale = (totalEffects.armyMorale || 0) + (combined.armyMorale || 0);
                totalEffects.armyCapacity = (totalEffects.armyCapacity || 0) + (combined.armyCapacity || 0);
                
                if (combined.rollModifiers) {
                    totalEffects.rollModifiers!.push(...combined.rollModifiers);
                }
                
                if (combined.special) {
                    totalEffects.special = totalEffects.special || [];
                    totalEffects.special.push(...combined.special);
                }
            }
        }

        return totalEffects;
    }

    /**
     * Check for expired modifiers
     */
    checkExpiredModifiers(currentTurn: number): string[] {
        const expiredIds: string[] = [];
        
        for (const modifier of this.modifiers) {
            if (ModifierUtils.hasExpired(modifier, currentTurn)) {
                expiredIds.push(modifier.id);
            }
        }
        
        return expiredIds;
    }

    /**
     * Attempt to resolve a modifier with a skill check
     */
    resolveModifier(modifierId: string, skill: string, rollResult: number): ResolutionResult {
        const modifier = this.modifiers.find(m => m.id === modifierId);
        
        if (!modifier) {
            return {
                success: false,
                modifier: {} as KingdomModifier,
                message: 'Modifier not found',
                removed: false
            };
        }

        if (!modifier.resolution) {
            return {
                success: false,
                modifier,
                message: 'This modifier cannot be resolved through skill checks',
                removed: false
            };
        }

        // Check if the skill is valid for this modifier
        if (modifier.resolution.skills && !modifier.resolution.skills.includes(skill)) {
            return {
                success: false,
                modifier,
                message: `Cannot use ${skill} to resolve this modifier. Valid skills: ${modifier.resolution.skills.join(', ')}`,
                removed: false
            };
        }

        // Determine DC
        const dc = modifier.resolution.dc || this.calculateDC(modifier);

        // Check success
        const success = rollResult >= dc;

        if (success) {
            const removeOnSuccess = modifier.resolution.onResolution?.removeOnSuccess !== false;
            
            return {
                success: true,
                modifier,
                message: modifier.resolution.onResolution?.successMsg || `Successfully resolved ${modifier.name}`,
                removed: removeOnSuccess
            };
        }

        const removeOnFailure = modifier.resolution.onResolution?.removeOnFailure === true;
        
        return {
            success: false,
            modifier,
            message: modifier.resolution.onResolution?.failureMsg || `Failed to resolve ${modifier.name} (rolled ${rollResult} vs DC ${dc})`,
            removed: removeOnFailure
        };
    }

    /**
     * Get all active modifiers for a given turn
     */
    getActiveModifiers(currentTurn?: number): KingdomModifier[] {
        if (currentTurn === undefined) {
            return [...this.modifiers];
        }

        return this.modifiers.filter(modifier => {
            // Check if expired
            if (ModifierUtils.hasExpired(modifier, currentTurn)) {
                return false;
            }

            // Check if started
            if (modifier.startTurn !== undefined && modifier.startTurn > currentTurn) {
                return false;
            }

            return true;
        });
    }

    /**
     * Get modifiers by source type
     */
    getModifiersBySourceType(sourceType: string): KingdomModifier[] {
        return this.modifiers.filter(m => m.source.type === sourceType);
    }

    /**
     * Get modifiers by source ID
     */
    getModifiersBySourceId(sourceId: string): KingdomModifier[] {
        return this.modifiers.filter(m => m.source.id === sourceId);
    }

    /**
     * Clear all modifiers
     */
    clearAllModifiers(): void {
        this.modifiers = [];
    }

    /**
     * Apply escalation effects to a modifier
     */
    private applyEscalation(modifier: KingdomModifier): void {
        if (!modifier.escalation) return;

        // Use ModifierUtils to create the escalated version
        const escalated = ModifierUtils.createEscalatedModifier(modifier);
        
        // Replace the modifier with its escalated version
        const index = this.modifiers.findIndex(m => m.id === modifier.id);
        if (index !== -1) {
            this.modifiers[index] = escalated;
        }
    }

    /**
     * Calculate DC for resolution based on modifier properties
     */
    private calculateDC(modifier: KingdomModifier): number {
        // Base DC based on severity
        const severityDCs: Record<string, number> = {
            'beneficial': 10,
            'neutral': 15,
            'dangerous': 20,
            'critical': 25
        };

        let dc = modifier.severity ? (severityDCs[modifier.severity] || 20) : 20;

        // Adjust for escalation state
        if (modifier.escalation?.hasEscalated) {
            dc += 5;
        }

        return dc;
    }

    /**
     * Export current modifiers for persistence
     */
    exportModifiers(): KingdomModifier[] {
        return [...this.modifiers];
    }

    /**
     * Import modifiers from persistence
     */
    importModifiers(modifiers: KingdomModifier[]): void {
        this.modifiers = [...modifiers];
    }
}

// Export singleton instance
export const modifierService = new ModifierService();
