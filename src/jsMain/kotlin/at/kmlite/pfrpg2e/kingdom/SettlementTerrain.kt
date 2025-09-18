package at.kmlite.pfrpg2e.kingdom

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class SettlementTerrain: ValueEnum, Translatable {
    FOREST,
    SWAMP,
    MOUNTAINS,
    PLAINS;

    companion object {
        fun fromString(value: String) = fromCamelCase<SettlementTerrain>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "settlementTerrain.$value"
}