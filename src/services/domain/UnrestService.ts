/**
 * UnrestService - Handles unrest calculations and incident management
 * 
 * This service manages unrest tiers, incident generation, and resolution
 * according to the Reignmaker Lite rules.
 */

import { diceService } from './DiceService';
import type { KingdomData } from '../../actors/KingdomActor';
import type { KingdomIncident } from '../../controllers/incidents/types';
import type { Settlement } from '../../models/Settlement';
import { SettlementTier } from '../../models/Settlement';

// Incident severity type
export type IncidentSeverity = 'minor' | 'moderate' | 'major';

// Type alias for compatibility
type Incident = KingdomIncident;

export interface UnrestStatus {
    currentUnrest: number;
    imprisonedUnrest: number;
    tier: number;
    tierName: string;
    penalty: number;
    incidentSeverity: IncidentSeverity | null;
}

export interface IncidentCheckResult {
    roll: number;
    incident: Incident | null;
    severity: IncidentSeverity | null;
}

export interface IncidentResolutionResult {
    success: boolean;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    effects: Map<string, number>;
    message: string;
}

export class UnrestService {
    /**
     * Calculate current unrest status
     */
    getUnrestStatus(kingdomData: KingdomData): UnrestStatus {
        const currentUnrest = kingdomData.unrest || 0;
        const imprisonedUnrest = kingdomData.imprisonedUnrest || 0;
        
        // Calculate tier based on unrest value
        const tier = this.getUnrestTier(currentUnrest);
        const tierName = this.getUnrestTierName(tier);
        const penalty = this.getUnrestPenalty(currentUnrest);
        const incidentSeverity = this.getIncidentSeverity(tier);
        
        return {
            currentUnrest,
            imprisonedUnrest,
            tier,
            tierName,
            penalty,
            incidentSeverity
        };
    }
    
    /**
     * Get unrest tier from unrest value
     */
    private getUnrestTier(unrest: number): number {
        if (unrest >= 15) return 3;  // Rebellion
        if (unrest >= 10) return 2;  // Unrest
        if (unrest >= 5) return 1;   // Discontent
        return 0;                     // Stable
    }
    
    /**
     * Get tier name
     */
    private getUnrestTierName(tier: number): string {
        const names = ['Stable', 'Discontent', 'Unrest', 'Rebellion'];
        return names[tier] || 'Stable';
    }
    
    /**
     * Get unrest penalty
     */
    private getUnrestPenalty(unrest: number): number {
        if (unrest >= 15) return -4;
        if (unrest >= 10) return -2;
        if (unrest >= 5) return -1;
        return 0;
    }
    
    /**
     * Roll for incidents based on current unrest tier
     * Note: This is now handled by IncidentProvider, this is just for compatibility
     */
    rollForIncident(tier?: number): IncidentCheckResult {
        // If no tier is provided, return no incident
        if (!tier || tier === 0) {
            return {
                roll: 0,
                incident: null,
                severity: null
            };
        }
        
        // Map tier to severity
        const severity = this.getIncidentSeverity(tier);
        
        // Note: Actual incident selection is now done by IncidentProvider
        // This method is just for status/compatibility
        return {
            roll: 1,
            incident: null,  // Will be populated by IncidentProvider
            severity
        };
    }
    
    /**
     * Resolve an incident with a skill check
     * Note: This now uses the new event-based structure
     */
    resolveIncident(
        incident: Incident,
        skill: string,
        rollTotal: number,
        dc: number = 15
    ): IncidentResolutionResult {
        const outcome = diceService.calculateSuccessDegree(rollTotal, dc, rollTotal);
        const effects = new Map<string, number>();
        let message = '';
        
        // Get the appropriate outcome from the new structure
        const effectsData = incident.effects;
        let eventOutcome;
        
        switch (outcome) {
            case 'criticalSuccess':
                eventOutcome = effectsData.criticalSuccess;
                message = eventOutcome?.msg || 'The incident is resolved favorably';
                break;
                
            case 'success':
                eventOutcome = effectsData.success;
                message = eventOutcome?.msg || 'The incident is resolved';
                break;
                
            case 'failure':
                eventOutcome = effectsData.failure;
                message = eventOutcome?.msg || 'Failed to resolve the incident';
                break;
                
            case 'criticalFailure':
                eventOutcome = effectsData.criticalFailure;
                message = eventOutcome?.msg || 'The incident worsens dramatically';
                break;
        }
        
        // Apply modifiers from the outcome
        if (eventOutcome?.modifiers) {
            for (const modifier of eventOutcome.modifiers) {
                if (modifier.duration === 'immediate') {
                    const current = effects.get(modifier.resource) || 0;
                    effects.set(modifier.resource, current + modifier.value);
                }
            }
        }
        
        return {
            success: outcome === 'success' || outcome === 'criticalSuccess',
            outcome,
            effects,
            message
        };
    }
    
