package at.kmlite.pfrpg2e.data.armies

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class ArmyType: Translatable, ValueEnum {
    SKIRMISHER,
    CAVALRY,
    SIEGE,
    INFANTRY;

    companion object {
        fun fromString(value: String) = fromCamelCase<ArmyType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "armyType.$value"
}