package at.kmlite.pfrpg2e.kingdom.sheet.contexts

import at.kmlite.pfrpg2e.app.forms.FormElementContext
import at.kmlite.pfrpg2e.app.forms.Select
import at.kmlite.pfrpg2e.data.kingdom.FameType
import at.kmlite.pfrpg2e.kingdom.data.RawFame
import at.kmlite.pfrpg2e.utils.t
import js.objects.JsPlainObject

@JsPlainObject
external interface FameContext {
    val now: FormElementContext
    val next: FormElementContext
    val type: FormElementContext
}

fun RawFame.toContext(maximumFamePoints: Int): FameContext {
    val fameType = FameType.fromString(type) ?: FameType.FAMOUS
    val label = t(fameType)
    return FameContext(
        now = Select.range(
            name = "fame.now",
            label = label,
            value = now,
            from = 0,
            to = maximumFamePoints,
            stacked = false,
            elementClasses = listOf("km-width-small"),
            labelClasses = listOf("km-slim-inputs"),
        ).toContext(),
        next = Select.range(
            name = "fame.next",
            label = t("kingdom.next"),
            value = next,
            from = 0,
            to = maximumFamePoints,
            stacked = false,
            elementClasses = listOf("km-width-small"),
            labelClasses = listOf("km-slim-inputs"),
        ).toContext(),
        type = Select.fromEnum<FameType>(
            name = "fame.type",
            value = fameType,
            stacked = false,
            hideLabel = true,
        ).toContext(),
    )
}