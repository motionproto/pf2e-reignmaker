package at.kmlite.pfrpg2e.kingdom.sheet

import at.kmlite.pfrpg2e.kingdom.KingdomData
import at.kmlite.pfrpg2e.kingdom.sheet.contexts.CapacityContext
import at.kmlite.pfrpg2e.kingdom.sheet.contexts.CommoditiesContext
import at.kmlite.pfrpg2e.kingdom.sheet.contexts.FameContext
import at.kmlite.pfrpg2e.kingdom.sheet.renderers.FameInfamyRenderer
import at.kmlite.pfrpg2e.kingdom.sheet.renderers.ResourceRenderer
import at.kmlite.pfrpg2e.kingdom.sheet.renderers.SettlementsRenderer
import at.kmlite.pfrpg2e.kingdom.data.RawGold
import at.kmlite.pfrpg2e.utils.t
import kotlinx.js.JsPlainObject
import at.kmlite.pfrpg2e.data.kingdom.settlements.Settlement

@JsPlainObject
external interface KingdomStatsContext {
    val kingdomSize: Int
    val fame: FameStatContext
    val settlements: SettlementsStatsContext
    val commodities: CommodityStatsContext
    val gold: GoldContext?
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
    val luxuries: CommodityStatContext?  // Optional for Reignmaker-lite compatibility
}

@JsPlainObject
external interface GoldContext {
    val treasury: Int
    val income: Int
    val upkeep: Int
    val netIncome: Int
    val label: String
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
    
    private val fameRenderer = FameInfamyRenderer()
    private val resourceRenderer = ResourceRenderer()
    private val settlementsRenderer = SettlementsRenderer()
    
    /**
     * Creates context for displaying kingdom statistics
     */
    fun createContext(
        kingdom: KingdomData,
        settlements: List<Settlement>,
        commoditiesContext: CommoditiesContext,
        fameContext: FameContext,
        gold: RawGold? = null,
        isReignmakerLite: Boolean = true
    ): KingdomStatsContext {
        
        // Process settlements using the dedicated renderer
        val settlementsStats = settlementsRenderer.createSettlementsContext(settlements)
        
        // Create commodities context using the dedicated renderer
        val commodityStats = resourceRenderer.createCommoditiesContext(
            commoditiesContext,
            isReignmakerLite = isReignmakerLite
        )
        
        // Create fame context using the dedicated renderer
        val fameStats = fameRenderer.createFameContext(fameContext)
        
        // Create gold context for Reignmaker-lite
        val goldContext = if (isReignmakerLite && gold != null) {
            resourceRenderer.createGoldContext(gold)
        } else null
        
        return KingdomStatsContext(
            kingdomSize = kingdom.size,
            fame = fameStats,
            settlements = settlementsStats,
            commodities = commodityStats,
            gold = goldContext
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
                ${fameRenderer.generateFameHtml(context.fame)}
                
                <!-- Resources and Gold -->
                ${resourceRenderer.generateResourcesHtml(context.commodities, context.gold)}
                
                <!-- Settlements -->
                ${settlementsRenderer.generateSettlementsHtml(context.settlements)}
            </div>
        """.trimIndent()
    }
    
}
