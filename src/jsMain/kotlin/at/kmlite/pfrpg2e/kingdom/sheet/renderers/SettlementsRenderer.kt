package at.kmlite.pfrpg2e.kingdom.sheet.renderers

import at.kmlite.pfrpg2e.kingdom.sheet.SettlementsStatsContext
import at.kmlite.pfrpg2e.kingdom.sheet.SettlementStatContext
import at.kmlite.pfrpg2e.data.kingdom.settlements.Settlement
import at.kmlite.pfrpg2e.utils.t

/**
 * Dedicated renderer for Kingdom Settlements display.
 * Handles the rendering of settlement information including capitals, levels, and counts.
 */
class SettlementsRenderer {
    
    /**
     * Creates the context object for settlements display
     */
    fun createSettlementsContext(settlements: List<Settlement>): SettlementsStatsContext {
        val capitalCount = settlements.count { it.type?.value == "capital" }
        
        val settlementsList = settlements.map { settlement ->
            SettlementStatContext(
                name = settlement.name,
                level = settlement.occupiedBlocks, // Using occupiedBlocks instead of level
                isCapital = settlement.type?.value == "capital"
            )
        }.toTypedArray()
        
        return SettlementsStatsContext(
            totalCount = settlements.size,
            capitalCount = capitalCount,
            settlementsList = settlementsList
        )
    }
    
    /**
     * Generates the HTML for the Settlements stat group
     */
    fun generateSettlementsHtml(settlements: SettlementsStatsContext): String {
        return """
            <div class="km-stat-group">
                <h4 class="km-stat-header">${t("kingdom.settlements")} (${settlements.totalCount})</h4>
                <div class="km-settlements-list">
                    ${generateSettlementsList(settlements.settlementsList)}
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates the list of individual settlements
     */
    private fun generateSettlementsList(settlementsList: Array<SettlementStatContext>): String {
        if (settlementsList.isEmpty()) {
            return """
                <div class="km-no-settlements">
                    <span class="km-empty-message">${t("kingdom.noSettlements")}</span>
                </div>
            """.trimIndent()
        }
        
        return settlementsList.joinToString("") { settlement ->
            generateSettlementItem(settlement)
        }
    }
    
    /**
     * Generates HTML for an individual settlement
     */
    private fun generateSettlementItem(settlement: SettlementStatContext): String {
        return """
            <div class="km-settlement-stat">
                <span class="km-settlement-name">${settlement.name}</span>
                <span class="km-settlement-level">Lv ${settlement.level}</span>
                ${if (settlement.isCapital) """<span class="km-capital-badge">Capital</span>""" else ""}
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates a compact display for settlements summary
     */
    fun generateCompactSettlementsDisplay(settlements: SettlementsStatsContext): String {
        val capitalText = if (settlements.capitalCount > 0) {
            " (${settlements.capitalCount} capital${if (settlements.capitalCount > 1) "s" else ""})"
        } else {
            ""
        }
        
        return """
            <span class="km-settlements-compact">
                <span class="km-settlements-icon">🏛️</span>
                <span class="km-settlements-count">${settlements.totalCount} settlements${capitalText}</span>
            </span>
        """.trimIndent()
    }
    
    /**
     * Generates a detailed settlement card (for expanded views)
     */
    fun generateDetailedSettlementCard(settlement: SettlementStatContext): String {
        val levelClass = when {
            settlement.level >= 20 -> "metropolis"
            settlement.level >= 10 -> "city"
            settlement.level >= 5 -> "town"
            else -> "village"
        }
        
        return """
            <div class="km-settlement-card km-level-${levelClass}">
                <div class="km-settlement-header">
                    <h5 class="km-settlement-title">${settlement.name}</h5>
                    ${if (settlement.isCapital) """<span class="km-capital-crown">👑</span>""" else ""}
                </div>
                <div class="km-settlement-details">
                    <span class="km-settlement-type">${getSettlementType(settlement.level)}</span>
                    <span class="km-settlement-blocks">Level ${settlement.level}</span>
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Gets the settlement type based on level
     */
    private fun getSettlementType(level: Int): String {
        return when {
            level >= 20 -> "Metropolis"
            level >= 10 -> "City"
            level >= 5 -> "Town"
            level >= 1 -> "Village"
            else -> "Hamlet"
        }
    }
    
    /**
     * Generates a tooltip for a settlement
     */
    fun generateSettlementTooltip(settlement: SettlementStatContext): String {
        val type = getSettlementType(settlement.level)
        val capitalStatus = if (settlement.isCapital) " (Capital)" else ""
        
        return "${settlement.name}${capitalStatus} - ${type} (Level ${settlement.level})"
    }
    
    /**
     * Generates a summary of settlements by type
     */
    fun generateSettlementsSummary(settlements: SettlementsStatsContext): String {
        if (settlements.settlementsList.isEmpty()) {
            return "No settlements founded"
        }
        
        val byType = settlements.settlementsList.groupBy { getSettlementType(it.level) }
        val summaryParts = mutableListOf<String>()
        
        byType.forEach { (type, list) ->
            val count = list.size
            summaryParts.add("$count ${type.lowercase()}${if (count > 1) "s" else ""}")
        }
        
        return summaryParts.joinToString(", ")
    }
    
    /**
     * Generates warnings for settlement issues
     */
    fun generateSettlementWarnings(settlements: SettlementsStatsContext): List<String> {
        val warnings = mutableListOf<String>()
        
        // Check for no capital
        if (settlements.capitalCount == 0 && settlements.totalCount > 0) {
            warnings.add("No capital designated - consider establishing one")
        }
        
        // Check for multiple capitals (unusual situation)
        if (settlements.capitalCount > 1) {
            warnings.add("Multiple capitals detected - this may cause governance issues")
        }
        
        // Check for settlement sprawl
        if (settlements.totalCount > 10) {
            warnings.add("Large number of settlements may increase unrest")
        }
        
        return warnings
    }
    
    /**
     * Generates HTML for a settlements grid view
     */
    fun generateSettlementsGrid(settlements: SettlementsStatsContext): String {
        if (settlements.settlementsList.isEmpty()) {
            return generateEmptyState()
        }
        
        return """
            <div class="km-settlements-grid">
                ${settlements.settlementsList.joinToString("") { settlement ->
                    generateSettlementTile(settlement)
                }}
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates a tile for grid view
     */
    private fun generateSettlementTile(settlement: SettlementStatContext): String {
        val icon = when {
            settlement.level >= 20 -> "🏙️"
            settlement.level >= 10 -> "🌆"
            settlement.level >= 5 -> "🏘️"
            else -> "🏠"
        }
        
        return """
            <div class="km-settlement-tile">
                <div class="km-settlement-icon">${icon}</div>
                <div class="km-settlement-name">${settlement.name}</div>
                <div class="km-settlement-info">
                    <span class="km-level">Lv ${settlement.level}</span>
                    ${if (settlement.isCapital) """<span class="km-capital-indicator">👑</span>""" else ""}
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates an empty state message
     */
    private fun generateEmptyState(): String {
        return """
            <div class="km-settlements-empty">
                <div class="km-empty-icon">🏚️</div>
                <p class="km-empty-text">No settlements have been founded yet</p>
                <p class="km-empty-hint">Found your first settlement to begin building your kingdom</p>
            </div>
        """.trimIndent()
    }
}
