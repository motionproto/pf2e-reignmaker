package at.kmlite.pfrpg2e.kingdom.modifiers.evaluation

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class UntrainedProficiencyMode: ValueEnum, Translatable {
    NONE,
    HALF,
    FULL;

    companion object {
        fun fromString(value: String) = fromCamelCase<UntrainedProficiencyMode>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "untrainedProficiencyMode.$value"
}
