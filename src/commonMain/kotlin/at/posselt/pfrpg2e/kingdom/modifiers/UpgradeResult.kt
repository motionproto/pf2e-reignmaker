package at.kmlite.pfrpg2e.kingdom.modifiers

import at.kmlite.pfrpg2e.data.checks.DegreeOfSuccess

data class UpgradeResult(
    val upgrade: DegreeOfSuccess,
    val times: Int,
)
