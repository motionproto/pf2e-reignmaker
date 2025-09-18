package kingdom.lite.macros

import kingdom.lite.app.forms.NumberInput
import kingdom.lite.app.forms.Select
import kingdom.lite.app.forms.SelectOption
import kingdom.lite.app.forms.formContext
import kingdom.lite.app.prompt
import kingdom.lite.utils.fromUuidTypeSafe
import kingdom.lite.utils.postChatMessage
import kingdom.lite.utils.t
import kingdom.lite.utils.typeSafeUpdate
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import com.foundryvtt.pf2e.actor.PF2ECharacter
import com.foundryvtt.pf2e.actor.PF2EParty
import js.objects.recordOf
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.js.JsPlainObject
import kotlin.math.min

suspend fun updateXP(players: Array<PF2ECharacter>, amount: Int) = coroutineScope {
    players.map {
        val currentXP = it.system.details.xp.value
        val xpThreshold = it.system.details.xp.max
        val currentLevel = it.system.details.level.value
        val addLevels = (currentXP + amount) / xpThreshold
        val level = currentLevel + addLevels
        val xpGain = if (level >= 20) {
            0
        } else {
            (currentXP + amount) % xpThreshold
        }
        async {
            it.typeSafeUpdate {
                system.details.xp.value = xpGain
                system.details.level.value = min(20, level)
            }
        }
    }.awaitAll()
    postChatMessage(t("macros.xp.gained", recordOf("amount" to amount)))
}

@JsPlainObject
external interface XpFormData {
    val amount: Int
    val partyUuid: String
}

suspend fun awardXPMacro(game: Game) {
    val parties = game.actors.contents
        .filterIsInstance<PF2EParty>()
    if (parties.isEmpty()) {
        ui.notifications.error(t("macros.noPartiesFound"))
        return
    }
    prompt<XpFormData, Unit>(
        title = t("macros.xp.title"),
        templatePath = "components/forms/form.hbs",
        templateContext = recordOf(
            "formRows" to formContext(
                Select(
                    name = "partyUuid",
                    label = t("macros.xp.party"),
                    value = parties.first().uuid,
                    options = parties
                        .map { SelectOption(value = it.uuid, label = it.name) }
                ),
                NumberInput(
                    name = "amount",
                    label = t("macros.xp.amount"),
                ),
            )
        )
    ) {
        if (it.amount > 0) {
            fromUuidTypeSafe<PF2EParty>(it.partyUuid)
                ?.members
                ?.filterIsInstance<PF2ECharacter>()
                ?.toTypedArray()
                ?.let { players -> updateXP(players, it.amount) }

        }
    }
}