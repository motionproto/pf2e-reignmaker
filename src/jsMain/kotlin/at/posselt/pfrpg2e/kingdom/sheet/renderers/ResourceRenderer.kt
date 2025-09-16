package at.posselt.pfrpg2e.kingdom.sheet.renderers

import at.posselt.pfrpg2e.kingdom.sheet.CommodityStatsContext
import at.posselt.pfrpg2e.kingdom.sheet.CommodityStatContext
import at.posselt.pfrpg2e.kingdom.sheet.contexts.CommoditiesContext
import at.posselt.pfrpg2e.kingdom.sheet.contexts.CapacityContext
import at.posselt.pfrpg2e.utils.t

/**
 * Dedicated renderer for Kingdom Resources/Commodities display.
 * Handles the rendering of food, lumber, ore, stone, and luxuries.
 */
class ResourceRenderer {
    
    /**
     * Creates the context object for commodities display
     */
    fun createCommoditiesContext(
        commoditiesContext: CommoditiesContext
    ): CommodityStatsContext {
        return CommodityStatsContext(
            food = CommodityStatContext(
                current = (commoditiesContext.now.food.value as? Number)?.toInt() ?: 0,
                capacity = commoditiesContext.capacity.food,
                label = t("kingdom.food")
            ),
            lumber = CommodityStatContext(
                current = (commoditiesContext.now.lumber.value as? Number)?.toInt() ?: 0,
                capacity = commoditiesContext.capacity.lumber,
                label = t("kingdom.lumber")
            ),
            ore = CommodityStatContext(
                current = (commoditiesContext.now.ore.value as? Number)?.toInt() ?: 0,
                capacity = commoditiesContext.capacity.ore,
                label = t("kingdom.ore")
            ),
            stone = CommodityStatContext(
                current = (commoditiesContext.now.stone.value as? Number)?.toInt() ?: 0,
                capacity = commoditiesContext.capacity.stone,
                label = t("kingdom.stone")
            ),
            luxuries = CommodityStatContext(
                current = (commoditiesContext.now.luxuries.value as? Number)?.toInt() ?: 0,
                capacity = commoditiesContext.capacity.luxuries,
                label = t("kingdom.luxuries")
            )
        )
    }
    
    /**
     * Generates the HTML for the Resources stat group
     */
    fun generateResourcesHtml(commodities: CommodityStatsContext): String {
        return """
            <div class="km-stat-group">
                <h4 class="km-stat-header">${t("kingdom.resources")}</h4>
                <div class="km-resources-grid">
                    ${generateResourceHtml(commodities.food)}
                    ${generateResourceHtml(commodities.lumber)}
                    ${generateResourceHtml(commodities.ore)}
                    ${generateResourceHtml(commodities.stone)}
                    ${generateResourceHtml(commodities.luxuries)}
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates HTML for an individual resource
     */
    fun generateResourceHtml(resource: CommodityStatContext): String {
        val percentage = calculateFillPercentage(resource.current, resource.capacity)
        
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
    
    /**
     * Generates a compact display for a single resource
     */
    fun generateCompactResourceDisplay(resource: CommodityStatContext): String {
        return """
            <span class="km-resource-compact">
                <span class="km-resource-icon">${getResourceIcon(resource.label)}</span>
                <span class="km-resource-value-compact">${resource.current}/${resource.capacity}</span>
            </span>
        """.trimIndent()
    }
    
    /**
     * Generates a summary line for all resources
     */
    fun generateResourcesSummary(commodities: CommodityStatsContext): String {
        return listOf(
            "${getResourceIcon(commodities.food.label)}${commodities.food.current}",
            "${getResourceIcon(commodities.lumber.label)}${commodities.lumber.current}",
            "${getResourceIcon(commodities.ore.label)}${commodities.ore.current}",
            "${getResourceIcon(commodities.stone.label)}${commodities.stone.current}",
            "${getResourceIcon(commodities.luxuries.label)}${commodities.luxuries.current}"
        ).joinToString(" | ")
    }
    
    /**
     * Gets the appropriate icon/emoji for a resource type
     */
    private fun getResourceIcon(resourceLabel: String): String {
        return when {
            resourceLabel.contains("food", ignoreCase = true) -> "🌾"
            resourceLabel.contains("lumber", ignoreCase = true) -> "🪵"
            resourceLabel.contains("ore", ignoreCase = true) -> "⚒️"
            resourceLabel.contains("stone", ignoreCase = true) -> "🪨"
            resourceLabel.contains("luxuries", ignoreCase = true) -> "💎"
            else -> "📦"
        }
    }
    
    /**
     * Calculates the fill percentage for resource bars
     */
    private fun calculateFillPercentage(current: Int, capacity: Int): Int {
        return if (capacity > 0) {
            (current.toDouble() / capacity * 100).toInt()
        } else {
            0
        }
    }
    
    /**
     * Generates a warning message if resources are low
     */
    fun generateResourceWarnings(commodities: CommodityStatsContext): List<String> {
        val warnings = mutableListOf<String>()
        
        fun checkResource(resource: CommodityStatContext) {
            val percentage = calculateFillPercentage(resource.current, resource.capacity)
            if (percentage < 20 && resource.capacity > 0) {
                warnings.add("${resource.label} is running low (${resource.current}/${resource.capacity})")
            }
        }
        
        checkResource(commodities.food)
        checkResource(commodities.lumber)
        checkResource(commodities.ore)
        checkResource(commodities.stone)
        checkResource(commodities.luxuries)
        
        return warnings
    }
    
    /**
     * Generates tooltip text for a resource
     */
    fun generateResourceTooltip(resource: CommodityStatContext): String {
        val percentage = calculateFillPercentage(resource.current, resource.capacity)
        val status = when {
            percentage >= 90 -> "Nearly full"
            percentage >= 70 -> "Well stocked"
            percentage >= 50 -> "Adequate"
            percentage >= 30 -> "Low"
            percentage >= 10 -> "Very low"
            percentage > 0 -> "Critical"
            else -> "Empty"
        }
        
        return "${resource.label}: ${resource.current}/${resource.capacity} - $status"
    }
}
