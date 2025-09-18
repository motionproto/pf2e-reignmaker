package at.kmlite.pfrpg2e.data.kingdom

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class KingdomAbility : Translatable, ValueEnum {
    CULTURE,
    ECONOMY,
    LOYALTY,
    STABILITY;

    companion object {
        fun fromString(value: String) = fromCamelCase<KingdomAbility>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "kingdomAbility.$value"
}

fun calculateScore(boosts: Int, flaws: Int): Int {
    val total = boosts - flaws
    return if (total < 4) {
        10 + total * 2
    } else {
        18 + (total - 4)
    }
}