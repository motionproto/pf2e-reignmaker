package kingdom.lite.ui

import kingdom.lite.ui.styles.*

/**
 * CSS styles for the Kingdom Sheet
 * Aggregates styles from modular style components for better organization and maintainability
 * 
 * The styles have been broken up into logical modules:
 * - BaseStyles: Core application and window styles
 * - HeaderStyles: Header and content selector navigation
 * - KingdomStatsStyles: Sidebar and kingdom statistics
 * - TurnStyles: Turn controller and phase management
 * - ContentStyles: Content sections (settlements, factions, notes, etc.)
 * - ControlStyles: Buttons, dropdowns, and interactive elements
 */
object KingdomSheetStyles {
    /**
     * Initialize and inject CSS variables into the document
     */
    fun initialize() {
        KingdomColorPalette.inject()
    }
    
    /**
     * Get the complete styles with CSS variables
     * Combines all modular styles into a single stylesheet
     */
    val styles: String
        get() = """
/* ===== CSS Variables and Color Palette ===== */
${KingdomColorPalette.cssVariables}

${KingdomColorPalette.getThemedStyles()}

/* ===== Base Application Styles ===== */
${BaseStyles.styles}

/* ===== Header and Navigation ===== */
${HeaderStyles.styles}

/* ===== Kingdom Stats Sidebar ===== */
${KingdomStatsStyles.styles}

/* ===== Turn Controller and Phases ===== */
${TurnStyles.styles}

/* ===== Content Sections ===== */
${ContentStyles.styles}

/* ===== Interactive Controls ===== */
${ControlStyles.styles}
        """.trimIndent()
}
