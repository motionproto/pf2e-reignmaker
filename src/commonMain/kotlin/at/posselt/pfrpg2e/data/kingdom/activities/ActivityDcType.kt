package at.kmlite.pfrpg2e.data.kingdom.activities

import at.kmlite.pfrpg2e.data.ValueEnum
import at.kmlite.pfrpg2e.fromCamelCase
import at.kmlite.pfrpg2e.localization.Translatable
import at.kmlite.pfrpg2e.toCamelCase

enum class ActivityDcType: ValueEnum, Translatable {
    VALUE,
    CONTROL,
    CUSTOM,
    NONE,
    EVENT,
    NEGOTIATION,
    NEGOTIATION_OR_CONTROL,
    SCOUTING;

    companion object {
        fun fromString(value: String) = fromCamelCase<ActivityDcType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "activityDcType.$value"
}

fun getDcType(value: Any): ActivityDcType =
    when(value) {
        ActivityDcType.CONTROL.value -> ActivityDcType.CONTROL
        ActivityDcType.CUSTOM.value -> ActivityDcType.CUSTOM
        ActivityDcType.NONE.value -> ActivityDcType.NONE
        ActivityDcType.SCOUTING.value -> ActivityDcType.SCOUTING
        else -> ActivityDcType.VALUE
    }
