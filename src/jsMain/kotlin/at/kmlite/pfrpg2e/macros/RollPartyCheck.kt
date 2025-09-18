package at.kmlite.pfrpg2e.macros

import at.kmlite.pfrpg2e.actor.rollChecks
import at.kmlite.pfrpg2e.app.PromptType
import at.kmlite.pfrpg2e.app.forms.CheckboxInput
import at.kmlite.pfrpg2e.app.forms.Select
import at.kmlite.pfrpg2e.app.forms.SelectOption
import at.kmlite.pfrpg2e.app.forms.formContext
import at.kmlite.pfrpg2e.app.prompt
import at.kmlite.pfrpg2e.data.actor.Attribute
import at.kmlite.pfrpg2e.data.actor.Perception
import at.kmlite.pfrpg2e.data.actor.Skill
import at.kmlite.pfrpg2e.data.checks.RollMode
import at.kmlite.pfrpg2e.utils.awaitAll
import at.kmlite.pfrpg2e.utils.t
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