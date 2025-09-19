package kingdom.lite.ui

import kingdom.lite.ui.components.*
import org.w3c.dom.HTMLElement
import kotlin.js.Json
import kotlin.js.json

/**
 * Main Kingdom Sheet Application
 * Simply provides the window structure - all behavior is managed by components
 */
class KingdomSheet : Application() {
    // Components that make up the sheet
    private val contentSelector = ContentSelector { contentId ->
        onContentChange(contentId)
    }
    private val kingdomStats = KingdomStats
    
    // Content components - each manages its own state and listeners
    private val contentComponents: Map<String, ContentComponent> = mapOf(
        "turn" to ContentTurn(),
        "settlements" to ContentSettlements,
        "factions" to ContentFactions,
        "modifiers" to ContentModifiers,
        "notes" to ContentNotes
    )
    
    private var currentContent: ContentComponent? = contentComponents["turn"]
    
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
        
        // Let each component handle its own listeners
        contentSelector.attachListeners(html)
        kingdomStats.attachListeners(html)
        currentContent?.attachListeners(html)
    }
    
    private fun onContentChange(contentId: String) {
        // Update current content
        currentContent = contentComponents[contentId]
        
        // Re-render the main content area
        element?.querySelector(".kingdom-main")?.let { mainArea ->
            (mainArea as HTMLElement).innerHTML = currentContent?.render() ?: ""
            // Attach listeners for the new content
            currentContent?.attachListeners(mainArea.parentElement as HTMLElement)
        }
    }
    
    override val template: String
        get() = buildString {
            append("""
                <div class="kingdom-container">
                    <div class="kingdom-header">
                        ${contentSelector.render()}
                    </div>
                    <div class="kingdom-body">
                        <div class="kingdom-sidebar">
                            ${kingdomStats.render()}
                        </div>
                        <div class="kingdom-main content">
                            ${currentContent?.render() ?: ""}
                        </div>
                    </div>
                </div>
            """)
        }
}
