package at.kmlite.pfrpg2e.app.forms

import at.kmlite.pfrpg2e.app.SkillInputArrayContext
import kotlinx.js.JsPlainObject

@JsPlainObject
external interface SkillInputContext {
    val hideProficiency: Boolean
    val skills: Array<SkillInputArrayContext>
}

fun SkillInputContext(
    hideProficiency: Boolean = false,
    skills: Array<SkillInputArrayContext> = emptyArray()
): SkillInputContext {
    return js("{ hideProficiency: hideProficiency, skills: skills }").unsafeCast<SkillInputContext>()
}

data class SkillPicker(
    val context: SkillInputContext,
    val stacked: Boolean = true,
    override val label: String = "",
    override val name: String = "skills",
    override val help: String? = null,
    override val hideLabel: Boolean = false,
): IntoFormElementContext {
    override fun toContext(): FormElementContext = FormElementContext(
        type = "skill-picker",
        label = label,
        name = name,
        help = help,
        value = context,
        required = false,
        readonly = false,
        disabled = false,
        stacked = stacked,
        options = emptyArray(),
        hideLabel = hideLabel,
        isFormElement = true,
        elementClasses = "",
        labelClasses = "",
        escapeLabel = true,
        labelElement = "label"
    )
}
