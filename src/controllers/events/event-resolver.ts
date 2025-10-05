/**
 * EventResolver - Handles all event resolution business logic
 * 
 * This service manages event stability checks, outcome application,
 * and unresolved event handling for the kingdom game.
 */

import { getEventDisplayName } from '../../types/event-helpers';
import { diceService, type D20Result } from '../../services/domain/DiceService';
import type { EventService, EventData } from './event-loader';
import type { EventOutcome, EventModifier, OngoingEffect } from './event-types';
import type { KingdomData } from '../../actors/KingdomActor';
import type { ActiveModifier } from '../../models/Modifiers';
import {
  aggregateResourceChanges,
  prepareStateChanges,
  createUnresolvedModifier as createUnresolvedModifierShared,
  canResolveWithSkill as canResolveWithSkillShared,
  getLevelBasedDC
} from '../shared/resolution-service';

export interface StabilityCheckResult {
    roll: number;
    success: boolean;
    newDC: number;
    event?: EventData;
}

export interface EventOutcomeApplication {
    resourceChanges: Map<string, number>;
    messages: string[];
    unresolvedModifier?: ActiveModifier;
}

export interface EventResolutionResult {
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    message: string;
    effects: Map<string, number>;
    unresolvedEvent?: EventData;
}

export class EventResolver {
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
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
        currentTurn: number = 0,
        currentState?: KingdomData
    ): EventOutcomeApplication {
        const messages: string[] = [];
        let unresolvedModifier: ActiveModifier | undefined;
        
        const effect = event.effects?.[outcome];
        if (!effect) {
            return { resourceChanges: new Map(), messages };
        }
        
        // Parse and aggregate resource modifiers using shared utility
        const resourceChanges = effect.modifiers 
            ? aggregateResourceChanges(effect.modifiers)
            : new Map<string, number>();
        
        // Check for resource shortage if we have current state
        if (currentState) {
            const { hadShortage } = prepareStateChanges(currentState, resourceChanges);
            if (hadShortage) {
                // Add shortage penalty
                const currentUnrest = resourceChanges.get('unrest') || 0;
                resourceChanges.set('unrest', currentUnrest + 1);
                messages.push('You gained 1 unrest from shortage.');
            }
        }
        
        // Handle unresolved events (create ongoing modifier)
        // NEW LOGIC: Only create modifier if:
        // 1. Event has "ongoing" trait AND
        // 2. Event is dangerous OR (beneficial AND ongoing)
        // This means beneficial non-ongoing events simply expire when ignored
        if ((outcome === 'failure' || outcome === 'criticalFailure')) {
            const isOngoing = event.traits?.includes('ongoing');
            const isBeneficial = event.traits?.includes('beneficial');
            const isDangerous = event.traits?.includes('dangerous');
            
            // Only create modifier for ongoing events
            // Beneficial non-ongoing events just expire without creating modifiers
            if (isOngoing) {
                // Both dangerous and beneficial ongoing events can create modifiers
                console.log(`[EventResolver] Creating ongoing modifier for ${event.id} (beneficial: ${isBeneficial}, dangerous: ${isDangerous})`);
                try {
                    unresolvedModifier = this.createUnresolvedModifierFromTraits(event, currentTurn);
                } catch (error) {
                    console.warn('[EventResolver] Could not create unresolved modifier:', error);
                }
            } else if (isBeneficial) {
                // Beneficial non-ongoing events expire without penalty
                console.log(`[EventResolver] Beneficial non-ongoing event ${event.id} expires without creating modifier`);
                messages.push(`The opportunity has passed.`);
            }
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
        const effect = event.effects?.[outcome as keyof typeof event.effects];
        
        if (!effect?.modifiers) return new Map();
        
        // Use shared utility for resource aggregation
        return aggregateResourceChanges(effect.modifiers);
    }

    /**
     * Create an unresolved modifier from an event using the new traits system
     */
    private createUnresolvedModifierFromTraits(event: EventData, currentTurn: number): ActiveModifier {
        // For ongoing events, we use the failure outcome modifiers as the ongoing effect
        const failureOutcome = event.effects?.failure || event.effects?.criticalFailure;
        if (!failureOutcome?.modifiers) {
            throw new Error('Event does not have failure modifiers to create ongoing effect');
        }
        
        // Create OngoingEffect from failure modifiers
        const ongoingEffect: OngoingEffect = {
            name: `${getEventDisplayName(event)} (Ongoing)`,
            description: event.description,
            tier: 1,
            icon: '',
            modifiers: failureOutcome.modifiers.map(m => ({
                ...m,
                name: m.resource,
                duration: 'ongoing'
            })),
            resolvedWhen: {
                type: 'skill',
                skillResolution: {
                    dcAdjustment: 0,
                    onSuccess: {
                        msg: 'Event resolved successfully',
                        removeAllModifiers: true
                    }
                }
            }
        };
        
        return createUnresolvedModifierShared(
            ongoingEffect,
            'event',
            event.id,
            getEventDisplayName(event),
            currentTurn
        );
    }

    /**
     * Create an unresolved modifier from an event (DEPRECATED - uses old ifUnresolved structure)
     */
    private createUnresolvedModifier(event: EventData, currentTurn: number): ActiveModifier {
        if (!event.ifUnresolved) {
            throw new Error('Event does not have unresolved configuration');
        }
        
        const unresolved = event.ifUnresolved;
        
        // EventData uses legacy UnresolvedEvent structure, need to convert
        if (unresolved.type === 'ongoing' && unresolved.ongoing?.modifierTemplate) {
            const template = unresolved.ongoing.modifierTemplate;
            
            // Convert to OngoingEffect format
            const ongoingEffect: OngoingEffect = {
                name: template.name,
                description: template.description || event.description,
                tier: 1,
                icon: template.icon || '',
                modifiers: this.convertEffectsToEventModifiers(template.effects, template.duration),
                resolvedWhen: template.resolution ? {
                    type: 'skill',
                    skillResolution: {
                        dcAdjustment: template.resolution.dc || 0,
                        onSuccess: {
                            msg: 'Event resolved successfully',
                            removeAllModifiers: true
                        }
                    }
                } : undefined
            };
            
            return createUnresolvedModifierShared(
                ongoingEffect,
                'event',
                event.id,
                getEventDisplayName(event),
                currentTurn
            );
        }
        
        throw new Error('Event does not have ongoing modifier template');
    }
    
    /**
     * Convert event effects to EventModifier array format
     */
    private convertEffectsToEventModifiers(effects: Record<string, any>, duration: string | number): EventModifier[] {
        const modifiers: EventModifier[] = [];
        
        const resourceMappings: Record<string, EventModifier['resource']> = {
            'gold': 'gold',
            'food': 'food',
            'lumber': 'lumber',
            'stone': 'stone',
            'ore': 'ore',
            'luxuries': 'luxuries',
            'unrest': 'unrest',
            'fame': 'fame'
        };
        
        for (const [key, resource] of Object.entries(resourceMappings)) {
            if (effects[key] !== undefined && effects[key] !== 0) {
                const modifier: EventModifier = {
                    name: `${key} modifier`,
                    resource: resource,
                    value: effects[key],
                    duration: typeof duration === 'number' ? 'turns' : (duration as any)
                };
                
                if (modifier.duration === 'turns' && typeof duration === 'number') {
                    modifier.turns = duration;
                }
                
                modifiers.push(modifier);
            }
        }
        
        return modifiers;
    }

    /**
     * Check if an event can be resolved with a specific skill
     */
    canResolveWithSkill(event: EventData, skill: string): boolean {
        return canResolveWithSkillShared(event.skills, skill);
    }

    /**
     * Get the DC for resolving an event
     */
    getResolutionDC(kingdomLevel: number): number {
        // Use shared level-based DC calculation
        return getLevelBasedDC(kingdomLevel);
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
     * Get events that are currently ongoing (using new traits system)
     */
    getOngoingEvents(events: EventData[]): EventData[] {
        return events.filter(e => e.traits?.includes('ongoing'));
    }

    /**
     * Get events that are currently ongoing (DEPRECATED - kept for backward compatibility)
     * @deprecated Use getOngoingEvents instead
     */
    getContinuousEvents(events: EventData[]): EventData[] {
        return this.getOngoingEvents(events);
    }

    /**
     * Get events that will expire (DEPRECATED - no longer used with traits system)
     * @deprecated Events without 'ongoing' trait will simply expire
     */
    getExpiringEvents(events: EventData[]): EventData[] {
        return events.filter(e => !e.traits?.includes('ongoing'));
    }

    /**
     * Apply state changes to kingdom
     * Note: This returns the changes to be applied, not directly mutating state
     */
    prepareKingdomStateChanges(
        currentState: KingdomData,
        resourceChanges: Map<string, number>
    ): Partial<KingdomData> {
        // Use shared state preparation utility
        const { updates } = prepareStateChanges(currentState, resourceChanges);
        return updates;
    }
}

// Export singleton instance with EventService dependency
import { eventService } from './event-loader';
export const eventResolver = new EventResolver(eventService);
