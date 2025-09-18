package at.kmlite.pfrpg2e.kingdom.sheet.contexts

import at.kmlite.pfrpg2e.app.forms.FormElementContext
import at.kmlite.pfrpg2e.app.forms.NumberInput
import at.kmlite.pfrpg2e.kingdom.data.RawConsumption
import at.kmlite.pfrpg2e.utils.t
import kotlinx.js.JsPlainObject

@JsPlainObject
external interface ConsumptionContext {
    var armies: FormElementContext
    var now: FormElementContext
    var next: FormElementContext
}

fun RawConsumption.toContext(automateArmyConsumption: Boolean) =
    ConsumptionContext(
        armies = NumberInput(
            name = "consumption.armies",
            value = armies,
            label = t("kingdom.armies"),
            readonly = automateArmyConsumption,
            elementClasses = listOf("km-slim-inputs", "km-width-small"),
        ).toContext(),
        now = NumberInput(
            name = "consumption.now",
            value = now,
            label = t("kingdom.consumption"),
            elementClasses = listOf("km-slim-inputs", "km-width-small"),
        ).toContext(),
        next = NumberInput(
            name = "consumption.next",
            value = next,
            label = t("kingdom.next"),
            elementClasses = listOf("km-slim-inputs", "km-width-small"),
        ).toContext(),
    )