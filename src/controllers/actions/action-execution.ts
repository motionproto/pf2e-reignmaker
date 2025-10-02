/**
 * ActionExecutionService - Handles player action execution and validation
 * 
 * This service manages action requirements, outcome parsing, and state changes
 * for kingdom actions according to the Reignmaker Lite rules.
 */

import { diceService } from '../../services/domain/DiceService';
import type { PlayerAction } from '../../models/PlayerActions';
import type { KingdomData } from '../../actors/KingdomActor';
import {
    getLevelBasedDC,
    hasRequiredResources
} from '../shared/resolution-service';

export interface ActionRequirement {
    met: boolean;
    reason?: string;
    requiredResources?: Map<string, number>;
    missingResources?: Map<string, number>;
}

export interface ParsedActionEffect {
    unrest?: number;
    gold?: number;
    resources?: number;
    food?: number;
    lumber?: number;
    stone?: number;
    ore?: number;
    fame?: number;
    hexesClaimed?: number | string;
    structuresBuilt?: number;
    roadsBuilt?: string;
    armyRecruited?: boolean;
    structureCostReduction?: string;
    imprisonedUnrest?: number;
    imprisonedUnrestRemoved?: number | string;
    settlementFounded?: boolean;
    armyLevel?: number;
    meta?: { nextActionBonus?: number };
}

export interface ActionOutcome {
    stateChanges: Map<string, any>;
    messages: string[];
    sideEffects?: string[];
}

export class ActionExecutionService {
    /**
     * Check if an action can be performed based on kingdom state
     */
    checkActionRequirements(
        action: PlayerAction,
        kingdomData: KingdomData
    ): ActionRequirement {
        // Check specific action-based requirements
        const specificCheck = this.checkSpecificActionRequirements(action, kingdomData);
        if (!specificCheck.met) {
            return specificCheck;
        }
        
        // Check resource costs using shared utility
        if (action.cost && action.cost.size > 0) {
            const resourceCheck = hasRequiredResources(kingdomData, action.cost);
            
            if (!resourceCheck.valid) {
                return {
                    met: false,
                    reason: 'Insufficient resources',
                    requiredResources: action.cost,
                    missingResources: resourceCheck.missing
                };
            }
        }
        
        return { met: true };
    }
    
    /**
     * Check specific action-based requirements
     */
    private checkSpecificActionRequirements(
        action: PlayerAction,
        kingdomData: KingdomData
    ): ActionRequirement {
        switch (action.id) {
            case 'arrest-dissidents':
                // Needs a justice structure with capacity (simplified check)
                // In full implementation, would check for specific structures
                if (kingdomData.unrest === 0) {
                    return {
                        met: false,
                        reason: 'No unrest to arrest'
                    };
                }
                break;
                
            case 'execute-pardon-prisoners':
            case 'execute-or-pardon-prisoners':
                if (kingdomData.imprisonedUnrest <= 0) {
                    return {
                        met: false,
                        reason: 'No imprisoned unrest to resolve'
                    };
                }
                break;
                
            case 'disband-army':
                if (kingdomData.armies.length === 0) {
                    return {
                        met: false,
                        reason: 'No armies to disband'
                    };
                }
                break;
                
            case 'deploy-army':
            case 'outfit-army':
            case 'recover-army':
            case 'train-army':
                if (kingdomData.armies.length === 0) {
                    return {
                        met: false,
                        reason: 'No armies available'
                    };
                }
                break;
                
            case 'upgrade-settlement':
                if (kingdomData.settlements.length === 0) {
                    return {
                        met: false,
                        reason: 'No settlements to upgrade'
                    };
                }
                break;
        }
        
        return { met: true };
    }
    
