import type { ActiveModifier } from '../../models/Modifiers';
import type { EventSkill, EventOutcome, EventModifier, EventEffects } from './event-types';
import eventsData from '../../../dist/events.json';


/**
 * Unresolved event configuration (cleaned up - no legacy severity/escalation/priority)
 */
export interface UnresolvedEvent {
    type: 'continuous' | 'auto-resolve' | 'expires';
    continuous?: {
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
 * Event representation from the JSON data (flattened structure)
 */
export interface EventData {
    id: string;
    name: string;
    description: string;
    traits?: string[];
    location?: string;
    modifier?: number;
    resolvedOn?: string[];
    skills?: EventSkill[];  // Now at top level
    effects: EventEffects;   // Now at top level
    special?: string;
    ifUnresolved?: UnresolvedEvent;
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
            console.log('Events already loaded, skipping...');
            return;
        }

        console.log('Loading events from imported data...');
        
        try {
            // Load events from the imported JSON data
            const eventsList = eventsData as EventData[];
            
            // Add all events to the map
            for (const event of eventsList) {
                this.events.set(event.id, event);
            }
            
            this.eventsLoaded = true;
            console.log(`Successfully loaded ${this.events.size} events`);
            
            // Log all event names for verification
            const eventNames = Array.from(this.events.values()).map(e => e.name);
            console.log('Events loaded:', eventNames);
        } catch (error) {
            console.error('Failed to load events:', error);
            // Fallback to empty map
            this.events = new Map();
        }
    }

    /**
     * Get a random event for the current turn (Phase 4)
     */
    getRandomEvent(): EventData | null {
        if (!this.eventsLoaded) {
            console.error('Events not loaded yet - call loadEvents() first');
            return null;
        }

        const eventArray = Array.from(this.events.values());
        console.log(`Getting random event from ${eventArray.length} available events`);
        
        if (eventArray.length === 0) {
            console.error('No events available in the events map');
            return null;
        }

        const randomIndex = Math.floor(Math.random() * eventArray.length);
        const selectedEvent = eventArray[randomIndex];
        console.log(`Selected event: ${selectedEvent.name} (${selectedEvent.id})`);
        
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
            console.warn(`Event ${event.id} has no effects`);
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
                    appliedEffects[modifier.resource] = (appliedEffects[modifier.resource] || 0) + modifier.value;
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
            case 'continuous':
                // Event becomes a modifier until resolved
                if (unresolved.continuous?.becomesModifier && unresolved.continuous.modifierTemplate) {
                    return this.createModifierFromEvent(event, unresolved.continuous.modifierTemplate, currentTurn);
                }
                break;

            case 'expires':
                // Handle expiration effects
                if (unresolved.expires) {
                    console.log(`Event ${event.id} expires: ${unresolved.expires.message || 'No message'}`);
                    
                    // Check if it transforms to another event
                    if (unresolved.expires.transformsTo) {
                        const newEvent = this.getEventById(unresolved.expires.transformsTo);
                        if (newEvent) {
                            console.log(`Event ${event.id} transforms to ${unresolved.expires.transformsTo}`);
                        }
                    }
                }
                break;

            case 'auto-resolve':
                // This type is no longer in the new data
                console.log(`Event ${event.id} auto-resolves`);
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
            name: template.name || event.name,
            description: template.description || event.description,
            icon: template.icon,
            tier: 1, // Events typically start at tier 1
            
            // Source tracking (new format)
            sourceType: 'event',
            sourceId: event.id,
            sourceName: event.name,
            
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
                    name: `${key} modifier`,
                    resource: resource,
                    value: effects[key],
                    duration: typeof duration === 'number' ? 'turns' : (duration as any)
                };
                
                // Add turns field only if duration is 'turns'
                if (modifier.duration === 'turns' && typeof duration === 'number') {
                    modifier.turns = duration;
                }
                
                modifiers.push(modifier);
            }
        }

        return modifiers;
    }

    /**
     * Get all events that can become continuous modifiers
     */
    getContinuousEvents(): EventData[] {
        return Array.from(this.events.values()).filter(
            event => event.ifUnresolved?.type === 'continuous'
        );
    }

    /**
     * Get all events that expire
     */
    getExpiringEvents(): EventData[] {
        return Array.from(this.events.values()).filter(
            event => event.ifUnresolved?.type === 'expires'
        );
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
     * Get resolution DC for an event
     */
    getResolutionDC(event: EventData): number {
        // Check if event has custom resolution DC in unresolved section
        if (event.ifUnresolved?.continuous?.modifierTemplate?.resolution?.dc) {
            return event.ifUnresolved.continuous.modifierTemplate.resolution.dc;
        }

        // Otherwise use modifier value or default
        return event.modifier || 0;
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
