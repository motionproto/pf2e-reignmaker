import type { ActiveModifier } from '../../models/Modifiers';
import type { EventSkill, EventOutcome, EventModifier, EventEffects, EventTrait } from '../../types/events';
import { getEventDisplayName } from '../../types/event-helpers';
import eventsData from '../../data-compiled/events.json';
import { logger } from '../../utils/Logger';


/**
 * Unresolved event configuration (cleaned up - no legacy severity/escalation/priority)
 */
export interface UnresolvedEvent {
    type: 'ongoing' | 'auto-resolve' | 'expires';
    ongoing?: {
        becomesModifier: boolean;
        modifierTemplate?: {
            name: string;
            description?: string;
            duration: string | number;
            effects: Record<string, any>;
            resolution?: {
                skills: string[];
                dc?: number;
                automatic?: {
                    condition: string;
                    description: string;
                };
            };
            icon?: string;
        };
    };
    expires?: {
        message?: string;
        effects?: Record<string, number>;
        turnsUntilTransform?: number;
        transformsTo?: string;
    };
}

/**
 * Event representation from the JSON data (simplified structure)
 * This should match KingdomEvent from types/events.ts
 */
export interface EventData {
    id: string;
    name: string;
    tier: 'event' | 'minor' | 'moderate' | 'major' | number;
    description: string;
    skills?: EventSkill[];
    effects: EventEffects;
    traits?: EventTrait[];  // Event traits (beneficial, dangerous, ongoing)
    ifUnresolved?: UnresolvedEvent;  // DEPRECATED: kept for backward compatibility
}

/**
 * Service for managing kingdom events
 */
export class EventService {
    private events: Map<string, EventData> = new Map();
    private eventsLoaded: boolean = false;

    /**
     * Load events from imported JSON data
     */
    loadEvents(): void {
        if (this.eventsLoaded) {

            return;
        }

        try {
            // Load events from the imported JSON data
            const eventsList = eventsData as EventData[];
            
            // Add all events to the map
            for (const event of eventsList) {
                this.events.set(event.id, event);
            }
            
            this.eventsLoaded = true;

            // Log all event names for verification
            const eventNames = Array.from(this.events.values()).map(e => getEventDisplayName(e));

        } catch (error) {
            logger.error('Failed to load events:', error);
            // Fallback to empty map
            this.events = new Map();
        }
    }

    /**
     * Get a random event for the current turn (Phase 4)
     */
    getRandomEvent(): EventData | null {
        if (!this.eventsLoaded) {
            logger.error('Events not loaded yet - call loadEvents() first');
            return null;
        }

        const eventArray = Array.from(this.events.values());

        if (eventArray.length === 0) {
            logger.error('No events available in the events map');
            return null;
        }

        const randomIndex = Math.floor(Math.random() * eventArray.length);
        const selectedEvent = eventArray[randomIndex];

        return selectedEvent;
    }

    /**
     * Get a specific event by ID
     */
    getEventById(eventId: string): EventData | null {
        return this.events.get(eventId) || null;
    }

    /**
     * Get skills for an event
     */
    getEventSkills(event: EventData): EventSkill[] {
        // Get skills directly from the event (no longer wrapped in stages)
        return event.skills || [];
    }

    /**
     * Get outcome for a specific result
     */
    getEventOutcome(event: EventData, result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): EventOutcome | null {
        // Get outcomes from the effects object
        const effects = event.effects;
        if (!effects) {
            logger.warn(`Event ${event.id} has no effects`);
            return null;
        }

        return effects[result] || null;
    }

    /**
     * Apply event outcome effects
     */
    applyEventOutcome(event: EventData, result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): Record<string, number> {
        // Get the outcome from the effects
        const effects = event.effects;
        if (!effects || !effects[result]) {
            return {};
        }

        const outcome = effects[result];
        const appliedEffects: Record<string, number> = {};

        // Process modifiers using the new EventModifier structure
        if (outcome.modifiers && Array.isArray(outcome.modifiers)) {
            for (const modifier of outcome.modifiers) {
                if (modifier.resource) {
                    // Handle both numeric and string (dice formula) values
                    const value = typeof modifier.value === 'number' ? modifier.value : 0;
                    appliedEffects[modifier.resource] = (appliedEffects[modifier.resource] || 0) + value;
                }
            }
        }

        return appliedEffects;
    }

    /**
     * Check if an event can be resolved
     */
    private canResolveEvent(event: EventData): boolean {
        // Check if event has skills that can be rolled
        return !!(event.skills && event.skills.length > 0);
    }

    /**
     * Handle an unresolved event based on its configuration
     * Returns a modifier if the event becomes one, or null
     */
    handleUnresolvedEvent(event: EventData, currentTurn: number): ActiveModifier | null {
        if (!event.ifUnresolved) {
            // Event expires with no further effect
            return null;
        }

        const unresolved = event.ifUnresolved;

        switch (unresolved.type) {
            case 'ongoing':
                // Event becomes a modifier until resolved
                if (unresolved.ongoing?.becomesModifier && unresolved.ongoing.modifierTemplate) {
                    return this.createModifierFromEvent(event, unresolved.ongoing.modifierTemplate, currentTurn);
                }
                break;

            case 'expires':
                // Handle expiration effects
                if (unresolved.expires) {

                    // Check if it transforms to another event
                    if (unresolved.expires.transformsTo) {
                        const newEvent = this.getEventById(unresolved.expires.transformsTo);
                        if (newEvent) {

                        }
                    }
                }
                break;

            case 'auto-resolve':
                // This type is no longer in the new data

                break;
        }

        return null;
    }

    /**
     * Create a modifier from an unresolved event
     */
    private createModifierFromEvent(
        event: EventData,
        template: any,
        currentTurn: number
    ): ActiveModifier {
        const modifier: ActiveModifier = {
            id: `event-${event.id}-${currentTurn}`,
            name: template.name || getEventDisplayName(event),
            description: template.description || event.description,
            icon: template.icon,
            tier: 1, // Events typically start at tier 1
            
            // Source tracking (new format)
            sourceType: 'event',
            sourceId: event.id,
            sourceName: getEventDisplayName(event),
            
            // Timing
            startTurn: currentTurn,
            
            // Effects - convert template effects to EventModifier array
            modifiers: this.convertEffectsToEventModifiers(template.effects, template.duration),
            
            // Resolution info if present
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

        return modifier;
    }

    /**
     * Convert event effects to EventModifier array format
     */
    private convertEffectsToEventModifiers(effects: Record<string, any>, duration: string | number): EventModifier[] {
        const modifiers: EventModifier[] = [];

        // Resource type mapping
        type ResourceType = 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries' | 'unrest' | 'fame';
        
        const resourceMappings: Record<string, ResourceType> = {
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
                    resource: resource,
                    value: effects[key],
                    duration: duration as any  // ModifierDuration = 'immediate' | 'ongoing' | 'permanent' | number
                };
                
                modifiers.push(modifier);
            }
        }

        return modifiers;
    }

    /**
     * Check if an event can be resolved with a given skill
     */
    canResolveWithSkill(event: EventData, skill: string): boolean {
        if (!event.skills) {
            return false;
        }

        return event.skills.some(s => s.skill === skill);
    }

    /**
     * Export events for debugging
     */
    exportEvents(): EventData[] {
        return Array.from(this.events.values());
    }
}

// Export singleton instance
export const eventService = new EventService();

// Initialize events on module load
if (typeof window !== 'undefined') {
    eventService.loadEvents();
}
