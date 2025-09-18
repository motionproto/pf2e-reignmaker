package at.kmlite.pfrpg2e.kingdom.modifiers

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class ModifierType : Translatable, ValueEnum {
    ABILITY,
    PROFICIENCY,
    ITEM,
    STATUS,
    CIRCUMSTANCE,
    LEADERSHIP,
    VACANCY,
    UNTYPED;

    companion object {
        fun fromString(value: String) = fromCamelCase<ModifierType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey = "modifierType.$value"
}