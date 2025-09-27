/**
 * UpkeepPhaseController - Orchestrates upkeep phase operations
 * 
 * This controller coordinates the upkeep phase including resource decay,
 * project processing, and end-of-turn cleanup.
 */

import { resourceManagementService } from '../services/domain/ResourceManagementService';
import { stateChangeFormatter } from '../services/formatters/StateChangeFormatter';
import { UpdateResourcesCommand } from '../commands/impl/UpdateResourcesCommand';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { KingdomState, BuildProject } from '../models/KingdomState';
import type { KingdomEvent } from '../models/Events';

export interface ProjectProgress {
    projectId: string;
    resourcesApplied: Map<string, number>;
    remainingCost: Map<string, number>;
    isCompleted: boolean;
}

export interface UpkeepPhaseState {
    foodShortage: number;
    unrestGenerated: number;
    resourcesDecayed: Map<string, number>;
    projectsProcessed: ProjectProgress[];
    unresolvedEvents: KingdomEvent[];
    upkeepCosts: Map<string, number>;
    totalChanges: Map<string, number>;
}

export interface UpkeepDisplayData {
    currentFood: number;
    foodConsumption: number;
    foodShortage: number;
    settlementConsumption: number;
    armyConsumption: number;
    armyCount: number;
    armySupport: number;
    unsupportedCount: number;
    foodRemainingForArmies: number;
    armyFoodShortage: number;
    settlementFoodShortage: number;
}

export class UpkeepPhaseController {
    private state: UpkeepPhaseState;
    
    constructor() {
        this.state = this.createInitialState();
    }
    
    private createInitialState(): UpkeepPhaseState {
        return {
            foodShortage: 0,
            unrestGenerated: 0,
            resourcesDecayed: new Map(),
            projectsProcessed: [],
            unresolvedEvents: [],
            upkeepCosts: new Map(),
            totalChanges: new Map()
        };
    }
    
