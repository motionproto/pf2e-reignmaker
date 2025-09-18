package at.kmlite.pfrpg2e.kingdom.modifiers.penalties

import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill
import at.kmlite.pfrpg2e.data.kingdom.settlements.Settlement
import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierType
import at.kmlite.pfrpg2e.kingdom.modifiers.expressions.Eq

fun noBridgePenalty(settlements: List<Settlement>): Modifier? {
    val settlementsLackingBridge = settlements.filter { it.lacksBridge }
    return if (settlementsLackingBridge.isNotEmpty()) {
        Modifier(
            id = "lacking-bridge",
            name = "modifiers.penalties.lackingBridges",
            value = -settlementsLackingBridge.size,
            applyIf = listOf(
                Eq("@skill", KingdomSkill.TRADE.value)
            ),
            i18nContext = mapOf(
                "count" to settlementsLackingBridge.size,
                "settlements" to settlementsLackingBridge.joinToString(", ") { it.name }
            ),
            type = ModifierType.ITEM,
        )
    } else {
        null
    }
}
