package kingdom.lite.ui.turn

/**
 * Unrest Phase content for the Kingdom Sheet
 * Handles applying unrest and checking for incidents
 */
object UnrestPhase {
    fun render(): String = buildString {
        append("""
            <div class="phase-step-container">
                <strong>Step 1: Apply Unrest</strong> - Add unrest from size and other sources
            </div>
            <div class="phase-step-container">
                <strong>Step 2: Check for Incidents</strong> - If Unrest > 0, check for unrest incidents
            </div>
        """)
    }
}
