package kingdom.lite.ui

import kingdom.lite.ui.components.*
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.w3c.dom.HTMLElement
import kotlin.js.Json
import kotlin.js.json

/**
 * Main Kingdom Sheet Application
 * Provides a tabbed interface with sidebar for kingdom stats and main panel for content
 */
class KingdomSheet : Application() {
    private var activeTab = "turn"
    private val turnContent = ContentTurn()
    
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
                    turnContent.setActivePhase(phaseName)
                    updatePhaseContent()
                }
            })
        }
    }
    
    private fun setActiveTab(tabName: String) {
        activeTab = tabName
    }
    
    private fun updatePhaseContent() {
        // Re-render the entire turn content to update phase display
        element?.querySelector(".kingdom-main")?.let { mainContent ->
            (mainContent as HTMLElement).innerHTML = renderMainContent()
        }
        
        // Reattach phase button listeners after re-render
        val buttonNodeList = element?.asDynamic()?.querySelectorAll(".phase-button")
        val buttonCount = buttonNodeList?.length as? Int ?: 0
        for (i in 0 until buttonCount) {
            val button = buttonNodeList[i] as HTMLElement
            button.addEventListener("click", {
                val phaseName = button.asDynamic().dataset.phase as String?
                if (phaseName != null) {
                    turnContent.setActivePhase(phaseName)
                    updatePhaseContent()
                }
            })
        }
    }
    
    override val template: String
        get() = renderContent()
    
    private fun renderContent(): String = buildString {
        append("""
            <div class="kingdom-container">
                <div class="kingdom-header">
                    ${KingdomTabs.render(activeTab)}
                </div>
                <div class="kingdom-body">
                    <div class="kingdom-sidebar">
                        ${KingdomStats.render()}
                    </div>
                    <div class="kingdom-main">
                        ${renderMainContent()}
                    </div>
                </div>
            </div>
        """)
    }
    
    private fun renderMainContent(): String = when (activeTab) {
        "turn" -> turnContent.render()
        "factions" -> ContentFactions.render()
        "events" -> ContentEvents.render()
        else -> turnContent.render()
    }
}
