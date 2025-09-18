package at.kmlite.pfrpg2e.data.kingdom.settlements

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class SettlementType: Translatable, ValueEnum {
    SETTLEMENT,
    CAPITAL;

    companion object {
        fun fromString(value: String) = fromCamelCase<SettlementType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "settlementType.$value"
}