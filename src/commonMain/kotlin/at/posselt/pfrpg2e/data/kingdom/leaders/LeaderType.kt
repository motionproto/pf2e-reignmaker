package at.kmlite.pfrpg2e.data.kingdom.leaders

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class LeaderType: Translatable, ValueEnum {
    PC,
    REGULAR_NPC,
    HIGHLY_MOTIVATED_NPC,
    NON_PATHFINDER_NPC;

    companion object {
        fun fromString(value: String) = fromCamelCase<LeaderType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "leaderType.$value"
}