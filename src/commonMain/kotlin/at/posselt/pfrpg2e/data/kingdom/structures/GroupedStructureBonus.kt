package at.kmlite.pfrpg2e.data.kingdom.structures

import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill

data class GroupedStructureBonus(
    val structureNames: Set<String>,
    val skill: KingdomSkill?,
    val activity: String?,
    val value: Int,
    val locatedIn: String,
)