    /**
     * Parse action outcome text to extract state changes
     */
    parseActionOutcome(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): ParsedActionEffect {
        const effect = action[outcome];
        const parsed: ParsedActionEffect = {};
        
        if (!effect?.description) return parsed;
        
        const description = effect.description.toLowerCase();
        
        // Parse unrest changes
        this.parseUnrestChanges(description, parsed);
        
        // Parse gold changes
        this.parseGoldChanges(description, parsed);
        
        // Parse resource changes
        this.parseResourceChanges(description, parsed);
        
        // Parse fame changes
        this.parseFameChanges(description, parsed);
        
        // Parse structure-related changes
        this.parseStructureChanges(description, parsed);
        
        // Parse hex and territory changes
        this.parseHexChanges(description, parsed);
        
        // Parse army-related changes
        this.parseArmyChanges(description, parsed);
        
        // Parse imprisoned unrest changes
        this.parseImprisonedUnrestChanges(description, parsed);
        
        // Apply any explicit modifiers from the action
        if (effect.modifiers) {
            Object.assign(parsed, effect.modifiers);
        }
        
        return parsed;
    }
    
    private parseUnrestChanges(description: string, parsed: ParsedActionEffect): void {
        // Reduction patterns
        const reduceMatch = description.match(/reduce (?:current )?unrest by (\d+)/);
        if (reduceMatch) {
            parsed.unrest = -parseInt(reduceMatch[1]);
            return;
        }
        
        // Addition patterns
        if (description.includes('+1 unrest')) {
            parsed.unrest = 1;
        } else if (description.includes('+2 unrest')) {
            parsed.unrest = 2;
        } else if (description.includes('+1d4 unrest')) {
            parsed.unrest = diceService.rollD4();
        } else if (description.includes('gain 1 unrest')) {
            parsed.unrest = 1;
        } else if (description.includes('gain 1 current unrest')) {
            parsed.unrest = 1;
        }
    }
    
    private parseGoldChanges(description: string, parsed: ParsedActionEffect): void {
        // Gain patterns
        const gainMatch = description.match(/gain (\d+) gold/);
        if (gainMatch) {
            parsed.gold = parseInt(gainMatch[1]);
            return;
        }
        
        if (description.includes('gain double')) {
            parsed.gold = 'double amount' as any;
            return;
        }
        
        // Loss patterns
        const loseMatch = description.match(/lose (\d+) gold/);
        if (loseMatch) {
            parsed.gold = -parseInt(loseMatch[1]);
            return;
        }
        
        // Conversion patterns
        if (description.includes('→ 1 gold')) {
            parsed.gold = 1;
        } else if (description.includes('→ 2 gold')) {
            parsed.gold = 2;
        }
    }
    
    private parseResourceChanges(description: string, parsed: ParsedActionEffect): void {
        const resourceMatch = description.match(/gain (\d+) (?:resource|resources)/);
        if (resourceMatch) {
            parsed.resources = parseInt(resourceMatch[1]);
        }
        
        // Specific resource types
        const types = ['food', 'lumber', 'stone', 'ore'];
        for (const type of types) {
            const typeMatch = description.match(new RegExp(`gain (\\d+) ${type}`));
            if (typeMatch) {
                parsed[type as keyof ParsedActionEffect] = parseInt(typeMatch[1]) as any;
            }
        }
    }
    
    private parseFameChanges(description: string, parsed: ParsedActionEffect): void {
        if (description.includes('-1 fame')) {
            parsed.fame = -1;
        } else if (description.includes('+1 fame')) {
            parsed.fame = 1;
        }
    }
    
    private parseStructureChanges(description: string, parsed: ParsedActionEffect): void {
        if (description.includes('+1 structure')) {
            parsed.structuresBuilt = 1;
        } else if (description.includes('build structures for half cost')) {
            parsed.structureCostReduction = '50%';
        } else if (description.includes('build 1 structure')) {
            parsed.structuresBuilt = 1;
        }
    }
    
