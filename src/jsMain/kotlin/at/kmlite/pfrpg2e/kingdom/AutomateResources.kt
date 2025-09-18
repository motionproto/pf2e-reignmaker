package at.kmlite.pfrpg2e.kingdom

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class AutomateResources: ValueEnum, Translatable {
    KINGMAKER,
    TILE_BASED,
    MANUAL;

    companion object {
        fun fromString(value: String) = fromCamelCase<AutomateResources>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "automateResources.$value"
}