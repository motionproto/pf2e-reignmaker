package at.kmlite.pfrpg2e.data.kingdom

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

@Suppress("unused")
enum class FameType: Translatable, ValueEnum {
    FAMOUS,
    INFAMOUS;

    companion object {
        fun fromString(value: String) = fromCamelCase<FameType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "fameType.$value"
}