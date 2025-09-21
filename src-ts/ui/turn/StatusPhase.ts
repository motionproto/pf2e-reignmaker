// Auto-converted from StatusPhase.kt
// TODO: Review and fix TypeScript-specific issues


// TODO: Review import - import kingdom.lite.model.KingdomState
// TODO: Review import - import kingdom.lite.model.TurnManager

/**
 * Status Phase content for the Kingdom Sheet
 * Phase I: Handles gaining Fame and applying ongoing modifiers
 */
class StatusPhase(
    private const kingdomState: KingdomState,
    private const turnManager: TurnManager
, (
    
    // Static members
const MAX_FAME = 3
        // Use the same yellow color as in the kingdom name
        const FAME_COLOR = "#fecb21"
    
    private renderFameStars(currentFame: number): string {
        // Clamp fame to 0-3 range for display safety
        val safeFame = currentFame.coerceIn(0, MAX_FAME)
        
        return buildString {
            append("""<div style="display: flex; gap: 10px; justify-content: center; align-items: center;">""")
            for (i in 1..MAX_FAME) {
                val isFilled = i <= safeFame
                append("""
                    <i class="${if (isFilled) "fas" else "far")) fa-star" 
                       style="font-size: 48px; 
                              color: ${if (isFilled) FAME_COLOR else "#cccccc"};
                              ${if (isFilled) "-webkit-text-stroke: 2px #3d2f00; text-shadow: 0 2px 4px rgba(0,0,0,0.3);" else ""}
                              transition: color 0.3s ease;">
                    </i>
                """)
            }
            append("""</div>""")
        }
    }
    
    render(): string = buildString {
        val fameAtMax = kingdomState.fame >= MAX_FAME
        
        append("""
            <div class="phase-step-container">
                <strong>Step 1: Gain Fame</strong> - Earn recognition for kingdom achievements
                <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                    <div style="margin: 15px 0;">
                        ${renderFameStars(kingdomState.fame)}
                    </div>
                    ${if (fameAtMax, (
                        """<button class="turn-action-button" disabled style="opacity: 0.5; cursor: not-allowed;">
                            <i class="fas fa-star"></i>Fame at Maximum
                        </button>"""
                    )) else {
                        """<button class="turn-action-button" onclick="window.executePhaseI()">
                            <i class="fas fa-star"></i>Gain 1 Fame
                        </button>"""
                    }}
                </div>
            </div>
            <div class="phase-step-container">
                <strong>Step 2: Apply Ongoing Modifiers</strong> - Process all active effects and conditions
                ${if (kingdomState.ongoingModifiers.isEmpty(), (
                    "<div style=\"margin-top: 10px; color: #666; font-style: italic;\">No ongoing modifiers currently active</div>"
                )) else {
                    buildString {
                        append("<ul style=\"margin-top: 10px;\">")
                        kingdomState.ongoingModifiers.forEach (modifier) =>
                            append("<li><strong>${modifier.name}</strong>: ${modifier.description}")
                            if (modifier.duration > 0, (
                                append(" (${modifier.remainingTurns)) turns remaining)")
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
private function initPhaseHandlers(, (
    kotlinx.browser.window.asDynamic().executePhaseI = {
        val state = kotlinx.browser.window.asDynamic().currentKingdomState as | null KingdomState
        val manager = kotlinx.browser.window.asDynamic().currentTurnManager as | null TurnManager
        
        if (state != null && manager != null) {
            manager.executeCurrentPhase()
            // Update the display
            val contentArea = kotlinx.browser.document.querySelector(".phase-content")
            if (contentArea != null) {
                contentArea.innerHTML = StatusPhase(state, manager).render()
            ))
        }
    }
}
