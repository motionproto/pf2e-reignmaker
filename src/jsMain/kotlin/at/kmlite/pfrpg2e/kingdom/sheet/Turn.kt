package at.kmlite.pfrpg2e.kingdom.sheet

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class Turn : Translatable, ValueEnum {
    NOW,
    NEXT;

    companion object {
        fun fromString(value: String) = fromCamelCase<Turn>(value)
    }

    override val i18nKey = "resourceButton.turn.$value"

    val i18nKeyShort = "resourceButton.turnShort.$value"

    override val value: String
        get() = toCamelCase()
}