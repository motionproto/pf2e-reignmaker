package at.kmlite.pfrpg2e.kingdom.modifiers.bonuses

import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierType
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.MergedSettlement
import at.kmlite.pfrpg2e.kingdom.modifiers.expressions.Eq
import at.kmlite.pfrpg2e.slugify

fun createStructureBonuses(mergedSettlement: MergedSettlement) =
    mergedSettlement.settlement.highestUniqueBonuses.map {
        val ids = listOfNotNull(it.skill, it.activity, it.locatedIn.slugify()) +
                it.structureNames.map { name -> name.slugify() }
        Modifier(
            value = it.value,
            id = "structure-${ids.joinToString("-")}",
            name = "${it.locatedIn} (${it.structureNames.joinToString(", ")})",
            applyIf = listOfNotNull(
                it.skill?.let { skill -> Eq("@skill", skill.value) },
                it.activity?.let { activity -> Eq("@activity", activity) },
            ),
            type = ModifierType.ITEM,
        )
    }
