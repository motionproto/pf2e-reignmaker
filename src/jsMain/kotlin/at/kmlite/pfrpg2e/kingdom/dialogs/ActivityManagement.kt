package at.kmlite.pfrpg2e.kingdom.dialogs

import at.kmlite.pfrpg2e.app.CrudApplication
import at.kmlite.pfrpg2e.app.CrudData
import at.kmlite.pfrpg2e.app.CrudItem
import at.kmlite.pfrpg2e.app.forms.CheckboxInput
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.RawActivity
import at.kmlite.pfrpg2e.kingdom.getAllActivities
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.setKingdom
import at.kmlite.pfrpg2e.utils.buildPromise
import at.kmlite.pfrpg2e.utils.launch
import at.kmlite.pfrpg2e.utils.t
import js.core.Void
import kotlin.js.Promise

class ActivityManagement(
    private val kingdomActor: KingdomActor,
) : CrudApplication(
    title = t("kingdom.manageActivities"),
    debug = true,
    id = "kmManageActivities-${kingdomActor.uuid}"
) {
    override fun deleteEntry(id: String) = buildPromise {
        kingdomActor.getKingdom()?.let { kingdom ->
            kingdom.homebrewActivities = kingdom.homebrewActivities.filter { it.id != id }.toTypedArray()
            kingdom.activityBlacklist = kingdom.activityBlacklist.filter { it == id }.toTypedArray()
            kingdomActor.setKingdom(kingdom)
            render()
        }
        undefined
    }

    override fun addEntry(): Promise<Void> = buildPromise {
        ModifyActivity(
            afterSubmit = {
                kingdomActor.getKingdom()?.let { kingdom ->
                    kingdom.homebrewActivities = kingdom.homebrewActivities + it
                    kingdomActor.setKingdom(kingdom)
                }
                render()
            },
        ).launch()
        undefined
    }

    override fun editEntry(id: String) = buildPromise {
        ModifyActivity(
            data = kingdomActor.getKingdom()?.homebrewActivities?.find { it.id == id },
            afterSubmit = { activity ->
                kingdomActor.getKingdom()?.let { kingdom ->
                    kingdom.homebrewActivities = kingdom.homebrewActivities
                        .filter { m -> m.id != activity.id }
                        .toTypedArray() + activity
                    kingdomActor.setKingdom(kingdom)
                }
                render()
            },
        ).launch()
        undefined
    }

    override fun getItems(): Promise<Array<CrudItem>> = buildPromise {
        kingdomActor.getKingdom()?.let { kingdom ->
            val disabledIds = kingdom.activityBlacklist.toSet()
            val homebrewIds = kingdom.homebrewActivities.map { it.id }.toSet()
            kingdom.getAllActivities()
                .sortedWith(compareBy(RawActivity::title))
                .map { item ->
                    val canBeEdited = item.id in homebrewIds
                    CrudItem(
                        id = item.id,
                        name = item.title,
                        nameIsHtml = false,
                        additionalColumns = arrayOf(),
                        enable = CheckboxInput(
                            value = item.id !in disabledIds,
                            label = t("applications.enable"),
                            hideLabel = true,
                            name = "enabledIds.${item.id}",
                        ).toContext(),
                        canBeEdited = canBeEdited,
                        canBeDeleted = canBeEdited,
                    )
                }.toTypedArray()
        } ?: emptyArray()
    }

    override fun getHeadings(): Promise<Array<String>> = buildPromise {
        arrayOf()
    }

    override fun onParsedSubmit(value: CrudData): Promise<Void> = buildPromise {
        kingdomActor.getKingdom()?.let { kingdom ->
            val enabled = value.enabledIds.toSet()
            kingdom.activityBlacklist = kingdom.getAllActivities()
                .filter { it.id !in enabled }
                .map { it.id }
                .toTypedArray()
            kingdomActor.setKingdom(kingdom)
        }
        undefined
    }
}