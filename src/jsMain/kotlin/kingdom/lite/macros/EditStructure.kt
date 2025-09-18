package kingdom.lite.macros

import kingdom.lite.app.forms.TextArea
import kingdom.lite.app.forms.formContext
import kingdom.lite.app.prompt
import kingdom.lite.kingdom.structures.RawStructureData
import kingdom.lite.kingdom.structures.StructureActor
import kingdom.lite.kingdom.structures.StructureValidationError
import kingdom.lite.kingdom.structures.getRawStructureData
import kingdom.lite.kingdom.structures.setStructureData
import kingdom.lite.kingdom.structures.structureRefSchema
import kingdom.lite.kingdom.structures.unsetStructureData
import kingdom.lite.kingdom.structures.validateStructure
import kingdom.lite.takeIfInstance
import kingdom.lite.utils.t
import com.foundryvtt.core.documents.Actor
import com.foundryvtt.core.ui
import js.objects.recordOf
import js.objects.unsafeJso
import kotlinx.js.JsPlainObject
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json.Default.parseToJsonElement

@JsPlainObject
external interface StructureMacroData {
    val data: String
}

suspend fun editStructureMacro(actor: Actor?) {
    val npcActor = actor
        ?.takeIfInstance<StructureActor>()
        ?.parent.unsafeCast<StructureActor?>()
        ?.baseActor.unsafeCast<StructureActor?>()
    if (npcActor == null) {
        ui.notifications.error(t("macros.editStructure.selectActor"))
        return
    }
    val existing = npcActor.getRawStructureData() ?: unsafeJso()
    prompt<StructureMacroData, Unit>(
        templatePath = "components/forms/form.hbs",
        templateContext = recordOf(
            "formRows" to formContext(
                TextArea(
                    label = t("macros.editStructure.data"),
                    name = "data",
                    value = JSON.stringify(existing, null, 2),
                    help = t("macros.editStructure.dataHelp"),
                    required = false,
                    elementClasses = listOf("larger-textarea")
                ),
            )
        ),
        title = t("macros.editStructure.title"),
        width = 600,
    ) { data ->
        try {
            if (data.data.isBlank()) {
                ui.notifications.info(t("macros.editStructure.removedData"))
                npcActor.unsetStructureData()
            } else {
                try {
                    validateStructure(data.data, parseToJsonElement(JSON.stringify(structureRefSchema)))
                    val value = JSON.parse<RawStructureData>(data.data)
                    npcActor.setStructureData(value)
                } catch (e: StructureValidationError) {
                    ui.notifications.error(t("macros.editStructure.validationError", recordOf("message" to e.message)))
                    console.error(e.message)
                    e.errors.forEach { console.log(it.message, it) }
                }
            }
        } catch (e: SerializationException) {
            ui.notifications.error("${data.data}: ${e.message}")
        }
    }
}

