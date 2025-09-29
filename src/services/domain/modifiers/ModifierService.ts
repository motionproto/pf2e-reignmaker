import type { KingdomModifier, ModifierEffects, ResolutionResult } from '../../../models/Modifiers';
import { ModifierUtils } from '../../../models/Modifiers';
import type { KingdomState } from '../../../models/KingdomState';
import { structuresService } from '../../structures';

/**
 * Roll modifier that can be applied to a skill check
 */
export interface RollModifier {
    name: string;
    label?: string;
    value: number;
    modifier?: number;
    type?: 'circumstance' | 'status' | 'item' | 'untyped';
    enabled?: boolean;
    source?: string;
}

/**
 * Service for managing kingdom modifiers from unresolved events, trade agreements, etc.
 * Also tracks temporary modifiers and aggregates from Kingdom state
 */
export class ModifierService {
    private modifiers: KingdomModifier[] = [];
    private temporaryModifiers: Map<string, RollModifier[]> = new Map();

    constructor() {
        this.modifiers = [];
        this.temporaryModifiers = new Map();
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

    /**
     * Add a temporary modifier (e.g., from Aid Another)
     * These are not persisted and cleared after use
     */
    addTemporaryModifier(skill: string, modifier: RollModifier): void {
        if (!this.temporaryModifiers.has(skill)) {
            this.temporaryModifiers.set(skill, []);
        }
        this.temporaryModifiers.get(skill)!.push(modifier);
    }

    /**
     * Clear temporary modifiers for a skill or all skills
     */
    clearTemporaryModifiers(skill?: string): void {
        if (skill) {
            this.temporaryModifiers.delete(skill);
        } else {
            this.temporaryModifiers.clear();
        }
    }

    /**
     * Get all modifiers that apply to a specific check
     * Aggregates from Kingdom State (structures, long-term modifiers) and temporary modifiers
     */
    getModifiersForCheck(
        checkType: string,
        skill: string,
        kingdomState: KingdomState,
        currentTurn: number
    ): RollModifier[] {
        const modifiers: RollModifier[] = [];
        
        // 1. Get structure bonuses from settlements
        const structureModifiers = this.getStructureModifiers(kingdomState, skill);
        modifiers.push(...structureModifiers);
        
        // 2. Get applicable long-term modifiers from kingdom state
        const activeKingdomModifiers = this.getActiveModifiers(currentTurn)
            .filter(m => this.modifierAppliesTo(m, checkType, skill))
            .map(m => this.convertToRollModifier(m));
        modifiers.push(...activeKingdomModifiers);
        
        // 3. Add temporary modifiers for this skill
        const tempMods = this.temporaryModifiers.get(skill) || [];
        modifiers.push(...tempMods);
        
        // 4. Add unrest penalties if applicable
        const unrestModifier = this.getUnrestModifier(kingdomState);
        if (unrestModifier) {
            modifiers.push(unrestModifier);
        }
        
        return modifiers;
    }

    /**
     * Get modifiers from structures in settlements
     */
    private getStructureModifiers(kingdomState: KingdomState, skill: string): RollModifier[] {
        const modifiers: RollModifier[] = [];
        
        if (!kingdomState.settlements) return modifiers;
        
        // Go through all settlements and their structures
        for (const settlement of kingdomState.settlements) {
            if (!settlement.structureIds) continue;
            
            for (const structureId of settlement.structureIds) {
                // Get structure from service
                const structure = structuresService.getStructure(structureId);
                if (!structure) continue;
                
                // Check if structure provides a bonus to this skill
                const skillBonus = this.getStructureSkillBonus(structure, skill);
                if (skillBonus) {
                    modifiers.push({
                        name: `${structure.name} (${settlement.name})`,
                        value: skillBonus,
                        type: 'item',
                        source: 'structure',
                        enabled: true
                    });
                }
            }
        }
        
        return modifiers;
    }

    /**
     * Check if a structure provides a bonus to a specific skill
     */
    private getStructureSkillBonus(structure: any, skill: string): number {
        // Check the structure's effects for skill bonuses
        // This would need to be expanded based on actual structure data
        
        // Example mappings (would be data-driven in practice)
        const skillBonuses: Record<string, Record<string, number>> = {
            'embassy': { 'diplomacy': 2 },
            'barracks': { 'intimidation': 1, 'warfare lore': 1 },
            'library': { 'arcana': 1, 'society': 1 },
            'marketplace': { 'mercantile lore': 1, 'society': 1 },
            'temple': { 'religion': 2 },
            'thieves-guild': { 'thievery': 2, 'stealth': 1 },
            'academy': { 'arcana': 2, 'occultism': 1 },
            'garrison': { 'warfare lore': 2, 'intimidation': 1 }
        };
        
        const structureBonuses = skillBonuses[structure.id] || {};
        return structureBonuses[skill.toLowerCase()] || 0;
    }

    /**
     * Check if a modifier applies to a specific check type and skill
     */
    private modifierAppliesTo(modifier: KingdomModifier, checkType: string, skill: string): boolean {
        // Check if modifier has roll modifiers that apply
        if (!modifier.effects?.rollModifiers) return false;
        
        for (const rollMod of modifier.effects.rollModifiers) {
            // Check if it applies to this check type
            if (rollMod.type === checkType || rollMod.type === 'all') {
                // Check if it applies to this skill
                if (!rollMod.skills || rollMod.skills.includes(skill.toLowerCase())) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Convert a kingdom modifier to a roll modifier
     */
    private convertToRollModifier(modifier: KingdomModifier): RollModifier {
        // Extract the first applicable roll modifier
        const rollMod = modifier.effects?.rollModifiers?.[0];
        
        return {
            name: modifier.name,
            value: rollMod?.value || 0,
            type: 'circumstance',
            source: modifier.source.type,
            enabled: true
        };
    }

    /**
     * Get unrest penalty as a modifier
     */
    private getUnrestModifier(kingdomState: KingdomState): RollModifier | null {
        const unrest = kingdomState.unrest || 0;
        
        // Calculate penalty based on unrest tier
        let penalty = 0;
        if (unrest >= 15) {
            penalty = -4; // Rebellion
        } else if (unrest >= 10) {
            penalty = -2; // Unrest
        } else if (unrest >= 5) {
            penalty = -1; // Discontent
        }
        
        if (penalty === 0) return null;
        
        return {
            name: 'Unrest Penalty',
            value: penalty,
            type: 'circumstance',
            source: 'unrest',
            enabled: true
        };
    }
}

// Export singleton instance
export const modifierService = new ModifierService();
