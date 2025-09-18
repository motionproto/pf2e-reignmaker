package at.kmlite.pfrpg2e.kingdom.modifiers.bonuses

import at.kmlite.pfrpg2e.data.kingdom.KingdomPhase
import at.kmlite.pfrpg2e.data.kingdom.leaders.Leader
import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierType
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.GlobalStructureBonuses
import at.kmlite.pfrpg2e.kingdom.modifiers.expressions.Eq

fun createRulerBonus(global: GlobalStructureBonuses): Modifier? =
    if (global.leaderLeadershipActivityBonus > 0) {
        Modifier(
            type = ModifierType.ITEM,
            name = "modifiers.bonuses.rulerLeadershipBonus",
            value = global.leaderLeadershipActivityBonus,
            applyIf = listOf(
                Eq("@leader", Leader.RULER.value),
                Eq("@phase", KingdomPhase.LEADERSHIP.value),
            ),
            id = "ruler-bonus"
        )
    } else {
        null
    }