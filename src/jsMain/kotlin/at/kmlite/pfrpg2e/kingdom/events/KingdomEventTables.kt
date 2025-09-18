package at.kmlite.pfrpg2e.kingdom.events

import at.kmlite.pfrpg2e.kingdom.data.KingdomEvent
import at.kmlite.pfrpg2e.kingdom.data.EventCategory
import at.kmlite.pfrpg2e.kingdom.data.OngoingEventState
import kotlinx.serialization.json.Json
import kotlinx.serialization.decodeFromString
import kotlin.random.Random

/**
 * Manages kingdom event tables and event selection.
 * Loads events from JSON files and provides methods for random selection.
 */
object KingdomEventTables {
    
    private val json = Json { 
        ignoreUnknownKeys = true
        coerceInputValues = true
    }
    
    // Event storage by category
    private val allEvents = mutableListOf<KingdomEvent>()
    private val eventById = mutableMapOf<String, KingdomEvent>()
    private val eventsByCategory = mutableMapOf<EventCategory, MutableList<KingdomEvent>>()
    
    /**
     * Initialize event tables by loading all event JSON files.
     * This should be called during module initialization.
     */
    fun initialize(eventJsonStrings: Map<String, String>) {
        allEvents.clear()
        eventById.clear()
        eventsByCategory.clear()
        
        // Initialize category lists
        EventCategory.entries.forEach { category ->
            eventsByCategory[category] = mutableListOf()
        }
        
        // Load each event from JSON
        eventJsonStrings.forEach { (filename, jsonContent) ->
            try {
                val event = json.decodeFromString<KingdomEvent>(jsonContent)
                allEvents.add(event)
                eventById[event.id] = event
                
                // Categorize the event
                val category = when {
                    event.traits.contains("continuous") -> EventCategory.CONTINUOUS
                    event.traits.contains("beneficial") -> EventCategory.BENEFICIAL
                    event.traits.contains("dangerous") -> EventCategory.DANGEROUS
                    event.traits.contains("harmful") -> EventCategory.HARMFUL
                    else -> null
                }
                
                category?.let { eventsByCategory[it]?.add(event) }
                
                console.log("Loaded event: ${event.id} (${event.traits.joinToString()})")
            } catch (e: Exception) {
                console.error("Failed to load event from $filename", e)
            }
        }
        
        console.log("Loaded ${allEvents.size} total events")
        eventsByCategory.forEach { (category, events) ->
            console.log("  ${category.value}: ${events.size} events")
        }
    }
    
    /**
     * Select a random event from all available events.
     * Excludes events that are already ongoing.
     */
    fun selectRandomEvent(
        excludeIds: Set<String> = emptySet(),
        ongoingEvents: List<OngoingEventState> = emptyList()
    ): KingdomEvent? {
        // Get IDs of ongoing events to exclude
        val ongoingIds = ongoingEvents
            .filter { !it.resolved }
            .map { it.eventId }
            .toSet()
        
        // Filter available events
        val availableEvents = allEvents.filter { event ->
            event.id !in excludeIds && event.id !in ongoingIds
        }
        
        if (availableEvents.isEmpty()) {
            console.warn("No available events to select")
            return null
        }
        
        // Select random event
        val selected = availableEvents.random()
        console.log("Selected event: ${selected.id} - ${selected.name}")
        return selected
    }
    
    /**
     * Select a random event from a specific category.
     */
    fun selectRandomEventFromCategory(
        category: EventCategory,
        excludeIds: Set<String> = emptySet(),
        ongoingEvents: List<OngoingEventState> = emptyList()
    ): KingdomEvent? {
        val categoryEvents = eventsByCategory[category] ?: return null
        
        // Get IDs of ongoing events to exclude
        val ongoingIds = ongoingEvents
            .filter { !it.resolved }
            .map { it.eventId }
            .toSet()
        
        // Filter available events
        val availableEvents = categoryEvents.filter { event ->
            event.id !in excludeIds && event.id !in ongoingIds
        }
        
        if (availableEvents.isEmpty()) {
            console.warn("No available events in category ${category.value}")
            return null
        }
        
        return availableEvents.random()
    }
    
