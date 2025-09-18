package at.kmlite.pfrpg2e.data.kingdom.structures

import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill

data class StructureBonus(
    val skill: KingdomSkill?,
    val activity: String?,
    val value: Int,
)