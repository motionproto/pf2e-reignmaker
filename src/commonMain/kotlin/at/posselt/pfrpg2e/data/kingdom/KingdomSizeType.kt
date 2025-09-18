package at.kmlite.pfrpg2e.data.kingdom

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class KingdomSizeType: Translatable, ValueEnum {
    TERRITORY,
    PROVINCE,
    STATE,
    COUNTRY,
    DOMINION;

    companion object {
        fun fromString(value: String) = fromCamelCase<KingdomSizeType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "kingdomSizeType.$value"
}