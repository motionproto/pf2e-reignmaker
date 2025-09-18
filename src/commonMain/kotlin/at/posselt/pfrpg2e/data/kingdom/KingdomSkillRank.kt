package at.kmlite.pfrpg2e.data.kingdom

import at.kmlite.pfrpg2e.data.actor.Proficiency

data class KingdomSkillRank(
    val skill: KingdomSkill,
    val rank: Int = 0,
) {
    val proficiency: Proficiency
        get() = Proficiency.Companion.fromRank(rank)
}