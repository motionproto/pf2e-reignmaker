package at.kmlite.pfrpg2e.data.events

import at.kmlite.pfrpg2e.kingdom.modifiers.Modifier

data class KingdomEventOutcome(
    val msg: String,
    val modifiers: List<Modifier>,
)