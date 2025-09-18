package at.kmlite.pfrpg2e.kingdom.modifiers

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class ModifierSelector : Translatable, ValueEnum {
    CHECK,
    ORE,
    STONE,
    LUMBER,
    CONSUMPTION,
    GOLD,
    FOOD,
    UNREST,
    FAME;

    companion object {
        fun fromString(value: String) = fromCamelCase<ModifierSelector>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey = "modifierSelector.$value"
}
