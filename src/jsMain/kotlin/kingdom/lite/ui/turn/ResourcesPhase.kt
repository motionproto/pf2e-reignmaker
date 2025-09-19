package kingdom.lite.ui.turn

/**
 * Resources Phase content for the Kingdom Sheet
 * Handles resource collection, consumption, military support, and build queue
 */
object ResourcesPhase {
    fun render(): String = buildString {
        append("""
            <div class="phase-step-container">
                <strong>Step 1: Collect Resources and Revenue</strong> - Gather income from settlements and worksites
            </div>
            <div class="phase-step-container">
                <strong>Step 2: Food Consumption</strong> - Pay food upkeep for population and armies
            </div>
            <div class="phase-step-container">
                <strong>Step 3: Military Support</strong> - Maintain army costs and supplies
            </div>
            <div class="phase-step-container">
                <strong>Step 4: Build Queue</strong> - Process ongoing construction projects
            </div>
        """)
    }
}
