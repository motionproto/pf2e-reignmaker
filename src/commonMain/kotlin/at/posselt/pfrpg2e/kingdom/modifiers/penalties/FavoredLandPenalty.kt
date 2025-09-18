package at.kmlite.pfrpg2e.kingdom.modifiers.penalties

import at.kmlite.pfrpg2e.data.kingdom.KingdomPhase
import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierType
import at.kmlite.pfrpg2e.kingdom.modifiers.expressions.Eq

fun createFavoredLandPenalty() =
    Modifier(
        value = -2,
        type = ModifierType.UNTYPED,
        id = "favored-land",
        enabled = false,
        name = "modifiers.penalties.favoredLand",
        applyIf = listOf(
            Eq("@phase", KingdomPhase.REGION.value)
        )
    )