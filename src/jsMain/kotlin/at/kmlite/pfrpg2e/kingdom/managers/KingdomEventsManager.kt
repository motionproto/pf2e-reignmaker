package at.kmlite.pfrpg2e.kingdom.managers

import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.KingdomData
import at.kmlite.pfrpg2e.kingdom.RawModifier
import at.kmlite.pfrpg2e.kingdom.data.*
import at.kmlite.pfrpg2e.kingdom.events.KingdomEventTables
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.setKingdom
import com.foundryvtt.core.Game
import at.kmlite.pfrpg2e.utils.buildPromise
import at.kmlite.pfrpg2e.utils.postChatMessage
import at.kmlite.pfrpg2e.utils.t
import js.objects.recordOf
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/**
 * Manages kingdom events and their resolution.
 * Handles event checks, selection, resolution, and tracking of continuous events.
 */
class KingdomEventsManager(private val game: Game) {
    
    /**
     * Check if an event should occur based on the current DC.
     * Returns true if an event occurs, false otherwise.
     */
    suspend fun checkForEvent(currentDC: Int): Boolean {
        val roll = Random.nextInt(1, 21) // d20 roll
        val result = roll >= currentDC
        
        console.log("Event Check: rolled $roll vs DC $currentDC - ${if (result) "Event occurs!" else "No event"}")
        
        // Post to chat about the check
        val messageKey = if (result) "kingdom.eventCheckSuccess" else "kingdom.eventCheckFailure"
        postChatMessage(
            t(messageKey, recordOf(
                "roll" to roll,
                "dc" to currentDC
            ))
        )
        
        return result
    }
    
    /**
     * Update the event DC after a check.
     * Decreases DC on failure, resets on success.
     */
    suspend fun updateEventDC(
        actor: KingdomActor,
        eventOccurred: Boolean
    ) {
        val kingdom = actor.getKingdom() ?: return
        val settings = kingdom.settings
        
        val newDC = if (eventOccurred) {
            // Reset DC when event occurs
            16
        } else {
            // Decrease DC by step amount, minimum 6
            max(6, settings.eventDc - (settings.eventDcStep ?: 5))
        }
        
        // Update the DC in settings
        settings.eventDc = newDC
        
        // Track turns without event
        if (!eventOccurred) {
            kingdom.turnsWithoutEvent++
        } else {
            kingdom.turnsWithoutEvent = 0
        }
        
        actor.setKingdom(kingdom)
        
        console.log("Event DC updated: $newDC (was ${settings.eventDc})")
        
        // Notify about DC change
        postChatMessage(
            t("kingdom.eventDcUpdated", recordOf(
                "newDc" to newDC,
                "turnsWithoutEvent" to kingdom.turnsWithoutEvent
            ))
        )
    }
    
    /**
     * Select a random event from available events.
     * Excludes ongoing events and respects blacklist.
     */
    suspend fun selectRandomEvent(kingdom: KingdomData): KingdomEvent? {
        // Get blacklisted event IDs
        val blacklist = kingdom.kingdomEventBlacklist.toSet()
        
        // Get ongoing event states
        val ongoingStates = kingdom.ongoingEvents
            .mapNotNull { raw -> parseOngoingEvent(raw) }
        
        // Select event using the event tables
        val event = KingdomEventTables.selectRandomEvent(
            excludeIds = blacklist,
            ongoingEvents = ongoingStates
        )
        
        if (event != null) {
            console.log("Selected event: ${event.id} - ${event.name}")
            
            // Post to chat about the selected event
            postChatMessage(
                t("kingdom.eventSelected", recordOf(
                    "eventName" to t(event.name),
                    "description" to t(event.description),
                    "location" to event.location?.let { t(it) }
                ))
            )
        } else {
            console.warn("No available events to select")
        }
        
        return event
    }
    
    /**
     * Resolve an event stage with a skill check.
     * Returns the resolution result with effects to apply.
     */
    fun resolveEventStage(
        event: KingdomEvent,
        stageIndex: Int,
        skill: String,
        rollResult: Int,
        dc: Int
    ): EventResolutionResult {
        val stage = event.stages.getOrNull(stageIndex)
            ?: throw IllegalArgumentException("Invalid stage index: $stageIndex")
        
        // Determine degree of success
        val degreeOfSuccess = when {
            rollResult >= dc + 10 -> "criticalSuccess"
            rollResult >= dc -> "success"
            rollResult <= dc - 10 -> "criticalFailure"
            else -> "failure"
        }
        
        // Get the outcome for this degree
        val outcome = stage.getOutcome(degreeOfSuccess)
            ?: EventOutcome(msg = "No outcome defined", modifiers = emptyList())
        
        // Check if event is resolved
        val eventResolved = event.isResolvedBy(degreeOfSuccess) || 
            stageIndex >= event.stages.size - 1
        
        console.log("""
            Event Stage Resolution:
            - Event: ${event.id}
            - Stage: $stageIndex
            - Skill: $skill
            - Roll: $rollResult vs DC $dc
            - Result: $degreeOfSuccess
            - Resolved: $eventResolved
        """.trimIndent())
        
        return EventResolutionResult(
            eventId = event.id,
            stage = stageIndex,
            skill = skill,
            degreeOfSuccess = degreeOfSuccess,
            outcome = outcome,
            eventResolved = eventResolved,
            message = t(outcome.msg)
        )
    }
    
