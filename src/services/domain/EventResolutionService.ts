/**
 * EventResolutionService - Handles all event resolution business logic
 * 
 * This service manages event stability checks, outcome application,
 * and unresolved event handling for the kingdom game.
 */

import { diceService, type D20Result } from './DiceService';
import type { EventService, EventData, EventOutcome as EventEffect } from './events/EventService';
import type { KingdomState } from '../../models/KingdomState';
import type { KingdomModifier, ModifierEffects } from '../../models/Modifiers';

export interface StabilityCheckResult {
    roll: number;
    success: boolean;
    newDC: number;
    event?: EventData;
}

export interface EventOutcomeApplication {
    resourceChanges: Map<string, number>;
    messages: string[];
    unresolvedModifier?: KingdomModifier;
}

export interface EventResolutionResult {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    message: string;
    effects: Map<string, number>;
    unresolvedEvent?: EventData;
}

export class EventResolutionService {
    constructor(
        private eventService: EventService
    ) {}

    /**
     * Perform stability check to determine if an event occurs
     * 
     * Rules: 
     * - If roll >= DC: Event occurs, DC resets to 15
     * - If roll < DC: No event occurs, DC reduced for next turn
     */
    performStabilityCheck(currentDC: number): StabilityCheckResult {
        const roll = diceService.rollD20();
        const success = roll >= currentDC;
        
        let newDC: number;
        let event: EventData | undefined;
        
        if (success) {
            // Successful roll - event occurs, reset DC to 15
            newDC = 15;
            const randomEvent = this.eventService.getRandomEvent();
            event = randomEvent || undefined;
        } else {
            // Failed roll - no event, reduce DC by 5 (minimum 6)
            newDC = Math.max(6, currentDC - 5);
        }
        
        return { roll, success, newDC, event };
    }

    /**
     * Apply the outcome of an event resolution
     */
    applyEventOutcome(
        event: EventData,
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): EventOutcomeApplication {
        const resourceChanges = new Map<string, number>();
        const messages: string[] = [];
        let unresolvedModifier: KingdomModifier | undefined;
        
        const effect = event.effects?.[outcome];
        if (!effect) {
            return { resourceChanges, messages };
        }
        
        // Parse and aggregate resource modifiers
        if (effect.modifiers) {
            for (const modifier of effect.modifiers) {
                if (!modifier.enabled) continue;
                
                const currentValue = resourceChanges.get(modifier.selector) || 0;
                resourceChanges.set(modifier.selector, currentValue + modifier.value);
            }
        }
        
        // Handle unresolved events (create continuous modifier)
        if ((outcome === 'failure' || outcome === 'criticalFailure') && event.ifUnresolved) {
            unresolvedModifier = this.createUnresolvedModifier(event);
        }
        
        // Add outcome message
        if (effect.msg) {
            messages.push(effect.msg);
        }
        
        return { resourceChanges, messages, unresolvedModifier };
    }

    /**
     * Calculate resource changes from event outcome
     */
    calculateResourceChanges(event: EventData, outcome: string): Map<string, number> {
        const changes = new Map<string, number>();
        const effect = event.effects?.[outcome as keyof typeof event.effects];
        
        if (!effect?.modifiers) return changes;
        
        for (const modifier of effect.modifiers) {
            if (!modifier.enabled) continue;
            
            // Handle different resource types
            switch (modifier.selector) {
                case 'gold':
                case 'food':
                case 'lumber':
                case 'stone':
                case 'ore':
                case 'luxuries':
                    const current = changes.get(modifier.selector) || 0;
                    changes.set(modifier.selector, current + modifier.value);
                    break;
                    
                case 'resources':
                    // Generic resources affect lumber, stone, and ore
                    ['lumber', 'stone', 'ore'].forEach(resource => {
                        const current = changes.get(resource) || 0;
                        changes.set(resource, current + modifier.value);
                    });
                    break;
                    
                case 'unrest':
                case 'fame':
                    const currentValue = changes.get(modifier.selector) || 0;
                    changes.set(modifier.selector, currentValue + modifier.value);
                    break;
                    
                default:
                    console.warn(`Unknown modifier selector: ${modifier.selector}`);
            }
        }
        
        return changes;
    }

