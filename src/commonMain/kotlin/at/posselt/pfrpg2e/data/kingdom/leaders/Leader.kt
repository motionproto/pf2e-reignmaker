package at.kmlite.pfrpg2e.data.kingdom.leaders

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.data.kingdom.KingdomAbility
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class Leader(val keyAbility: KingdomAbility): Translatable, ValueEnum {
    RULER(KingdomAbility.LOYALTY),
    COUNSELOR(KingdomAbility.CULTURE),
    EMISSARY(KingdomAbility.LOYALTY),
    GENERAL(KingdomAbility.STABILITY),
    MAGISTER(KingdomAbility.CULTURE),
    TREASURER(KingdomAbility.ECONOMY),
    VICEROY(KingdomAbility.ECONOMY),
    WARDEN(KingdomAbility.STABILITY);

    companion object {
        fun fromString(value: String) = fromCamelCase<Leader>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "leader.$value"
}