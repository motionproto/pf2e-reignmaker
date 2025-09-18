package at.kmlite.pfrpg2e.kingdom.sheet

import at.kmlite.pfrpg2e.actions.ActionDispatcher
import at.kmlite.pfrpg2e.app.HandlebarsRenderContext
import at.kmlite.pfrpg2e.app.forms.MenuControl
import at.kmlite.pfrpg2e.app.forms.SimpleApp
import at.kmlite.pfrpg2e.kingdom.AutomateResources
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.managers.WorksiteManager
import at.kmlite.pfrpg2e.kingdom.sheet.contexts.WorkSiteSummary
import at.kmlite.pfrpg2e.kingdom.data.RawGold
import at.kmlite.pfrpg2e.kingdom.data.RawConsumption
import at.kmlite.pfrpg2e.kingdom.data.RawCurrentCommodities
import at.kmlite.pfrpg2e.kingdom.data.RawStorageBuildings
import at.kmlite.pfrpg2e.kingdom.data.calculateCapacity
import at.kmlite.pfrpg2e.kingdom.getRealmData
import at.kmlite.pfrpg2e.kingdom.setKingdom
import at.kmlite.pfrpg2e.utils.buildPromise
import at.kmlite.pfrpg2e.utils.t
import com.foundryvtt.core.Game
import com.foundryvtt.core.applications.api.HandlebarsRenderOptions
import com.foundryvtt.core.game
import kotlinx.coroutines.await
import kotlinx.html.org.w3c.dom.events.PointerEvent
import org.w3c.dom.HTMLElement

private const val TEMPLATE = "applications/kingdom/kingdom-sheet.hbs"

@JsPlainObject
external interface KingdomSheetContext : HandlebarsRenderContext {
    val hasKingdom: Boolean
    val kingdomName: String
    val level: Int?
    val size: Int?
    val sizeLabel: String?
    val unrest: Int?
    val automateResourcesMode: String?
    val automateResourcesLabel: String?
    val gold: GoldContext?
    val commodities: Array<CommodityContext>
    val worksites: Array<WorksiteRowContext>
    val consumption: ConsumptionContext?
    val currentTurnPhase: String?
    val message: String?
}

@JsPlainObject
external interface GoldContext {
    val treasury: Int
    val income: Int
    val upkeep: Int
    val net: Int
}

@JsPlainObject
external interface CommodityContext {
    val id: String
    val label: String
    val current: Int
    val incoming: Int
    val capacity: Int
}

@JsPlainObject
external interface WorksiteRowContext {
    val label: String
    val quantity: Int
    val resources: Int
}

@JsPlainObject
external interface ConsumptionContext {
    val current: Int
    val armies: Int
    val next: Int
}

