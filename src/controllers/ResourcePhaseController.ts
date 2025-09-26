/**
 * ResourcePhaseController - Orchestrates resource collection phase operations
 * 
 * This controller coordinates resource collection, production tracking,
 * and gold income from settlements.
 */

import { economicsService, type ResourceCollectionResult } from '../services/economics';
import { resourceManagementService } from '../services/domain/ResourceManagementService';
import { UpdateResourcesCommand } from '../commands/impl/UpdateResourcesCommand';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { KingdomState } from '../models/KingdomState';
import type { Hex } from '../models/Hex';
import type { Settlement } from '../models/Settlement';

export interface ResourcePhaseState {
    collectionCompleted: boolean;
    lastCollectionResult: ResourceCollectionResult | null;
    totalResources: Map<string, number>;
    potentialCollection: ResourceCollectionResult | null;
}

export interface ResourceCollectionSummary {
    hexProduction: Map<string, number>;
    goldIncome: number;
    totalCollected: Map<string, number>;
    fedSettlementsCount: number;
    unfedSettlementsCount: number;
}

export class ResourcePhaseController {
    private state: ResourcePhaseState;
    
    constructor() {
        this.state = this.createInitialState();
    }
    
    private createInitialState(): ResourcePhaseState {
        return {
            collectionCompleted: false,
            lastCollectionResult: null,
            totalResources: new Map(),
            potentialCollection: null
        };
    }
    
    /**
     * Calculate potential resources that would be collected this turn
     */
    calculatePotentialCollection(kingdomState: KingdomState): ResourceCollectionResult {
        const result = economicsService.collectTurnResources({
            hexes: kingdomState.hexes,
            settlements: kingdomState.settlements,
            cachedProduction: kingdomState.cachedProduction,
            cachedProductionByHex: kingdomState.cachedProductionByHex
        });
        
        this.state.potentialCollection = result;
        return result;
    }
    
    /**
     * Execute resource collection for the turn
     */
    async collectResources(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{
        success: boolean;
        result?: ResourceCollectionResult;
        error?: string;
    }> {
        // Check if already collected
        if (this.state.collectionCompleted) {
            return {
                success: false,
                error: 'Resources have already been collected this phase'
            };
        }
        
        try {
            // Calculate resources to collect
            const collectionResult = economicsService.collectTurnResources({
                hexes: kingdomState.hexes,
                settlements: kingdomState.settlements,
                cachedProduction: kingdomState.cachedProduction,
                cachedProductionByHex: kingdomState.cachedProductionByHex
            });
            
            // Store result for display
            this.state.lastCollectionResult = collectionResult;
            
            // Create command context
            const context: CommandContext = {
                kingdomState,
                currentTurn,
                currentPhase: 'Phase II: Resources'
            };
            
            // Build resource updates from collection result
            const updates: any[] = [];
            collectionResult.totalCollected.forEach((amount, resource) => {
                if (amount > 0) {
                    updates.push({
                        resource,
                        amount,
                        operation: 'add' as const
                    });
                }
            });
            
            // Execute resource updates through command
            if (updates.length > 0) {
                const command = new UpdateResourcesCommand(updates);
                const result = await commandExecutor.execute(command, context);
                
                if (!result.success) {
                    return {
                        success: false,
                        error: result.error || 'Failed to update resources'
                    };
                }
            }
            
            // Mark collection as completed
            this.state.collectionCompleted = true;
            
            // Update total resources
            collectionResult.totalCollected.forEach((amount, resource) => {
                const current = this.state.totalResources.get(resource) || 0;
                this.state.totalResources.set(resource, current + amount);
            });
            
            return {
                success: true,
                result: collectionResult
            };
        } catch (error) {
            console.error('Error collecting resources:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    
    /**
     * Get resource production breakdown by hex
     */
    getProductionByHex(kingdomState: KingdomState): Map<string, Map<string, number>> {
        const productionByHex = new Map<string, Map<string, number>>();
        
        kingdomState.hexes.forEach(hex => {
            if (hex.worksite) {
                const production = hex.getProduction();
                if (production.size > 0) {
                    productionByHex.set(hex.id, production);
                }
            }
        });
        
        return productionByHex;
    }
    
    /**
     * Get total production for all resources
     */
    getTotalProduction(kingdomState: KingdomState): Map<string, number> {
        const totalProduction = new Map<string, number>();
        
        kingdomState.hexes.forEach(hex => {
            if (hex.worksite) {
                const production = hex.getProduction();
                production.forEach((amount: number, resource: string) => {
                    const current = totalProduction.get(resource) || 0;
                    totalProduction.set(resource, current + amount);
                });
            }
        });
        
        return totalProduction;
    }
    
    /**
     * Calculate gold income from settlements
     */
    calculateGoldIncome(settlements: Settlement[]): {
        totalGold: number;
        fedCount: number;
        unfedCount: number;
    } {
        let totalGold = 0;
        let fedCount = 0;
        let unfedCount = 0;
        
        settlements.forEach(settlement => {
            if (settlement.wasFedLastTurn !== false) {
                totalGold += settlement.goldIncome || 0;
                fedCount++;
            } else {
                unfedCount++;
            }
        });
        
        return {
            totalGold,
            fedCount,
            unfedCount
        };
    }
    
    /**
     * Get worksite details for display
     */
    getWorksiteDetails(hexes: Hex[]): Array<{
        hexName: string;
        terrain: string;
        production: Map<string, number>;
    }> {
        const details: Array<{
            hexName: string;
            terrain: string;
            production: Map<string, number>;
        }> = [];
        
        hexes.forEach(hex => {
            if (hex.worksite) {
                const production = hex.getProduction();
                if (production.size > 0) {
                    details.push({
                        hexName: hex.name || hex.id || 'Unnamed Hex',
                        terrain: hex.terrain || 'Unknown',
                        production: production
                    });
                }
            }
        });
        
        return details;
    }
    
    /**
     * Check if resources have been collected
     */
    isCollectionCompleted(): boolean {
        return this.state.collectionCompleted;
    }
    
    /**
     * Get last collection result
     */
    getLastCollectionResult(): ResourceCollectionResult | null {
        return this.state.lastCollectionResult;
    }
    
    /**
     * Get potential collection (preview)
     */
    getPotentialCollection(): ResourceCollectionResult | null {
        return this.state.potentialCollection;
    }
    
    /**
     * Get total resources collected this phase
     */
    getTotalResourcesCollected(): Map<string, number> {
        return new Map(this.state.totalResources);
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
    getState(): ResourcePhaseState {
        return {
            ...this.state,
            totalResources: new Map(this.state.totalResources)
        };
    }
    
    /**
     * Get phase summary
     */
    getPhaseSummary(): ResourceCollectionSummary | null {
        if (!this.state.lastCollectionResult) {
            return null;
        }
        
        const result = this.state.lastCollectionResult;
        return {
            hexProduction: result.hexProduction,
            goldIncome: result.goldIncome,
            totalCollected: result.totalCollected,
            fedSettlementsCount: result.fedSettlementsCount,
            unfedSettlementsCount: result.unfedSettlementsCount
        };
    }
}

// Export factory function
export function createResourcePhaseController(): ResourcePhaseController {
    return new ResourcePhaseController();
}
