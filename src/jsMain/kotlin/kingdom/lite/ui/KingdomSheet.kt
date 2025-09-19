package kingdom.lite.ui

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.html.*
import kotlinx.html.js.onClickFunction
import org.w3c.dom.HTMLElement
import kotlin.js.Json
import kotlin.js.json

/**
 * Main Kingdom Sheet Application
 * Provides a tabbed interface with sidebar for kingdom stats and main panel for content
 */
class KingdomSheet : Application() {
    private var activeTab = "turn"
    private var activePhase = "upkeep"
    
    override val options: ApplicationOptions = object : ApplicationOptions {
        override var id: String? = "kingdom-sheet"
        override var title: String? = "Kingdom Management"
        override var classes: Array<String>? = arrayOf("kingdom-sheet")
        override var width: Int? = 1000
        override var height: Int? = 700
        override var resizable: Boolean? = true
        override var minimizable: Boolean? = false
        override var scrollY: Array<String>? = null
    }

    override suspend fun getData(): Json = json()

    override fun activateListeners(html: HTMLElement) {
        super.activateListeners(html)
        
        // Tab click handlers
        val tabNodeList = html.asDynamic().querySelectorAll(".kingdom-tab")
        val tabCount = tabNodeList.length as Int
        for (i in 0 until tabCount) {
            val tab = tabNodeList[i] as HTMLElement
            tab.addEventListener("click", {
                val tabName = tab.asDynamic().dataset.tab as String?
                if (tabName != null) {
                    setActiveTab(tabName)
                    GlobalScope.launch {
                        render(true)
                    }
                }
            })
        }
        
        // Phase button handlers
        val buttonNodeList = html.asDynamic().querySelectorAll(".phase-button")
        val buttonCount = buttonNodeList.length as Int
        for (i in 0 until buttonCount) {
            val button = buttonNodeList[i] as HTMLElement
            button.addEventListener("click", {
                val phaseName = button.asDynamic().dataset.phase as String?
                if (phaseName != null) {
                    activePhase = phaseName
                    updatePhaseContent()
                }
            })
        }
    }
    
    private fun setActiveTab(tabName: String) {
        activeTab = tabName
    }
    
    private fun updatePhaseContent() {
        // Update the phase content display
        element?.querySelector(".phase-content")?.let { content ->
            (content as HTMLElement).innerHTML = renderPhaseContent()
        }
        
        // Update active phase button styling
        element?.let { elem ->
            val buttonNodeList = elem.asDynamic().querySelectorAll(".phase-button")
            val buttonCount = buttonNodeList.length as Int
            for (i in 0 until buttonCount) {
                val button = buttonNodeList[i] as HTMLElement
                button.classList.remove("active")
                if (button.asDynamic().dataset.phase == activePhase) {
                    button.classList.add("active")
                }
            }
        }
    }
    
    override val template: String
        get() = renderContent()
    
    private fun renderContent(): String = buildString {
        append("""
            <div class="kingdom-container">
                <div class="kingdom-header">
                    ${renderTabs()}
                </div>
                <div class="kingdom-body">
                    <div class="kingdom-sidebar">
                        ${renderKingdomStats()}
                    </div>
                    <div class="kingdom-main">
                        ${renderMainContent()}
                    </div>
                </div>
            </div>
        """)
    }
    
    private fun renderTabs(): String = buildString {
        val tabs = listOf(
            "turn" to "Turn",
            "settlements" to "Settlements",
            "factions" to "Factions",
            "structures" to "Structures",
            "events" to "Events"
        )
        
        append("""<nav class="kingdom-tabs">""")
        tabs.forEach { (id, label) ->
            val activeClass = if (id == activeTab) "active" else ""
            append("""
                <button class="kingdom-tab $activeClass" data-tab="$id">
                    $label
                </button>
            """)
        }
        append("""</nav>""")
    }
    
