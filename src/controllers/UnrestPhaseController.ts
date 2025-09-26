/**
 * UnrestPhaseController - Orchestrates unrest phase operations
 * 
 * This controller coordinates between services, commands, and stores
 * to handle all unrest phase business logic without UI concerns.
 */

import { unrestService } from '../services/domain/UnrestService';
import { stateChangeFormatter } from '../services/formatters/StateChangeFormatter';
import { commandExecutor } from '../commands/base/CommandExecutor';
import type { CommandContext } from '../commands/base/Command';
import type { KingdomState } from '../models/KingdomState';
import type { Incident } from '../models/Incidents';

export interface IncidentResolution {
    incident: Incident;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    skillUsed?: string;
    actorName?: string;
    effects: Map<string, any>;
    formattedEffects?: any[];
    message: string;
}

export interface UnrestPhaseState {
    currentIncident: Incident | null;
    incidentRoll: number;
    incidentResolved: boolean;
    incidentResolution?: IncidentResolution;
    unrestSources: Map<string, number>;
    totalUnrestGenerated: number;
}

export class UnrestPhaseController {
    private state: UnrestPhaseState;
    
    constructor() {
        this.state = this.createInitialState();
    }
    
    private createInitialState(): UnrestPhaseState {
        return {
            currentIncident: null,
            incidentRoll: 0,
            incidentResolved: false,
            incidentResolution: undefined,
            unrestSources: new Map(),
            totalUnrestGenerated: 0
        };
    }
    
    /**
     * Get current unrest status
     */
    getUnrestStatus(kingdomState: KingdomState) {
        return unrestService.getUnrestStatus(kingdomState);
    }
    
    /**
     * Calculate unrest generation from all sources
     */
    calculateUnrestGeneration(kingdomState: KingdomState): {
        sources: Map<string, number>;
        total: number;
        breakdown: Array<{ source: string; amount: number; formatted: string }>;
    } {
        const sources = unrestService.calculateUnrestGeneration(kingdomState);
        let total = 0;
        const breakdown: Array<{ source: string; amount: number; formatted: string }> = [];
        
        for (const [source, amount] of sources) {
            total += amount;
            breakdown.push({
                source,
                amount,
                formatted: stateChangeFormatter.formatLabel(source)
            });
        }
        
        // Update state
        this.state.unrestSources = sources;
        this.state.totalUnrestGenerated = total;
        
        return { sources, total, breakdown };
    }
    
    /**
     * Roll for incident based on current tier
     */
    rollForIncident(tier: number): {
        roll: number;
        incident: Incident | null;
        level: 'MINOR' | 'MODERATE' | 'MAJOR' | null;
        shouldCheck: boolean;
    } {
        // Check if incidents should be checked this tier
        const shouldCheck = unrestService.shouldCheckForIncidents(tier);
        
        if (!shouldCheck) {
            return {
                roll: 0,
                incident: null,
                level: null,
                shouldCheck: false
            };
        }
        
        const result = unrestService.rollForIncident(tier);
        
        // Update state
        this.state.currentIncident = result.incident;
        this.state.incidentRoll = result.roll;
        
        return {
            roll: result.roll,
            incident: result.incident,
            level: result.level,
            shouldCheck: true
        };
    }
    
    /**
     * Resolve an incident with a skill check
     */
    async resolveIncident(
        incident: Incident,
        skill: string,
        rollTotal: number,
        dc: number,
        actorName?: string
    ): Promise<{
        success: boolean;
        resolution?: IncidentResolution;
        error?: string;
    }> {
        if (this.state.incidentResolved) {
            return {
                success: false,
                error: 'Incident has already been resolved'
            };
        }
        
        const result = unrestService.resolveIncident(
            incident,
            skill,
            rollTotal,
            dc
        );
        
        // Format effects for display
        const formattedEffects = stateChangeFormatter.formatStateChanges(
            result.effects
        );
        
        // Create resolution record
        const resolution: IncidentResolution = {
            incident,
            outcome: result.outcome,
            skillUsed: skill,
            actorName: actorName || 'The Kingdom',
            effects: result.effects,
            formattedEffects,
            message: result.message
        };
        
        // Update state
        this.state.incidentResolved = true;
        this.state.incidentResolution = resolution;
        
        return {
            success: true,
            resolution
        };
    }
    
    /**
     * Process imprisoned unrest actions (execute or pardon)
     */
    processImprisonedUnrest(
        currentImprisoned: number,
        action: 'execute' | 'pardon',
        amount?: number
    ): {
        imprisonedChange: number;
        unrestChange: number;
        message: string;
    } {
        const result = unrestService.processImprisonedUnrest(
            currentImprisoned,
            action === 'execute' ? 'release' : 'convert',
            amount
        );
        
        let message = '';
        if (action === 'execute') {
            const released = Math.abs(result.imprisonedChange);
            message = `Executed prisoners, releasing ${released} imprisoned unrest`;
        } else {
            const converted = Math.abs(result.unrestChange);
            message = `Pardoned prisoners, converting ${converted} unrest to imprisoned`;
        }
        
        return {
            imprisonedChange: result.imprisonedChange,
            unrestChange: result.unrestChange,
            message
        };
    }
    
    /**
     * Get tier style class for display
     */
    getTierStyleClass(tierName: string): string {
        return unrestService.getTierStyleClass(tierName);
    }
    
    /**
     * Get incident severity for display
     */
    getIncidentSeverity(incident: Incident | null): string | null {
        if (!incident) return null;
        const severity = unrestService.getIncidentSeverity(incident.level);
        return severity;
    }
    
    /**
     * Apply unrest generation to kingdom state
     * This should be called at the end of the phase
     */
    applyUnrestGeneration(
        kingdomState: KingdomState,
        currentTurn: number
    ): Promise<{ success: boolean; error?: string }> {
        // Create a command to update unrest
        // This would use a specific UpdateUnrestCommand
        // For now, directly update the state (should be refactored)
        
        kingdomState.unrest += this.state.totalUnrestGenerated;
        
        // Apply incident resolution effects if any
        if (this.state.incidentResolution) {
            const effects = this.state.incidentResolution.effects;
            
            for (const [key, value] of effects) {
                switch (key) {
                    case 'unrest':
                        kingdomState.unrest = Math.max(0, kingdomState.unrest + value);
                        break;
                    case 'gold':
                        const currentGold = kingdomState.resources.get('gold') || 0;
                        kingdomState.resources.set('gold', Math.max(0, currentGold + value));
                        break;
                    case 'fame':
                        kingdomState.fame = Math.max(0, Math.min(3, kingdomState.fame + value));
                        break;
                    case 'lumber':
                    case 'stone':
                    case 'ore':
                        const current = kingdomState.resources.get(key) || 0;
                        kingdomState.resources.set(key, Math.max(0, current + value));
                        break;
                }
            }
        }
        
        return Promise.resolve({ success: true });
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
    getState(): UnrestPhaseState {
        return {
            ...this.state,
            unrestSources: new Map(this.state.unrestSources),
            incidentResolution: this.state.incidentResolution ? 
                { ...this.state.incidentResolution } : undefined
        };
    }
    
    /**
     * Check if incident has been resolved
     */
    isIncidentResolved(): boolean {
        return this.state.incidentResolved;
    }
    
    /**
     * Get current incident
     */
    getCurrentIncident(): Incident | null {
        return this.state.currentIncident;
    }
}

// Export factory function
export function createUnrestPhaseController(): UnrestPhaseController {
    return new UnrestPhaseController();
}
