/**
 * EventProvider - Provides event data for the Events phase
 * 
 * Simple data provider that handles event selection and retrieval.
 * No game logic - just data access.
 */

import { eventService, type EventData } from './event-loader';

export class EventProvider {
    /**
     * Get a random event for the current turn
     * Ensures proper random selection with logging for debugging
     */
    static async getRandomEvent(): Promise<EventData | null> {
        // Ensure events are loaded
        await eventService.loadEvents();
        
        // Get all available events
        const allEvents = eventService.exportEvents();
        
        console.log(`[EventProvider] Getting random event from ${allEvents.length} available events`);
        
        if (allEvents.length === 0) {
            console.warn('[EventProvider] No events available');
            return null;
        }
        
        // Proper random selection
        const randomIndex = Math.floor(Math.random() * allEvents.length);
        const selectedEvent = allEvents[randomIndex];
        
        console.log(`[EventProvider] Selected event "${selectedEvent.name}" (${selectedEvent.id}) - index ${randomIndex} of ${allEvents.length}`);
        
        return selectedEvent;
    }
    
    /**
     * Get a specific event by ID (for multiplayer sync)
     */
    static async getEventById(eventId: string): Promise<EventData | null> {
        await eventService.loadEvents();
        return eventService.getEventById(eventId);
    }
    
    /**
     * Get all available events (for debugging)
     */
    static async getAllEvents(): Promise<EventData[]> {
        await eventService.loadEvents();
        return eventService.exportEvents();
    }
}
