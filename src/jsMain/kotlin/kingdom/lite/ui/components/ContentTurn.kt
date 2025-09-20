package kingdom.lite.ui.components

import kingdom.lite.ui.turn.*
import org.w3c.dom.HTMLElement
import kingdom.lite.model.*
import kingdom.lite.api.*

/**
 * Turn content component
 * Self-contained component that manages the turn phase navigation and content display
 */
class ContentTurn : ContentComponent {
    private var activePhase = "status"
    private var elementId = "turn-content-${kotlin.js.Date.now()}"
    
    // Data models for game mechanics - use existing state or initialize with minimal defaults
    private val kingdomState: KingdomState
    
    init {
        // Try to use existing kingdom state first
        val existingState = kotlinx.browser.window.asDynamic().currentKingdomState as? KingdomState
        
        kingdomState = if (existingState != null) {
            // Use the existing kingdom state
            existingState
        } else {
            // Create state from real kingdom data using the same API as KingdomStats
            val hexList = mutableListOf<Hex>()
            val settlementList = mutableListOf<Settlement>()
            
            // Load real data from the PF2e Kingmaker module if available
            val realmData = getKingmakerRealmData()
            if (realmData != null) {
                console.log("Loading kingdom data from PF2e Kingmaker...")
                console.log("Total hexes claimed: ${realmData.size}")
                console.log("Farmlands: ${realmData.worksites.farmlands.quantity}")
                console.log("Lumber Camps: ${realmData.worksites.lumberCamps.quantity}")
                console.log("Mines: ${realmData.worksites.mines.quantity}")
                console.log("Quarries: ${realmData.worksites.quarries.quantity}")
                
                // Track worksite counts
                val worksiteCounts = mutableMapOf(
                    "farmlands" to realmData.worksites.farmlands.quantity,
                    "lumberCamps" to realmData.worksites.lumberCamps.quantity,
                    "quarries" to realmData.worksites.quarries.quantity,
                    "mines" to realmData.worksites.mines.quantity,
                    "bogMines" to 0,
                    "huntingCamps" to 0
                )
                
                // Create hexes with worksites based on the worksite data
                var hexId = 0
                
                // Add farmlands (they're usually on Plains, but could be on Hills/Swamp)
                for (i in 0 until realmData.worksites.farmlands.quantity) {
                    hexList.add(
                        Hex(
                            id = "hex${++hexId}",
                            terrain = "Plains", // Default to Plains for 2 food production
                            worksite = Worksite(WorksiteType.FARMSTEAD),
                            hasSpecialTrait = false,
                            name = "Farmland ${i + 1}"
                        )
                    )
                }
                
                // Add lumber camps (Forest terrain)
                for (i in 0 until realmData.worksites.lumberCamps.quantity) {
                    hexList.add(
                        Hex(
                            id = "hex${++hexId}",
                            terrain = "Forest",
                            worksite = Worksite(WorksiteType.LOGGING_CAMP),
                            hasSpecialTrait = false,
                            name = "Lumber Camp ${i + 1}"
                        )
                    )
                }
                
                // Add mines (Mountains terrain)
                for (i in 0 until realmData.worksites.mines.quantity) {
                    hexList.add(
                        Hex(
                            id = "hex${++hexId}",
                            terrain = "Mountains",
                            worksite = Worksite(WorksiteType.MINE),
                            hasSpecialTrait = false,
                            name = "Mine ${i + 1}"
                        )
                    )
                }
                
                // Add quarries (Hills terrain)
                for (i in 0 until realmData.worksites.quarries.quantity) {
                    hexList.add(
                        Hex(
                            id = "hex${++hexId}",
                            terrain = "Hills",
                            worksite = Worksite(WorksiteType.QUARRY),
                            hasSpecialTrait = false,
                            name = "Quarry ${i + 1}"
                        )
                    )
                }
                
                // Add settlements from the realm data
                for (i in 0 until realmData.settlements.villages) {
                    settlementList.add(
                        Settlement(
                            name = "Village ${i + 1}",
                            tier = SettlementTier.VILLAGE,
                            structures = mutableListOf()
                        )
                    )
                }
                
                for (i in 0 until realmData.settlements.towns) {
                    settlementList.add(
                        Settlement(
                            name = "Town ${i + 1}",
                            tier = SettlementTier.TOWN,
                            structures = mutableListOf()
                        )
                    )
                }
                
                for (i in 0 until realmData.settlements.cities) {
                    settlementList.add(
                        Settlement(
                            name = "City ${i + 1}",
                            tier = SettlementTier.CITY,
                            structures = mutableListOf()
                        )
                    )
                }
                
                for (i in 0 until realmData.settlements.metropolises) {
                    settlementList.add(
                        Settlement(
                            name = "Metropolis ${i + 1}",
                            tier = SettlementTier.METROPOLIS,
                            structures = mutableListOf()
                        )
                    )
                }
                
                console.log("Created ${hexList.size} hexes with worksites")
                console.log("Created ${settlementList.size} settlements")
            }
            
            // Create kingdom state with real or empty data
            val state = KingdomState(
                settlements = settlementList,
                resources = mutableMapOf(
                    "food" to 0,
                    "lumber" to 0,
                    "stone" to 0,
                    "ore" to 0,
                    "gold" to 0
                ),
                hexes = hexList,
                armies = mutableListOf(), // Armies would need to be loaded from elsewhere
                buildQueue = mutableListOf(),
                isAtWar = kotlinx.browser.window.localStorage.getItem("kingdomWarStatus") == "war",
                size = realmData?.size ?: hexList.size  // Set the actual kingdom size
            )
            
            // Update worksite counts if we have realm data
            if (realmData != null) {
                state.worksiteCount["farmlands"] = realmData.worksites.farmlands.quantity
                state.worksiteCount["lumberCamps"] = realmData.worksites.lumberCamps.quantity
                state.worksiteCount["quarries"] = realmData.worksites.quarries.quantity
                state.worksiteCount["mines"] = realmData.worksites.mines.quantity
            }
            
            state
        }
    }
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
        
