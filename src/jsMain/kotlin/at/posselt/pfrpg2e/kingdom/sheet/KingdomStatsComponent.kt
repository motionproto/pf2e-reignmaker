package at.posselt.pfrpg2e.kingdom.sheet

import at.posselt.pfrpg2e.kingdom.KingdomData
import at.posselt.pfrpg2e.kingdom.sheet.contexts.CapacityContext
import at.posselt.pfrpg2e.kingdom.sheet.contexts.CommoditiesContext
import at.posselt.pfrpg2e.kingdom.sheet.contexts.FameContext
import at.posselt.pfrpg2e.utils.t
import kotlinx.js.JsPlainObject
import at.posselt.pfrpg2e.data.kingdom.settlements.Settlement

@JsPlainObject
external interface KingdomStatsContext {
    val kingdomSize: Int
    val fame: FameStatContext
    val settlements: SettlementsStatsContext
    val commodities: CommodityStatsContext
}

@JsPlainObject
external interface FameStatContext {
    val current: Int
    val max: Int
    val label: String
}

@JsPlainObject
external interface SettlementsStatsContext {
    val totalCount: Int
    val capitalCount: Int
    val settlementsList: Array<SettlementStatContext>
}

@JsPlainObject
external interface SettlementStatContext {
    val name: String
    val level: Int
    val isCapital: Boolean
}

@JsPlainObject
external interface CommodityStatsContext {
    val food: CommodityStatContext
    val lumber: CommodityStatContext  
    val ore: CommodityStatContext
    val stone: CommodityStatContext
    val luxuries: CommodityStatContext
}

@JsPlainObject
external interface CommodityStatContext {
    val current: Int
    val capacity: Int
    val label: String
}

/**
 * Component for displaying kingdom statistics in the sidebar
 */
class KingdomStatsComponent {
    
    /**
     * Creates context for displaying kingdom statistics
     */
    fun createContext(
        kingdom: KingdomData,
        settlements: List<Settlement>,
        commoditiesContext: CommoditiesContext,
        fameContext: FameContext
    ): KingdomStatsContext {
        
        // Process settlements
        val capitalCount = settlements.count { it.type?.value == "capital" }
        val settlementsList = settlements.map { settlement ->
            SettlementStatContext(
                name = settlement.name,
                level = settlement.level,
                isCapital = settlement.type?.value == "capital"
            )
        }.toTypedArray()
        
        // Create commodities context
        val commodityStats = CommodityStatsContext(
            food = CommodityStatContext(
                current = commoditiesContext.now.food.value?.toIntOrNull() ?: 0,
                capacity = commoditiesContext.capacity.food,
                label = t("kingdom.food")
            ),
            lumber = CommodityStatContext(
                current = commoditiesContext.now.lumber.value?.toIntOrNull() ?: 0,
                capacity = commoditiesContext.capacity.lumber,
                label = t("kingdom.lumber")
            ),
            ore = CommodityStatContext(
                current = commoditiesContext.now.ore.value?.toIntOrNull() ?: 0,
                capacity = commoditiesContext.capacity.ore,
                label = t("kingdom.ore")
            ),
            stone = CommodityStatContext(
                current = commoditiesContext.now.stone.value?.toIntOrNull() ?: 0,
                capacity = commoditiesContext.capacity.stone,
                label = t("kingdom.stone")
            ),
            luxuries = CommodityStatContext(
                current = commoditiesContext.now.luxuries.value?.toIntOrNull() ?: 0,
                capacity = commoditiesContext.capacity.luxuries,
                label = t("kingdom.luxuries")
            )
        )
        
        // Create fame context
        val fameStats = FameStatContext(
            current = fameContext.now.value?.toIntOrNull() ?: 0,
            max = fameContext.max.value?.toIntOrNull() ?: 0,
            label = t("kingdom.fame")
        )
        
        return KingdomStatsContext(
            kingdomSize = kingdom.size,
            fame = fameStats,
            settlements = SettlementsStatsContext(
                totalCount = settlements.size,
                capitalCount = capitalCount,
                settlementsList = settlementsList
            ),
            commodities = commodityStats
        )
    }
    
    /**
     * Generates HTML for the kingdom stats section
     */
    fun generateStatsHtml(context: KingdomStatsContext): String {
        return """
            <div class="km-kingdom-stats-container">
                <!-- Kingdom Size -->
                <div class="km-stat-group">
                    <h4 class="km-stat-header">${t("kingdom.kingdomSize")}</h4>
                    <div class="km-stat-value">${context.kingdomSize}</div>
                </div>
                
                <!-- Fame -->
                <div class="km-stat-group">
                    <h4 class="km-stat-header">${context.fame.label}</h4>
                    <div class="km-fame-display">
                        <div class="km-fame-value">
                            <span class="km-fame-current">${context.fame.current}</span>
                            <span class="km-fame-separator">/</span>
                            <span class="km-fame-max">${context.fame.max}</span>
                        </div>
                        <div class="km-fame-bar">
                            <div class="km-fame-bar-fill" style="width: ${if (context.fame.max > 0) (context.fame.current.toDouble() / context.fame.max * 100).toInt() else 0}%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Resources -->
                <div class="km-stat-group">
                    <h4 class="km-stat-header">${t("kingdom.resources")}</h4>
                    <div class="km-resources-grid">
                        ${generateResourceHtml(context.commodities.food)}
                        ${generateResourceHtml(context.commodities.lumber)}
                        ${generateResourceHtml(context.commodities.ore)}
                        ${generateResourceHtml(context.commodities.stone)}
                        ${generateResourceHtml(context.commodities.luxuries)}
                    </div>
                </div>
                
                <!-- Settlements -->
                <div class="km-stat-group">
                    <h4 class="km-stat-header">${t("kingdom.settlements")} (${context.settlements.totalCount})</h4>
                    <div class="km-settlements-list">
                        ${context.settlements.settlementsList.joinToString("") { settlement ->
                            """
                            <div class="km-settlement-stat">
                                <span class="km-settlement-name">${settlement.name}</span>
                                <span class="km-settlement-level">Lv ${settlement.level}</span>
                                ${if (settlement.isCapital) """<span class="km-capital-badge">Capital</span>""" else ""}
                            </div>
                            """
                        }}
                    </div>
                </div>
            </div>
        """.trimIndent()
    }
    
    private fun generateResourceHtml(resource: CommodityStatContext): String {
        val percentage = if (resource.capacity > 0) {
            (resource.current.toDouble() / resource.capacity * 100).toInt()
        } else {
            0
        }
        
        return """
            <div class="km-resource-stat">
                <div class="km-resource-label">${resource.label}</div>
                <div class="km-resource-value">
                    <span class="km-resource-current">${resource.current}</span>
                    <span class="km-resource-separator">/</span>
                    <span class="km-resource-max">${resource.capacity}</span>
                </div>
                <div class="km-resource-bar">
                    <div class="km-resource-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        """.trimIndent()
    }
}