    private parseHexChanges(description: string, parsed: ParsedActionEffect): void {
        const claimMatch = description.match(/claim.*?(\d+).*?hex/);
        if (claimMatch) {
            parsed.hexesClaimed = parseInt(claimMatch[1]);
        } else if (description.includes('claim targeted hexes')) {
            parsed.hexesClaimed = 'varies by proficiency';
        } else if (description.includes('+1 extra hex')) {
            parsed.hexesClaimed = '+1 extra';
        }
        
        // Road building
        if (description.includes('build roads')) {
            if (description.includes('+1 hex')) {
                parsed.roadsBuilt = '+1 hex';
            } else {
                parsed.roadsBuilt = 'standard';
            }
        }
    }
    
    private parseArmyChanges(description: string, parsed: ParsedActionEffect): void {
        if (description.includes('recruit')) {
            parsed.armyRecruited = true;
        }
    }
    
    private parseImprisonedUnrestChanges(description: string, parsed: ParsedActionEffect): void {
        const convertMatch = description.match(/convert (\d+) unrest to imprisoned/);
        if (convertMatch) {
            parsed.unrest = -parseInt(convertMatch[1]);
            parsed.imprisonedUnrest = parseInt(convertMatch[1]);
        } else if (description.includes('remove all imprisoned unrest')) {
            parsed.imprisonedUnrestRemoved = 'all';
        } else if (description.includes('remove 1d4 imprisoned unrest')) {
            parsed.imprisonedUnrestRemoved = diceService.rollD4();
        }
    }
    
    /**
     * Execute an action and calculate state changes
     */
    executeAction(
        action: PlayerAction,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        kingdomData: KingdomData
    ): ActionOutcome {
        const parsedEffects = this.parseActionOutcome(action, outcome);
        const stateChanges = new Map<string, any>();
        const messages: string[] = [];
        const sideEffects: string[] = [];
        
        // Convert parsed effects to state changes
        for (const [key, value] of Object.entries(parsedEffects)) {
            if (value !== undefined) {
                stateChanges.set(key, value);
            }
        }
        
        // Add outcome message
        const effect = action[outcome];
        if (effect?.description) {
            messages.push(effect.description);
        }
        
        // Handle special action-specific logic
        this.applySpecialActionEffects(action, outcome, stateChanges, sideEffects);
        
        return { stateChanges, messages, sideEffects };
    }
    
    /**
     * Apply special action-specific effects
     */
    private applySpecialActionEffects(
        action: PlayerAction,
        outcome: string,
        stateChanges: Map<string, any>,
        sideEffects: string[]
    ): void {
        // Aid Another provides a bonus to the aided action
        if (action.id === 'aid-another' && (outcome === 'success' || outcome === 'criticalSuccess')) {
            const bonusValue = outcome === 'criticalSuccess' ? 'proficiency+reroll' : 'proficiency';
            stateChanges.set('meta', { aidBonus: bonusValue });
            sideEffects.push('Aided action gains a bonus based on your proficiency');
        }
        
        // Hire Adventurers might resolve events
        if (action.id === 'hire-adventurers' && outcome === 'criticalSuccess') {
            sideEffects.push('Resolves one continuous event');
        }
        
        // Deal with Unrest has scaling effects
        if (action.id === 'deal-with-unrest') {
            const currentUnrest = stateChanges.get('unrest') || 0;
            if (outcome === 'criticalSuccess' && currentUnrest < -2) {
                // Cap unrest reduction at -3 for critical success
                stateChanges.set('unrest', -3);
            }
        }
    }
    
    /**
     * Get available actions for a category
     */
    getAvailableActions(
        category: string,
        kingdomData: KingdomData,
        allActions: PlayerAction[]
    ): PlayerAction[] {
        return allActions
            .filter(action => action.category === category)
            .filter(action => this.checkActionRequirements(action, kingdomData).met);
    }
    
    /**
     * Calculate DC for an action based on character level
     */
    getActionDC(characterLevel: number): number {
        // Use shared level-based DC calculation
        return getLevelBasedDC(characterLevel);
    }
}

// Export singleton instance
export const actionExecutionService = new ActionExecutionService();