        // Setup Resource Phase Step handlers
        kotlinx.browser.window.asDynamic().executeResourceStep1 = {
            turnManager.executeResourcesStep1()
            updateResourcePhaseDisplay(turnContent as HTMLElement)
        }
        
        kotlinx.browser.window.asDynamic().executeResourceStep2 = {
            turnManager.executeResourcesStep2()
            updateResourcePhaseDisplay(turnContent as HTMLElement)
            updateKingdomStatsDisplay()
        }
        
        kotlinx.browser.window.asDynamic().executeResourceStep3 = {
            turnManager.executeResourcesStep3()
            updateResourcePhaseDisplay(turnContent as HTMLElement)
            updateKingdomStatsDisplay()
        }
        
        kotlinx.browser.window.asDynamic().executeResourceStep4 = {
            turnManager.executeResourcesStep4()
            updateResourcePhaseDisplay(turnContent as HTMLElement)
            updateKingdomStatsDisplay()
        }
        
        // Setup resource allocation adjustment handler
        kotlinx.browser.window.asDynamic().adjustAllocation = { projectId: String, resource: String, delta: Int ->
            val project = kingdomState.buildQueue.find { it.id == projectId }
            if (project != null) {
                val current = project.pendingAllocation[resource] ?: 0
                val available = kingdomState.resources[resource] ?: 0
                val remaining = project.getRemainingCost()[resource] ?: 0
                
                // Calculate total pending for this resource across all projects
                val totalPending = kingdomState.buildQueue.sumOf { 
                    if (it.id == projectId) current else (it.pendingAllocation[resource] ?: 0)
                }
                
                val newValue = current + delta
                
                // Ensure we don't exceed available resources or needed amount
                if (newValue >= 0 && (totalPending + delta) <= available && newValue <= remaining) {
                    project.pendingAllocation[resource] = newValue
                    updateResourcePhaseDisplay(turnContent as HTMLElement)
                }
            }
        }
    }
    
    private fun updateResourcePhaseDisplay(container: HTMLElement) {
        if (activePhase == "resources") {
            val contentArea = container.querySelector("#phase-content-$elementId") as? HTMLElement
            contentArea?.innerHTML = ResourcesPhase(kingdomState, turnManager).render()
        }
    }
    
    private fun setActivePhase(phase: String) {
        // Map string phase names to TurnPhase enum values
        val turnPhase = when(phase) {
            "status" -> TurnPhase.PHASE_I
            "resources" -> TurnPhase.PHASE_II
            "unrest" -> TurnPhase.PHASE_III
            "events" -> TurnPhase.PHASE_IV
            "actions" -> TurnPhase.PHASE_V
            "resolution" -> TurnPhase.PHASE_VI
            else -> return
        }
        
        // Only allow phase change if we're currently in Phase I (Status phase)
        if (kingdomState.currentPhase == TurnPhase.PHASE_I) {
            kingdomState.currentPhase = turnPhase
            turnManager.skipToPhase(turnPhase)
        }
        
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
        "resources" -> ResourcesPhase(kingdomState, turnManager).render()
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