    /**
     * Select an event using weighted probabilities based on categories.
     * Default weights: Beneficial 25%, Harmful 25%, Dangerous 30%, Continuous 20%
     */
    fun selectWeightedRandomEvent(
        weights: Map<EventCategory, Int> = defaultWeights(),
        excludeIds: Set<String> = emptySet(),
        ongoingEvents: List<OngoingEventState> = emptyList()
    ): KingdomEvent? {
        // Build weighted list
        val weightedEvents = mutableListOf<KingdomEvent>()
        
        weights.forEach { (category, weight) ->
            val events = eventsByCategory[category] ?: emptyList()
            val ongoingIds = ongoingEvents
                .filter { !it.resolved }
                .map { it.eventId }
                .toSet()
                
            val availableEvents = events.filter { event ->
                event.id !in excludeIds && event.id !in ongoingIds
            }
            
            // Add each event 'weight' times to the list
            availableEvents.forEach { event ->
                repeat(weight) { weightedEvents.add(event) }
            }
        }
        
        if (weightedEvents.isEmpty()) {
            // Fallback to completely random if no weighted events available
            return selectRandomEvent(excludeIds, ongoingEvents)
        }
        
        return weightedEvents.random()
    }
    
    /**
     * Get an event by its ID.
     */
    fun getEventById(id: String): KingdomEvent? = eventById[id]
    
    /**
     * Get all events in a specific category.
     */
    fun getEventsByCategory(category: EventCategory): List<KingdomEvent> =
        eventsByCategory[category]?.toList() ?: emptyList()
    
    /**
     * Get all continuous events.
     */
    fun getContinuousEvents(): List<KingdomEvent> =
        eventsByCategory[EventCategory.CONTINUOUS]?.toList() ?: emptyList()
    
    /**
     * Get all loaded events.
     */
    fun getAllEvents(): List<KingdomEvent> = allEvents.toList()
    
    /**
     * Check if an event ID exists.
     */
    fun hasEvent(id: String): Boolean = eventById.containsKey(id)
    
    /**
     * Default category weights for event selection.
     */
    private fun defaultWeights(): Map<EventCategory, Int> = mapOf(
        EventCategory.BENEFICIAL to 25,
        EventCategory.HARMFUL to 25,
        EventCategory.DANGEROUS to 30,
        EventCategory.CONTINUOUS to 20
    )
    
    /**
     * Generate a percentile table for debugging/reference.
     * Shows which events would be selected at each percentile.
     */
    fun generatePercentileTable(): String {
        val table = StringBuilder()
        table.appendLine("Kingdom Events Percentile Table")
        table.appendLine("================================")
        
        EventCategory.entries.forEach { category ->
            val events = eventsByCategory[category] ?: emptyList()
            if (events.isNotEmpty()) {
                table.appendLine("\n${category.value.uppercase()} EVENTS (${events.size} total):")
                events.forEachIndexed { index, event ->
                    val range = calculatePercentileRange(index, events.size, 100)
                    table.appendLine("  ${range.first.toString().padStart(2, '0')}-${range.second.toString().padEnd(2, '0')}: ${event.id}")
                }
            }
        }
        
        return table.toString()
    }
    
    /**
     * Calculate percentile range for an item in a list.
     */
    private fun calculatePercentileRange(
        index: Int,
        totalItems: Int,
        totalRange: Int
    ): Pair<Int, Int> {
        val itemRange = totalRange / totalItems
        val start = index * itemRange + 1
        val end = if (index == totalItems - 1) {
            totalRange // Last item gets any remainder
        } else {
            (index + 1) * itemRange
        }
        return start to end
    }
}

/**
 * Helper class for loading event JSON files.
 * This would typically load from the file system or bundle.
 */
class EventJsonLoader {
    
    /**
     * Load all event JSON files from the data/events directory.
     * Returns a map of filename to JSON content.
     */
    fun loadEventJsonFiles(): Map<String, String> {
        // This is a placeholder - in the actual implementation,
        // this would load the JSON files from the module's data directory
        // For now, we'll return an empty map and require manual initialization
        
        console.warn("EventJsonLoader.loadEventJsonFiles() needs implementation")
        return emptyMap()
    }
    
    /**
     * Load a single event JSON file.
     */
    fun loadEventJson(filename: String): String? {
        // Placeholder for loading individual event files
        console.warn("EventJsonLoader.loadEventJson() needs implementation")
        return null
    }
}