    /**
     * Calculate unrest generation from various sources
     */
    calculateUnrestGeneration(kingdomData: KingdomData): Record<string, number> {
        const sources: Record<string, number> = {};
        
        // Food shortage - calculate based on consumption vs available
        const totalFood = this.calculateTotalFoodConsumption(kingdomData);
        const availableFood = kingdomData.resources.food || 0;
        const foodShortage = Math.max(0, totalFood - availableFood);
        if (foodShortage > 0) {
            sources.foodShortage = foodShortage;
        }
        
        // Unsupported armies
        const unsupportedArmies = this.calculateUnsupportedArmies(kingdomData);
        if (unsupportedArmies > 0) {
            sources.unsupportedArmies = unsupportedArmies;
        }
        
        // War status
        if (kingdomData.isAtWar) {
            sources.atWar = 1; // Being at war adds 1 unrest per turn
        }
        
        return sources;
    }
    
    /**
     * Calculate total food consumption
     */
    private calculateTotalFoodConsumption(kingdomData: KingdomData): number {
        const settlementFood = kingdomData.settlements.reduce((sum, settlement) => {
            switch (settlement.tier) {
                case SettlementTier.VILLAGE: return sum + 1;
                case SettlementTier.TOWN: return sum + 4;
                case SettlementTier.CITY: return sum + 8;
                case SettlementTier.METROPOLIS: return sum + 12;
                default: return sum;
            }
        }, 0);
        
        return settlementFood + kingdomData.armies.length;
    }
    
    /**
     * Calculate unsupported armies
     */
    private calculateUnsupportedArmies(kingdomData: KingdomData): number {
        const totalSupport = kingdomData.settlements.reduce((sum, settlement) => {
            switch (settlement.tier) {
                case SettlementTier.VILLAGE: return sum + 1;
                case SettlementTier.TOWN: return sum + 2;
                case SettlementTier.CITY: return sum + 3;
                case SettlementTier.METROPOLIS: return sum + 4;
                default: return sum;
            }
        }, 0);
        
        return Math.max(0, kingdomData.armies.length - totalSupport);
    }
    
    /**
     * Process imprisoned unrest release/conversion
     */
    processImprisonedUnrest(
        currentImprisoned: number,
        action: 'release' | 'convert',
        amount?: number
    ): { imprisonedChange: number; unrestChange: number } {
        let imprisonedChange = 0;
        let unrestChange = 0;
        
        if (action === 'release') {
            // Release imprisoned unrest back to regular unrest
            const releaseAmount = amount || currentImprisoned;
            const actualRelease = Math.min(releaseAmount, currentImprisoned);
            
            imprisonedChange = -actualRelease;
            unrestChange = actualRelease;
        } else if (action === 'convert') {
            // Convert regular unrest to imprisoned
            const convertAmount = amount || 0;
            
            imprisonedChange = convertAmount;
            unrestChange = -convertAmount;
        }
        
        return { imprisonedChange, unrestChange };
    }
    
    /**
     * Get the tier name with appropriate styling class
     */
    getTierStyleClass(tierName: string): string {
        const name = tierName.toLowerCase();
        if (name === 'stable') return 'stable';
        if (name === 'discontent') return 'discontent';
        if (name === 'unrest') return 'unrest';
        if (name === 'rebellion') return 'rebellion';
        return 'stable';
    }
    
    /**
     * Check if incidents should be checked this phase
     */
    shouldCheckForIncidents(tier: number): boolean {
        return tier > 0;
    }
    
    /**
     * Get incident severity from tier
     */
    getIncidentSeverity(tier: number): IncidentSeverity | null {
        switch (tier) {
            case 1:
                return 'minor';
            case 2:
                return 'moderate';
            case 3:
                return 'major';
            default:
                return null;
        }
    }
}

// Export singleton instance
export const unrestService = new UnrestService();