class KingdomSheet(
    private val game: Game,
    private val actor: KingdomActor,
    private val dispatcher: ActionDispatcher,
) : SimpleApp<KingdomSheetContext>(
    title = t("kingdom.manageKingdom"),
    template = TEMPLATE,
    id = "kmKingdomSheet-${actor.uuid}",
    classes = setOf("km-kingdom-sheet"),
    width = 620,
    controls = arrayOf(
        MenuControl(label = t("kingdom.refresh"), action = "refresh"),
        MenuControl(label = t("kingdom.clear"), action = "clear", gmOnly = true),
    )
) {
    private val worksiteManager = WorksiteManager()

    init {
        actor.apps[super.id] = this
    }

    override fun _preparePartContext(
        partId: String,
        context: HandlebarsRenderContext,
        options: HandlebarsRenderOptions
    ) = buildPromise {
        val parent = super._preparePartContext(partId, context, options).await()
        val kingdom = actor.getKingdom()
        val sheetContext = if (kingdom == null) {
            KingdomSheetContext(
                partId = parent.partId,
                hasKingdom = false,
                kingdomName = actor.name,
                level = null,
                size = null,
                sizeLabel = null,
                unrest = null,
                automateResourcesMode = null,
                automateResourcesLabel = null,
                gold = null,
                commodities = emptyArray(),
                worksites = emptyArray(),
                consumption = null,
                currentTurnPhase = null,
                message = "No kingdom data available yet.",
            )
        } else {
            val realm = game.getRealmData(actor, kingdom)
            val capacities = combinedCapacity(kingdom.storageCapacity, kingdom.storageBuildings)
            val commodities = commodityContexts(kingdom.commodities, capacities)
            val worksites = worksiteManager
                .summarizeWorksites(kingdom)
                .map { WorksiteRowContext(
                    label = it.label,
                    quantity = it.quantity,
                    resources = it.resources,
                ) }
                .toTypedArray()
            val automateMode = AutomateResources.fromString(kingdom.settings.automateResources)
            KingdomSheetContext(
                partId = parent.partId,
                hasKingdom = true,
                kingdomName = kingdom.name,
                level = kingdom.level,
                size = realm.size,
                sizeLabel = t(realm.sizeInfo.type),
                unrest = kingdom.unrest,
                automateResourcesMode = kingdom.settings.automateResources,
                automateResourcesLabel = automateMode?.let { t(it) } ?: kingdom.settings.automateResources,
                gold = goldContext(kingdom.gold),
                commodities = commodities,
                worksites = worksites,
                consumption = consumptionContext(kingdom.consumption),
                currentTurnPhase = kingdom.currentTurnPhase,
                message = null,
            )
        }
        sheetContext
    }

    override fun _onClickAction(event: PointerEvent, target: HTMLElement) {
        when (target.dataset["action"]) {
            "refresh" -> buildPromise { render(); null }
            "clear" -> buildPromise {
                actor.setKingdom(null)
                render()
                null
            }
        }
    }

    private fun goldContext(gold: RawGold) = GoldContext(
        treasury = gold.treasury,
        income = gold.income,
        upkeep = gold.upkeep,
        net = gold.netIncome(),
    )

    private fun consumptionContext(consumption: RawConsumption) = ConsumptionContext(
        current = consumption.now,
        armies = consumption.armies,
        next = consumption.next,
    )

    private fun commodityContexts(
        commodities: RawCurrentCommodities,
        capacities: CapacityTotals,
    ): Array<CommodityContext> = arrayOf(
        CommodityContext(
            id = "food",
            label = t("kingdom.food"),
            current = commodities.now.food,
            incoming = commodities.next.food,
            capacity = capacities.food,
        ),
        CommodityContext(
            id = "lumber",
            label = t("kingdom.lumber"),
            current = commodities.now.lumber,
            incoming = commodities.next.lumber,
            capacity = capacities.lumber,
        ),
        CommodityContext(
            id = "stone",
            label = t("kingdom.stone"),
            current = commodities.now.stone,
            incoming = commodities.next.stone,
            capacity = capacities.stone,
        ),
        CommodityContext(
            id = "ore",
            label = t("kingdom.ore"),
            current = commodities.now.ore,
            incoming = commodities.next.ore,
            capacity = capacities.ore,
        ),
    )

    private fun combinedCapacity(
        base: at.kmlite.pfrpg2e.kingdom.data.RawStorageCapacity,
        buildings: RawStorageBuildings,
    ): CapacityTotals {
        val bonus = buildings.calculateCapacity()
        return CapacityTotals(
            food = base.food + bonus.food,
            lumber = base.lumber + bonus.lumber,
            stone = base.stone + bonus.stone,
            ore = base.ore + bonus.ore,
        )
    }

    private data class CapacityTotals(
        val food: Int,
        val lumber: Int,
        val stone: Int,
        val ore: Int,
    )
}

suspend fun openOrCreateKingdomSheet(
    game: Game,
    dispatcher: ActionDispatcher,
    actor: KingdomActor,
) {
    val existing = actor.apps.values
        .mapNotNull { it as? KingdomSheet }
        .firstOrNull()
    if (existing != null) {
        existing.render()
    } else {
        KingdomSheet(game, actor, dispatcher).launch()
    }
}
