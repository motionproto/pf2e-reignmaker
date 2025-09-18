package at.kmlite.pfrpg2e.data.kingdom.settlements

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class SettlementSizeType : Translatable, ValueEnum {
    VILLAGE,
    TOWN,
    CITY,
    METROPOLIS;

    companion object {
        fun fromString(value: String) = fromCamelCase<SettlementSizeType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "settlementSizeType.$value"
}