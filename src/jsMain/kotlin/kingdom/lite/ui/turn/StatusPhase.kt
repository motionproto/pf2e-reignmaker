package kingdom.lite.ui.turn

import kingdom.lite.model.KingdomState
import kingdom.lite.model.TurnManager

/**
 * Status Phase content for the Kingdom Sheet
 * Phase I: Handles gaining Fame and applying ongoing modifiers
 */
class StatusPhase(
    private val kingdomState: KingdomState,
    private val turnManager: TurnManager
) {
    
    fun render(): String = buildString {
        append("""
            <div class="phase-step-container">
                <strong>Step 1: Gain Fame</strong> - Earn recognition for kingdom achievements
                <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                    <div><strong>Turn ${kingdomState.currentTurn}</strong></div>
                    <div>Current Fame: <strong>${kingdomState.fame}</strong></div>
                    <button class="turn-action-button" onclick="window.executePhaseI()">
                        <i class="fas fa-star"></i>Gain 1 Fame
                    </button>
                </div>
            </div>
            <div class="phase-step-container">
                <strong>Step 2: Apply Ongoing Modifiers</strong> - Process all active effects and conditions
                ${if (kingdomState.ongoingModifiers.isEmpty()) {
                    "<div style=\"margin-top: 10px; color: #666; font-style: italic;\">No ongoing modifiers currently active</div>"
                } else {
                    buildString {
                        append("<ul style=\"margin-top: 10px;\">")
                        kingdomState.ongoingModifiers.forEach { modifier ->
                            append("<li><strong>${modifier.name}</strong>: ${modifier.description}")
                            if (modifier.duration > 0) {
                                append(" (${modifier.remainingTurns} turns remaining)")
                            }
                            append("</li>")
                        }
                        append("</ul>")
                    }
                }}
            </div>
        """)
    }
}

// Register a simpler function for Phase I execution
private fun initPhaseHandlers() {
    kotlinx.browser.window.asDynamic().executePhaseI = {
        val state = kotlinx.browser.window.asDynamic().currentKingdomState as? KingdomState
        val manager = kotlinx.browser.window.asDynamic().currentTurnManager as? TurnManager
        
        if (state != null && manager != null) {
            manager.executeCurrentPhase()
            // Update the display
            val contentArea = kotlinx.browser.document.querySelector(".phase-content")
            if (contentArea != null) {
                contentArea.innerHTML = StatusPhase(state, manager).render()
            }
        }
    }
}