    /**
     * Create an unresolved modifier from an event
     */
    private createUnresolvedModifier(event: EventData): KingdomModifier {
        if (!event.ifUnresolved) {
            throw new Error('Event does not have unresolved configuration');
        }
        
        const currentTurn = 0; // This should be passed in from the game state
        
        const modifier: KingdomModifier = {
            id: `unresolved-${event.id}-${Date.now()}`,
            name: event.name,
            description: event.description,
            source: {
                type: 'event',
                id: event.id,
                name: event.name
            },
            startTurn: currentTurn,
            duration: 'until-resolved',
            priority: 100,
            effects: {},
            resolution: {
                skills: event.skills?.map(s => s.skill) || [],
                dc: 15,
                onResolution: {
                    successMsg: 'The event has been resolved',
                    removeOnSuccess: true
                }
            },
            visible: true,
            severity: this.mapEventTypeToSeverity(event.ifUnresolved.type)
        };
        
        // Note: event.ifUnresolved structure may need to be adjusted based on actual EventData type
        // For now, we're using a basic implementation
        
        return modifier;
    }

    /**
     * Map event type to modifier severity
     */
    private mapEventTypeToSeverity(eventType?: string): 'beneficial' | 'neutral' | 'dangerous' | 'critical' {
        switch (eventType) {
            case 'continuous':
                return 'dangerous';
            case 'auto-resolve':
                return 'neutral';
            case 'expires':
                return 'dangerous';
            default:
                return 'neutral';
        }
    }

    /**
     * Check if an event can be resolved with a specific skill
     */
    canResolveWithSkill(event: EventData, skill: string): boolean {
        if (!event.skills) return false;
        return event.skills.some(s => s.skill === skill);
    }

    /**
     * Get the DC for resolving an event
     */
    getResolutionDC(event: EventData): number {
        // Default to level-based DC
        // This could be enhanced to look at event difficulty or other factors
        return 15;
    }

    /**
     * Determine the outcome based on roll result and DC
     */
    determineOutcome(
        roll: number,
        modifier: number,
        dc: number
    ): 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' {
        return diceService.calculateSuccessDegree(roll + modifier, dc, roll);
    }

    /**
     * Check if event should auto-resolve
     */
    shouldAutoResolve(event: EventData): boolean {
        return event.ifUnresolved?.type === 'auto-resolve';
    }

    /**
     * Get events that are currently continuous
     */
    getContinuousEvents(events: EventData[]): EventData[] {
        return events.filter(e => e.ifUnresolved?.type === 'continuous');
    }

    /**
     * Get events that will expire
     */
    getExpiringEvents(events: EventData[]): EventData[] {
        return events.filter(e => e.ifUnresolved?.type === 'expires');
    }

    /**
     * Apply state changes to kingdom
     * Note: This returns the changes to be applied, not directly mutating state
     */
    prepareStateChanges(
        currentState: KingdomState,
        resourceChanges: Map<string, number>
    ): Partial<KingdomState> {
        const updates: Partial<KingdomState> = {
            resources: new Map(currentState.resources)
        };
        
        // Apply resource changes with bounds checking
        for (const [resource, change] of resourceChanges) {
            if (resource === 'unrest') {
                updates.unrest = Math.max(0, (currentState.unrest || 0) + change);
            } else if (resource === 'fame') {
                // Fame is capped between 0 and 3
                updates.fame = Math.max(0, Math.min(3, (currentState.fame || 0) + change));
            } else if (updates.resources) {
                const current = updates.resources.get(resource) || 0;
                updates.resources.set(resource, Math.max(0, current + change));
            }
        }
        
        return updates;
    }
}

// Note: We don't export a singleton here as it needs EventService injection
// This will be instantiated in the controller/store layer with proper dependencies