    private fun renderKingdomStats(): String = buildString {
        // Based on Kingdom_Stat_Block.md - Reignmaker Lite simplified stats
        append("""
            <div class="kingdom-stats">
                <h3>Kingdom Statistics</h3>
                
                <!-- Core Trackers -->
                <div class="stat-group">
                    <h4>Core Trackers</h4>
                    <div class="stat-item">
                        <label>Fame:</label>
                        <span class="stat-value">
                            <span class="fame-boxes">
                                <i class="far fa-square"></i>
                                <i class="far fa-square"></i>
                                <i class="far fa-square"></i>
                            </span>
                        </span>
                    </div>
                    <div class="stat-item">
                        <label>Unrest:</label>
                        <span class="stat-value">0</span>
                    </div>
                    <div class="stat-item">
                        <label>Gold:</label>
                        <span class="stat-value">0</span>
                    </div>
                    <div class="stat-item">
                        <label>Event DC:</label>
                        <span class="stat-value">14</span>
                    </div>
                    <div class="stat-item">
                        <label>War Status:</label>
                        <span class="stat-value">Peace</span>
                    </div>
                </div>
                
                <!-- Kingdom Size -->
                <div class="stat-group">
                    <h4>Kingdom Size</h4>
                    <div class="stat-item">
                        <label>Hexes Claimed:</label>
                        <span class="stat-value">1</span>
                    </div>
                    <div class="stat-item">
                        <label>Unrest from Size:</label>
                        <span class="stat-value">0</span>
                    </div>
                    <div class="stat-item">
                        <label>Metropolises:</label>
                        <span class="stat-value">0</span>
                    </div>
                </div>
                
                <!-- Resources -->
                <div class="stat-group">
                    <h4>Resources</h4>
                    <div class="resource-section">
                        <div class="resource-header">Food</div>
                        <div class="stat-item">
                            <label>On Hand:</label>
                            <span class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <label>Capacity:</label>
                            <span class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <label>Production:</label>
                            <span class="stat-value">0/turn</span>
                        </div>
                        <div class="stat-item">
                            <label>Consumption:</label>
                            <span class="stat-value">0/turn</span>
                        </div>
                        <div class="stat-item">
                            <label>Net:</label>
                            <span class="stat-value">0</span>
                        </div>
                    </div>
                    <div class="resource-section">
                        <div class="resource-header">Trade Resources</div>
                        <div class="resource-grid">
                            <div class="resource-item">
                                <label>Lumber:</label>
                                <span>0</span>
                            </div>
                            <div class="resource-item">
                                <label>Stone:</label>
                                <span>0</span>
                            </div>
                            <div class="resource-item">
                                <label>Ore:</label>
                                <span>0</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Summary -->
                <div class="stat-group">
                    <h4>Quick Summary</h4>
                    <div class="stat-item">
                        <label>Settlements:</label>
                        <span class="stat-value">0</span>
                    </div>
                    <div class="stat-item">
                        <label>Worksites:</label>
                        <span class="stat-value">0</span>
                    </div>
                    <div class="stat-item">
                        <label>Armies:</label>
                        <span class="stat-value">0</span>
                    </div>
                </div>
            </div>
        """)
    }
    
    private fun renderMainContent(): String = when (activeTab) {
        "turn" -> renderTurnContent()
        "settlements" -> renderSettlementsContent()
        "factions" -> renderFactionsContent()
        "structures" -> renderStructuresContent()
        "events" -> renderEventsContent()
        else -> renderTurnContent()
    }
    
    private fun renderTurnContent(): String = buildString {
        append("""
            <div class="turn-content">
                <div class="phase-navigation">
                    ${renderPhaseButtons()}
                </div>
                <div class="phase-content">
                    ${renderPhaseContent()}
                </div>
            </div>
        """)
    }
    
