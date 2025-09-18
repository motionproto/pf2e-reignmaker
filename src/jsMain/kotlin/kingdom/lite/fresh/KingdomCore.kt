package kingdom.lite.fresh

import js.objects.JsPlainObject
import kotlinx.serialization.Serializable

/**
 * Fresh start - Minimal kingdom data model based on the reference rules
 */
@Serializable
data class Kingdom(
    val id: String,
    val name: String = "New Kingdom",
    val level: Int = 1,
    val xp: Int = 0,
    val currentTurn: Int = 1,
    val resources: Resources = Resources(),
    val settlements: List<Settlement> = emptyList(),
    val activeEvents: List<String> = emptyList(), // Event IDs
    val modifiers: List<Modifier> = emptyList()
)

@Serializable
data class Resources(
    val food: Int = 0,
    val lumber: Int = 0,
    val ore: Int = 0,
    val stone: Int = 0,
    val commodities: Int = 0,
    val luxuries: Int = 0,
    val resourcePoints: Int = 0
)

@Serializable
data class Settlement(
    val id: String,
    val name: String,
    val level: Int = 1,
    val structures: List<String> = emptyList() // Structure IDs
)

@Serializable
data class Modifier(
    val source: String,
    val type: String,
    val value: Int,
    val duration: String = "permanent" // permanent, turns:X, until:condition
)

/**
 * Raw data types for JSON parsing
 */
@JsPlainObject
external interface RawStructure {
    val id: String
    val name: String
    val level: Int
    val traits: Array<String>
    val cost: RawCost?
    val description: String
}

@JsPlainObject
external interface RawCost {
    val resourcePoints: Int?
    val food: Int?
    val lumber: Int?
    val ore: Int?
    val stone: Int?
    val commodities: Int?
    val luxuries: Int?
}

@JsPlainObject
external interface RawPlayerAction {
    val id: String
    val name: String
    val description: String
    val phase: String
    val dc: Int?
    val skill: String?
    val traits: Array<String>?
    val requirements: String?
    val criticalSuccess: String?
    val success: String?
    val failure: String?
    val criticalFailure: String?
}

@JsPlainObject
external interface RawEvent {
    val id: String
    val name: String
    val description: String
    val traits: Array<String>
    val modifier: Int?
    val resolution: String?
}
