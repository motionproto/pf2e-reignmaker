package at.kmlite.pfrpg2e.kingdom.sheet.contexts

import at.kmlite.pfrpg2e.app.forms.FormElementContext
import at.kmlite.pfrpg2e.app.forms.Select
import at.kmlite.pfrpg2e.app.forms.SelectOption
import at.kmlite.pfrpg2e.data.kingdom.KingdomAbility
import at.kmlite.pfrpg2e.kingdom.RawHeartland
import at.kmlite.pfrpg2e.kingdom.data.RawHeartlandChoices
import at.kmlite.pfrpg2e.utils.t
import js.objects.JsPlainObject

@JsPlainObject
external interface HeartlandContext {
    val type: FormElementContext
    val description: String?
    val boost: String
}

fun RawHeartlandChoices.toContext(heartlands: List<RawHeartland>): HeartlandContext {
    val heartland = heartlands.find { it.id == type }
    return HeartlandContext(
        type = Select(
            name = "heartland.type",
            value = type,
            options = heartlands.map { SelectOption(it.name, it.id) },
            label = t("kingdom.heartland"),
            required = false,
            stacked = false,
            hideLabel = true,
        ).toContext(),
        description = heartland?.description,
        boost = heartland?.boost?.let { KingdomAbility.fromString(it) }?.let { t(it) } ?: "",
    )
}