package at.kmlite.pfrpg2e.kingdom.dialogs

import at.kmlite.pfrpg2e.app.prompt
import at.kmlite.pfrpg2e.kingdom.sheet.contexts.ConsumptionBreakdownContext
import at.kmlite.pfrpg2e.utils.t


suspend fun consumptionBreakdown(context: ConsumptionBreakdownContext) {
    prompt<Unit, Unit>(
        title = t("kingdom.consumptionBreakdown"),
        templateContext = context,
        templatePath = "applications/kingdom/consumption-breakdown.hbs",
    ) {  }
}