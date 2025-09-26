/**
 * StatusPhaseController - Orchestrates status phase operations
 * 
 * This controller coordinates the status phase including fame gains,
 * modifier processing, and milestone checks.
 */

import { resourceManagementService } from '../services/domain/ResourceManagementService';
import { stateChangeFormatter } from '../services/formatters/StateChangeFormatter';
import { UpdateResourcesCommand } from '../commands/impl/UpdateResourcesCommand';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { KingdomState } from '../models/KingdomState';
import { SettlementTier } from '../models/KingdomState';
import type { KingdomModifier } from '../models/Modifiers';

export interface MilestoneCheck {
    type: 'firstVillage' | 'firstTown' | 'firstCity' | 'firstMetropolis';
    achieved: boolean;
    fameGained: number;
}

export interface StatusPhaseState {
    fameGained: number;
    milestones: MilestoneCheck[];
    activeModifiers: KingdomModifier[];
    processedModifiers: Map<string, any>;
    totalChanges: Map<string, number>;
}

export class StatusPhaseController {
    private state: StatusPhaseState;
    
    constructor() {
        this.state = this.createInitialState();
    }
    
    private createInitialState(): StatusPhaseState {
        return {
            fameGained: 0,
            milestones: [],
            activeModifiers: [],
            processedModifiers: new Map(),
            totalChanges: new Map()
        };
    }
    
    /**
     * Check for milestone achievements
     */
    checkMilestones(kingdomState: KingdomState): MilestoneCheck[] {
        const milestones: MilestoneCheck[] = [];
        
        // Check settlement milestones
        for (const settlement of kingdomState.settlements) {
            let milestone: MilestoneCheck | null = null;
            
            switch (settlement.tier) {
                case SettlementTier.VILLAGE:
                    if (!this.hasMilestone('firstVillage')) {
                        milestone = {
                            type: 'firstVillage',
                            achieved: true,
                            fameGained: 1
                        };
                    }
                    break;
                case SettlementTier.TOWN:
                    if (!this.hasMilestone('firstTown')) {
                        milestone = {
                            type: 'firstTown',
                            achieved: true,
                            fameGained: 1
                        };
                    }
                    break;
                case SettlementTier.CITY:
                    if (!this.hasMilestone('firstCity')) {
                        milestone = {
                            type: 'firstCity',
                            achieved: true,
                            fameGained: 1
                        };
                    }
                    break;
                case SettlementTier.METROPOLIS:
                    if (!this.hasMilestone('firstMetropolis')) {
                        milestone = {
                            type: 'firstMetropolis',
                            achieved: true,
                            fameGained: 1
                        };
                    }
                    break;
            }
            
            if (milestone) {
                milestones.push(milestone);
                this.state.milestones.push(milestone);
            }
        }
        
        return milestones;
    }
    
    /**
     * Check if a milestone has been achieved
     */
    private hasMilestone(type: string): boolean {
        return this.state.milestones.some(m => m.type === type);
    }
    
