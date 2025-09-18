package at.kmlite.pfrpg2e.firstrun

import at.kmlite.pfrpg2e.data.checks.RollMode
import at.kmlite.pfrpg2e.settings.pfrpg2eKingdomCampingWeather
import at.kmlite.pfrpg2e.utils.bindChatClick
import at.kmlite.pfrpg2e.utils.buildPromise
import at.kmlite.pfrpg2e.utils.buildUuid
import at.kmlite.pfrpg2e.utils.isFirstGM
import at.kmlite.pfrpg2e.utils.postChatMessage
import at.kmlite.pfrpg2e.utils.postChatTemplate
import at.kmlite.pfrpg2e.utils.t
import com.foundryvtt.core.Game
import com.foundryvtt.core.applications.ux.TextEditor.TextEditor
import js.objects.recordOf
import kotlinx.coroutines.await

suspend fun showFirstRunMessage(game: Game) {
    val settings = game.settings.pfrpg2eKingdomCampingWeather
    if (!settings.getDisableFirstRunMessage() && game.isFirstGM()) {
        postChatTemplate(
            templatePath = "chatmessages/firstrun.hbs",
            rollMode = RollMode.GMROLL,
            templateContext = recordOf(
                "manual" to TextEditor.enrichHTML(buildUuid("Compendium.pf2e-kingdom-lite.kingdom-lite-journals.JournalEntry.iAQCUYEAq4Dy8uCY"))
                    .await(),
                "camping" to TextEditor.enrichHTML(
                    buildUuid(
                        "Compendium.pf2e-kingdom-lite.kingdom-lite-macros.Macro.GXeKz3qKlsoxcaTg",
                        t("applications.camping")
                    )
                ).await(),
                "kingdom" to TextEditor.enrichHTML(
                    buildUuid(
                        "Compendium.pf2e-kingdom-lite.kingdom-lite-macros.Macro.1LmPW2OlHgJvedY8",
                        t("applications.kingdom")
                    )
                ).await(),
                "license" to TextEditor.enrichHTML(
                    buildUuid(
                        "Compendium.pf2e-kingdom-lite.kingdom-lite-journals.JournalEntry.8DyhRcPn7d8hlC1y",
                        t("chatMessages.firstRun.licenses")
                    )
                ).await(),
                "upgrading" to TextEditor.enrichHTML(
                    buildUuid(
                        "Compendium.pf2e-kingdom-lite.kingdom-lite-journals.JournalEntry.wz1mIWMxDJVsMIUd",
                        t("chatMessages.firstRun.upgradeNotices")
                    )
                ).await(),
            )
        )
    }
    bindChatClick(".km-disable-firstrun-message") { _, _, _ ->
        buildPromise {
            settings.setDisableFirstRunMessage(true)
            postChatMessage(t("chatMessages.firstRun.disabled"))
        }
    }
}
