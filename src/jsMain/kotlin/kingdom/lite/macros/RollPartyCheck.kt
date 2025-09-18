package kingdom.lite.macros

import kingdom.lite.actor.rollChecks
import kingdom.lite.app.PromptType
import kingdom.lite.app.forms.CheckboxInput
import kingdom.lite.app.forms.Select
import kingdom.lite.app.forms.SelectOption
import kingdom.lite.app.forms.formContext
import kingdom.lite.app.prompt
import kingdom.lite.data.actor.Attribute
import kingdom.lite.data.actor.Perception
import kingdom.lite.data.actor.Skill
import kingdom.lite.data.checks.RollMode
import kingdom.lite.utils.awaitAll
import kingdom.lite.utils.t
import com.foundryvtt.pf2e.actor.PF2ECharacter
import js.objects.recordOf
import kotlinx.js.JsPlainObject

private val skills = listOf(
    Perception,
    Skill.NATURE,
    Skill.SURVIVAL
)

@JsPlainObject
private external interface FormData {
    val skill: String
    val dc: Int
    val private: Boolean
}

suspend fun rollPartyCheckMacro(players: Array<PF2ECharacter>) {
    prompt<FormData, Unit>(
        templatePath = "components/forms/form.hbs",
        templateContext = recordOf(
            "formRows" to formContext(
                Select.dc(name = "dc", required = false),
                CheckboxInput(label = t("macros.rollPartyCheck.privateRoll"), name = "private", value = true, required = false),
                Select(label = t("enums.skill"), name = "skill", options = skills.map {
                    SelectOption(label = t(it), value = it.value)
                })
            )
        ),
        title = t("macros.rollPartyCheck.title"),
        promptType = PromptType.ROLL,
    ) { data ->
        players.rollChecks(
            attribute = Attribute.fromString(data.skill),
            dc = data.dc,
            rollMode = if (data.private) RollMode.GMROLL else RollMode.PUBLICROLL
        ).awaitAll()
    }
}