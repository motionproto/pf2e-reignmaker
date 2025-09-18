package at.kmlite.pfrpg2e.kingdom.data

import kotlinx.js.JsPlainObject

/**
 * Tracks gold as the kingdom's persistent currency in Reignmaker-lite.
 * Gold carries over between turns unlike other resources.
 */
@JsPlainObject
external interface RawGold {
    var treasury: Int   // Current gold on hand (persists between turns)
    var income: Int     // Gold generated per turn from structures/trade
    var upkeep: Int     // Gold consumed per turn for maintenance
}

fun RawGold.endTurn(): RawGold = RawGold(
    treasury = treasury + income - upkeep,
    income = 0,  // Reset for next turn calculation
    upkeep = 0   // Reset for next turn calculation
)

fun RawGold.netIncome(): Int = income - upkeep

/**
 * Convert to display context for the UI.
 * Returns a generic context object that can be used in templates.
 */
fun RawGold.toContext(): Any {
    val goldObj = js("({})")
    goldObj.asDynamic().treasury = treasury
    goldObj.asDynamic().income = income
    goldObj.asDynamic().upkeep = upkeep
    goldObj.asDynamic().netIncome = netIncome()
    return goldObj
}