    /**
     * Process food consumption for settlements and armies
     */
    async processFoodConsumption(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{ success: boolean; shortage: number; unrestGenerated: number; error?: string }> {
        const consumption = resourceManagementService.calculateFoodConsumption(kingdomState);
        
        if (consumption.shortage > 0) {
            // Update feeding status - settlements not fed
            this.updateSettlementFeedingStatus(kingdomState, false);
            
            // Generate unrest for food shortage
            const context: CommandContext = {
                kingdomState,
                currentTurn,
                currentPhase: 'Phase VI: Upkeep'
            };
            
            const command = new UpdateResourcesCommand([
                { resource: 'food', amount: 0, operation: 'set' },
                { resource: 'unrest', amount: consumption.shortage, operation: 'add' }
            ]);
            
            const result = await commandExecutor.execute(command, context);
            
            if (result.success) {
                this.state.foodShortage = consumption.shortage;
                this.state.unrestGenerated = consumption.shortage;
                return { 
                    success: true, 
                    shortage: consumption.shortage, 
                    unrestGenerated: consumption.shortage 
                };
            } else {
                return { 
                    success: false, 
                    shortage: 0, 
                    unrestGenerated: 0, 
                    error: result.error 
                };
            }
        } else {
            // Update feeding status - all settlements fed
            this.updateSettlementFeedingStatus(kingdomState, true);
            
            // Deduct food normally
            const context: CommandContext = {
                kingdomState,
                currentTurn,
                currentPhase: 'Phase VI: Upkeep'
            };
            
            const command = new UpdateResourcesCommand([{
                resource: 'food',
                amount: consumption.food.total,
                operation: 'subtract'
            }]);
            
            const result = await commandExecutor.execute(command, context);
            
            return { 
                success: result.success, 
                shortage: 0, 
                unrestGenerated: 0,
                error: result.error
            };
        }
    }
    
    /**
     * Process upkeep costs (army support, etc.)
     */
    async processUpkeepCosts(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{ success: boolean; costs: Map<string, number>; error?: string }> {
        const costs = resourceManagementService.calculateUpkeepCosts(kingdomState);
        
        if (costs.size === 0) {
            return { success: true, costs: new Map() };
        }
        
        // Check if we can afford upkeep
        const canAfford = resourceManagementService.canAfford(kingdomState, costs);
        
        if (!canAfford) {
            // Generate unrest for unpaid upkeep
            const goldCost = costs.get('gold') || 0;
            const available = kingdomState.resources.get('gold') || 0;
            const shortage = goldCost - available;
            
            const context: CommandContext = {
                kingdomState,
                currentTurn,
                currentPhase: 'Phase VI: Upkeep'
            };
            
            const command = new UpdateResourcesCommand([
                { resource: 'gold', amount: 0, operation: 'set' },
                { resource: 'unrest', amount: shortage, operation: 'add' }
            ]);
            
            await commandExecutor.execute(command, context);
            
            this.state.upkeepCosts = costs;
            this.state.unrestGenerated += shortage;
            
            return { 
                success: true, 
                costs,
                error: `Unable to pay upkeep, generated ${shortage} unrest`
            };
        }
        
        // Deduct upkeep costs
        const context: CommandContext = {
            kingdomState,
            currentTurn,
            currentPhase: 'Phase VI: Upkeep'
        };
        
        const updates = Array.from(costs).map(([resource, amount]) => ({
            resource,
            amount,
            operation: 'subtract' as const
        }));
        
        const command = new UpdateResourcesCommand(updates);
        const result = await commandExecutor.execute(command, context);
        
        if (result.success) {
            this.state.upkeepCosts = costs;
            return { success: true, costs };
        } else {
            return { success: false, costs: new Map(), error: result.error };
        }
    }
    
    /**
     * Process build projects in queue
     */
    processProjects(kingdomState: KingdomState): ProjectProgress[] {
        const progress: ProjectProgress[] = [];
        
        for (const project of kingdomState.buildQueue) {
            const result = resourceManagementService.applyProjectCosts(
                kingdomState,
                project.remainingCost
            );
            
            // Update project remaining cost
            project.remainingCost = result.remaining;
            
            // Check if project is completed
            const isCompleted = Array.from(result.remaining.values())
                .every(cost => cost === 0);
            
            progress.push({
                projectId: project.structureId,
                resourcesApplied: result.applied,
                remainingCost: result.remaining,
                isCompleted
            });
            
            // Remove completed projects from queue
            if (isCompleted) {
                const index = kingdomState.buildQueue.indexOf(project);
                if (index > -1) {
                    kingdomState.buildQueue.splice(index, 1);
                }
            }
        }
        
        this.state.projectsProcessed = progress;
        return progress;
    }
    
    /**
     * Calculate project completion percentage
     */
    getProjectCompletionPercentage(project: BuildProject): number {
        if (!project.totalCost || project.totalCost.size === 0) return 100;
        
        let totalNeeded = 0;
        let totalRemaining = 0;
        
        project.totalCost.forEach((needed: number) => {
            totalNeeded += needed;
        });
        
        project.remainingCost.forEach((amount: number) => {
            totalRemaining += amount;
        });
        
        if (totalNeeded === 0) return 100;
        const invested = totalNeeded - totalRemaining;
        return Math.floor((invested / totalNeeded) * 100);
    }
    
    /**
     * Get remaining cost for a project as a record
     */
    getProjectRemainingCost(project: BuildProject): Record<string, number> {
        const remaining: Record<string, number> = {};
        if (project.remainingCost) {
            project.remainingCost.forEach((amount: number, resource: string) => {
                if (amount > 0) {
                    remaining[resource] = amount;
                }
            });
        }
        return remaining;
    }
    
    /**
     * Process turn-end modifiers
     */
    processEndTurnModifiers(kingdomState: KingdomState): void {
        // Decrement duration if numeric
        kingdomState.modifiers.forEach(modifier => {
            if (typeof modifier.duration === 'number') {
                modifier.duration--;
            }
        });
        
        // Remove expired modifiers
        kingdomState.modifiers = kingdomState.modifiers.filter(modifier => {
            if (typeof modifier.duration === 'number' && modifier.duration <= 0) {
                return false;
            }
            return true;
        });
    }
    
    /**
     * Calculate all display data for the UI
     */
    getDisplayData(kingdomState: KingdomState): UpkeepDisplayData {
        const currentFood = kingdomState.resources.get('food') || 0;
        const foodConsumption = kingdomState.getTotalFoodConsumption();
        const foodShortage = Math.max(0, foodConsumption - currentFood);
        const foodBreakdown = kingdomState.getFoodConsumptionBreakdown();
        const settlementConsumption = foodBreakdown[0];
        const armyConsumption = foodBreakdown[1];
        const armyCount = kingdomState.armies.length;
        const armySupport = kingdomState.getTotalArmySupport();
        const unsupportedCount = kingdomState.getUnsupportedArmies();
        const foodRemainingForArmies = Math.max(0, currentFood - settlementConsumption);
        const armyFoodShortage = Math.max(0, armyConsumption - foodRemainingForArmies);
        const settlementFoodShortage = Math.max(0, settlementConsumption - currentFood);
        
        return {
            currentFood,
            foodConsumption,
            foodShortage,
            settlementConsumption,
            armyConsumption,
            armyCount,
            armySupport,
            unsupportedCount,
            foodRemainingForArmies,
            armyFoodShortage,
            settlementFoodShortage
        };
    }
    
    /**
     * Process military support and generate unrest if needed
     */
    async processMilitarySupport(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{ success: boolean; unrestGenerated: number; error?: string }> {
        const displayData = this.getDisplayData(kingdomState);
        let totalUnrest = 0;
        
        const context: CommandContext = {
            kingdomState,
            currentTurn,
            currentPhase: 'Phase VI: Upkeep'
        };
        
        // Generate unrest for unsupported armies
        if (displayData.unsupportedCount > 0) {
            const command = new UpdateResourcesCommand([{
                resource: 'unrest',
                amount: displayData.unsupportedCount,
                operation: 'add'
            }]);
            
            const result = await commandExecutor.execute(command, context);
            if (result.success) {
                totalUnrest += displayData.unsupportedCount;
            } else {
                return { success: false, unrestGenerated: 0, error: result.error };
            }
        }
        
        // Generate unrest for unfed armies
        if (displayData.armyFoodShortage > 0) {
            const command = new UpdateResourcesCommand([{
                resource: 'unrest',
                amount: displayData.armyFoodShortage,
                operation: 'add'
            }]);
            
            const result = await commandExecutor.execute(command, context);
            if (result.success) {
                totalUnrest += displayData.armyFoodShortage;
            } else {
                return { 
                    success: false, 
                    unrestGenerated: totalUnrest, 
                    error: result.error 
                };
            }
        }
        
        this.state.unrestGenerated += totalUnrest;
        return { success: true, unrestGenerated: totalUnrest };
    }
    
    /**
     * Update settlement feeding status
     */
    updateSettlementFeedingStatus(kingdomState: KingdomState, allFed: boolean): void {
        kingdomState.settlements.forEach(settlement => {
            settlement.wasFedLastTurn = allFed;
        });
    }
    
    /**
     * Check if steps should be auto-completed
     */
    getAutoCompleteSteps(kingdomState: KingdomState): string[] {
        const steps: string[] = [];
        
        // Auto-complete military if no armies
        if (kingdomState.armies.length === 0) {
            steps.push('upkeep-military');
        }
        
        // Auto-complete build if no projects
        if (kingdomState.buildQueue.length === 0) {
            steps.push('upkeep-build');
        }
        
        return steps;
    }
    
    /**
     * Process resource decay at end of turn
     */
    async processResourceDecay(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{ success: boolean; decayed: Map<string, number>; error?: string }> {
        const decay = resourceManagementService.getResourceDecay(kingdomState);
        
        // Apply decay using command for tracking
        const context: CommandContext = {
            kingdomState,
            currentTurn,
            currentPhase: 'Phase VI: Upkeep'
        };
        
        const updates = [
            { resource: 'lumber', amount: 0, operation: 'set' as const },
            { resource: 'stone', amount: 0, operation: 'set' as const },
            { resource: 'ore', amount: 0, operation: 'set' as const }
        ];
        
        const command = new UpdateResourcesCommand(updates);
        const result = await commandExecutor.execute(command, context);
        
        if (result.success) {
            const decayedMap = new Map<string, number>();
            decayedMap.set('lumber', decay.lumber);
            decayedMap.set('stone', decay.stone);
            decayedMap.set('ore', decay.ore);
            
            this.state.resourcesDecayed = decayedMap;
            return { success: true, decayed: decayedMap };
        } else {
            return { success: false, decayed: new Map(), error: result.error };
        }
    }
    
    /**
     * Process unresolved events from previous phases
     */
    processUnresolvedEvents(kingdomState: KingdomState): KingdomEvent[] {
        const unresolved: KingdomEvent[] = [];
        
        // Check for unresolved event in game state
        // This would typically come from the event phase
        if (kingdomState.currentEvent && !this.isEventResolved(kingdomState.currentEvent)) {
            unresolved.push(kingdomState.currentEvent);
            
            // Apply unresolved event effects
            this.applyUnresolvedEventEffects(kingdomState, kingdomState.currentEvent);
        }
        
        this.state.unresolvedEvents = unresolved;
        return unresolved;
    }
    
    /**
     * Check if an event is resolved
     */
    private isEventResolved(event: KingdomEvent): boolean {
        // An event is resolved if it has been successfully handled
        // This logic would depend on your event resolution tracking
        return false; // Placeholder - implement based on your event system
    }
    
    /**
     * Apply effects of unresolved events
     */
    private applyUnresolvedEventEffects(kingdomState: KingdomState, event: KingdomEvent): void {
        // Apply any automatic effects from unresolved events
        // This would need to be implemented based on your event structure
        // For now, we'll add a placeholder that generates some unrest
        
        // Example: Unresolved events generate 1 unrest
        kingdomState.unrest += 1;
        this.state.unrestGenerated += 1;
        
        // Add a modifier to track the unresolved event
        kingdomState.modifiers.push({
            id: `unresolved-${event.name}-${Date.now()}`,
            name: `Unresolved: ${event.name}`,
            description: 'An unresolved event continues to affect the kingdom',
            source: {
                type: 'event',
                id: event.id || event.name,
                name: event.name
            },
            duration: 'until-resolved',
            severity: 'dangerous',
            priority: 1,
            visible: true,
            startTurn: 0,
            effects: {
                unrest: 1
            }
        });
    }
    
    /**
     * Execute complete upkeep phase
     */
    async executePhase(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{
        success: boolean;
        summary: UpkeepPhaseSummary;
        error?: string;
    }> {
        // Process food consumption
        const foodResult = await this.processFoodConsumption(kingdomState, currentTurn);
        if (!foodResult.success) {
            return {
                success: false,
                summary: this.getPhaseSummary(),
                error: foodResult.error
            };
        }
        
        // Process upkeep costs
        const upkeepResult = await this.processUpkeepCosts(kingdomState, currentTurn);
        
        // Process projects
        this.processProjects(kingdomState);
        
        // Process unresolved events
        this.processUnresolvedEvents(kingdomState);
        
        // Process resource decay
        await this.processResourceDecay(kingdomState, currentTurn);
        
        return {
            success: true,
            summary: this.getPhaseSummary()
        };
    }
    
    /**
     * Get summary of phase results
     */
    getPhaseSummary(): UpkeepPhaseSummary {
        return {
            foodShortage: this.state.foodShortage,
            unrestGenerated: this.state.unrestGenerated,
            resourcesDecayed: new Map(this.state.resourcesDecayed),
            projectsCompleted: this.state.projectsProcessed.filter(p => p.isCompleted).length,
            projectsInProgress: this.state.projectsProcessed.filter(p => !p.isCompleted).length,
            unresolvedEventCount: this.state.unresolvedEvents.length,
            upkeepCostsPaid: new Map(this.state.upkeepCosts)
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
    getState(): UpkeepPhaseState {
        return {
            ...this.state,
            resourcesDecayed: new Map(this.state.resourcesDecayed),
            projectsProcessed: [...this.state.projectsProcessed],
            unresolvedEvents: [...this.state.unresolvedEvents],
            upkeepCosts: new Map(this.state.upkeepCosts),
            totalChanges: new Map(this.state.totalChanges)
        };
    }
}

export interface UpkeepPhaseSummary {
    foodShortage: number;
    unrestGenerated: number;
    resourcesDecayed: Map<string, number>;
    projectsCompleted: number;
    projectsInProgress: number;
    unresolvedEventCount: number;
    upkeepCostsPaid: Map<string, number>;
}

// Export factory function
export function createUpkeepPhaseController(): UpkeepPhaseController {
    return new UpkeepPhaseController();
}
