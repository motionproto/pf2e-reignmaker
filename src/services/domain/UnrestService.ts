/**
 * UnrestService - Handles unrest calculations and incident management
 * 
 * This service manages unrest tiers, incident generation, and resolution
 * according to the Reignmaker Lite rules.
 */

import { diceService } from './DiceService';
import type { KingdomState } from '../../models/KingdomState';
import type { Incident, IncidentLevel } from '../../models/Incidents';
import { IncidentManager } from '../../models/Incidents';

export interface UnrestStatus {
    currentUnrest: number;
    imprisonedUnrest: number;
    tier: number;
    tierName: string;
    penalty: number;
    incidentLevel: IncidentLevel | null;
}

export interface IncidentCheckResult {
    roll: number;
    incident: Incident | null;
    level: IncidentLevel | null;
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
    getUnrestStatus(state: KingdomState): UnrestStatus {
        const currentUnrest = state.unrest || 0;
        const imprisonedUnrest = state.imprisonedUnrest || 0;
        const tier = IncidentManager.getUnrestTier(currentUnrest);
        const tierName = IncidentManager.getUnrestTierName(tier);
        const penalty = IncidentManager.getUnrestPenalty(currentUnrest);
        const incidentLevel = IncidentManager.getIncidentLevel(tier);
        
        return {
            currentUnrest,
            imprisonedUnrest,
            tier,
            tierName,
            penalty,
            incidentLevel
        };
    }
    
    /**
     * Roll for incidents based on current unrest tier
     */
    rollForIncident(tier: number): IncidentCheckResult {
        if (tier === 0) {
            return {
                roll: 0,
                incident: null,
                level: null
            };
        }
        
        const roll = diceService.rollD100();
        // Pass the roll to IncidentManager to use the same roll for determination
        const incident = IncidentManager.rollForIncident(tier, roll);
        const level = IncidentManager.getIncidentLevel(tier);
        
        return {
            roll,
            incident,
            level
        };
    }
    
    /**
     * Resolve an incident with a skill check
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
        
        switch (outcome) {
            case 'criticalSuccess':
                message = 'The incident is resolved favorably';
                // Critical success might reduce unrest
                effects.set('unrest', -1);
                break;
                
            case 'success':
                message = incident.successEffect || 'The incident is resolved';
                // Success typically resolves without additional effects
                break;
                
            case 'failure':
                message = incident.failureEffect || 'Failed to resolve the incident';
                // Failure might add unrest based on incident level
                effects.set('unrest', incident.level === 'MAJOR' ? 2 : 1);
                break;
                
            case 'criticalFailure':
                message = incident.criticalFailureEffect || 'The incident worsens dramatically';
                // Critical failure adds more unrest
                effects.set('unrest', incident.level === 'MAJOR' ? 3 : 2);
                break;
        }
        
        return {
            success: outcome === 'success' || outcome === 'criticalSuccess',
            outcome,
            effects,
            message
        };
    }
    
    /**
     * Apply incident effects to the effects map
     */
    private applyIncidentEffects(
        incidentEffects: any,
        effects: Map<string, number>
    ): void {
        // Parse incident effects based on the structure
        if (incidentEffects.unrest !== undefined) {
            effects.set('unrest', incidentEffects.unrest);
        }
        
        if (incidentEffects.gold !== undefined) {
            effects.set('gold', incidentEffects.gold);
        }
        
        if (incidentEffects.resources !== undefined) {
            // Generic resources affect lumber, stone, and ore
            effects.set('lumber', incidentEffects.resources);
            effects.set('stone', incidentEffects.resources);
            effects.set('ore', incidentEffects.resources);
        }
        
        if (incidentEffects.fame !== undefined) {
            effects.set('fame', incidentEffects.fame);
        }
    }
    
    /**
     * Calculate unrest generation from various sources
     */
    calculateUnrestGeneration(state: KingdomState): Map<string, number> {
        const sources = new Map<string, number>();
        
        // Food shortage
        const foodShortage = state.calculateFoodShortage();
        if (foodShortage > 0) {
            sources.set('foodShortage', foodShortage);
        }
        
        // Unsupported armies
        const unsupportedArmies = state.getUnsupportedArmies();
        if (unsupportedArmies > 0) {
            sources.set('unsupportedArmies', unsupportedArmies);
        }
        
        // War status
        if (state.isAtWar) {
            sources.set('atWar', 2); // Being at war adds 2 unrest per turn
        }
        
        return sources;
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
     * Get incident severity level
     */
    getIncidentSeverity(level: IncidentLevel | null): 'minor' | 'moderate' | 'major' | null {
        if (!level) return null;
        
        switch (level) {
            case 'MINOR':
                return 'minor';
            case 'MODERATE': 
                return 'moderate';
            case 'MAJOR':
                return 'major';
            default:
                return null;
        }
    }
}

// Export singleton instance
export const unrestService = new UnrestService();
