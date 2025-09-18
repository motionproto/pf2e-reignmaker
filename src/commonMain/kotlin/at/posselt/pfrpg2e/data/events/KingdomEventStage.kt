package at.kmlite.pfrpg2e.data.events

import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill
import at.kmlite.pfrpg2e.data.kingdom.leaders.Leader

data class KingdomEventStage(
    val skills: Set<KingdomSkill>,
    val leader: Leader,
    val criticalSuccess: KingdomEventOutcome?,
    val success: KingdomEventOutcome?,
    val failure: KingdomEventOutcome?,
    val criticalFailure: KingdomEventOutcome?,
)