package at.kmlite.pfrpg2e.kingdom.sheet.contexts

import at.kmlite.pfrpg2e.app.forms.FormElementContext
import at.kmlite.pfrpg2e.app.forms.NumberInput
import at.kmlite.pfrpg2e.kingdom.data.RawResources
import at.kmlite.pfrpg2e.utils.t
import kotlinx.js.JsPlainObject

@JsPlainObject
external interface ResourceContext {
    var now: FormElementContext
    var next: FormElementContext
}

fun RawResources.toContext(key: String, label: String) =
    ResourceContext(
        now = NumberInput(
            name = "$key.now",
            label = label,
            value = now,
            stacked = false,
            elementClasses = listOf("km-width-small"),
            labelClasses = listOf("km-slim-inputs"),
        ).toContext(),
        next = NumberInput(
            name = "$key.next",
            label = t("kingdom.next"),
            value = next,
            stacked = false,
            elementClasses = listOf("km-width-small", "km-slim-inputs"),
            hideLabel = true,
        ).toContext(),
    )