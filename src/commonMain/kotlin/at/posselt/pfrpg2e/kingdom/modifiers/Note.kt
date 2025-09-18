package at.kmlite.pfrpg2e.kingdom.modifiers

import at.kmlite.pfrpg2e.data.checks.DegreeOfSuccess

data class Note(
    val note: String,
    val degree: DegreeOfSuccess? = null,
)