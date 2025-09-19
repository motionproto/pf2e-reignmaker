package kingdom.lite.ui.turn

/**
 * Events Phase content for the Kingdom Sheet
 * Handles checking for kingdom events and resolving them
 */
object EventsPhase {
    fun render(): String = buildString {
        append("""
            <div class="phase-step-container">
                <strong>Check for Kingdom Events</strong>
            </div>
            <div class="phase-step-container">
                Roll Stability check vs DC 16
            </div>
            <div class="phase-step-container">
                On failure, draw an event appropriate to kingdom level
            </div>
            <div class="phase-step-container">
                Resolve immediate event effects
            </div>
            <div class="phase-step-container">
                Apply any ongoing modifiers from events
            </div>
        """)
    }
}
