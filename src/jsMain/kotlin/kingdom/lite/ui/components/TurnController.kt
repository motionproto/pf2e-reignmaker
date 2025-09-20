package kingdom.lite.ui.components

import kingdom.lite.model.KingdomState
import kingdom.lite.model.TurnManager
import kingdom.lite.model.TurnPhase
import kingdom.lite.ui.turn.*
import org.w3c.dom.HTMLElement
import kotlinx.browser.window

/**
 * Main turn controller component that manages the turn phases and UI
 */
class TurnController : ContentComponent {
    private val kingdomState: KingdomState
    private val turnManager: TurnManager
    private var elementId = "turn-controller-${kotlin.js.Date.now()}"
    
    init {
        // Use the global kingdom state if available, otherwise create new one
        val existingState = window.asDynamic().currentKingdomState as? KingdomState
        kingdomState = existingState ?: KingdomState(
            // Initialize with empty/minimal data
            settlements = mutableListOf(),
            resources = mutableMapOf(
                "food" to 0,
                "lumber" to 0,
                "stone" to 0,
                "ore" to 0,
                "gold" to 0
            )
        )
        
        // Store the kingdom state globally for other components
        window.asDynamic().currentKingdomState = kingdomState
        
        turnManager = TurnManager(kingdomState)
        window.asDynamic().currentTurnManager = turnManager
        
        // Setup turn manager callbacks
        turnManager.onTurnChanged = { turn ->
            updateDisplay()
            updateGlobalStats()
        }
        
        turnManager.onPhaseChanged = { phase ->
            updateDisplay()
        }
        
        turnManager.onFameGained = { amount ->
            if (amount > 0) {
                showNotification("Gained $amount Fame!")
            }
            updateDisplay()
            updateGlobalStats()
        }
        
        turnManager.onUnrestChanged = { unrest ->
            updateDisplay()
            updateGlobalStats()
        }
        
        // Register update callback for kingdom stats
        window.asDynamic().updateKingdomStats = {
            updateDisplay()
        }
    }
    
    override fun render(): String = buildString {
        append("""
            <div class="turn-controller" id="$elementId">
                ${renderTurnHeader()}
                ${renderPhaseContent()}
                ${renderTurnControls()}
            </div>
        """)
    }
    
    private fun renderTurnHeader(): String = buildString {
        append("""
            <div class="turn-header">
                <div class="turn-info">
                    <h2>Turn ${kingdomState.currentTurn}</h2>
                    <div class="turn-phase">${kingdomState.currentPhase.displayName}</div>
                </div>
                <div class="kingdom-resources">
                    ${renderResourceSummary()}
                </div>
                ${renderPhaseIndicator()}
            </div>
        """)
    }
    
    private fun renderResourceSummary(): String = buildString {
        append("""
            <div class="resource-summary">
                <span class="resource-item">
                    <i class="fas fa-star"></i> Fame: ${kingdomState.fame}
                </span>
                <span class="resource-item">
                    <i class="fas fa-exclamation-triangle"></i> Unrest: ${kingdomState.unrest}
                </span>
                <span class="resource-item">
                    <i class="fas fa-bread-slice"></i> Food: ${kingdomState.resources["food"]}
                </span>
                <span class="resource-item">
                    <i class="fas fa-coins"></i> Gold: ${kingdomState.resources["gold"]}
                </span>
            </div>
        """)
    }
    
    private fun renderPhaseIndicator(): String = buildString {
        append("""<div class="phase-indicator">""")
        
        TurnPhase.values().forEach { phase ->
            val status = when {
                phase == kingdomState.currentPhase -> "active"
                phase.ordinal < kingdomState.currentPhase.ordinal -> "completed"
                else -> "pending"
            }
            
            append("""
                <div class="phase-dot $status" title="${phase.displayName}">
                    <span class="phase-number">${phase.ordinal + 1}</span>
                </div>
            """)
        }
        
        append("""</div>""")
    }
    
    private fun renderPhaseContent(): String = buildString {
        append("""
            <div class="phase-content-area" id="phase-content-$elementId">
        """)
        
        when (kingdomState.currentPhase) {
            TurnPhase.PHASE_I -> {
                val statusPhase = StatusPhase(kingdomState, turnManager)
                append(statusPhase.render())
            }
            TurnPhase.PHASE_II -> {
                val resourcesPhase = ResourcesPhase(kingdomState, turnManager)
                append(resourcesPhase.render())
            }
            TurnPhase.PHASE_III -> {
                append(UnrestPhase.render())
            }
            TurnPhase.PHASE_IV -> {
                val eventsPhase = EventsPhase(kingdomState, turnManager)
                append(eventsPhase.render())
            }
            TurnPhase.PHASE_V -> {
                append(ActionsPhase.render())
            }
            TurnPhase.PHASE_VI -> {
                append(ResolutionPhase.render())
            }
        }
        
        append("""
            </div>
        """)
    }
    
    private fun renderTurnControls(): String = buildString {
        append("""
            <div class="turn-controls">
                <button class="btn-execute-phase" id="execute-phase-$elementId">
                    <i class="fas fa-play"></i> Execute ${kingdomState.currentPhase.displayName}
                </button>
                <button class="btn-next-phase" id="next-phase-$elementId">
                    <i class="fas fa-forward"></i> Next Phase
                </button>
                <button class="btn-end-turn" id="end-turn-$elementId">
                    <i class="fas fa-step-forward"></i> End Turn
                </button>
            </div>
        """)
    }
    
    override fun attachListeners(container: HTMLElement) {
        val controller = container.querySelector("#$elementId") ?: return
        
        // Execute phase button
        controller.querySelector("#execute-phase-$elementId")?.addEventListener("click", {
            turnManager.executeCurrentPhase()
            updateDisplay()
        })
        
        // Next phase button
        controller.querySelector("#next-phase-$elementId")?.addEventListener("click", {
            turnManager.nextPhase()
            updateDisplay()
        })
        
        // End turn button
        controller.querySelector("#end-turn-$elementId")?.addEventListener("click", {
            if (window.confirm("End the current turn and start Turn ${kingdomState.currentTurn + 1}?")) {
                turnManager.endTurn()
                updateDisplay()
            }
        })
        
        // Store references globally for phase-specific actions
        window.asDynamic().executeStatusPhase = {
            turnManager.executeCurrentPhase()
            updateDisplay()
        }
        
        window.asDynamic().proceedToNextPhase = {
            turnManager.nextPhase()
            updateDisplay()
        }
    }
    
    private fun updateDisplay() {
        val container = kotlinx.browser.document.getElementById(elementId)
        if (container != null) {
            container.innerHTML = render()
            attachListeners(container as HTMLElement)
        }
    }
    
    private fun showNotification(message: String) {
        // Simple console log for now, can be enhanced with UI notifications
        console.log("🎉 $message")
    }
    
    private fun updateGlobalStats() {
        // Update the kingdom stats display in the sidebar
        val statsContainer = kotlinx.browser.document.querySelector(".kingdom-stats-container")
        if (statsContainer != null) {
            statsContainer.innerHTML = KingdomStats.render()
            KingdomStats.attachListeners(statsContainer as HTMLElement)
        }
    }
}
