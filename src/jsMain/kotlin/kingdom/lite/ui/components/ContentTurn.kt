package kingdom.lite.ui.components

import kingdom.lite.ui.turn.*

/**
 * Turn tab content component
 * Manages the turn phase navigation and content display
 */
class TurnContent {
    private var activePhase = "status"
    
    fun render(): String = buildString {
        append("""
            <div class="turn-content">
                <div class="phase-navigation-fixed">
                    ${renderPhaseButtons()}
                </div>
                <div class="phase-content-scrollable">
                    <div class="phase-content">
                        ${renderPhaseContent()}
                    </div>
                </div>
            </div>
        """)
    }
    
    fun setActivePhase(phase: String) {
        activePhase = phase
    }
    
    fun getActivePhase(): String = activePhase
    
    private fun renderPhaseButtons(): String = buildString {
        val phases = listOf(
            "status" to "Status",
            "resources" to "Resources",
            "unrest" to "Unrest", 
            "events" to "Events",
            "actions" to "Actions",
            "resolution" to "Resolution"
        )
        
        append("""<div class="phase-buttons">""")
        phases.forEach { (id, label) ->
            val activeClass = if (id == activePhase) "active" else ""
            append("""
                <button class="phase-button $activeClass" data-phase="$id">
                    $label
                </button>
            """)
        }
        append("""</div>""")
    }
    
    private fun renderPhaseContent(): String = when (activePhase) {
        "status" -> StatusPhase.render()
        "resources" -> ResourcesPhase.render()
        "unrest" -> UnrestPhase.render()
        "events" -> EventsPhase.render()
        "actions" -> ActionsPhase.render()
        "resolution" -> ResolutionPhase.render()
        else -> "<div>Select a phase</div>"
    }
}