    private fun renderPhaseButtons(): String = buildString {
        val phases = listOf(
            "upkeep" to "Upkeep",
            "edict" to "Edict",
            "activities" to "Activities", 
            "event" to "Event",
            "loot" to "Loot"
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
    
    private fun renderPhaseContent(): String = buildString {
        when (activePhase) {
            "upkeep" -> {
                append("""
                    <div class="phase-details">
                        <h3>Upkeep Phase</h3>
                        <ol class="phase-steps">
                            <li><strong>Add Unrest from Size:</strong> Hexes ÷ 8 (truncated) added to Unrest</li>
                            <li><strong>Add Unrest from Excess Units:</strong> +1 per unit over capacity</li>
                            <li><strong>Add Unrest from Metropolises:</strong> +1 per Metropolis</li>
                            <li><strong>Check for Unrest Incidents:</strong> If Unrest ≥ 5, handle incident</li>
                            <li><strong>Resource Production:</strong> Collect resources from worksites</li>
                            <li><strong>Resource Consumption:</strong> Pay food upkeep for settlements and armies</li>
                        </ol>
                    </div>
                """)
            }
            "edict" -> {
                append("""
                    <div class="phase-details">
                        <h3>Edict Phase</h3>
                        <ol class="phase-steps">
                            <li><strong>Diplomatic Edicts:</strong> Manage relations with other factions</li>
                            <li><strong>Settlement Edicts:</strong> Found new settlements or upgrade existing ones</li>
                            <li><strong>Army Edicts:</strong> Recruit, disband, or reorganize military units</li>
                            <li><strong>Trade Edicts:</strong> Exchange resources at current market rates</li>
                        </ol>
                    </div>
                """)
            }
            "activities" -> {
                append("""
                    <div class="phase-details">
                        <h3>Activities Phase</h3>
                        <div class="activity-info">
                            <p><strong>Number of Activities:</strong> 3 (base)</p>
                            <p>During this phase, perform kingdom activities such as:</p>
                            <ul>
                                <li>Build Roads (1 Gold per hex)</li>
                                <li>Build Structure (varies by structure)</li>
                                <li>Claim Hexes (1 Gold per hex)</li>
                                <li>Create Worksite (2 Gold)</li>
                                <li>Deal with Unrest (reduce by 1d4)</li>
                                <li>Hire Adventurers</li>
                                <li>And more...</li>
                            </ul>
                        </div>
                    </div>
                """)
            }
            "event" -> {
                append("""
                    <div class="phase-details">
                        <h3>Event Phase</h3>
                        <div class="event-info">
                            <p>Roll for kingdom events:</p>
                            <ol>
                                <li><strong>Roll d20 vs Event DC:</strong> Current DC is 14</li>
                                <li><strong>Success:</strong> Beneficial or neutral event occurs</li>
                                <li><strong>Failure:</strong> Detrimental event occurs</li>
                                <li><strong>Critical Success/Failure:</strong> Major event occurs</li>
                            </ol>
                            <p><em>Event DC increases by 1 each turn, resets after event occurs</em></p>
                        </div>
                    </div>
                """)
            }
            "loot" -> {
                append("""
                    <div class="phase-details">
                        <h3>Loot Phase</h3>
                        <div class="loot-info">
                            <p><strong>Treasury Management:</strong></p>
                            <ul>
                                <li>Deposit treasure and convert to Gold</li>
                                <li>Withdraw Gold for party use</li>
                                <li>Manage resource stockpiles</li>
                            </ul>
                            <p><strong>Trade Resources:</strong></p>
                            <ul>
                                <li>Lumber, Stone, and Ore can be traded</li>
                                <li>Exchange rates vary by diplomatic relations</li>
                            </ul>
                        </div>
                    </div>
                """)
            }
            else -> append("<div>Select a phase</div>")
        }
    }
    
    private fun renderSettlementsContent(): String = """
        <div class="settlements-content">
            <h3>Settlements</h3>
            <p>No settlements established yet.</p>
            <button class="btn">Establish Settlement</button>
        </div>
    """
    
    private fun renderFactionsContent(): String = """
        <div class="factions-content">
            <h3>Factions</h3>
            <p>No factions encountered yet.</p>
        </div>
    """
    
    private fun renderStructuresContent(): String = """
        <div class="structures-content">
            <h3>Structures</h3>
            <p>No structures built yet.</p>
            <button class="btn">Build Structure</button>
        </div>
    """
    
    private fun renderEventsContent(): String = """
        <div class="events-content">
            <h3>Kingdom Events</h3>
            <p>No events recorded yet.</p>
            <button class="btn">Roll for Event</button>
        </div>
    """
}
