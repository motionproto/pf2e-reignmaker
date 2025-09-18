package at.kmlite.pfrpg2e.kingdom.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.Contextual
import js.objects.JsPlainObject

/**
 * Represents categories of kingdom events based on their nature.
 * Events can have multiple traits but are categorized by their primary characteristic.
 */
enum class EventCategory(val value: String) {
    BENEFICIAL("beneficial"),
    HARMFUL("harmful"),
    DANGEROUS("dangerous"),
    CONTINUOUS("continuous");
    
    companion object {
        fun fromString(value: String): EventCategory? =
            entries.find { it.value == value }
    }
}

/**
 * Represents a modifier applied as a result of an event outcome.
 * These modifiers can affect various kingdom attributes and may last multiple turns.
 */
@Serializable
data class EventModifier(
    val type: String, // "untyped", "circumstance", etc.
    val name: String, // Translation key for the modifier name
    val value: Int, // Numeric value of the modifier
    val selector: String, // What it applies to: "gold", "unrest", "fame", etc.
    val enabled: Boolean = true,
    val turns: Int? = null, // null = permanent, otherwise number of turns
    val choice: List<String>? = null // For modifiers that allow choosing (e.g., resource types)
)

/**
 * Represents the outcome of a specific degree of success for an event stage.
 */
@Serializable
data class EventOutcome(
    val msg: String, // Translation key for the outcome message
    val modifiers: List<EventModifier> = emptyList()
)

/**
 * Represents a single stage of event resolution.
 * Events can have multiple stages that must be resolved in sequence.
 */
@Serializable
data class EventStage(
    val skills: List<String>, // List of skills that can be used (character skills)
    val criticalSuccess: EventOutcome? = null,
    val success: EventOutcome? = null,
    val failure: EventOutcome? = null,
    val criticalFailure: EventOutcome? = null
)

/**
 * Represents a complete kingdom event loaded from JSON.
 * Events test player skills and create narrative moments with mechanical consequences.
 */
@Serializable
data class KingdomEvent(
    val id: String,
    val name: String, // Translation key
    val description: String, // Translation key
    val traits: List<String> = emptyList(), // Event traits/categories
    val location: String? = null, // Translation key for location description
    val modifier: Int = 0, // Bonus/penalty to the check
    val resolution: String? = null, // Translation key for resolution description
    val resolvedOn: List<String> = emptyList(), // Which outcomes resolve the event
    val stages: List<EventStage> = emptyList(),
    val special: String? = null // Translation key for special rules
)

/**
 * Tracks the state of an ongoing or continuous event.
 * Used for events that persist across multiple turns.
 */
@Serializable
data class OngoingEventState(
    val eventId: String,
    val currentStage: Int = 0,
    val turnsActive: Int = 0,
    val resolved: Boolean = false,
    val customData: Map<String, String> = emptyMap() // For event-specific tracking
)

/**
 * Result of an event resolution attempt.
 * Contains all the effects that need to be applied to the kingdom.
 */
@Serializable
data class EventResolutionResult(
    val eventId: String,
    val stage: Int,
    val skill: String,
    val degreeOfSuccess: String, // "criticalSuccess", "success", "failure", "criticalFailure"
    val outcome: EventOutcome,
    val eventResolved: Boolean, // Whether the entire event is now complete
    val message: String? = null // Custom message to display
)

/**
 * Tracks the current event check DC and related state.
 * This is used to manage the escalating probability of events.
 */
@Serializable
data class EventCheckState(
    val currentDC: Int = 16,
    val dcStep: Int = 5,
    val minDC: Int = 6,
    val turnsWithoutEvent: Int = 0
) {
    /**
     * Calculate the new DC after a failed event check.
     */
    fun decreaseDC(): Int = (currentDC - dcStep).coerceAtLeast(minDC)
    
    /**
     * Reset DC after an event occurs.
     */
    fun resetDC(): Int = 16
}

// Note: RawOngoingKingdomEvent is defined in KingdomEvent.kt

/**
 * Extension functions for working with event data.
 */
fun KingdomEvent.isContinuous(): Boolean = 
    traits.contains("continuous")

fun KingdomEvent.isBeneficial(): Boolean =
    traits.contains("beneficial")

fun KingdomEvent.isDangerous(): Boolean =
    traits.contains("dangerous") || traits.contains("harmful")

fun KingdomEvent.getCategory(): EventCategory? {
    return when {
        traits.contains("continuous") -> EventCategory.CONTINUOUS
        traits.contains("beneficial") -> EventCategory.BENEFICIAL
        traits.contains("dangerous") -> EventCategory.DANGEROUS
        traits.contains("harmful") -> EventCategory.HARMFUL
        else -> null
    }
}

/**
 * Check if an event should be resolved based on the degree of success.
 */
fun KingdomEvent.isResolvedBy(degreeOfSuccess: String): Boolean =
    resolvedOn.contains(degreeOfSuccess)

/**
 * Get the outcome for a specific degree of success in a stage.
 */
fun EventStage.getOutcome(degreeOfSuccess: String): EventOutcome? {
    return when (degreeOfSuccess) {
        "criticalSuccess" -> criticalSuccess
        "success" -> success
        "failure" -> failure
        "criticalFailure" -> criticalFailure
        else -> null
    }
}
