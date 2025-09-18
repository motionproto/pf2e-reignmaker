package at.kmlite.pfrpg2e.kingdom.modifiers

import at.kmlite.pfrpg2e.data.checks.DegreeOfSuccess

data class DowngradeResult(
    val downgrade: DegreeOfSuccess,
    val times: Int = 1,
)