    /**
     * Reset fame to 1 at the start of the phase
     */
    async resetFame(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{ success: boolean; fameSet: number; error?: string }> {
        // Always reset fame to 1 at the start of status phase
        const targetFame = 1;
        
        // Calculate the change needed to reach 1
        const currentFame = kingdomState.fame || 0;
        const fameChange = targetFame - currentFame;
        
        if (fameChange !== 0) {
            const context: CommandContext = {
                kingdomState,
                currentTurn,
                currentPhase: 'Phase I: Kingdom Status'
            };
            
            const command = new UpdateResourcesCommand([{
                resource: 'fame',
                amount: fameChange,
                operation: fameChange > 0 ? 'add' : 'subtract'
            }]);
            
            const result = await commandExecutor.execute(command, context);
            
            if (result.success) {
                this.state.fameGained = targetFame;
                return { success: true, fameSet: targetFame };
            } else {
                return { 
                    success: false, 
                    fameSet: 0, 
                    error: result.error 
                };
            }
        }
        
        // Fame is already 1, no change needed
        this.state.fameGained = targetFame;
        return { success: true, fameSet: targetFame };
    }
    
    /**
     * Check if kingdom should gain automatic fame
     */
    private shouldGainAutomaticFame(kingdomState: KingdomState): boolean {
        // Check for conditions that grant automatic fame
        // This could be expanded based on kingdom rules
        
        // Example: Fame for low unrest
        if (kingdomState.unrest === 0 && kingdomState.fame < 3) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Process active modifiers and their effects
     */
    async processModifiers(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{ 
        success: boolean; 
        changes: Map<string, number>; 
        modifierDetails: Array<{
            name: string;
            source: string;
            effects: Array<{
                resource: string;
                amount: number;
            }>;
        }>;
        error?: string 
    }> {
        const changes = new Map<string, number>();
        const modifierDetails: Array<{
            name: string;
            source: string;
            effects: Array<{
                resource: string;
                amount: number;
            }>;
        }> = [];
        
        // Process each active modifier
        for (const modifier of kingdomState.modifiers) {
            if (this.isModifierActive(modifier, currentTurn)) {
                const effects = this.getModifierEffects(modifier);
                const effectsList: Array<{resource: string; amount: number}> = [];
                
                for (const [resource, amount] of effects) {
                    const current = changes.get(resource) || 0;
                    changes.set(resource, current + amount);
                    effectsList.push({ resource, amount });
                }
                
                // Track processed modifier with details
                if (effectsList.length > 0) {
                    modifierDetails.push({
                        name: modifier.name,
                        source: modifier.source.name || modifier.source.type,
                        effects: effectsList
                    });
                }
                
                // Track processed modifier
                this.state.processedModifiers.set(modifier.name, effects);
            }
        }
        
        // Apply all changes using command
        if (changes.size > 0) {
            const context: CommandContext = {
                kingdomState,
                currentTurn,
                currentPhase: 'Phase I: Kingdom Status'
            };
            
            const command = new UpdateResourcesCommand(changes);
            const result = await commandExecutor.execute(command, context);
            
            if (result.success) {
                this.state.totalChanges = changes;
                return { success: true, changes, modifierDetails };
            } else {
                return { 
                    success: false, 
                    changes: new Map(),
                    modifierDetails: [],
                    error: result.error 
                };
            }
        }
        
        return { success: true, changes: new Map(), modifierDetails: [] };
    }
    
    /**
     * Check if a modifier is currently active
     */
    private isModifierActive(modifier: KingdomModifier, currentTurn: number): boolean {
        if (modifier.duration === 'permanent') {
            return true;
        }
        
        if (modifier.duration === 'until-resolved') {
            // Check if modifier has been resolved (extend type if needed)
            return true; // Active until explicitly resolved
        }
        
        // Check turn-based duration
        if (typeof modifier.duration === 'number') {
            const turnsActive = currentTurn - (modifier.startTurn || 0);
            return turnsActive <= modifier.duration;
        }
        
        return false;
    }
    
    /**
     * Get the effects of a modifier
     */
    private getModifierEffects(modifier: KingdomModifier): Map<string, number> {
        const effects = new Map<string, number>();
        
        // Extract effects from modifier
        if (modifier.effects) {
            if (modifier.effects.gold) {
                effects.set('gold', modifier.effects.gold);
            }
            if (modifier.effects.food) {
                effects.set('food', modifier.effects.food);
            }
            if (modifier.effects.lumber) {
                effects.set('lumber', modifier.effects.lumber);
            }
            if (modifier.effects.stone) {
                effects.set('stone', modifier.effects.stone);
            }
            if (modifier.effects.ore) {
                effects.set('ore', modifier.effects.ore);
            }
            if (modifier.effects.luxuries) {
                effects.set('luxuries', modifier.effects.luxuries);
            }
            if (modifier.effects.unrest) {
                effects.set('unrest', modifier.effects.unrest);
            }
            if (modifier.effects.fame) {
                effects.set('fame', modifier.effects.fame);
            }
        }
        
        return effects;
    }
    
    /**
     * Expire modifiers that have reached their duration
     */
    expireModifiers(kingdomState: KingdomState, currentTurn: number): number {
        let expiredCount = 0;
        
        kingdomState.modifiers = kingdomState.modifiers.filter(modifier => {
            if (!this.isModifierActive(modifier, currentTurn)) {
                expiredCount++;
                return false;
            }
            return true;
        });
        
        return expiredCount;
    }
    
    /**
     * Get summary of phase results
     */
    getPhaseSummary(): {
        fameGained: number;
        milestonesAchieved: string[];
        modifiersApplied: number;
        totalChanges: Map<string, number>;
    } {
        return {
            fameGained: this.state.fameGained,
            milestonesAchieved: this.state.milestones.map(m => m.type),
            modifiersApplied: this.state.processedModifiers.size,
            totalChanges: new Map(this.state.totalChanges)
        };
    }
    
    /**
     * Reset controller state for next phase
     */
    resetState(): void {
        this.state = this.createInitialState();
    }
    
    /**
     * Get current controller state
     */
    getState(): StatusPhaseState {
        return {
            ...this.state,
            activeModifiers: [...this.state.activeModifiers],
            processedModifiers: new Map(this.state.processedModifiers),
            totalChanges: new Map(this.state.totalChanges)
        };
    }
}

// Export factory function
export function createStatusPhaseController(): StatusPhaseController {
    return new StatusPhaseController();
}
