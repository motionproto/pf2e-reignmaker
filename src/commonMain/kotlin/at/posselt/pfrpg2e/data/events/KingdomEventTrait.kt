package at.kmlite.pfrpg2e.data.events

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class KingdomEventTrait: Translatable, ValueEnum {
    DOWNTIME,
    LEADERSHIP,
    HEX,
    DANGEROUS,
    BENEFICIAL,
    SETTLEMENT,
    CONTINUOUS;

    companion object {
        fun fromString(value: String) = fromCamelCase<KingdomEventTrait>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "kingdomEventTrait.$value"
}