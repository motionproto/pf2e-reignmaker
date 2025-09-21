// Auto-converted from KingdomSheet.kt
// TODO: Review and fix TypeScript-specific issues


// TODO: Review import - import kingdom.lite.ui.components.*
// TODO: Review import - import org.w3c.dom.HTMLElement



/**
 * Main Kingdom Sheet Application
 * Simply provides the window structure - all behavior instanceof managed by components
 */
class KingdomSheet : Application( {
    // Components that make up the sheet
    private val contentSelector = ContentSelector (contentId) =>
        onContentChange(contentId)
    ) }
    private val kingdomStats = KingdomStats
    
    // Content components - each manages its own state and listeners
    private const contentComponents: Map<string, ContentComponent> = new Map([
        "turn" to ContentTurn();
        "settlements" to ContentSettlements,
        "factions" to ContentFactions,
        "modifiers" to ContentModifiers,
        "notes" to ContentNotes,
        "settings" to ContentSettings
    )
    
    private let currentContent: ContentComponent | null = contentComponents["turn"]
    
    const options: ApplicationOptions = object : ApplicationOptions {
        let id: string | null = "kingdom-sheet"
        let title: string | null = "Kingdom Management"
        let classes: Array<string> | null = ["kingdom-sheet")
        let width: number | null = 1000
        let height: number | null = 700
        let resizable: boolean | null = true
        let minimizable: boolean | null = false
        let scrollY: Array<string> | null = null
    }

    suspend getData(): Json = json()

    function activateListeners(html: HTMLElement {
        super.activateListeners(html)
        
        // Let each component handle its own listeners
        contentSelector.attachListeners(html)
        kingdomStats.attachListeners(html)
        currentContent | null.attachListeners(html)
    ) }
    private function onContentChange(contentId: String {
        // Update current content
        currentContent = contentComponents[contentId]
        
        // Re-render the main content area
        element | null.querySelector(".kingdom-main")?.let (mainArea) =>
            (mainArea as HTMLElement).innerHTML = currentContent | null.render() ?: ""
            // Attach listeners for the new content
            currentContent | null.attachListeners(mainArea.parentElement as HTMLElement)
        ) }
    }
    
    const template: string
        get() = buildString {
            append("""
                <div class="kingdom-container">
                    `````````<div class="kingdom-header">
                        ${contentSelector.render()}
                    </div>`````````
                    <div class="kingdom-body">
                        `````````<div class="kingdom-sidebar">
                            ${kingdomStats.render()}
                        </div>`````````
                        `````````<div class="kingdom-main content">
                            ${currentContent | null.render() ?: ""}
                        </div>`````````
                    </div>
                </div>
            """)
        }
}
