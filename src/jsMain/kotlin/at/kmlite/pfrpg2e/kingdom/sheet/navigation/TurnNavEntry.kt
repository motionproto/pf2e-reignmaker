package at.kmlite.pfrpg2e.kingdom.sheet.navigation

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

@Suppress("unused")
enum class TurnNavEntry : ValueEnum, Translatable {
    UPKEEP,
    COMMERCE,
    LEADERSHIP,
    REGION,
    CIVIC,
    ARMY,
    EVENT,
    XP,
    END;

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "kingdomTurnNav.$value"
}