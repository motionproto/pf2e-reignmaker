package kingdom.lite.fresh

import js.objects.JsPlainObject
import kotlinx.serialization.Serializable

/**
 * Fresh start - Kingdom data model based on the simplified rules
 */
@Serializable
data class Kingdom(
    val id: String,
    val name: String = "New Kingdom",
    val level: Int = 1,
    val xp: Int = 0,
    val currentTurn: Int = 1,
    val gold: Int = 0,              // Currency
    val unrest: Int = 0,            // Negative status
    val fame: Int = 0,              // Reputation
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
    val stone: Int = 0
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
 * Raw data types for JSON parsing - matching actual JSON schema
 */

// Structure JSON schema
@JsPlainObject
external interface RawStructure {
    val id: String
    val name: String
    val type: String
    val category: String
    val tier: Int
    val effect: String?
    val earnIncomeLevel: String?
    val bonus: Int?
    val skills: Array<String>?
    val construction: RawConstruction?
    val traits: Array<String>
    val special: String?
    val upgradeFrom: String?
}

@JsPlainObject
external interface RawConstruction {
    val resources: RawResourceCost?
}

@JsPlainObject
external interface RawResourceCost {
    val lumber: Int?
    val stone: Int?
    val ore: Int?
    val food: Int?
}

// Player Action JSON schema
@JsPlainObject
external interface RawPlayerAction {
    val id: String
    val name: String
    val category: String
    val description: String
    val skills: Array<RawSkillOption>?
    val effects: RawActionEffects?
    val special: String?
}

@JsPlainObject
external interface RawSkillOption {
    val skill: String
    val description: String
}

@JsPlainObject
external interface RawActionEffects {
    val criticalSuccess: RawActionResult?
    val success: RawActionResult?
    val failure: RawActionResult?
    val criticalFailure: RawActionResult?
}

@JsPlainObject
external interface RawActionResult {
    val description: String
    val modifiers: dynamic  // Complex object, using dynamic for now
}

// Event JSON schema
@JsPlainObject
external interface RawEvent {
    val id: String
    val name: String
    val description: String
    val traits: Array<String>
    val location: String?
    val modifier: Int
    val resolution: String?
    val resolvedOn: Array<String>?
    val stages: Array<RawEventStage>?
    val special: String?
}

@JsPlainObject
external interface RawEventStage {
    val skills: Array<String>?
    val criticalSuccess: RawEventOutcome?
    val success: RawEventOutcome?
    val failure: RawEventOutcome?
    val criticalFailure: RawEventOutcome?
}

@JsPlainObject
external interface RawEventOutcome {
    val msg: String
    val modifiers: Array<RawEventModifier>?
}

@JsPlainObject
external interface RawEventModifier {
    val type: String
    val name: String
    val value: Int
    val selector: String
    val enabled: Boolean
    val turns: Int?
}

// Incident JSON schema
@JsPlainObject
external interface RawIncident {
    val id: String
    val name: String
    val tier: String
    val description: String
    val percentileMin: Int
    val percentileMax: Int
    val skillOptions: Array<RawIncidentSkillOption>
}

@JsPlainObject
external interface RawIncidentSkillOption {
    val skill: String
    val description: String
    val successEffect: String
    val failureEffect: String
    val criticalFailureExtra: String?
}
