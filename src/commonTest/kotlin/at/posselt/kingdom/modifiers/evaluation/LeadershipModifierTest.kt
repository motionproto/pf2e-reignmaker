package at.kmlite.kingdom.modifiers.evaluation

import at.kmlite.pfrpg2e.data.actor.Skill
import at.kmlite.pfrpg2e.data.actor.SkillRanks
import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill
import at.kmlite.pfrpg2e.data.kingdom.leaders.LeaderActor
import at.kmlite.pfrpg2e.data.kingdom.leaders.LeaderActors
import at.kmlite.pfrpg2e.data.kingdom.leaders.LeaderKingdomSkills
import at.kmlite.pfrpg2e.data.kingdom.leaders.LeaderSkills
import at.kmlite.pfrpg2e.data.kingdom.leaders.LeaderType
import at.kmlite.pfrpg2e.kingdom.modifiers.ModifierSelector
import at.kmlite.pfrpg2e.kingdom.modifiers.bonuses.createLeadershipModifiers
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.evaluateModifiers
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.filterModifiersAndUpdateContext
import kotlin.test.Test
import kotlin.test.assertEquals

class LeadershipModifierTest {
    @Test
    fun testAppliesFull() {
        val modifiers = createLeadershipModifiers(
            leaderSkills = LeaderSkills(counselor = listOf(Skill.STEALTH, Skill.ACROBATICS)),
            leaderKingdomSkills = LeaderKingdomSkills(
                counselor = listOf(KingdomSkill.AGRICULTURE)
            ),
            leaderActors = LeaderActors(
                counselor = LeaderActor(
                    level = 0,
                    type = LeaderType.PC,
                    ranks = SkillRanks(
                        stealth = 2,
                        acrobatics = 3,
                    ),
                    invested = false,
                    uuid = "",
                    img = null,
                    name = "name",
                )
            ),
        )
        val filteredModifiers = filterModifiersAndUpdateContext(modifiers, defaultContext, ModifierSelector.CHECK)
        val result = evaluateModifiers(filteredModifiers)
        assertEquals(2, result.total)
    }
}