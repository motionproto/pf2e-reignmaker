package kingdom.lite.ui.components

import kingdom.lite.ui.turn.*
import org.w3c.dom.HTMLElement
import kingdom.lite.model.KingdomState
import kingdom.lite.model.TurnManager

/**
 * Turn content component
 * Self-contained component that manages the turn phase navigation and content display
 */
class ContentTurn : ContentComponent {
    private var activePhase = "status"
    private var elementId = "turn-content-${kotlin.js.Date.now()}"
    
    // Data models for game mechanics
    private val kingdomState = KingdomState(
        settlements = mutableListOf(),
        resources = mutableMapOf(
            "food" to 5,
            "lumber" to 2,
            "stone" to 1,
            "ore" to 0,
            "gold" to 0
        ),
        isAtWar = kotlinx.browser.window.localStorage.getItem("kingdomWarStatus") == "war"
    )
    private val turnManager = TurnManager(kingdomState)
    
    override fun render(): String = buildString {
        append("""
            <div class="turn-content" data-content-id="$elementId">
                <div class="phase-navigation-fixed">
                    ${renderPhaseButtons()}
                </div>
                <div class="phase-content-scrollable">
                    <div class="phase-content" id="phase-content-$elementId">
                        ${renderPhaseContent()}
                    </div>
                </div>
            </div>
        """)
    }
    
    override fun attachListeners(container: HTMLElement) {
        // Attach phase button listeners within this component's scope
        val turnContent = container.querySelector("[data-content-id='$elementId']") ?: return
        val phaseButtons = turnContent.querySelectorAll(".phase-button")
        
        for (i in 0 until phaseButtons.length) {
            val button = phaseButtons.item(i) as HTMLElement
            button.addEventListener("click", { event ->
                event.preventDefault()
                val phase = button.dataset.asDynamic().phase as String?
                if (phase != null) {
                    setActivePhase(phase)
                    updatePhaseContent(turnContent as HTMLElement)
                }
            })
        }
        
        // Store global references for phase mechanics
        kotlinx.browser.window.asDynamic().currentKingdomState = kingdomState
        kotlinx.browser.window.asDynamic().currentTurnManager = turnManager
        
        // Setup Phase I execution handler
        kotlinx.browser.window.asDynamic().executePhaseI = {
            turnManager.executeCurrentPhase()
            // Refresh the display
            val contentArea = turnContent.querySelector("#phase-content-$elementId") as? HTMLElement
            if (contentArea != null && activePhase == "status") {
                contentArea.innerHTML = StatusPhase(kingdomState, turnManager).render()
            }
            // Update KingdomStats sidebar
            updateKingdomStatsDisplay()
            
            // Update fame button states in KingdomStats
            val fameDecreaseBtn = kotlinx.browser.document.querySelector("#fame-decrease-btn") as? HTMLElement
            val fameIncreaseBtn = kotlinx.browser.document.querySelector("#fame-increase-btn") as? HTMLElement
            
            if (kingdomState.fame <= 0) {
                fameDecreaseBtn?.setAttribute("disabled", "true")
                fameDecreaseBtn?.style?.opacity = "0.5"
                fameDecreaseBtn?.style?.cursor = "not-allowed"
            } else {
                fameDecreaseBtn?.removeAttribute("disabled")
                fameDecreaseBtn?.style?.opacity = "1"
                fameDecreaseBtn?.style?.cursor = "pointer"
            }
            
            if (kingdomState.fame >= 3) {
                fameIncreaseBtn?.setAttribute("disabled", "true")
                fameIncreaseBtn?.style?.opacity = "0.5"
                fameIncreaseBtn?.style?.cursor = "not-allowed"
            } else {
                fameIncreaseBtn?.removeAttribute("disabled")
                fameIncreaseBtn?.style?.opacity = "1"
                fameIncreaseBtn?.style?.cursor = "pointer"
            }
            
            // Update resource summary in turn controller header
            val resourceSummary = kotlinx.browser.document.querySelector(".resource-summary")
            if (resourceSummary != null) {
                val fameSpan = resourceSummary.querySelector(".resource-item:first-child")
                if (fameSpan != null) {
                    fameSpan.innerHTML = """<i class="fas fa-star"></i> Fame: ${kingdomState.fame}"""
                }
            }
            
            // Also trigger TurnController's update callback if it exists
            val updateTurnControllerCallback = kotlinx.browser.window.asDynamic().updateTurnControllerDisplay
            if (updateTurnControllerCallback != null) {
                updateTurnControllerCallback()
            }
        }
        
        // Setup update function for KingdomStats
        kotlinx.browser.window.asDynamic().updateKingdomStats = {
            updateKingdomStatsDisplay()
        }
    }
    
    private fun setActivePhase(phase: String) {
        activePhase = phase
    }
    
    fun getActivePhase(): String = activePhase
    
    private fun updatePhaseContent(container: HTMLElement) {
        // Update button states
        val buttons = container.querySelectorAll(".phase-button")
        for (i in 0 until buttons.length) {
            val btn = buttons.item(i) as HTMLElement
            val btnPhase = btn.dataset.asDynamic().phase as String?
            if (btnPhase == activePhase) {
                btn.classList.add("active")
            } else {
                btn.classList.remove("active")
            }
        }
        
        // Update content
        val contentArea = container.querySelector("#phase-content-$elementId") as? HTMLElement
        contentArea?.innerHTML = renderPhaseContent()
    }
    
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
        "status" -> StatusPhase(kingdomState, turnManager).render()
        "resources" -> ResourcesPhase.render()
        "unrest" -> UnrestPhase.render()
        "events" -> EventsPhase.render()
        "actions" -> ActionsPhase.render()
        "resolution" -> ResolutionPhase.render()
        else -> "<div>Select a phase</div>"
    }
    
    private fun updateKingdomStatsDisplay() {
        // Update specific values in the KingdomStats sidebar without re-rendering everything
        kotlinx.browser.document.getElementById("kingdom-fame-value")?.textContent = kingdomState.fame.toString()
        kotlinx.browser.document.getElementById("kingdom-gold-value")?.textContent = (kingdomState.resources["gold"] ?: 0).toString()
        kotlinx.browser.document.getElementById("kingdom-unrest-value")?.textContent = kingdomState.unrest.toString()
        kotlinx.browser.document.getElementById("kingdom-food-value")?.textContent = (kingdomState.resources["food"] ?: 0).toString()
        kotlinx.browser.document.getElementById("kingdom-lumber-value")?.textContent = (kingdomState.resources["lumber"] ?: 0).toString()
        kotlinx.browser.document.getElementById("kingdom-stone-value")?.textContent = (kingdomState.resources["stone"] ?: 0).toString()
        kotlinx.browser.document.getElementById("kingdom-ore-value")?.textContent = (kingdomState.resources["ore"] ?: 0).toString()
    }
}
