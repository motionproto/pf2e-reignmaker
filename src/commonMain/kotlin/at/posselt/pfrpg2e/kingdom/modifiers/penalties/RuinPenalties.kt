package at.kmlite.pfrpg2e.kingdom.modifiers.penalties

import at.kmlite.pfrpg2e.data.kingdom.Ruin
import at.kmlite.pfrpg2e.data.kingdom.RuinValues
import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierType
import at.kmlite.pfrpg2e.kingdom.modifiers.expressions.Eq

fun createRuinModifiers(values: RuinValues): List<Modifier> =
    Ruin.entries.mapNotNull {
        val value = values.resolve(it).penalty
        if (value == 0) {
            null
        } else {
            Modifier(
                id = "ruin-${it.value}",
                name = it.i18nKey,
                type = ModifierType.ITEM,
                value = -value,
                applyIf = listOf(
                    Eq("@ability", it.ability.value)
                )
            )
        }
    }