package at.kmlite.pfrpg2e.kingdom.modifiers.bonuses

import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierType
import at.kmlite.pfrpg2e.kingdom.modifiers.expressions.All
import at.kmlite.pfrpg2e.kingdom.modifiers.expressions.HasRollOption

fun createSupernaturalSolutionModifier() =
    Modifier(
        id = "creative-solution",
        type = ModifierType.CIRCUMSTANCE,
        value = 2,
        name = "modifiers.bonuses.creativeSolution",
        enabled = true,
        applyIf = listOf(
            All(expressions = listOf(HasRollOption(
                option = "creative-solution"
            )))
        )
    )