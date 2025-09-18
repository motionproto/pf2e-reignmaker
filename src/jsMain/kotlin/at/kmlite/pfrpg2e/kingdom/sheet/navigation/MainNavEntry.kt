package at.kmlite.pfrpg2e.kingdom.sheet.navigation

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class MainNavEntry: Translatable, ValueEnum {
    TURN,
    KINGDOM,
    SETTLEMENTS,
    TRADE_AGREEMENTS,
    MODIFIERS,
    NOTES;

    companion object {
        fun fromString(value: String) = fromCamelCase<MainNavEntry>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "kingdomMainNav.$value"
}