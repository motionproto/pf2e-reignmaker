package at.posselt.pfrpg2e.kingdom.sheet.renderers

import at.posselt.pfrpg2e.kingdom.sheet.FameStatContext
import at.posselt.pfrpg2e.kingdom.sheet.contexts.FameContext
import at.posselt.pfrpg2e.utils.t

/**
 * Dedicated renderer for Fame/Infamy display in the kingdom stats sidebar.
 * Extracted from KingdomStatsComponent to improve maintainability and separation of concerns.
 */
class FameInfamyRenderer {
    
    /**
     * Creates the context object for Fame/Infamy display
     */
    fun createFameContext(fameContext: FameContext): FameStatContext {
        // Get the max value from the FameContext's range
        val nowSelect = fameContext.now
        val maxValue = (nowSelect.options?.lastOrNull()?.value as? Number)?.toInt() ?: 10
        
        return FameStatContext(
            current = (fameContext.now.value as? Number)?.toInt() ?: 0,
            max = maxValue,
            label = t("kingdom.fame")
        )
    }
    
    /**
     * Generates the HTML for the Fame/Infamy stat group
     */
    fun generateFameHtml(fameStats: FameStatContext): String {
        val fillPercentage = calculateFillPercentage(fameStats.current, fameStats.max)
        
        return """
            <div class="km-stat-group">
                <h4 class="km-stat-header">${fameStats.label}</h4>
                <div class="km-fame-display">
                    ${generateFameValue(fameStats)}
                    ${generateFameBar(fillPercentage)}
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates the numeric display portion of the fame stat
     */
    private fun generateFameValue(fameStats: FameStatContext): String {
        return """
            <div class="km-fame-value">
                <span class="km-fame-current">${fameStats.current}</span>
                <span class="km-fame-separator">/</span>
                <span class="km-fame-max">${fameStats.max}</span>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates the visual bar representation of fame
     */
    private fun generateFameBar(fillPercentage: Int): String {
        return """
            <div class="km-fame-bar">
                <div class="km-fame-bar-fill" style="width: ${fillPercentage}%"></div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Calculates the fill percentage for the fame bar
     */
    private fun calculateFillPercentage(current: Int, max: Int): Int {
        return if (max > 0) {
            (current.toDouble() / max * 100).toInt()
        } else {
            0
        }
    }
    
    /**
     * Generates a compact inline display for Fame (useful for summary views)
     */
    fun generateCompactFameDisplay(fameStats: FameStatContext): String {
        return """
            <span class="km-fame-compact">
                <span class="km-fame-label-compact">${fameStats.label}:</span>
                <span class="km-fame-value-compact">${fameStats.current}/${fameStats.max}</span>
            </span>
        """.trimIndent()
    }
    
    /**
     * Generates a tooltip-friendly description of the current fame status
     */
    fun generateFameTooltip(fameStats: FameStatContext): String {
        val percentage = calculateFillPercentage(fameStats.current, fameStats.max)
        val status = when {
            percentage >= 80 -> t("kingdom.fameStatus.excellent")
            percentage >= 60 -> t("kingdom.fameStatus.good")
            percentage >= 40 -> t("kingdom.fameStatus.moderate")
            percentage >= 20 -> t("kingdom.fameStatus.low")
            else -> t("kingdom.fameStatus.veryLow")
        }
        
        return "${fameStats.label}: ${fameStats.current}/${fameStats.max} - $status"
    }
}