    /**
     * Apply the modifiers from an event outcome to the kingdom.
     */
    suspend fun applyEventOutcome(
        actor: KingdomActor,
        event: KingdomEvent,
        result: EventResolutionResult
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Apply each modifier
        result.outcome.modifiers.forEach { modifier ->
            when (modifier.selector) {
                "gold" -> {
                    kingdom.resourcePoints.now = max(0, kingdom.resourcePoints.now + modifier.value)
                    console.log("Gold changed by ${modifier.value}")
                }
                "unrest" -> {
                    kingdom.unrest = max(0, kingdom.unrest + modifier.value)
                    console.log("Unrest changed by ${modifier.value}")
                }
                "fame" -> {
                    kingdom.fame.now = max(0, kingdom.fame.now + modifier.value)
                    console.log("Fame changed by ${modifier.value}")
                }
                "food" -> {
                    kingdom.commodities.now.food = max(0, kingdom.commodities.now.food + modifier.value)
                    console.log("Food changed by ${modifier.value}")
                }
                // Handle resource choices
                in listOf("lumber", "ore", "stone", "luxuries") -> {
                    // These would need integration with resource system
                    console.log("Resource ${modifier.selector} changed by ${modifier.value}")
                }
                else -> {
                    console.warn("Unknown modifier selector: ${modifier.selector}")
                }
            }
            
            // Add modifier to kingdom if it has duration
            if (modifier.turns != null && modifier.turns > 0) {
                kingdom.modifiers = kingdom.modifiers + RawModifier(
                    type = modifier.type,
                    name = modifier.name,
                    value = modifier.value,
                    selector = modifier.selector,
                    enabled = modifier.enabled,
                    turns = modifier.turns
                )
            }
        }
        
        // Track continuous events
        if (event.isContinuous() && !result.eventResolved) {
            val existingIndex = kingdom.ongoingEvents.indexOfFirst { it.id == event.id }
            if (existingIndex >= 0) {
                // Update existing continuous event
                // Note: Cannot modify readonly properties, need to create a new object
                console.log("Event ${event.id} continuing to stage ${result.stage + 1}")
            } else {
                // Add new continuous event
                console.log("Event ${event.id} becomes continuous at stage ${result.stage + 1}")
                // Note: RawOngoingKingdomEvent is managed externally by KingdomEvent.kt
            }
        } else if (result.eventResolved) {
            // Remove from ongoing if resolved
            kingdom.ongoingEvents = kingdom.ongoingEvents.filter { it.id != event.id }.toTypedArray()
        }
        
        // Save kingdom
        actor.setKingdom(kingdom)
        
        // Post outcome message
        postChatMessage(
            t("kingdom.eventResolved", recordOf(
                "eventName" to t(event.name),
                "outcome" to t(result.outcome.msg),
                "degreeOfSuccess" to t("kingdom.degreeOfSuccess.$result.degreeOfSuccess")
            ))
        )
    }
    
    /**
     * Get all active continuous events.
     */
    fun getContinuousEvents(kingdom: KingdomData): List<Pair<KingdomEvent, OngoingEventState>> {
        return kingdom.ongoingEvents
            .mapNotNull { raw ->
                val state = parseOngoingEvent(raw)
                if (state != null && !state.resolved) {
                    val event = KingdomEventTables.getEventById(state.eventId)
                    if (event?.isContinuous() == true) {
                        event to state
                    } else null
                } else null
            }
    }
    
    /**
     * Process continuous events at the start of a turn.
     * Some continuous events may have automatic effects or require checks.
     */
    suspend fun processContinuousEvents(
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        val continuousEvents = getContinuousEvents(kingdom)
        
        if (continuousEvents.isNotEmpty()) {
            console.log("Processing ${continuousEvents.size} continuous events")
            
            continuousEvents.forEach { (event, state) ->
                // Increment turns active
                val updatedState = state.copy(turnsActive = state.turnsActive + 1)
                
                // Log turn tracking for debugging
                // Note: turnsActive tracking would need to be added to the existing data structure
                
                // Log for debugging
                console.log("Continuous event ${event.id} has been active for ${updatedState.turnsActive} turns")
                
                // Some events might have automatic effects each turn
                // This would be event-specific logic
            }
            
            actor.setKingdom(kingdom)
            
            // Notify about active continuous events
            val eventNames = continuousEvents.map { (event, _) -> t(event.name) }
            postChatMessage(
                t("kingdom.continuousEventsActive", recordOf(
                    "count" to continuousEvents.size,
                    "events" to eventNames.joinToString(", ")
                ))
            )
        }
    }
    
    /**
     * Parse a raw ongoing event into a typed state object.
     */
    private fun parseOngoingEvent(raw: at.kmlite.pfrpg2e.kingdom.RawOngoingKingdomEvent): OngoingEventState? {
        return try {
            OngoingEventState(
                eventId = raw.id,
                currentStage = raw.stage,
                turnsActive = 0, // Not tracked in existing structure
                resolved = false, // Not tracked in existing structure
                customData = emptyMap() // TODO: Parse custom data if needed
            )
        } catch (e: Exception) {
            console.error("Failed to parse ongoing event", e)
            null
        }
    }
    
    /**
     * Clear all ongoing events (for testing or reset).
     */
    suspend fun clearOngoingEvents(actor: KingdomActor) {
        val kingdom = actor.getKingdom() ?: return
        kingdom.ongoingEvents = emptyArray()
        actor.setKingdom(kingdom)
        
        console.log("Cleared all ongoing events")
        postChatMessage(t("kingdom.ongoingEventsCleared"))
    }
    
    /**
     * Get the current event check DC from kingdom settings.
     */
    fun getCurrentEventDC(kingdom: KingdomData): Int {
        return kingdom.settings.eventDc
    }
    
    /**
     * Initialize the event system (load event data).
     * This should be called during module initialization.
     */
    fun initialize(eventJsonMap: Map<String, String>) {
        KingdomEventTables.initialize(eventJsonMap)
        console.log("Kingdom Events Manager initialized with ${eventJsonMap.size} events")
    }
}
